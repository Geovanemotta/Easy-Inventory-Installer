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


router = APIRouter(
    prefix="/devices",
    tags=["Software"],
)


@router.get("/{device_id}/software")
def list_device_software(
    device_id: int,
    current_user: User = Depends(get_current_user),
):
    with Session(engine) as session:

        # -----------------------------------------
        # DEVICE + AUTORIZAÇÃO
        # -----------------------------------------

        device_query = select(Device).where(
            Device.id == device_id,
            Device.company_id == current_user.company_id,
        )

        if not current_user.is_superadmin:
            allowed_sites = (
                select(user_site_access.c.site_id)
                .where(
                    user_site_access.c.user_id == current_user.id
                )
            )

            device_query = device_query.where(
                Device.site_id.in_(allowed_sites)
            )

        device = session.scalar(device_query)

        if device is None:
            raise HTTPException(
                status_code=404,
                detail="Dispositivo não encontrado.",
            )

        # -----------------------------------------
        # SOFTWARE
        # -----------------------------------------

        rows = session.execute(
            select(
                DeviceSoftware,
                Software,
            )
            .join(
                Software,
                Software.id == DeviceSoftware.software_id,
            )
            .where(
                DeviceSoftware.device_id == device.id,
                DeviceSoftware.installed.is_(True),
            )
            .order_by(
                Software.nome
            )
        ).all()

        items = []

        for device_software, software in rows:

            packages = session.scalars(
                select(SoftwarePackage)
                .where(
                    SoftwarePackage.device_software_id
                    == device_software.id
                )
                .order_by(
                    SoftwarePackage.pacote
                )
            ).all()

            items.append(
                {
                    "software_id": software.id,
                    "identifier": software.identifier,
                    "nome": software.nome,
                    "tipo": software.tipo,
                    "origem": software.origem,
                    "installed": device_software.installed,
                    "first_seen_at": device_software.first_seen_at,
                    "last_seen_at": device_software.last_seen_at,
                    "packages": [
                        {
                            "id": package.id,
                            "pacote": package.pacote,
                            "versao": package.versao,
                            "first_seen_at": package.first_seen_at,
                            "last_seen_at": package.last_seen_at,
                        }
                        for package in packages
                    ],
                }
            )

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
