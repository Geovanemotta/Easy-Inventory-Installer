from typing import Any, Dict, List

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.database import engine
from app.models import (
    Device,
    DeviceSoftware,
    Site,
    Software,
    User,
)
from app.models.user_site_access import user_site_access
from app.schemas.dashboard import (
    DashboardDevicesBySite,
    DashboardDevicesByStatus,
    DashboardDevicesByVersion,
    DashboardDevicesMetrics,
    DashboardSitesMetrics,
    DashboardSoftwareMetrics,
    DashboardSummaryResponse,
)


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


def _is_global_user(user: User) -> bool:
    """Verifica se o usuário possui escopo global (superadmin, admin ou operador da matriz)."""
    if user.is_superadmin:
        return True
    roles = [r.slug for r in user.roles] if user.roles else []
    return any(r in ("admin", "operador_matriz") for r in roles)


@router.get("/summary")
def dashboard_summary(
    current_user: User = Depends(get_current_user),
):
    """
    Retorna os indicadores consolidados do painel administrativo (dispositivos, filiais, softwares,
    distribuição por sistema operacional e por filial), respeitando as permissões de filial do usuário.
    """
    with Session(engine) as session:
        is_global = _is_global_user(current_user)

        # -----------------------------------------
        # 1. FILTROS DE ESCOPO (Empresa e Filiais Permitidas)
        # -----------------------------------------
        device_filter = [
            Device.company_id == current_user.company_id,
        ]
        site_filter = [
            Site.company_id == current_user.company_id,
            Site.active.is_(True),
        ]

        if not is_global:
            allowed_sites = (
                select(user_site_access.c.site_id)
                .where(user_site_access.c.user_id == current_user.id)
            )
            device_filter.append(Device.site_id.in_(allowed_sites))
            site_filter.append(Site.id.in_(allowed_sites))

        # -----------------------------------------
        # 2. MÉTRICAS GERAIS (Total de Devices e Ativos)
        # -----------------------------------------
        total_devices = session.scalar(
            select(func.count(Device.id)).where(*device_filter)
        ) or 0

        active_devices = session.scalar(
            select(func.count(Device.id)).where(
                *device_filter,
                Device.active.is_(True),
            )
        ) or 0

        total_sites = session.scalar(
            select(func.count(Site.id)).where(*site_filter)
        ) or 0

        # -----------------------------------------
        # 3. SOFTWARES DISTINTOS UTILIZADOS
        # -----------------------------------------
        total_software = session.scalar(
            select(func.count(func.distinct(DeviceSoftware.software_id)))
            .join(Device, Device.id == DeviceSoftware.device_id)
            .where(
                *device_filter,
                DeviceSoftware.installed.is_(True),
            )
        ) or 0

        # -----------------------------------------
        # 4. DISPOSITIVOS AGRUPADOS POR FILIAL
        # -----------------------------------------
        devices_by_site_rows = session.execute(
            select(
                Site.id,
                Site.name,
                Site.code,
                func.count(Device.id),
            )
            .join(Device, Device.site_id == Site.id, isouter=True)
            .where(*site_filter)
            .group_by(
                Site.id,
                Site.name,
                Site.code,
            )
            .order_by(Site.code)
        ).all()

        devices_by_site = [
            {
                "site_id": site_id,
                "site": site_name,
                "code": site_code,
                "total": total,
            }
            for site_id, site_name, site_code, total in devices_by_site_rows
        ]

        # -----------------------------------------
        # 5. DISPOSITIVOS POR VERSÃO DE SISTEMA OPERACIONAL
        # -----------------------------------------
        devices_by_version_rows = session.execute(
            select(
                Device.versao,
                func.count(Device.id),
            )
            .where(*device_filter)
            .group_by(Device.versao)
            .order_by(func.count(Device.id).desc())
        ).all()

        devices_by_version = [
            {
                "versao": version or "Não informado",
                "total": total,
            }
            for version, total in devices_by_version_rows
        ]

        # -----------------------------------------
        # 6. DISPOSITIVOS POR STATUS OPERACIONAL
        # -----------------------------------------
        devices_by_status_rows = session.execute(
            select(
                Device.status,
                func.count(Device.id),
            )
            .where(*device_filter)
            .group_by(Device.status)
            .order_by(func.count(Device.id).desc())
        ).all()

        devices_by_status = [
            {
                "status": status or "Não informado",
                "total": total,
            }
            for status, total in devices_by_status_rows
        ]

        return {
            "devices": {
                "total": total_devices,
                "active": active_devices,
            },
            "sites": {
                "total": total_sites,
            },
            "software": {
                "total": total_software,
            },
            "devices_by_site": devices_by_site,
            "devices_by_version": devices_by_version,
            "devices_by_status": devices_by_status,
        }
