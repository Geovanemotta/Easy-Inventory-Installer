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


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get("/summary")
def dashboard_summary(
    current_user: User = Depends(get_current_user),
):
    with Session(engine) as session:

        # -----------------------------------------
        # DEVICES VISÍVEIS PARA O USUÁRIO
        # -----------------------------------------

        device_filter = [
            Device.company_id == current_user.company_id,
        ]

        if not current_user.is_superadmin:
            allowed_sites = (
                select(user_site_access.c.site_id)
                .where(
                    user_site_access.c.user_id == current_user.id
                )
            )

            device_filter.append(
                Device.site_id.in_(allowed_sites)
            )

        # -----------------------------------------
        # TOTAL DE DEVICES
        # -----------------------------------------

        total_devices = session.scalar(
            select(func.count(Device.id))
            .where(*device_filter)
        ) or 0

        active_devices = session.scalar(
            select(func.count(Device.id))
            .where(
                *device_filter,
                Device.active.is_(True),
            )
        ) or 0

        # -----------------------------------------
        # TOTAL DE SITES VISÍVEIS
        # -----------------------------------------

        if current_user.is_superadmin:

            total_sites = session.scalar(
                select(func.count(Site.id))
                .where(
                    Site.company_id == current_user.company_id,
                    Site.active.is_(True),
                )
            ) or 0

        else:

            total_sites = session.scalar(
                select(func.count(Site.id))
                .where(
                    Site.company_id == current_user.company_id,
                    Site.active.is_(True),
                    Site.id.in_(
                        select(user_site_access.c.site_id)
                        .where(
                            user_site_access.c.user_id
                            == current_user.id
                        )
                    ),
                )
            ) or 0

        # -----------------------------------------
        # SOFTWARES UTILIZADOS NOS DEVICES
        # -----------------------------------------

        total_software = session.scalar(
            select(
                func.count(
                    func.distinct(DeviceSoftware.software_id)
                )
            )
            .join(
                Device,
                Device.id == DeviceSoftware.device_id,
            )
            .where(
                *device_filter,
                DeviceSoftware.installed.is_(True),
            )
        ) or 0

        # -----------------------------------------
        # DEVICES POR SITE
        # -----------------------------------------

        devices_by_site_rows = session.execute(
            select(
                Site.id,
                Site.name,
                Site.code,
                func.count(Device.id),
            )
            .join(
                Device,
                Device.site_id == Site.id,
                isouter=True,
            )
            .where(
                Site.company_id == current_user.company_id,
                Site.active.is_(True),
                (
                    Site.id.in_(
                        select(user_site_access.c.site_id)
                        .where(
                            user_site_access.c.user_id
                            == current_user.id
                        )
                    )
                    if not current_user.is_superadmin
                    else True
                ),
            )
            .group_by(
                Site.id,
                Site.name,
                Site.code,
            )
            .order_by(
                Site.code
            )
        ).all()

        devices_by_site = [
            {
                "site_id": site_id,
                "site": site_name,
                "code": site_code,
                "total": total,
            }
            for (
                site_id,
                site_name,
                site_code,
                total,
            ) in devices_by_site_rows
        ]

        # -----------------------------------------
        # DEVICES POR VERSÃO DO SISTEMA
        # -----------------------------------------

        devices_by_version_rows = session.execute(
            select(
                Device.versao,
                func.count(Device.id),
            )
            .where(
                *device_filter,
            )
            .group_by(
                Device.versao,
            )
            .order_by(
                func.count(Device.id).desc()
            )
        ).all()

        devices_by_version = [
            {
                "versao": version or "Não informado",
                "total": total,
            }
            for version, total in devices_by_version_rows
        ]

        # -----------------------------------------
        # DEVICES POR STATUS
        # -----------------------------------------

        devices_by_status_rows = session.execute(
            select(
                Device.status,
                func.count(Device.id),
            )
            .where(
                *device_filter,
            )
            .group_by(
                Device.status,
            )
            .order_by(
                func.count(Device.id).desc()
            )
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
