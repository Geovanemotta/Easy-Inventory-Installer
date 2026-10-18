from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.database import engine
from app.models import (
    Device,
    DeviceSoftware,
    Software,
    SoftwarePackage,
    User,
)
from app.models.user_site_access import user_site_access
from app.services.inventory_service import sincronizar_software_dispositivo
from app.services.software_service import (
    obter_catalogo_softwares,
    obter_dispositivos_software,
)
from app.schemas.software import (
    DeviceSoftwareHeader,
    DeviceSoftwareItem,
    DeviceSoftwareListResponse,
    SoftwareCatalogResponse,
    SoftwareDevicesResponse,
    SoftwarePackageItem,
)


def _is_admin_user(user: User) -> bool:
    """Verifica se o usuário possui perfil admin ou superadmin."""
    if user.is_superadmin:
        return True
    roles = [r.slug for r in user.roles] if user.roles else []
    return "admin" in roles


def _is_global_user(user: User) -> bool:
    """Verifica se o usuário possui acesso global (admin, superadmin ou operador_matriz)."""
    if user.is_superadmin:
        return True
    roles = [r.slug for r in user.roles] if user.roles else []
    return "admin" in roles or "operador_matriz" in roles


def require_software_catalog_access(current_user: User = Depends(get_current_user)) -> User:
    """Garante que apenas administradores acessem o catálogo de aplicativos."""
    if not _is_admin_user(current_user):
        raise HTTPException(
            status_code=403,
            detail="Acesso não autorizado ao catálogo de aplicativos. Apenas administradores possuem permissão.",
        )
    return current_user


# =====================================================================
# Router do Catálogo Geral de Softwares (/api/v1/software)
# =====================================================================

router = APIRouter(
    prefix="/software",
    tags=["Software Catalog"],
    dependencies=[Depends(require_software_catalog_access)],
)


@router.get("", response_model=SoftwareCatalogResponse)
@router.get("/", response_model=SoftwareCatalogResponse)
def get_software_catalog(
    site_id: Optional[int] = Query(default=None, description="Filtra por loja/filial"),
    plataforma: Optional[str] = Query(default=None, description="Filtra por plataforma (linux | windows)"),
    categoria: Optional[str] = Query(default=None, description="Filtra por categoria (aplicativo, agente, runtime, ferramenta)"),
    search: Optional[str] = Query(default=None, description="Busca por nome ou identificador do software"),
    current_user: User = Depends(get_current_user),
):
    with Session(engine) as session:
        return obter_catalogo_softwares(
            db=session,
            current_user=current_user,
            site_id=site_id,
            plataforma=plataforma,
            categoria=categoria,
            search=search,
        )


@router.get("/{software_id}/devices", response_model=SoftwareDevicesResponse)
def get_software_devices(
    software_id: int,
    site_id: Optional[int] = Query(default=None, description="Filtra por loja/filial"),
    plataforma: Optional[str] = Query(default=None, description="Filtra por plataforma (linux | windows)"),
    versao: Optional[str] = Query(default=None, description="Filtra por versão específica do software"),
    search: Optional[str] = Query(default=None, description="Busca por hostname, IP, MAC ou patrimônio"),
    current_user: User = Depends(get_current_user),
):
    with Session(engine) as session:
        return obter_dispositivos_software(
            db=session,
            current_user=current_user,
            software_id=software_id,
            site_id=site_id,
            plataforma=plataforma,
            versao=versao,
            search=search,
        )


@router.get("/devices-without-apps")
def get_devices_without_apps(
    site_id: Optional[int] = None,
    plataforma: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    per_page: int = 25,
    current_user: User = Depends(get_current_user),
):
    """Retorna estações de trabalho que não possuem nenhum software inventariado instalado."""
    from app.api.v1.devices import list_devices
    return list_devices(
        search=search if isinstance(search, str) else None,
        site_id=site_id if isinstance(site_id, int) else None,
        plataforma=plataforma if isinstance(plataforma, str) else None,
        sem_apps=True,
        page=page if isinstance(page, int) else 1,
        per_page=per_page if isinstance(per_page, int) else 25,
        current_user=current_user,
    )


