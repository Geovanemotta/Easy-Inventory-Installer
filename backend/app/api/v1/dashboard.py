import math
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

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
    ChartSliceItem,
    DashboardChartsResponse,
    DashboardDevicesBySite,
    DashboardDevicesByStatus,
    DashboardDevicesByVersion,
    DashboardDevicesMetrics,
    DashboardSitesMetrics,
    DashboardSoftwareMetrics,
    DashboardSummaryResponse,
    ReportGroupItem,
    ReportMachineItem,
    ReportSummaryResponse,
)
from app.services.device_normalizer import (
    normalizar_capacidade_disco,
    normalizar_capacidade_ram,
    normalizar_fabricante_modelo,
    normalizar_processador,
    normalizar_status_operacional,
    normalizar_ram,
    normalizar_so,
    normalizar_tipo_armazenamento,
    normalizar_tipo_ram,
    tamanho_para_mb,
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


# =====================================================================
# ROTA DE RELATÓRIOS ANALÍTICOS (Agregação no Back-end)
# =====================================================================

CAMPOS_NOME: Dict[str, str] = {
    "processador": "Processador",
    "modelo": "Placa-mãe / modelo",
    "ram": "Memória RAM",
    "ram_tipo": "Tipo de memória RAM",
    "disco_tipo": "Tipo de Armazenamento — NVMe / SSD / HDD",
    "disco": "Tamanho do disco",
    "sistema": "Sistema operacional",
    "windows_release": "Versão Release Windows",
    "fabricante": "Fabricante",
    "dominio": "Domínio",
    "filial": "Filial",
    "status": "Status",
}


def _extrair_valor_campo(d: Device, campo: str) -> str:
    """Extrai e normaliza o valor do campo solicitado para o dispositivo."""
    if campo == "processador":
        return normalizar_processador(d.processador) or "Não informado"
    elif campo == "modelo":
        info_mod = normalizar_fabricante_modelo(d.fabricante, d.modelo)
        return info_mod.get("modelo_exibicao") or "Não informado"
    elif campo == "ram":
        info_ram = normalizar_ram(d.ram_total, d.ram_tipo)
        return info_ram.get("ram_total_formatada") or "Não informado"
    elif campo == "ram_tipo":
        return normalizar_tipo_ram(d.ram_tipo)
    elif campo == "disco_tipo":
        return normalizar_tipo_armazenamento(d)
    elif campo == "disco":
        return normalizar_capacidade_disco(d.disco_total) or "Não informado"
    elif campo == "sistema":
        info_so = normalizar_so(d.sistema, d.versao, d.build, d.windows_release)
        return info_so.get("so_formatado") or "Não informado"
    elif campo == "windows_release":
        is_win = bool(d.sistema and "windows" in d.sistema.lower()) or bool(d.versao and "windows" in d.versao.lower())
        if is_win:
            return f"Windows {d.windows_release}" if d.windows_release else "Versão anterior"
        return "Linux"
    elif campo == "fabricante":
        return d.fabricante or "Não informado"
    elif campo == "dominio":
        return d.dominio or "Não informado"
    elif campo == "filial":
        return d.site.name if d.site else "Não atribuída"
    elif campo == "status":
        info_so = normalizar_so(d.sistema, d.versao, d.build, d.windows_release)
        lbl, _, _ = normalizar_status_operacional(
            status=d.status,
            sistema=d.sistema,
            versao=d.versao,
            so_formatado=info_so.get("so_formatado"),
        )
        return lbl
    return "Não informado"


@router.get("/reports", response_model=ReportSummaryResponse)
def get_dashboard_reports(
    campo: str = Query("processador", description="Campo de agrupamento"),
    plataforma: Optional[str] = Query(None, description="Filtro de SO: 'Windows' ou 'Linux'"),
    site_id: Optional[int] = Query(None, description="Filtrar por ID de filial"),
    search: Optional[str] = Query(None, description="Busca textual livre"),
    grupo_selecionado: Optional[str] = Query(None, description="Filtrar máquinas por grupo específico"),
    page: int = Query(1, ge=1, description="Número da página para listagem de máquinas"),
    per_page: int = Query(50, ge=1, le=500, description="Itens por página"),
    export_all: bool = Query(False, description="Se True, retorna todas as máquinas sem paginação"),
    current_user: User = Depends(get_current_user),
):
    """
    Retorna a consolidação analítica e distribuição de estações por atributo de hardware ou software.
    Transfere todo o cálculo pesado do front-end para o back-end com normalização de strings e paginação server-side.
    """
    with Session(engine) as session:
        is_global = _is_global_user(current_user)

        device_filters = [
            Device.company_id == current_user.company_id,
            Device.active.is_(True),
        ]

        if not is_global:
            allowed_sites = (
                select(user_site_access.c.site_id)
                .where(user_site_access.c.user_id == current_user.id)
            )
            device_filters.append(Device.site_id.in_(allowed_sites))

        if isinstance(site_id, int):
            device_filters.append(Device.site_id == site_id)

        # Carrega dispositivos com filial associada
        devices = session.scalars(
            select(Device)
            .options(selectinload(Device.site))
            .where(*device_filters)
            .order_by(Device.hostname)
        ).all()

        nome_campo = CAMPOS_NOME.get(campo, campo.capitalize())
        search_lower = search.strip().lower() if isinstance(search, str) and search.strip() else None
        plat_req = plataforma.strip().lower() if isinstance(plataforma, str) and plataforma.strip() else None

        # Processamento e normalização em memória otimizada
        items_processados = []
        contagem_grupos: Dict[str, int] = {}

        for d in devices:
            # 1. Filtro de plataforma (Windows vs Linux)
            is_win = bool(d.sistema and "windows" in d.sistema.lower()) or bool(d.versao and "windows" in d.versao.lower())
            if plat_req:
                if plat_req == "windows" and not is_win:
                    continue
                if plat_req == "linux" and is_win:
                    continue

            val = _extrair_valor_campo(d, campo)

            # 2. Filtro de busca textual
            if search_lower:
                match_val = search_lower in val.lower()
                match_host = search_lower in (d.hostname or "").lower()
                match_ip = search_lower in (d.ip or "").lower()
                if not (match_val or match_host or match_ip):
                    continue

            contagem_grupos[val] = contagem_grupos.get(val, 0) + 1

            filial_nome = d.site.name if d.site else "Não atribuída"
            so_str = "Windows" if is_win else "Linux"
            versao_completa = f"{d.sistema or ''} {d.versao or ''}".strip() or so_str

            data_str = d.data_coleta.isoformat() if d.data_coleta else None

            items_processados.append({
                "id": d.id,
                "hostname": d.hostname or "Sem Hostname",
                "ip": d.ip,
                "so": so_str,
                "versao_so": versao_completa,
                "site_id": d.site_id,
                "filial": filial_nome,
                "valor_campo": val,
                "rustdesk_id": d.rustdesk_id,
                "status": d.status,
                "data_coleta": data_str,
            })

        total_maquinas = len(items_processados)

        # Monta grupos ordenados por maior contagem
        grupos_ordenados: List[ReportGroupItem] = []
        for chave, count in sorted(contagem_grupos.items(), key=lambda x: (-x[1], x[0].lower())):
            pct = round((count / total_maquinas * 100), 1) if total_maquinas > 0 else 0.0
            grupos_ordenados.append(ReportGroupItem(
                chave=chave,
                total=count,
                percentual=pct,
            ))

        # Filtra máquinas se houver grupo selecionado
        if isinstance(grupo_selecionado, str) and grupo_selecionado.strip():
            g_sel = grupo_selecionado.strip().lower()
            maquinas_finais = [
                ReportMachineItem(**item)
                for item in items_processados
                if item["valor_campo"].strip().lower() == g_sel
                or (campo == "sistema" and (g_sel in item["valor_campo"].strip().lower() or item["valor_campo"].strip().lower() in g_sel))
            ]
        else:
            maquinas_finais = [ReportMachineItem(**item) for item in items_processados]

        maquinas_total = len(maquinas_finais)
        p_page = page if isinstance(page, int) and page >= 1 else 1
        p_per_page = per_page if isinstance(per_page, int) and per_page >= 1 else 50
        total_pages = max(1, math.ceil(maquinas_total / p_per_page))

        if not export_all:
            start_idx = (p_page - 1) * p_per_page
            end_idx = start_idx + p_per_page
            maquinas_paginadas = maquinas_finais[start_idx:end_idx]
        else:
            maquinas_paginadas = maquinas_finais

        return ReportSummaryResponse(
            campo=campo,
            nome_campo=nome_campo,
            total_maquinas=total_maquinas,
            total_grupos=len(grupos_ordenados),
            grupos=grupos_ordenados,
            maquinas=maquinas_paginadas,
            page=p_page,
            per_page=p_per_page,
            total_pages=total_pages,
            maquinas_total=maquinas_total,
        )


# =====================================================================
# ROTA DE GRÁFICOS DE DISTRIBUIÇÃO (Donut / Barras)
# =====================================================================

PALETTE_SO = {
    "Windows 11": "#2563eb",
    "Windows 10": "#3b82f6",
    "Windows 7": "#60a5fa",
    "Windows Server": "#1d4ed8",
    "Ubuntu": "#e11d48",
    "Debian": "#f43f5e",
    "Linux Mint": "#10b981",
    "Linux": "#ea580c",
}

DEFAULT_PALETTE = [
    "#2563eb",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#6366f1",
    "#14b8a6",
    "#f97316",
    "#64748b",
]


def _montar_fatias(contagem: Dict[str, int], total_geral: int, custom_colors: Optional[Dict[str, str]] = None) -> List[ChartSliceItem]:
    """Calcula percentuais e atribui cores harmoniosas para as fatias de um gráfico."""
    fatias: List[ChartSliceItem] = []
    itens_ord = sorted(contagem.items(), key=lambda x: (-x[1], x[0]))

    for idx, (label, count) in enumerate(itens_ord):
        pct = round((count / total_geral * 100), 1) if total_geral > 0 else 0.0
        cor = None
        if custom_colors:
            cor = custom_colors.get(label)
        if not cor:
            cor = DEFAULT_PALETTE[idx % len(DEFAULT_PALETTE)]

        fatias.append(ChartSliceItem(
            label=label,
            total=count,
            percentual=pct,
            color=cor,
        ))
    return fatias


@router.get("/charts", response_model=DashboardChartsResponse)
def get_dashboard_charts(
    site_id: Optional[int] = Query(None, description="Filtrar por ID de filial"),
    current_user: User = Depends(get_current_user),
):
    """
    Retorna os dados normalizados e percentuais prontos para gráficos de distribuição:
    Sistemas Operacionais, Memória RAM, Tipo de Memória, Discos, Coleta/Status e Filiais.
    """
    with Session(engine) as session:
        is_global = _is_global_user(current_user)

        device_filters = [
            Device.company_id == current_user.company_id,
            Device.active.is_(True),
        ]

        if not is_global:
            allowed_sites = (
                select(user_site_access.c.site_id)
                .where(user_site_access.c.user_id == current_user.id)
            )
            device_filters.append(Device.site_id.in_(allowed_sites))

        if isinstance(site_id, int):
            device_filters.append(Device.site_id == site_id)

        devices = session.scalars(
            select(Device)
            .options(selectinload(Device.site))
            .where(*device_filters)
        ).all()

        total = len(devices)

        cnt_so: Dict[str, int] = {}
        cnt_ram: Dict[str, int] = {}
        cnt_tipo_ram: Dict[str, int] = {}
        cnt_disco: Dict[str, int] = {}
        cnt_tipo_armazenamento: Dict[str, int] = {}
        cnt_status: Dict[str, int] = {}
        cnt_site: Dict[str, int] = {}

        agora = datetime.now(timezone.utc)

        for d in devices:
            # 1. SO
            info_so = normalizar_so(d.sistema, d.versao, d.build, d.windows_release)
            so_name = info_so.get("so_formatado") or "Não informado"
            # Agrupa edições semelhantes (ex: Windows 11 Pro -> Windows 11), mas preserva Kubuntu e Zorin canônicos
            so_clean = so_name
            if so_name.lower().startswith("kubuntu") or so_name.lower().startswith("zorin"):
                so_clean = so_name
            elif "windows 11" in so_name.lower():
                so_clean = "Windows 11"
            elif "windows 10" in so_name.lower():
                so_clean = "Windows 10"
            elif "windows 7" in so_name.lower():
                so_clean = "Windows 7"
            elif "windows server" in so_name.lower():
                so_clean = "Windows Server"
            elif "debian" in so_name.lower():
                so_clean = "Debian"
            elif "mint" in so_name.lower():
                so_clean = "Linux Mint"

            cnt_so[so_clean] = cnt_so.get(so_clean, 0) + 1

            # 2. RAM
            ram_info = normalizar_ram(d.ram_total, d.ram_tipo)
            ram_lbl = ram_info.get("ram_total_formatada") or "Não informado"
            cnt_ram[ram_lbl] = cnt_ram.get(ram_lbl, 0) + 1

            # 3. Tipo RAM (agrupamento base DDR4, DDR5, DDR3 sem frequências)
            tram = normalizar_tipo_ram(d.ram_tipo)
            cnt_tipo_ram[tram] = cnt_tipo_ram.get(tram, 0) + 1

            # 4. Disco (arredondado comercialmente via cálculo de 1024/1000)
            dlbl = normalizar_capacidade_disco(d.disco_total) or "Não informado"
            cnt_disco[dlbl] = cnt_disco.get(dlbl, 0) + 1

            # 5. Status Operacional (alinhado 100% com o Explorador Analítico campo=status)
            st_lbl, _, _ = normalizar_status_operacional(
                status=d.status,
                sistema=d.sistema,
                versao=d.versao,
                so_formatado=so_name,
            )
            cnt_status[st_lbl] = cnt_status.get(st_lbl, 0) + 1

            # 6. Filial
            st_name = d.site.name if d.site else "Não atribuída"
            cnt_site[st_name] = cnt_site.get(st_name, 0) + 1

            # 7. Tipo de Armazenamento (NVMe / SSD / HDD / Virtual / Não Identificado)
            tipo_arm = normalizar_tipo_armazenamento(d)
            cnt_tipo_armazenamento[tipo_arm] = cnt_tipo_armazenamento.get(tipo_arm, 0) + 1

        status_colors = {
            "Atualizada": "#10b981",
            "Atualização Necessária": "#f59e0b",
            "Desatualizada": "#ef4444",
            "Não Identificada": "#94a3b8",
        }

        storage_colors = {
            "NVMe": "#6366f1",
            "SSD": "#0ea5e9",
            "HDD": "#f59e0b",
            "Virtual": "#a855f7",
            "Não Identificado": "#94a3b8",
        }

        ram_type_colors = {
            "DDR5": "#8b5cf6",
            "DDR4": "#0ea5e9",
            "DDR3": "#10b981",
            "DDR2": "#f59e0b",
            "Não informado": "#64748b",
        }

        return DashboardChartsResponse(
            total_maquinas=total,
            sistema_operacional=_montar_fatias(cnt_so, total, PALETTE_SO),
            memoria_ram=_montar_fatias(cnt_ram, total),
            tipo_ram=_montar_fatias(cnt_tipo_ram, total, ram_type_colors),
            tipo_disco=_montar_fatias(cnt_disco, total),
            tipo_armazenamento=_montar_fatias(cnt_tipo_armazenamento, total, storage_colors),
            status_coleta=_montar_fatias(cnt_status, total, status_colors),
            filiais=_montar_fatias(cnt_site, total),
        )

