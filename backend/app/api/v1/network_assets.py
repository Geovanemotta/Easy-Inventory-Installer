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
    NetworkAssetKPIs,
    NetworkAssetListResponse,
    NetworkAssetOut,
    NetworkAssetUpdate,
    PingResultOut,
    ScanBatchIn,
    SiteIpRangeCreate,
    SiteIpRangeOut,
    SiteIpRangeUpdate,
    SweeperStatusOut,
    SweeperToggleIn,
)
from app.services.network_asset_service import (
    atualizar_ip_range,
    atualizar_network_asset,
    calcular_kpis_network_assets,
    criar_ip_range,
    criar_network_asset,
    excluir_ip_range,
    excluir_network_asset,
    excluir_network_assets_lote,
    gerar_csv_modelo,
    get_sweeper_status,
    listar_ip_ranges,
    listar_network_assets,
    ping_asset_by_id,
    ping_direct,
    processar_csv_importacao,
    registrar_priority_site,
    scan_assets_batch,
    toggle_sweeper,
)

router = APIRouter(
    prefix="/network-assets",
    tags=["Network Assets"],
)


def check_admin_write_permission(user: User):
    if user.is_superadmin:
        return
    role_slugs = [r.slug for r in user.roles] if user.roles else []
    if "admin" in role_slugs:
        return
    raise HTTPException(
        status_code=403,
        detail="Apenas administradores possuem permissão para criar, alterar ou excluir ativos e faixas de rede.",
    )


@router.get("", response_model=NetworkAssetListResponse)
@router.get("/", response_model=NetworkAssetListResponse)
def get_assets(
    site_id: Optional[int] = Query(default=None, description="Filtra por loja/filial"),
    tipo: Optional[str] = Query(default=None, description="Filtra por tipo (Impressora, Switch, Estação, etc.)"),
    status_online: Optional[bool] = Query(default=None, description="Filtra por status de conexão"),
    search: Optional[str] = Query(default=None, description="Busca por nome, IP, MAC, patrimônio, modelo"),
    filtro_ocupacao: Optional[str] = Query(default=None, description="Filtra por ocupação (todos, ocupados, livres, estacoes, ativos)"),
    faixa_id: Optional[int] = Query(default=None, description="Filtra por ID de faixa de IP específica"),
    grupo: Optional[str] = Query(default=None, description="Filtra por grupo (impressora, rede, wifi)"),
    page: int = Query(default=1, ge=1, description="Número da página"),
    per_page: int = Query(default=50, ge=1, le=5000, description="Itens por página"),
    sort_by: Optional[str] = Query(default="ip", description="Campo de ordenação (ip, filial, nome, tipo, patrimonio, mac, vlan, status)"),
    sort_dir: Optional[str] = Query(default="asc", description="Direção da ordenação (asc/desc)"),
    export_all: bool = Query(default=False, description="Retorna todos os itens para exportação"),
    current_user: User = Depends(get_current_user),
):
    if site_id:
        registrar_priority_site(site_id)
    with Session(engine) as session:
        return listar_network_assets(
            db=session,
            current_user=current_user,
            site_id=site_id,
            tipo=tipo,
            status_online=status_online,
            search=search,
            filtro_ocupacao=filtro_ocupacao,
            faixa_id=faixa_id,
            grupo=grupo,
            page=page,
            per_page=per_page,
            sort_by=sort_by,
            sort_dir=sort_dir,
            export_all=export_all,
        )


@router.get("/kpis", response_model=NetworkAssetKPIs)
def get_assets_kpis(
    site_id: Optional[int] = Query(default=None, description="Filtra KPIs por loja/filial"),
    faixa_id: Optional[int] = Query(default=None, description="Filtra KPIs por faixa de IP específica"),
    tipo: Optional[str] = Query(default=None, description="Filtra KPIs por tipo"),
    search: Optional[str] = Query(default=None, description="Filtra KPIs por busca"),
    filtro_ocupacao: Optional[str] = Query(default=None, description="Filtra KPIs por ocupação"),
    grupo: Optional[str] = Query(default=None, description="Filtra KPIs por grupo"),
    current_user: User = Depends(get_current_user),
):
    if site_id:
        registrar_priority_site(site_id)
    with Session(engine) as session:
        return calcular_kpis_network_assets(
            db=session,
            current_user=current_user,
            site_id=site_id,
            faixa_id=faixa_id,
            tipo=tipo,
            search=search,
            filtro_ocupacao=filtro_ocupacao,
            grupo=grupo,
        )


# ==============================================================================
# FAIXAS DE IP (IPAM / SUBNETS / VLANS)
# ==============================================================================

