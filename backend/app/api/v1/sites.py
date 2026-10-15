from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies.auth import get_current_user
from app.database import engine
from app.models import (
    Device,
    NetworkAsset,
    Site,
    SiteIdentifier,
    User,
    user_site_access,
)
from app.schemas.site import (
    ReclassifiedDeviceItem,
    SiteCreate,
    SiteReclassifyRequest,
    SiteReclassifyResponse,
    SiteResponse,
    SiteSimulationRequest,
    SiteSimulationResponse,
    SiteUpdate,
)
from app.services.inventory_service import (
    identificar_site,
    simular_identificacao_site,
)

router = APIRouter(
    prefix="/sites",
    tags=["Sites"],
)


def _check_admin(user: User):
    is_admin = user.is_superadmin or any(
        r.slug == "admin" for r in (user.roles or [])
    )
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores do sistema.",
        )


@router.get(
    "",
    response_model=List[SiteResponse],
)
@router.get(
    "/",
    response_model=List[SiteResponse],
    include_in_schema=False,
)
def list_sites(

    include_inactive: bool = Query(False),
    current_user: User = Depends(get_current_user),
):
    with Session(engine) as session:
        is_admin = current_user.is_superadmin or any(
            r.slug == "admin" for r in (current_user.roles or [])
        )

        query = (
            select(Site)
            .options(selectinload(Site.identifiers))
            .where(Site.company_id == current_user.company_id)
        )

        if not is_admin:
            query = (
                query.join(
                    user_site_access,
                    user_site_access.c.site_id == Site.id,
                )
                .where(
                    Site.active.is_(True),
                    user_site_access.c.user_id == current_user.id,
                )
            )
        elif not include_inactive:
            query = query.where(Site.active.is_(True))

        sites = session.scalars(query.order_by(Site.code)).all()

        # Obter contagens agrupadas por site_id
        device_counts = dict(
            session.execute(
                select(Device.site_id, func.count(Device.id))
                .where(
                    Device.company_id == current_user.company_id,
                    Device.active.is_(True),
                )
                .group_by(Device.site_id)
            ).all()
        )

        asset_counts = dict(
            session.execute(
                select(NetworkAsset.site_id, func.count(NetworkAsset.id))
                .where(
                    NetworkAsset.company_id == current_user.company_id,
                )
                .group_by(NetworkAsset.site_id)
            ).all()
        )

        return [
            SiteResponse(
                id=s.id,
                company_id=s.company_id,
                name=s.name,
                code=s.code,
                active=s.active,
                identifiers=[
                    ident.identifier
                    for ident in (s.identifiers or [])
                    if ident.active
                ],
                devices_count=device_counts.get(s.id, 0),
                network_assets_count=asset_counts.get(s.id, 0),
            )
            for s in sites
        ]


@router.post(
    "",
    response_model=SiteResponse,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/",
    response_model=SiteResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def create_site(

    payload: SiteCreate,
    current_user: User = Depends(get_current_user),
):
    _check_admin(current_user)

    code = payload.code.strip().upper()
    name = payload.name.strip()

    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O código da loja é obrigatório.",
        )
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O nome da loja é obrigatório.",
        )

    with Session(engine) as session:
        existing = session.scalar(
            select(Site).where(
                Site.company_id == current_user.company_id,
                Site.code == code,
            )
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe uma filial cadastrada com o código '{code}'.",
            )

        site = Site(
            company_id=current_user.company_id,
            name=name,
            code=code,
            active=payload.active,
        )
        session.add(site)
        session.flush()

        seen = set()
        saved_idents: List[str] = []
        for ident_raw in payload.identifiers:
            ident = ident_raw.strip().upper()
            if ident and ident not in seen:
                seen.add(ident)
                session.add(
                    SiteIdentifier(
                        company_id=current_user.company_id,
                        site_id=site.id,
                        identifier=ident,
                        active=True,
                    )
                )
                saved_idents.append(ident)

        session.commit()
        session.refresh(site)

        return SiteResponse(
            id=site.id,
            company_id=site.company_id,
            name=site.name,
            code=site.code,
            active=site.active,
            identifiers=saved_idents,
            devices_count=0,
            network_assets_count=0,
        )


