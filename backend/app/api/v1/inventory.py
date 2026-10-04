import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.database import engine
from app.models.user import User
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


@router.get("/data")
def get_inventory_data(
    current_user: User = Depends(get_current_user),
):
    """
    Retorna os dados do inventário diretamente do PostgreSQL,
    com controle de permissões por site para usuários não-superadmin.
    """
    with Session(engine) as session:
        items = get_devices_for_dashboard(session, current_user)

    return {
        "items": items,
        "total": len(items),
        "source": "postgresql",
        "timestamp": datetime.utcnow().isoformat(),
    }


from fastapi.responses import JSONResponse, PlainTextResponse

@router.post("/receive")
@router.post("/receive_inventory.php")
async def receive_inventory(
    request: Request,
    x_agent_token: str | None = Header(default=None),
):
    """
    Endpoint de ingestão consumido pelos agentes (Linux e Windows).
    Realiza o Upsert no PostgreSQL (tabelas devices, software, packages)
    e grava cópia de segurança em disco.
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

    # 1. Persistência no PostgreSQL
    with Session(engine) as session:
        try:
            device = upsert_device_from_payload(session, dados, company_id=1)
            device_id = device.id
        except Exception as e:
            session.rollback()
            raise HTTPException(status_code=500, detail=f"Erro ao salvar no banco: {e}")

    # 2. Backup opcional em disco no padrão por pasta
    try:
        if INVENTORY_DIR.exists():
            h_upper = hostname.upper()
            m_cb = re.match(r"^(?:CB|C)(\d+)-", h_upper)
            m_lj = re.match(r"^(?:LJ|L)(\d+)-", h_upper)
            if h_upper.startswith("AC-") or h_upper == "MATRIZ":
                pasta = "MATRIZ"
            elif m_cb:
                pasta = f"COMBO-{int(m_cb.group(1)):02d}"
            elif m_lj:
                pasta = f"LOJA-{int(m_lj.group(1)):02d}"
            else:
                pasta = "OUTROS"

            destino_dir = INVENTORY_DIR / pasta
            destino_dir.mkdir(parents=True, exist_ok=True)
            safe_hostname = re.sub(r"[^A-Za-z0-9._-]", "_", hostname)
            arquivo = destino_dir / f"{safe_hostname}.json"
            with open(arquivo, "w", encoding="utf-8") as f:
                json.dump(dados, f, ensure_ascii=False, indent=4)
    except Exception:
        pass

    # Se o cliente solicitou JSON explicitamente via header Accept
    accept = request.headers.get("accept", "")
    if "application/json" in accept:
        return {
            "status": "ok",
            "device_id": device_id,
            "hostname": hostname,
            "database": "saved",
        }

    # Resposta padrão compatível com os scripts legados que verificam == "OK"
    return PlainTextResponse("OK", status_code=200)