@router.get("/ranges", response_model=List[SiteIpRangeOut])
def get_ip_ranges(
    site_id: Optional[int] = Query(default=None, description="Filtra faixas por loja/filial"),
    current_user: User = Depends(get_current_user),
):
    with Session(engine) as session:
        return listar_ip_ranges(
            db=session,
            current_user=current_user,
            site_id=site_id,
        )


@router.post("/ranges", response_model=SiteIpRangeOut)
def create_ip_range_route(
    data: SiteIpRangeCreate,
    current_user: User = Depends(get_current_user),
):
    check_admin_write_permission(current_user)
    with Session(engine) as session:
        return criar_ip_range(
            db=session,
            current_user=current_user,
            data=data,
        )


@router.put("/ranges/{range_id}", response_model=SiteIpRangeOut)
def update_ip_range_route(
    range_id: int,
    data: SiteIpRangeUpdate,
    current_user: User = Depends(get_current_user),
):
    check_admin_write_permission(current_user)
    with Session(engine) as session:
        res = atualizar_ip_range(
            db=session,
            current_user=current_user,
            range_id=range_id,
            data=data,
        )
        if not res:
            raise HTTPException(status_code=404, detail="Faixa de IP não encontrada.")
        return res


@router.delete("/ranges/{range_id}")
def delete_ip_range_route(
    range_id: int,
    current_user: User = Depends(get_current_user),
):
    check_admin_write_permission(current_user)
    with Session(engine) as session:
        ok = excluir_ip_range(
            db=session,
            current_user=current_user,
            range_id=range_id,
        )
        if not ok:
            raise HTTPException(status_code=404, detail="Faixa de IP não encontrada.")
        return {"success": True, "message": "Faixa de IP excluída com sucesso."}


# ==============================================================================
# OPERAÇÕES ESPECIAIS (PING, IMPORTAÇÃO, LOTE)
# ==============================================================================

@router.post("/ping-ip", response_model=PingResultOut)
async def ping_direct_ip_route(
    ip: str = Query(..., min_length=7, description="Endereço IP para teste de conectividade"),
    current_user: User = Depends(get_current_user),
):
    with Session(engine) as session:
        return await ping_direct(ip, db=session, current_user=current_user)


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


@router.post("/scan-batch", response_model=List[PingResultOut])
async def scan_batch(
    payload: Optional[ScanBatchIn] = None,
    site_id: Optional[int] = Query(default=None, description="Filtra por loja para testar conectividade em lote"),
    current_user: User = Depends(get_current_user),
):
    check_admin_write_permission(current_user)
    with Session(engine) as session:
        effective_asset_ids = payload.asset_ids if payload and payload.asset_ids else None
        effective_site_id = (payload.site_id if payload and payload.site_id else None) or site_id
        effective_ips = payload.ips if payload and payload.ips else None
        return await scan_assets_batch(
            db=session,
            current_user=current_user,
            site_id=effective_site_id,
            asset_ids=effective_asset_ids,
            ips=effective_ips,
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


# ==============================================================================
# BACKGROUND PING SWEEPER STATUS & CONTROLE
# ==============================================================================

@router.get("/sweeper-status", response_model=SweeperStatusOut)
def get_sweeper_status_endpoint(
    current_user: User = Depends(get_current_user),
):
    return get_sweeper_status()


@router.post("/sweeper-toggle", response_model=SweeperStatusOut)
def toggle_sweeper_endpoint(
    payload: SweeperToggleIn,
    current_user: User = Depends(get_current_user),
):
    check_admin_write_permission(current_user)
    return toggle_sweeper(payload.enabled)


# ==============================================================================
# CRUD ATIVOS DE REDE INDIVIDUAIS
# ==============================================================================

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


@router.post("/ping-ip", response_model=PingResultOut)
async def ping_direct_ip_endpoint(
    ip: str = Query(..., description="Endereço IP para teste de ping direto"),
    current_user: User = Depends(get_current_user),
):
    with Session(engine) as session:
        return await ping_direct(
            ip=ip,
            db=session,
            current_user=current_user,
        )


@router.post("/{asset_id}/ping", response_model=PingResultOut)
async def ping_asset(
    asset_id: int,
    ip: Optional[str] = Query(default=None, description="IP opcional para teste de ping"),
    device_id: Optional[int] = Query(default=None, description="ID opcional de Device"),
    current_user: User = Depends(get_current_user),
):
    with Session(engine) as session:
        res = await ping_asset_by_id(
            db=session,
            current_user=current_user,
            asset_id=asset_id,
            ip=ip,
            device_id=device_id,
        )
        if not res:
            raise HTTPException(
                status_code=404,
                detail="Ativo de rede ou estação não encontrado ou sem endereço IP cadastrado",
            )
        return res

