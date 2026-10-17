from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
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
from app.schemas.software import (
    DeviceSoftwareHeader,
    DeviceSoftwareItem,
    DeviceSoftwareListResponse,
    SoftwarePackageItem,
)


router = APIRouter(
    prefix="/devices",
    tags=["Software"],
)


def _is_global_user(user: User) -> bool:
    """Verifica se o usuário possui escopo global (superadmin, admin ou operador da matriz)."""
    if user.is_superadmin:
        return True
    roles = [r.slug for r in user.roles] if user.roles else []
    return any(r in ("admin", "operador_matriz") for r in roles)


@router.get("/{device_id}/software")
def list_device_software(
    device_id: int,
    current_user: User = Depends(get_current_user),
):
    """
    Retorna a lista completa de softwares e respectivos pacotes instalados em um dispositivo,
    com resolução de pacotes em lote (otimização contra N+1) e controle de acesso por filial.
    """
    with Session(engine) as session:

        # -----------------------------------------
        # 1. DISPOSITIVO + AUTORIZAÇÃO
        # -----------------------------------------
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

        # -----------------------------------------
        # 2. SOFTWARES INSTALADOS NO DISPOSITIVO
        # -----------------------------------------
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

        # -----------------------------------------
        # 3. CARREGAMENTO DOS PACOTES EM LOTE (Evita N+1)
        # -----------------------------------------
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

        # -----------------------------------------
        # 4. CONSOLIDAÇÃO DO PAYLOAD DE RESPOSTA
        # -----------------------------------------
        items = []
        for device_software, software in rows:
            items.append({
                "software_id": software.id,
                "identifier": software.identifier,
                "nome": software.nome,
                "tipo": software.tipo,
                "origem": software.origem,
                "installed": device_software.installed,
                "first_seen_at": device_software.first_seen_at,
                "last_seen_at": device_software.last_seen_at,
                "packages": packages_by_device_software.get(device_software.id, []),
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