@router.put(
    "/{site_id}",
    response_model=SiteResponse,
)
def update_site(
    site_id: int,
    payload: SiteUpdate,
    current_user: User = Depends(get_current_user),
):
    _check_admin(current_user)

    with Session(engine) as session:
        site = session.scalar(
            select(Site)
            .options(selectinload(Site.identifiers))
            .where(
                Site.id == site_id,
                Site.company_id == current_user.company_id,
            )
        )
        if not site:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Loja não encontrada.",
            )

        if payload.code is not None:
            new_code = payload.code.strip().upper()
            if not new_code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="O código não pode ser vazio.",
                )
            if new_code != site.code:
                conflict = session.scalar(
                    select(Site).where(
                        Site.company_id == current_user.company_id,
                        Site.code == new_code,
                        Site.id != site.id,
                    )
                )
                if conflict:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"O código '{new_code}' já está sendo utilizado por outra filial.",
                    )
                site.code = new_code

        if payload.name is not None:
            new_name = payload.name.strip()
            if not new_name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="O nome da loja não pode ser vazio.",
                )
            site.name = new_name

        if payload.active is not None:
            site.active = payload.active

        if payload.identifiers is not None:
            session.execute(
                delete(SiteIdentifier).where(
                    SiteIdentifier.site_id == site.id,
                )
            )
            seen = set()
            for ident_raw in payload.identifiers:
                ident = ident_raw.strip().upper()
                if ident and ident not in seen:
                    seen.add(ident)
                    session.add(
                        SiteIdentifier(
                            company_id=current_user.company_id,
                            site_id=site.id,
                            identifier=ident,
                            active=True,
                        )
                    )

        session.commit()
        session.refresh(site)

        # Atualizar contagens
        dev_count = session.scalar(
            select(func.count(Device.id)).where(
                Device.company_id == current_user.company_id,
                Device.site_id == site.id,
                Device.active.is_(True),
            )
        ) or 0

        asset_count = session.scalar(
            select(func.count(NetworkAsset.id)).where(
                NetworkAsset.company_id == current_user.company_id,
                NetworkAsset.site_id == site.id,
            )
        ) or 0

        # Recarregar identifiers
        current_idents = session.scalars(
            select(SiteIdentifier.identifier)
            .where(
                SiteIdentifier.site_id == site.id,
                SiteIdentifier.active.is_(True),
            )
            .order_by(SiteIdentifier.identifier)
        ).all()

        return SiteResponse(
            id=site.id,
            company_id=site.company_id,
            name=site.name,
            code=site.code,
            active=site.active,
            identifiers=list(current_idents),
            devices_count=dev_count,
            network_assets_count=asset_count,
        )


@router.delete(
    "/{site_id}",
)
def delete_site(
    site_id: int,
    current_user: User = Depends(get_current_user),
):
    _check_admin(current_user)

    with Session(engine) as session:
        site = session.scalar(
            select(Site).where(
                Site.id == site_id,
                Site.company_id == current_user.company_id,
            )
        )
        if not site:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Loja não encontrada.",
            )

        dev_count = session.scalar(
            select(func.count(Device.id)).where(
                Device.company_id == current_user.company_id,
                Device.site_id == site.id,
            )
        ) or 0

        asset_count = session.scalar(
            select(func.count(NetworkAsset.id)).where(
                NetworkAsset.company_id == current_user.company_id,
                NetworkAsset.site_id == site.id,
            )
        ) or 0

        if dev_count > 0 or asset_count > 0:
            site.active = False
            session.commit()
            return {
                "detail": (
                    f"A loja '{site.name}' possui {dev_count} equipamento(s) e "
                    f"{asset_count} ativo(s) de rede vinculados. Por segurança histórica, "
                    f"ela foi DESATIVADA em vez de excluída."
                ),
                "deactivated": True,
            }

        session.delete(site)
        session.commit()
        return {
            "detail": f"Loja '{site.name}' e seus padrões foram excluídos com sucesso.",
            "deactivated": False,
        }


@router.post(
    "/simulate",
    response_model=SiteSimulationResponse,
)
def simulate_match(
    payload: SiteSimulationRequest,
    current_user: User = Depends(get_current_user),
):
    with Session(engine) as session:
        result = simular_identificacao_site(
            hostname=payload.hostname,
            company_id=current_user.company_id,
            db=session,
            loja=payload.loja,
        )
        return SiteSimulationResponse(**result)


@router.post(
    "/reclassify",
    response_model=SiteReclassifyResponse,
)
def reclassify_sites(
    payload: SiteReclassifyRequest,
    current_user: User = Depends(get_current_user),
):
    _check_admin(current_user)

    with Session(engine) as session:
        query = select(Device).where(
            Device.company_id == current_user.company_id,
            Device.active.is_(True),
        )

        if payload.only_unassigned:
            outros_site = session.scalar(
                select(Site).where(
                    Site.company_id == current_user.company_id,
                    Site.code == "OUTROS",
                )
            )
            outros_id = outros_site.id if outros_site else None
            if outros_id:
                query = query.where(
                    (Device.site_id.is_(None)) | (Device.site_id == outros_id)
                )
            else:
                query = query.where(Device.site_id.is_(None))
        elif payload.site_id:
            query = query.where(Device.site_id == payload.site_id)

        devices = session.scalars(query).all()

        # Cache dos nomes das lojas
        all_sites = session.scalars(
            select(Site).where(Site.company_id == current_user.company_id)
        ).all()
        sites_map = {s.id: s.name for s in all_sites}

        changes: List[ReclassifiedDeviceItem] = []

        for dev in devices:
            matched_site = identificar_site(
                hostname=dev.hostname or "",
                company_id=current_user.company_id,
                db=session,
            )

            if matched_site and matched_site.id != dev.site_id:
                old_name = sites_map.get(dev.site_id, "Sem Loja / OUTROS") if dev.site_id else "Sem Loja"
                changes.append(
                    ReclassifiedDeviceItem(
                        device_id=dev.id,
                        hostname=dev.hostname or "Sem Hostname",
                        old_site=old_name,
                        new_site=matched_site.name,
                    )
                )
                dev.site_id = matched_site.id

        session.commit()

        return SiteReclassifyResponse(
            total_scanned=len(devices),
            total_reclassified=len(changes),
            changes=changes,
        )
