from datetime import datetime
import json
from pathlib import Path
import re
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.database import engine
from app.models.user import User
from app.schemas.inventory import (
    InventoryDataResponse,
    InventoryPayloadIn,
    InventoryReceiveResponse,
)
from app.services.inventory_service import (
    get_devices_for_dashboard,
    upsert_device_from_payload,
)


router = APIRouter(
    prefix="/inventory",
    tags=["Inventory"],
)

INVENTORY_DIR = Path("/app/import-data")
if not INVENTORY_DIR.exists():
    INVENTORY_DIR = Path("import-data")


# =====================================================================
# Funções Auxiliares de Persistência em Disco
# =====================================================================

def determinar_pasta_backup(hostname: str) -> str:
    """Classifica a subpasta de contingência em disco baseando-se no padrão estrutural do hostname."""
    h_upper = (hostname or "").upper().strip()
    m_cb = re.match(r"^(?:CB|C)(\d+)-", h_upper)
    m_lj = re.match(r"^(?:LJ|L)(\d+)-", h_upper)
    if h_upper.startswith("AC-") or h_upper == "MATRIZ":
        return "MATRIZ"
    if m_cb:
        return f"COMBO-{int(m_cb.group(1)):02d}"
    if m_lj:
        return f"LOJA-{int(m_lj.group(1)):02d}"
    return "OUTROS"


def salvar_backup_inventario_disco(hostname: str, dados: Dict[str, Any]) -> None:
    """Grava de forma segura cópia do inventário bruto em disco sem interromper o fluxo em caso de falha de I/O."""
    try:
        if INVENTORY_DIR.exists():
            pasta = determinar_pasta_backup(hostname)
            destino_dir = INVENTORY_DIR / pasta
            destino_dir.mkdir(parents=True, exist_ok=True)
            safe_hostname = re.sub(r"[^A-Za-z0-9._-]", "_", hostname)
            arquivo = destino_dir / f"{safe_hostname}.json"
            with open(arquivo, "w", encoding="utf-8") as f:
                json.dump(dados, f, ensure_ascii=False, indent=4)
    except Exception:
        pass


# =====================================================================
# Rotas de Inventário
# =====================================================================

@router.get("/data")
def get_inventory_data(
    current_user: User = Depends(get_current_user),
):
    """
    Retorna a lista completa de inventário para a visão em tabela,
    com aplicação de controle de acesso por filiais autorizadas.
    """
    with Session(engine) as session:
        items = get_devices_for_dashboard(session, current_user)

    return {
        "items": items,
        "total": len(items),
        "source": "postgresql",
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.post("/receive")
@router.post("/receive_inventory.php")
async def receive_inventory(
    request: Request,
    x_agent_token: Optional[str] = Header(default=None),
):
    """
    Endpoint principal de ingestão consumido pelos agentes corporativos (Linux e Windows).
    Realiza o Upsert no PostgreSQL (tabelas devices, softwares, pacotes e histórico)
    e efetua cópia de segurança em disco.
    """
    try:
        dados = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="JSON inválido")

    if not isinstance(dados, dict):
        raise HTTPException(status_code=400, detail="Formato de JSON inválido, esperado objeto.")

    hostname = str(dados.get("hostname", "")).strip()
    ip = str(dados.get("ip", "")).strip()

    if not hostname:
        raise HTTPException(status_code=400, detail="Hostname ausente")
    if not ip:
        raise HTTPException(status_code=400, detail="IP ausente")

    # 1. Persistência relacional no PostgreSQL
    with Session(engine) as session:
        try:
            device = upsert_device_from_payload(session, dados, company_id=1)
            device_id = device.id
        except Exception as e:
            session.rollback()
            raise HTTPException(status_code=500, detail=f"Erro ao salvar no banco: {e}")

    # 2. Backup assíncrono em disco na pasta correspondente à loja
    salvar_backup_inventario_disco(hostname, dados)

    # 3. Resposta compatível com JSON ou PlainText ("OK")
    accept = request.headers.get("accept", "")
    if "application/json" in accept:
        return {
            "status": "ok",
            "device_id": device_id,
            "hostname": hostname,
            "database": "saved",
        }

    return PlainTextResponse("OK", status_code=200)
