import os
import re
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import PlainTextResponse

router = APIRouter(
    prefix="/agent",
    tags=["Agent Distribution"],
)

AGENTS_DIR = Path("/app/scripts_agents")
if not AGENTS_DIR.exists() or not (AGENTS_DIR / "agent-linux.sh").exists():
    AGENTS_DIR = Path("scripts_agents")


def get_server_base_url(request: Request) -> str:
    """
    Detecta dinamicamente o protocolo, endereço e porta real do servidor,
    preservando portas personalizadas (ex: 9292, 8000, 8443) tanto através
    do cabeçalho Host do cliente quanto de proxies reversos e variáveis de ambiente.
    """
    proto = request.headers.get("x-forwarded-proto") or request.url.scheme or "http"
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or request.url.netloc

    # Se a porta foi passada separadamente via header (ex: X-Forwarded-Port) e ainda não está no host
    fwd_port = request.headers.get("x-forwarded-port")
    if host and ":" not in host and fwd_port:
        if (proto == "http" and fwd_port != "80") or (proto == "https" and fwd_port != "443"):
            host = f"{host}:{fwd_port}"

    # Fallback via variável de ambiente caso o proxy tenha omitido a porta
    if host and ":" not in host:
        port_env = os.getenv("PORT_HTTPS" if proto == "https" else "PORT_HTTP")
        if port_env and port_env not in ("80", "443"):
            host = f"{host}:{port_env}"

    return f"{proto}://{host}"



@router.get("/linux", response_class=PlainTextResponse)
@router.get("/install.sh", response_class=PlainTextResponse)
def get_linux_agent(request: Request):
    """
    Retorna o script bash do agente Linux configurado dinamicamente
    com a URL deste servidor para instalação rápida via:
    curl -sSL http://<servidor>:8000/api/v1/agent/linux | sudo bash
    """
    script_path = AGENTS_DIR / "agent-linux.sh"
    if not script_path.exists():
        raise HTTPException(status_code=404, detail="Script do agente Linux não encontrado.")

    content = script_path.read_text(encoding="utf-8")
    server_base = get_server_base_url(request)
    receive_url = f"{server_base}/api/v1/inventory/receive"

    # Substitui a URL padrão de fallback pela URL do servidor requisitado
    content = content.replace("http://localhost:8000/api/v1/inventory/receive", receive_url)

    return PlainTextResponse(content, media_type="text/x-shellscript; charset=utf-8")


@router.get("/windows", response_class=PlainTextResponse)
@router.get("/install.ps1", response_class=PlainTextResponse)
def get_windows_agent(request: Request):
    """
    Retorna o script PowerShell do agente Windows configurado dinamicamente
    com a URL deste servidor para instalação rápida via:
    irm http://<servidor>:8000/api/v1/agent/windows | iex
    """
    script_path = AGENTS_DIR / "agent-windows.ps1"
    if not script_path.exists():
        raise HTTPException(status_code=404, detail="Script do agente Windows não encontrado.")

    content = script_path.read_text(encoding="utf-8")
    server_base = get_server_base_url(request)
    receive_url = f"{server_base}/api/v1/inventory/receive"

    # Substitui a URL padrão de fallback pela URL do servidor requisitado
    content = content.replace(
        '"http://localhost:8000/api/v1/inventory/receive"',
        f'"{receive_url}"',
    )

    return PlainTextResponse(content, media_type="text/plain; charset=utf-8")
