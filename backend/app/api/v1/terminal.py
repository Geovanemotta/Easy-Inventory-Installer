import asyncio
import json
import logging
import os
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
import jwt
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
import asyncssh

from app.core.config import JWT_ALGORITHM, JWT_SECRET_KEY
from app.core.session_vault import get_ad_session_cred
from app.database import engine
from app.models.device import Device
from app.models.user import User

router = APIRouter(
    prefix="/terminal",
    tags=["Terminal"],
)

logger = logging.getLogger("terminal_ssh")


def authenticate_ws_token(token: Optional[str]) -> Optional[User]:
    if not token:
        return None
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )
        if payload.get("type") != "access":
            return None
        subject = payload.get("sub")
        if subject is None:
            return None
        user_id = int(subject)
        with Session(engine) as session:
            user = session.scalar(
                select(User)
                .options(selectinload(User.roles))
                .where(
                    User.id == user_id,
                    User.active.is_(True),
                )
            )
            return user
    except Exception as exc:
        logger.warning(f"Erro na validação do token WebSocket: {exc}")
        return None


@router.websocket("/ssh/{device_id}")
async def websocket_ssh_endpoint(websocket: WebSocket, device_id: int):
    await websocket.accept()

    # 1. Autenticação via Token no query parameter (?token=...)
    token = websocket.query_params.get("token")
    user = authenticate_ws_token(token)
    if not user:
        await websocket.send_text(
            "\r\n\x1b[31;1m[ERRO]\x1b[0m Não autenticado ou sessão expirada. Faça login novamente.\r\n"
        )
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 1.1 Restrição de Perfil: Operador de Loja não possui permissão para Terminal SSH
    user_roles = [r.slug for r in user.roles] if user.roles else []
    can_use_ssh = user.is_superadmin or "admin" in user_roles or "operador_matriz" in user_roles
    if not can_use_ssh:
        await websocket.send_text(
            "\r\n\x1b[31;1m[ACESSO RESTRITO]\x1b[0m O perfil de Operador de Loja não possui permissão para acessar o Terminal SSH.\r\n"
        )
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 2. Busca o dispositivo no banco de dados
    with Session(engine) as session:
        device = session.get(Device, device_id)
        if not device:
            await websocket.send_text(
                "\r\n\x1b[31;1m[ERRO]\x1b[0m Dispositivo não encontrado no inventário.\r\n"
            )
            await websocket.close()
            return

        target_ip = device.ip
        hostname = device.hostname or f"Device #{device_id}"

    if not target_ip:
        await websocket.send_text(
            f"\r\n\x1b[31;1m[ERRO]\x1b[0m O dispositivo '{hostname}' não possui um IP principal registrado.\r\n"
        )
        await websocket.close()
        return

    # 3. Aguarda o primeiro frame de configuração/handshake do cliente
    try:
        init_frame = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
        init_data = json.loads(init_frame)
    except asyncio.TimeoutError:
        await websocket.send_text(
            "\r\n\x1b[31;1m[ERRO]\x1b[0m Tempo limite esgotado aguardando parâmetros de conexão.\r\n"
        )
        await websocket.close()
        return
    except Exception as exc:
        await websocket.send_text(
            f"\r\n\x1b[31;1m[ERRO]\x1b[0m Formato de mensagem de conexão inválido: {exc}\r\n"
        )
        await websocket.close()
        return

    use_session_cred = bool(init_data.get("use_session_cred", False))
    raw_username = str(init_data.get("username", "")).strip()
    password = init_data.get("password") or None

    ad_user, ad_pass = get_ad_session_cred(user.id)

    used_session_vault = False
    if use_session_cred and ad_pass:
        password = ad_pass
        username = raw_username or ad_user or user.username
        used_session_vault = True
    elif not password and ad_pass and (not raw_username or raw_username.lower() == (ad_user or user.username).lower()):
        password = ad_pass
        username = raw_username or ad_user or user.username
        used_session_vault = True
    else:
        username = raw_username or (ad_user or user.username) or os.getenv("DEFAULT_SSH_USER", "suporte")

    port = int(init_data.get("port", 22))
    cols = max(20, int(init_data.get("cols", 100)))
    rows = max(5, int(init_data.get("rows", 30)))

    if used_session_vault:
        await websocket.send_text(
            f"\r\n\x1b[36m[*] Conectando a {hostname} ({target_ip}:{port}) utilizando credenciais da sessão AD ('{username}')...\x1b[0m\r\n"
        )
    else:
        await websocket.send_text(
            f"\r\n\x1b[36m[*] Conectando a {hostname} ({target_ip}:{port}) como '{username}'...\x1b[0m\r\n"
        )

    # 4. Inicia a conexão SSH
    conn = None
    try:
        conn = await asyncssh.connect(
            host=target_ip,
            port=port,
            username=username,
            password=password,
            known_hosts=None,
            connect_timeout=15,
        )
    except asyncssh.PermissionDenied:
        await websocket.send_text(
            "\r\n\x1b[31;1m[FALHA DE AUTENTICAÇÃO]\x1b[0m Usuário ou senha incorretos no host de destino.\r\n"
        )
        await websocket.close()
        return
    except (OSError, asyncio.TimeoutError) as exc:
        await websocket.send_text(
            f"\r\n\x1b[31;1m[ERRO DE CONEXÃO]\x1b[0m Inacessível via SSH ({target_ip}:{port}): {exc}\r\n"
        )
        await websocket.close()
        return
    except Exception as exc:
        await websocket.send_text(
            f"\r\n\x1b[31;1m[ERRO SSH]\x1b[0m {exc}\r\n"
        )
        await websocket.close()
        return

    # 5. Cria processo com PTY (Pseudo-Terminal)
    try:
        process = await conn.create_process(
            term_type="xterm-256color",
            term_size=(cols, rows),
            encoding=None,
        )
    except Exception as exc:
        await websocket.send_text(
            f"\r\n\x1b[31;1m[ERRO PTY]\x1b[0m Não foi possível alocar o terminal interativo: {exc}\r\n"
        )
        conn.close()
        await websocket.close()
        return

    await websocket.send_text(
        "\x1b[32m[✓] Conexão SSH estabelecida com sucesso!\x1b[0m\r\n\r\n"
    )

    # 6. Bomba bidirecional assíncrona entre WebSocket e SSH
    async def ssh_to_ws():
        try:
            while True:
                data = await process.stdout.read(4096)
                if not data:
                    break
                await websocket.send_bytes(data)
        except Exception:
            pass

    async def ws_to_ssh():
        try:
            while True:
                msg = await websocket.receive()
                if msg["type"] == "websocket.disconnect":
                    break

                if "text" in msg:
                    raw_text = msg["text"]
                    if raw_text.startswith("{") and raw_text.endswith("}"):
                        try:
                            action_data = json.loads(raw_text)
                            act = action_data.get("action")
                            if act == "resize":
                                new_cols = max(20, int(action_data.get("cols", cols)))
                                new_rows = max(5, int(action_data.get("rows", rows)))
                                process.change_terminal_size(new_cols, new_rows)
                                continue
                            elif act == "ping":
                                await websocket.send_text('{"action":"pong"}')
                                continue
                        except Exception:
                            pass

                    process.stdin.write(raw_text.encode("utf-8"))
                    await process.stdin.drain()

                elif "bytes" in msg:
                    process.stdin.write(msg["bytes"])
                    await process.stdin.drain()
        except Exception:
            pass

    task_ssh = asyncio.create_task(ssh_to_ws())
    task_ws = asyncio.create_task(ws_to_ssh())

    done, pending = await asyncio.wait(
        [task_ssh, task_ws],
        return_when=asyncio.FIRST_COMPLETED,
    )

    for p in pending:
        p.cancel()

    try:
        process.terminate()
    except Exception:
        pass

    try:
        conn.close()
    except Exception:
        pass

    try:
        await websocket.close()
    except Exception:
        pass
