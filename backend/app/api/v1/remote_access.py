import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.v1.auth import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/remote-access",
    tags=["Acesso Remoto"],
)

MESHCENTRAL_PORT = int(os.getenv("PORT_MESHCENTRAL", "4443"))


def check_remote_access_permission(user: User = Depends(get_current_user)) -> User:
    """Valida se o usuário autenticado possui perfil com permissão de acesso remoto."""
    if user.is_superadmin:
        return user

    user_roles = [r.slug for r in user.roles] if user.roles else []
    # Permissões autorizadas: admin, operador_matriz ou role específica remote_access
    allowed_roles = {"admin", "operador_matriz", "remote_access"}
    if any(role in allowed_roles for role in user_roles):
        return user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Acesso não autorizado ao módulo de Acesso Remoto.",
    )


@router.get("/config")
def get_remote_access_config(
    request: Request,
    current_user: User = Depends(check_remote_access_permission),
):
    """Retorna as configurações e URLs de conexão para o cliente web do MeshCentral."""
    server_host = os.getenv("SERVER_HOST", "")
    if not server_host:
        server_host = request.headers.get("host", "localhost").split(":")[0]

    # URL padrão acessível pelo navegador
    mesh_url = f"https://{server_host}:{MESHCENTRAL_PORT}"

    return {
        "enabled": True,
        "mesh_port": MESHCENTRAL_PORT,
        "mesh_url": mesh_url,
        "server_host": server_host,
        "features": {
            "desktop_sharing": True,
            "file_transfer": True,
            "uac_support": True,
            "unlimited_concurrent": True,
        },
        "user": {
            "username": current_user.username,
            "full_name": current_user.full_name,
            "is_admin": bool(current_user.is_superadmin or any(r.slug == "admin" for r in (current_user.roles or []))),
        },
    }
