from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.database import engine
from app.models.user import User
from app.schemas.network_asset import (
    BulkDeleteIn,
    ImportResultOut,
    NetworkAssetCreate,
    NetworkAssetOut,
    NetworkAssetUpdate,
    PingResultOut,
)
from app.services.network_asset_service import (
    atualizar_network_asset,
    criar_network_asset,
    excluir_network_asset,
    excluir_network_assets_lote,
    gerar_csv_modelo,
    listar_network_assets,
    ping_asset_by_id,
    processar_csv_importacao,
    scan_assets_batch,
)

router = APIRouter(
    prefix="/network-assets",
    tags=["Network Assets"],
)


@router.get("", response_model=List[NetworkAssetOut])
@router.get("/", response_model=List[NetworkAssetOut])
def get_assets(
    site_id: Optional[int] = Query(default=None, description="Filtra por loja/filial"),
    tipo: Optional[str] = Query(default=None, description="Filtra por tipo (Impressora, Switch, Roteador, AP, etc.)"),
    status_online: Optional[bool] = Query(default=None, description="Filtra por status de conexão"),
    search: Optional[str] = Query(default=None, description="Busca por nome, IP, MAC, patrimônio, modelo"),
    current_user: User = Depends(get_current_user),
):
    with Session(engine) as session:
        return listar_network_assets(
            db=session,
            current_user=current_user,
            site_id=site_id,
            tipo=tipo,
            status_online=status_online,
            search=search,
        )


def check_admin_write_permission(user: User):
    if user.is_superadmin:
        return
    role_slugs = [r.slug for r in user.roles] if user.roles else []
    if "admin" in role_slugs:
        return
    raise HTTPException(
        status_code=403,
        detail="Apenas administradores possuem permissão para criar, alterar ou excluir ativos de rede.",
    )


@router.post("", response_model=NetworkAssetOut)
@router.post("/", response_model=NetworkAssetOut)
def create_asset(
    data: NetworkAssetCreate,
    current_user: User = Depends(get_current_user),
):
    check_admin_write_permission(current_user)
    with Session(engine) as session:
        return criar_network_asset(
            db=session,
            current_user=current_user,
            data=data,
        )


@router.put("/{asset_id}", response_model=NetworkAssetOut)
def update_asset(
    asset_id: int,
    data: NetworkAssetUpdate,
    current_user: User = Depends(get_current_user),
):
    check_admin_write_permission(current_user)
    with Session(engine) as session:
        res = atualizar_network_asset(
            db=session,
            current_user=current_user,
            asset_id=asset_id,
            data=data,
        )
        if not res:
            raise HTTPException(status_code=404, detail="Ativo de rede não encontrado")
        return res


@router.delete("/{asset_id}")
def delete_asset(
    asset_id: int,
    current_user: User = Depends(get_current_user),
):
    check_admin_write_permission(current_user)
    with Session(engine) as session:
        ok = excluir_network_asset(
            db=session,
            current_user=current_user,
            asset_id=asset_id,
        )
        if not ok:
            raise HTTPException(status_code=404, detail="Ativo de rede não encontrado")
        return {"success": True, "message": "Ativo excluído com sucesso"}


@router.post("/bulk-delete")
def bulk_delete_assets(
    payload: BulkDeleteIn,
    current_user: User = Depends(get_current_user),
):
    check_admin_write_permission(current_user)
    with Session(engine) as session:
        removidos = excluir_network_assets_lote(
            db=session,
            current_user=current_user,
            ids=payload.ids,
        )
        return {"success": True, "removidos": removidos}


@router.post("/{asset_id}/ping", response_model=PingResultOut)
async def ping_asset(
    asset_id: int,
    current_user: User = Depends(get_current_user),
):
    with Session(engine) as session:
        res = await ping_asset_by_id(
            db=session,
            current_user=current_user,
            asset_id=asset_id,
        )
        if not res:
            raise HTTPException(
                status_code=404,
                detail="Ativo de rede não encontrado ou sem endereço IP cadastrado",
            )
        return res


@router.post("/scan-batch", response_model=List[PingResultOut])
async def scan_batch(
    site_id: Optional[int] = Query(default=None, description="Filtra por loja para testar conectividade em lote"),
    current_user: User = Depends(get_current_user),
):
    check_admin_write_permission(current_user)
    with Session(engine) as session:
        return await scan_assets_batch(
            db=session,
            current_user=current_user,
            site_id=site_id,
        )


@router.post("/import-csv", response_model=ImportResultOut)
async def import_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    check_admin_write_permission(current_user)
    try:
        raw_bytes = await file.read()
        try:
            csv_text = raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            csv_text = raw_bytes.decode("latin-1")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao ler arquivo enviado: {str(e)}")

    with Session(engine) as session:
        return processar_csv_importacao(
            db=session,
            current_user=current_user,
            csv_content=csv_text,
        )


@router.get("/template-csv")
def download_template():
    csv_text = gerar_csv_modelo()
    return Response(
        content=csv_text,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="modelo_ativos_rede.csv"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )
