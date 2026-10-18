from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.database import engine
from app.models.user import User
from app.schemas.software_license import (
    LicenseAssignIn,
    LicenseAvailableOut,
    LicenseCreate,
    LicenseDeviceItem,
    LicenseOut,
    LicenseStatsOut,
    LicenseUpdate,
)
from app.services.license_service import (
    atribuir_licenca_ativo,
    atualizar_licenca,
    criar_licenca,
    excluir_licenca,
    listar_licencas,
    listar_licencas_disponiveis,
    obter_computadores_vinculados,
    obter_estatisticas_licencas,
)

def check_admin_license_permission(user: User = Depends(get_current_user)) -> User:
    if user.is_superadmin:
        return user
    role_slugs = [r.slug for r in user.roles] if user.roles else []
    if "admin" in role_slugs:
        return user
    raise HTTPException(
        status_code=403,
        detail="Acesso não autorizado. Apenas administradores possuem acesso à gestão de licenças.",
    )


router = APIRouter(
    prefix="/licenses",
    tags=["Software Licenses"],
    dependencies=[Depends(check_admin_license_permission)],
)


def check_admin_write_permission(user: User):
    if user.is_superadmin:
        return
    role_slugs = [r.slug for r in user.roles] if user.roles else []
    if "admin" in role_slugs:
        return
    raise HTTPException(
        status_code=403,
        detail="Apenas administradores possuem permissão para cadastrar, editar ou excluir lotes de licenças.",
    )


@router.get("", response_model=List[LicenseOut])
@router.get("/", response_model=List[LicenseOut])
def get_licenses(
    site_id: Optional[int] = Query(default=None, description="Filtra por loja/filial"),
    categoria: Optional[str] = Query(default=None, description="Filtra por categoria (windows, office, outro)"),
    status: Optional[str] = Query(default=None, description="todas | disponiveis | esgotadas"),
    search: Optional[str] = Query(default=None, description="Busca por chave, software, NF ou obs"),
    software_nome: Optional[str] = Query(default=None, description="Filtra por software específico"),
    current_user: User = Depends(get_current_user),
):
    with Session(engine) as db:
        return listar_licencas(
            db=db,
            current_user=current_user,
            site_id=site_id,
            categoria=categoria,
            status=status,
            search=search,
            software_nome=software_nome,
        )


@router.get("/stats", response_model=LicenseStatsOut)
def get_license_stats(
    site_id: Optional[int] = Query(default=None, description="Filtra estatísticas por loja"),
    current_user: User = Depends(get_current_user),
):
    with Session(engine) as db:
        return obter_estatisticas_licencas(
            db=db,
            current_user=current_user,
            site_id=site_id,
        )


@router.get("/available", response_model=List[LicenseAvailableOut])
def get_available_licenses(
    categoria: Optional[str] = Query(default=None, description="windows | office"),
    site_id: Optional[int] = Query(default=None, description="Filial para busca"),
    chave_atual: Optional[str] = Query(default=None, description="Chave atualmente atribuída (sempre incluída)"),
    current_user: User = Depends(get_current_user),
):
    with Session(engine) as db:
        return listar_licencas_disponiveis(
            db=db,
            current_user=current_user,
            categoria=categoria,
            site_id=site_id,
            chave_atual=chave_atual,
        )


@router.get("/{license_id}/devices", response_model=List[LicenseDeviceItem])
def get_license_devices(
    license_id: int,
    current_user: User = Depends(get_current_user),
):
    with Session(engine) as db:
        return obter_computadores_vinculados(
            db=db,
            current_user=current_user,
            license_id=license_id,
        )


@router.post("", response_model=LicenseOut)
@router.post("/", response_model=LicenseOut)
def post_license(
    payload: LicenseCreate,
    current_user: User = Depends(get_current_user),
):
    check_admin_write_permission(current_user)
    with Session(engine) as db:
        return criar_licenca(db=db, current_user=current_user, data=payload)


@router.put("/{license_id}", response_model=LicenseOut)
def put_license(
    license_id: int,
    payload: LicenseUpdate,
    current_user: User = Depends(get_current_user),
):
    check_admin_write_permission(current_user)
    with Session(engine) as db:
        return atualizar_licenca(db=db, current_user=current_user, license_id=license_id, data=payload)


@router.delete("/{license_id}")
def delete_license(
    license_id: int,
    current_user: User = Depends(get_current_user),
):
    check_admin_write_permission(current_user)
    with Session(engine) as db:
        return excluir_licenca(db=db, current_user=current_user, license_id=license_id)


@router.post("/assign")
def assign_license(
    payload: LicenseAssignIn,
    current_user: User = Depends(get_current_user),
):
    # Qualquer operador matriz ou admin pode atribuir/desvincular serial
    with Session(engine) as db:
        return atribuir_licenca_ativo(db=db, current_user=current_user, data=payload)