@router.get("/devices-with-apps")
def get_devices_with_apps(
    site_id: Optional[int] = None,
    plataforma: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    per_page: int = 25,
    current_user: User = Depends(get_current_user),
):
    """Retorna estações de trabalho que possuem softwares inventariados instalados."""
    from app.api.v1.devices import list_devices
    return list_devices(
        search=search if isinstance(search, str) else None,
        site_id=site_id if isinstance(site_id, int) else None,
        plataforma=plataforma if isinstance(plataforma, str) else None,
        com_apps=True,
        page=page if isinstance(page, int) else 1,
        per_page=per_page if isinstance(per_page, int) else 25,
        current_user=current_user,
    )


# =====================================================================
# Router de Compatibilidade para Dispositivos (/api/v1/devices/{id}/software)
# =====================================================================

device_software_router = APIRouter(
    prefix="/devices",
    tags=["Device Software"],
)


@device_software_router.get("/{device_id}/software", response_model=DeviceSoftwareListResponse)
def list_device_software(
    device_id: int,
    current_user: User = Depends(get_current_user),
):
    """
    Retorna a lista completa de softwares e respectivos pacotes instalados em um dispositivo,
    com resolução de pacotes em lote (otimização contra N+1) e controle de acesso por filial.
    """
    with Session(engine) as session:
        device_query = select(Device).where(
            Device.id == device_id,
            Device.company_id == current_user.company_id,
        )

        if not _is_global_user(current_user):
            allowed_sites = (
                select(user_site_access.c.site_id)
                .where(user_site_access.c.user_id == current_user.id)
            )
            device_query = device_query.where(Device.site_id.in_(allowed_sites))

        device = session.scalar(device_query)
        if device is None:
            raise HTTPException(
                status_code=404,
                detail="Dispositivo não encontrado.",
            )

        rows = session.execute(
            select(DeviceSoftware, Software)
            .join(Software, Software.id == DeviceSoftware.software_id)
            .where(
                DeviceSoftware.device_id == device.id,
                DeviceSoftware.installed.is_(True),
            )
            .order_by(Software.nome)
        ).all()

        if not rows and device.extra_data and isinstance(device.extra_data, dict):
            sincronizar_software_dispositivo(session, device, device.extra_data, device.data_coleta)
            session.commit()
            rows = session.execute(
                select(DeviceSoftware, Software)
                .join(Software, Software.id == DeviceSoftware.software_id)
                .where(
                    DeviceSoftware.device_id == device.id,
                    DeviceSoftware.installed.is_(True),
                )
                .order_by(Software.nome)
            ).all()

        device_software_ids = [ds.id for ds, _ in rows]

        packages_by_device_software: Dict[int, List[Dict[str, Any]]] = {}
        if device_software_ids:
            package_rows = session.scalars(
                select(SoftwarePackage)
                .where(SoftwarePackage.device_software_id.in_(device_software_ids))
                .order_by(SoftwarePackage.pacote)
            ).all()

            for pkg in package_rows:
                packages_by_device_software.setdefault(pkg.device_software_id, []).append({
                    "id": pkg.id,
                    "pacote": pkg.pacote,
                    "versao": pkg.versao,
                    "first_seen_at": pkg.first_seen_at,
                    "last_seen_at": pkg.last_seen_at,
                })

        items = []
        for device_software, software in rows:
            pkgs = packages_by_device_software.get(device_software.id, [])
            items.append({
                "id": software.identifier,
                "software_id": software.id,
                "identifier": software.identifier,
                "nome": software.nome,
                "tipo": software.tipo or "aplicativo",
                "origem": software.origem or "",
                "installed": device_software.installed,
                "first_seen_at": device_software.first_seen_at,
                "last_seen_at": device_software.last_seen_at,
                "packages": pkgs,
                "pacotes": pkgs,
            })

        return {
            "device": {
                "id": device.id,
                "hostname": device.hostname,
                "site_id": device.site_id,
                "ip": device.ip,
                "mac": device.mac,
            },
            "software": items,
            "total": len(items),
        }
