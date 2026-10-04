from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.database import engine
from app.models import Device, User
from app.models.device_history import DeviceHistory
from app.models.user_site_access import user_site_access


router = APIRouter(
    prefix="/devices",
    tags=["Devices"],
)


@router.get("/")
def list_devices(
    search: str | None = Query(
        default=None,
        description="Busca por hostname, IP, MAC ou RustDesk ID.",
    ),
    site_id: int | None = Query(
        default=None,
        description="Filtra por site.",
    ),
    status: str | None = Query(
        default=None,
        description="Filtra pelo status do dispositivo.",
    ),
    page: int = Query(
        default=1,
        ge=1,
    ),
    per_page: int = Query(
        default=50,
        ge=1,
        le=200,
    ),
    current_user: User = Depends(get_current_user),
    sistema: str | None = None,
    versao: str | None = None,
):
    with Session(engine) as session:

        # ---------------------------------------------------------
        # Base: somente devices da empresa do usuário
        # ---------------------------------------------------------

        query = select(Device).where(
            Device.company_id == current_user.company_id,
        )

        count_query = select(
            func.count(Device.id)
        ).where(
            Device.company_id == current_user.company_id,
        )

        # ---------------------------------------------------------
        # Controle de acesso por site
        # ---------------------------------------------------------

        if not current_user.is_superadmin:

            allowed_sites = (
                select(user_site_access.c.site_id)
                .where(
                    user_site_access.c.user_id
                    == current_user.id
                )
            )

            query = query.where(
                Device.site_id.in_(allowed_sites)
            )

            count_query = count_query.where(
                Device.site_id.in_(allowed_sites)
            )

        # ---------------------------------------------------------
        # Filtro por site
        # ---------------------------------------------------------

        if site_id is not None:

            query = query.where(
                Device.site_id == site_id
            )

            count_query = count_query.where(
                Device.site_id == site_id
            )

        # ---------------------------------------------------------
        # Busca
        # ---------------------------------------------------------

        if search:

            termo = f"%{search.strip()}%"

            filtro_busca = or_(
                Device.hostname.ilike(termo),
                Device.ip.ilike(termo),
                Device.mac.ilike(termo),
                Device.rustdesk_id.ilike(termo),
            )

            query = query.where(filtro_busca)
            count_query = count_query.where(filtro_busca)

        # ---------------------------------------------------------
        # Status
        # ---------------------------------------------------------

        if status:

            query = query.where(
                Device.status == status
            )

            count_query = count_query.where(
                Device.status == status
            )

        # ---------------------------------------------------------
        # Sistema
        # ---------------------------------------------------------

        if sistema:

            query = query.where(
                Device.sistema == sistema
            )

            count_query = count_query.where(
                Device.sistema == sistema
            )

        # ---------------------------------------------------------
        # Versão
        # ---------------------------------------------------------

        if versao:

            query = query.where(
                Device.versao == versao
            )

            count_query = count_query.where(
                Device.versao == versao
            )

        # ---------------------------------------------------------
        # Total
        # ---------------------------------------------------------

        total = session.scalar(
            count_query
        ) or 0

        # ---------------------------------------------------------
        # Paginação
        # ---------------------------------------------------------

        offset = (page - 1) * per_page

        devices = session.scalars(
            query
            .order_by(Device.hostname)
            .offset(offset)
            .limit(per_page)
        ).all()

        # ---------------------------------------------------------
        # Resposta
        # ---------------------------------------------------------

        return {
            "items": [
                {
                    "id": device.id,
                    "company_id": device.company_id,
                    "site_id": device.site_id,
                    "hostname": device.hostname,
                    "loja": device.loja,
                    "ip": device.ip,
                    "mac": device.mac,
                    "sistema": device.sistema,
                    "versao": device.versao,
                    "status": device.status,
                    "processador": device.processador,
                    "ram_total": device.ram_total,
                    "disco_total": device.disco_total,
                    "disco_usado": device.disco_usado,
                    "disco_livre": device.disco_livre,
                    "disco_percentual": device.disco_percentual,
                    "rustdesk_id": device.rustdesk_id,
                    "data_coleta": device.data_coleta,
                    "active": device.active,
                    "created_at": device.created_at,
                    "updated_at": device.updated_at,
                }
                for device in devices
            ],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": (
                    (total + per_page - 1)
                    // per_page
                ),
            },
        }


@router.get("/{device_id}/history")
def get_device_history(
    device_id: int,
    current_user: User = Depends(get_current_user),
):
    """
    Retorna o histórico completo de alterações (drift) de um dispositivo.
    """
    with Session(engine) as session:
        device = session.scalar(
            select(Device).where(
                Device.id == device_id,
                Device.company_id == current_user.company_id,
            )
        )
        if not device:
            raise HTTPException(status_code=404, detail="Dispositivo não encontrado")

        histories = session.scalars(
            select(DeviceHistory)
            .where(DeviceHistory.device_id == device_id)
            .order_by(DeviceHistory.data_alteracao.desc())
        ).all()

        return [
            {
                "id": h.id,
                "campo": h.campo,
                "valor_anterior": h.valor_anterior,
                "valor_novo": h.valor_novo,
                "data_alteracao": h.data_alteracao.strftime("%d/%m/%Y %H:%M:%S") if h.data_alteracao else "",
            }
            for h in histories
        ]


@router.post("/{device_id}/clear-alert")
def clear_device_alert(
    device_id: int,
    current_user: User = Depends(get_current_user),
):
    """
    Limpa o alerta de hardware/MAC pendente de um dispositivo (exclusivo para Administrador).
    """
    if not current_user.is_superadmin:
        raise HTTPException(
            status_code=403,
            detail="Apenas administradores podem gerenciar e limpar alertas de hardware.",
        )

    with Session(engine) as session:
        device = session.scalar(
            select(Device).where(
                Device.id == device_id,
                Device.company_id == current_user.company_id,
            )
        )
        if not device:
            raise HTTPException(status_code=404, detail="Dispositivo não encontrado")

        antigo = device.alerta_hardware
        device.alerta_hardware = None

        if antigo:
            session.add(
                DeviceHistory(
                    device_id=device.id,
                    campo="ALERTA_RESOLVIDO",
                    valor_anterior=antigo[:1000],
                    valor_novo=f"Alerta resolvido pelo administrador {current_user.full_name or current_user.username}",
                )
            )

        session.commit()
        return {"status": "ok", "message": "Alerta resolvido com sucesso."}


@router.delete("/{device_id}")
def delete_device(
    device_id: int,
    current_user: User = Depends(get_current_user),
):
    """
    Exclui permanentemente um dispositivo e seu histórico do inventário (exclusivo para Administrador).
    """
    if not current_user.is_superadmin:
        raise HTTPException(
            status_code=403,
            detail="Apenas administradores podem excluir máquinas do inventário.",
        )

    with Session(engine) as session:
        device = session.scalar(
            select(Device).where(
                Device.id == device_id,
                Device.company_id == current_user.company_id,
            )
        )
        if not device:
            raise HTTPException(status_code=404, detail="Dispositivo não encontrado")

        hostname = device.hostname
        session.delete(device)
        session.commit()
        return {
            "status": "ok",
            "message": f"Máquina '{hostname}' excluída com sucesso do inventário.",
        }
