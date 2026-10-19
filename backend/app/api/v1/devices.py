from datetime import datetime, timedelta
import ipaddress
import re
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, exists, func, not_, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies.auth import get_current_user
from app.database import engine
from app.models import Device, DeviceSoftware, User
from app.models.device_history import DeviceHistory
from app.models.network_asset import NetworkAsset
from app.models.site import Site
from app.models.site_ip_range import SiteIpRange
from app.models.user_site_access import user_site_access
from app.schemas.device import (
    DeviceAprovarCadastroIn,
    DeviceDetailResponse,
    DeviceFirewallSolicitarIn,
    DeviceKPIs,
    DevicePatrimonioIn,
    DeviceRejeitarCadastroIn,
    DeviceSolicitarRecadastroIn,
    SiteVlanIpsResponse,
)
from app.services.inventory_service import (
    IGNORED_HISTORY_FIELDS,
    is_subnet_88,
    simular_identificacao_site,
)
from app.services.device_normalizer import (
    formatar_data_brasilia,
    normalizar_device_detail,
    normalizar_device_list_item,
    normalizar_so,
)


# =====================================================================
# Funções Auxiliares e Validações de Domínio
# =====================================================================

def extrair_digitos_patrimonio(valor: Optional[str]) -> str:
    """Extrai somente os caracteres numéricos do patrimônio informado."""
    return re.sub(r"[^0-9]", "", str(valor or "").strip())


def formatar_patrimonio(valor: Optional[str]) -> Optional[str]:
    """Retorna o patrimônio formatado no padrão 'pat.<numero>' ou None se não houver dígitos."""
    nums = extrair_digitos_patrimonio(valor)
    return f"pat.{nums}" if nums else None


def is_valid_ipv4_non_bench(ip_str: Optional[str]) -> bool:
    """Verifica se o IP é um endereço IPv4 válido e que não pertence à sub-rede de bancada (192.168.88.0/24)."""
    if not ip_str or not str(ip_str).strip():
        return False
    try:
        addr = ipaddress.IPv4Address(str(ip_str).strip())
        return not is_subnet_88(str(addr))
    except Exception:
        return False


def classificar_familia_so(sistema: Optional[str], versao: Optional[str]) -> str:
    """Identifica a família macro de Sistema Operacional (Windows, Linux, macOS)."""
    texto = f"{sistema or ''} {versao or ''}".lower()
    if any(k in texto for k in ["win", "windows", "microsoft"]):
        return "Windows"
    if any(k in texto for k in ["linux", "ubuntu", "zorin", "debian", "kubuntu", "mint", "centos", "fedora", "rhel"]):
        return "Linux"
    if "mac" in texto or "darwin" in texto:
        return "macOS"
    return (sistema or "Desconhecido").strip().capitalize()


def is_admin_user(user: User) -> bool:
    """Verifica se o usuário possui perfil de superadmin ou admin."""
    if user.is_superadmin:
        return True
    roles = [r.slug for r in user.roles] if user.roles else []
    return "admin" in roles


def is_matriz_operator(user: User) -> bool:
    """Verifica se o usuário possui o perfil de operador matriz."""
    roles = [r.slug for r in user.roles] if user.roles else []
    return "operador_matriz" in roles


def validar_restricao_bancada_patrimonio(device: Device, novo_patrimonio: str, user: User) -> None:
    """
    Garante que operadores da matriz só possam cadastrar ou alterar patrimônio
    se a máquina estiver atualmente na faixa de bancada (192.168.88.0/24) e não estiver confirmada no firewall.
    Fora da bancada .88, qualquer tentativa de cadastro/alteração por operadores é bloqueada com HTTP 403.
    Administradores têm permissão irrestrita.
    """
    if is_admin_user(user):
        return

    if not is_subnet_88(device.ip):
        raise HTTPException(
            status_code=403,
            detail="Operadores da matriz só possuem permissão para cadastrar ou alterar patrimônio em máquinas na bancada (192.168.88.x). Fora da bancada, o acesso é apenas para consulta.",
        )

    if device.firewall_status == "confirmado":
        raise HTTPException(
            status_code=403,
            detail="O patrimônio já foi homologado pelo administrador e está bloqueado para alteração.",
        )


def resolver_ativo_por_patrimonio(
    session: Session,
    company_id: int,
    pat_formatado: str,
    nums: str,
    exclude_device_id: Optional[int] = None,
) -> dict[str, Any]:
    """
    Pesquisa ativos existentes por patrimônio em Device (estações ativas)
    e em NetworkAsset (ativos importados/rede), detectando conflitos de duplicidade
    e estruturando os dados consolidados do ativo correspondente.
    """
    # 1. Busca em Device (estações ativas da empresa)
    stmt_dev = (
        select(Device)
        .options(selectinload(Device.site))
        .where(
            Device.company_id == company_id,
            or_(
                Device.patrimonio.ilike(pat_formatado),
                Device.patrimonio.ilike(f"%{nums}%"),
            ),
            Device.active.is_(True),
        )
    )
    if exclude_device_id:
        stmt_dev = stmt_dev.where(Device.id != exclude_device_id)

    matching_devs = session.scalars(stmt_dev).all()

    # 2. Busca em NetworkAsset (ativos de rede e importações)
    stmt_net = (
        select(NetworkAsset)
        .options(selectinload(NetworkAsset.site))
        .where(
            NetworkAsset.company_id == company_id,
            or_(
                NetworkAsset.patrimonio.ilike(pat_formatado),
                NetworkAsset.patrimonio.ilike(f"%{nums}%"),
            ),
        )
    )
    matching_nets = session.scalars(stmt_net).all()

    # Mapeamento de possíveis conflitos entre registros
    conflitos = []
    for d in matching_devs:
        d_loja = d.site.name if d.site else d.loja or ""
        conflitos.append({
            "id": d.id,
            "tipo_registro": "estacao",
            "hostname": d.hostname,
            "ip": d.ip,
            "mac": d.mac,
            "loja": d_loja,
            "site_id": d.site_id,
        })
    for n in matching_nets:
        n_loja = n.site.name if n.site else n.localizacao or ""
        conflitos.append({
            "id": n.id,
            "tipo_registro": "ativo_rede",
            "hostname": n.nome,
            "ip": n.ip,
            "mac": n.mac,
            "loja": n_loja,
            "site_id": n.site_id,
        })

    tem_conflito = len(conflitos) > 1
    if len(matching_devs) == 1 and len(matching_nets) == 1:
        dev_cand = matching_devs[0]
        net_cand = matching_nets[0]
        same_ip = bool(dev_cand.ip and net_cand.ip and dev_cand.ip == net_cand.ip)
        same_mac = bool(
            dev_cand.mac
            and net_cand.mac
            and dev_cand.mac.lower().replace("-", ":") == net_cand.mac.lower().replace("-", ":")
        )
        same_name = bool(
            dev_cand.hostname
            and net_cand.nome
            and dev_cand.hostname.lower() == net_cand.nome.lower()
        )
        same_site = bool(dev_cand.site_id and dev_cand.site_id == net_cand.site_id)
        if same_ip or same_mac or same_name or same_site:
            tem_conflito = False

    existing_dev = matching_devs[0] if matching_devs else None
    existing_net = matching_nets[0] if matching_nets else None

    if not existing_dev and not existing_net:
        return {
            "exists": False,
            "matching_devs": [],
            "matching_nets": [],
            "existing_dev": None,
            "existing_net": None,
            "linked_device_id": None,
            "linked_network_asset_id": None,
            "tem_conflito": False,
            "conflitos": [],
            "existing_asset_dict": None,
            "old_hostname": "",
            "old_loja": "",
            "old_site_id": None,
            "old_ip": "",
            "old_mac": "",
            "old_so": "",
            "versao_val": "",
            "fam_ant": "",
            "origem_val": "estacao",
        }

    linked_dev_id = existing_dev.id if existing_dev else None
    linked_net_id = existing_net.id if existing_net else None

    if existing_dev:
        tipo_origem = "ambos" if existing_net else "device"
        old_hostname = existing_dev.hostname or (existing_net.nome if existing_net else "")
        old_loja = (
            existing_dev.site.name
            if existing_dev.site
            else (
                existing_dev.loja
                or (existing_net.site.name if (existing_net and existing_net.site) else (existing_net.localizacao if existing_net else ""))
            )
        )
        old_site_id = existing_dev.site_id or (existing_net.site_id if existing_net else None)

        # Prioriza IP corporativo válido fora da faixa 192.168.88.0/24
        old_ip = ""
        if existing_net and is_valid_ipv4_non_bench(existing_net.ip):
            old_ip = existing_net.ip.strip()
        elif is_valid_ipv4_non_bench(existing_dev.ip):
            old_ip = existing_dev.ip.strip()
        elif is_valid_ipv4_non_bench(existing_dev.ip_definitivo):
            old_ip = existing_dev.ip_definitivo.strip()

        old_mac = existing_dev.mac or (existing_net.mac if existing_net else "")
        old_so = f"{existing_dev.sistema or ''} {existing_dev.versao or ''}".strip()
        versao_val = existing_dev.versao or ""
        fam_ant = classificar_familia_so(existing_dev.sistema, existing_dev.versao)
        origem_val = getattr(existing_dev, "origem", "estacao")
    else:
        tipo_origem = "network_asset"
        old_hostname = existing_net.nome or ""
        old_loja = existing_net.site.name if existing_net.site else (existing_net.localizacao or "")
        old_site_id = existing_net.site_id
        old_ip = existing_net.ip.strip() if is_valid_ipv4_non_bench(existing_net.ip) else ""
        old_mac = existing_net.mac or ""
        old_so = existing_net.tipo or "Ativo Importado"
        versao_val = existing_net.modelo or ""
        fam_ant = classificar_familia_so(existing_net.tipo, existing_net.modelo)
        origem_val = existing_net.origem or "planilha"

    existing_asset_dict = {
        "id": linked_dev_id or linked_net_id,
        "tipo_origem": tipo_origem,
        "linked_device_id": linked_dev_id,
        "linked_network_asset_id": linked_net_id,
        "hostname": old_hostname,
        "ip": old_ip,
        "mac": old_mac,
        "sistema": old_so,
        "versao": versao_val,
        "loja": old_loja,
        "site_id": old_site_id,
        "patrimonio": pat_formatado,
        "familia_so": fam_ant,
        "origem": origem_val,
    }

    return {
        "exists": True,
        "matching_devs": matching_devs,
        "matching_nets": matching_nets,
        "existing_dev": existing_dev,
        "existing_net": existing_net,
        "linked_device_id": linked_dev_id,
        "linked_network_asset_id": linked_net_id,
        "tem_conflito": tem_conflito,
        "conflitos": conflitos if tem_conflito else [],
        "existing_asset_dict": existing_asset_dict,
        "old_hostname": old_hostname,
        "old_loja": old_loja,
        "old_site_id": old_site_id,
        "old_ip": old_ip,
        "old_mac": old_mac,
        "old_so": old_so,
        "versao_val": versao_val,
        "fam_ant": fam_ant,
        "origem_val": origem_val,
    }


def formatar_lista_versoes(vers_raw: list) -> list:
    """Extrai e padroniza a lista de nomes de sistemas operacionais e versões via normalizar_so."""
    versoes_set = set()
    for row in vers_raw:
        sis = row[0] if len(row) > 0 else ""
        ver = row[1] if len(row) > 1 else ""
        win_rel = row[2] if len(row) > 2 else None
        v_str = (ver or "").strip()
        s_str = (sis or "").strip()
        if v_str.lower() == "none":
            v_str = ""
        if s_str.lower() == "none":
            s_str = ""
        if not v_str and not s_str:
            continue
        info = normalizar_so(s_str, v_str, windows_release=win_rel)
        so_name = info.get("so_formatado")
        if so_name and so_name.lower() not in ("none", "não informado"):
            versoes_set.add(so_name)
    return sorted(list(versoes_set))


def calcular_charts_summary(session: Session, base_where: Any, kpis: dict) -> dict:
    """Calcula os 3 gráficos Donut agregados para a tela de Estações: Plataforma, Status e Versões."""
    # 1. Plataforma (Windows vs Linux)
    tot_win = kpis.get("total_windows", 0)
    tot_lnx = kpis.get("total_linux", 0)
    tot_plat = tot_win + tot_lnx
    plat_slices = []
    if tot_plat > 0:
        if tot_win > 0:
            plat_slices.append({
                "label": "Windows",
                "count": tot_win,
                "percent": round((tot_win / tot_plat) * 100, 1),
                "color": "#0284c7",
            })
        if tot_lnx > 0:
            plat_slices.append({
                "label": "Linux",
                "count": tot_lnx,
                "percent": round((tot_lnx / tot_plat) * 100, 1),
                "color": "#f97316",
            })

    plataforma_chart = {
        "title": "Distribuição por Plataforma",
        "subtitle": "Divisão do parque por SO macro",
        "total": tot_plat,
        "slices": plat_slices,
    }

    # 2. Status Operacional (Atualizada, Atualização Necessária, Desatualizada)
    # Considera a regra de conformidade: toda máquina Windows 10 pertence a 'Atualização Necessária'
    cond_win10_chart = or_(
        func.coalesce(Device.versao, "").ilike("%windows 10%"),
        func.coalesce(Device.sistema, "").ilike("%windows 10%"),
        func.coalesce(Device.versao, "").ilike("10.0.1904%"),
        func.coalesce(Device.versao, "").ilike("%win10%"),
    )
    st_row = session.execute(
        select(
            func.count().filter(Device.status == "OK", not_(cond_win10_chart)).label("tot_ok"),
            func.count().filter(or_(Device.status == "UPGRADE_REQUIRED", cond_win10_chart)).label("tot_upg"),
            func.count().filter(
                or_(Device.status.is_(None), not_(Device.status.in_(["OK", "UPGRADE_REQUIRED"]))),
                not_(cond_win10_chart),
            ).label("tot_des"),
        ).where(base_where)
    ).one()
    st_counts = {
        "Atualizada": st_row.tot_ok or 0,
        "Atualização Necessária": st_row.tot_upg or 0,
        "Desatualizada": st_row.tot_des or 0,
    }

    tot_status = sum(st_counts.values())
    status_slices = []
    if tot_status > 0:
        if st_counts["Atualizada"] > 0:
            status_slices.append({
                "label": "Atualizada",
                "count": st_counts["Atualizada"],
                "percent": round((st_counts["Atualizada"] / tot_status) * 100, 1),
                "color": "#10b981",
            })
        if st_counts["Atualização Necessária"] > 0:
            status_slices.append({
                "label": "Atualização Necessária",
                "count": st_counts["Atualização Necessária"],
                "percent": round((st_counts["Atualização Necessária"] / tot_status) * 100, 1),
                "color": "#f59e0b",
            })
        if st_counts["Desatualizada"] > 0:
            status_slices.append({
                "label": "Desatualizada",
                "count": st_counts["Desatualizada"],
                "percent": round((st_counts["Desatualizada"] / tot_status) * 100, 1),
                "color": "#ef4444",
            })

    status_chart = {
        "title": "Status das Máquinas",
        "subtitle": "Condição de conformidade e versão",
        "total": tot_status,
        "slices": status_slices,
    }

    # 3. Distribuição por Versão de Sistema
    vers_rows = session.execute(
        select(Device.sistema, Device.versao, Device.windows_release, func.count())
        .where(base_where)
        .group_by(Device.sistema, Device.versao, Device.windows_release)
    ).all()
    vers_grouped: dict[str, int] = {}
    for sis, ver, win_rel, cnt in vers_rows:
        norm = normalizar_so(sis, ver, windows_release=win_rel)
        so_name = norm.get("so_formatado") or "Outros"
        vers_grouped[so_name] = vers_grouped.get(so_name, 0) + cnt

    tot_vers = sum(vers_grouped.values())
    sorted_vers = sorted(vers_grouped.items(), key=lambda x: x[1], reverse=True)
    vers_colors = [
        "#0284c7",  # Sky blue (Windows 11 Pro)
        "#0d9488",  # Teal (Kubuntu 22.04)
        "#10b981",  # Emerald (Kubuntu 24.04)
        "#8b5cf6",  # Purple (Zorin 18)
        "#f59e0b",  # Amber (Windows 10 Pro)
        "#06b6d4",  # Cyan (Kubuntu 20.04)
        "#3b82f6",  # Blue (Windows 11 Pro 25H2)
        "#14b8a6",  # Mint (Kubuntu 26.04)
        "#64748b",  # Slate (Windows)
        "#ec4899",  # Pink
        "#f97316",  # Orange
        "#a855f7",  # Violet
    ]

    vers_slices = []
    # Mostra todas as categorias reais presentes no parque sem agrupamento artificial prematuro
    max_slices = 12
    top_items = sorted_vers[:max_slices] if len(sorted_vers) <= max_slices + 1 else sorted_vers[:max_slices]
    other_items = [] if len(sorted_vers) <= max_slices + 1 else sorted_vers[max_slices:]

    for idx, (label, count) in enumerate(top_items):
        if count > 0 and tot_vers > 0:
            vers_slices.append({
                "label": label,
                "count": count,
                "percent": round((count / tot_vers) * 100, 1),
                "color": vers_colors[idx % len(vers_colors)],
            })

    if other_items and tot_vers > 0:
        other_cnt = sum(c for _, c in other_items)
        if other_cnt > 0:
            vers_slices.append({
                "label": "Outras Versões",
                "count": other_cnt,
                "percent": round((other_cnt / tot_vers) * 100, 1),
                "color": "#94a3b8",
            })

    versoes_chart = {
        "title": "Distribuição por Versão",
        "subtitle": "Versões de SO mais presentes no parque",
        "total": tot_vers,
        "slices": vers_slices,
    }

    return {
        "plataforma": plataforma_chart,
        "status": status_chart,
        "versoes": versoes_chart,
    }


# =====================================================================
# Rotas da API de Dispositivos
# =====================================================================

router = APIRouter(
    prefix="/devices",
    tags=["Devices"],
)


@router.get("/")
def list_devices(
    search: Optional[str] = None,
    site_id: Optional[int] = None,
    status: Optional[str] = None,
    page: int = 1,
    per_page: int = 50,
    current_user: User = Depends(get_current_user),
    sistema: Optional[str] = None,
    versao: Optional[str] = None,
    loja: Optional[str] = None,
    firewall_status: Optional[str] = None,
    alerta: Optional[bool] = None,
    inativas: Optional[bool] = None,
    bancada: Optional[bool] = None,
    plataforma: Optional[str] = None,
    disco_critico: Optional[bool] = None,
    sem_apps: Optional[bool] = None,
    com_apps: Optional[bool] = None,
    status_conexao: Optional[str] = None,
    ordenar_por: Optional[str] = "loja",
    ordem_dir: Optional[str] = "asc",
):
    """Lista dispositivos paginados com filtros avançados, KPIs e controle de acesso por filial."""
    with Session(engine) as session:
        query = select(Device).where(
            Device.company_id == current_user.company_id,
            Device.active.is_(True),
        )
        count_query = select(func.count(Device.id)).where(
            Device.company_id == current_user.company_id,
            Device.active.is_(True),
        )

        # Controle de acesso por site para operadores locais
        is_global_viewer = is_admin_user(current_user) or is_matriz_operator(current_user)
        if not is_global_viewer:
            allowed_sites = (
                select(user_site_access.c.site_id)
                .where(user_site_access.c.user_id == current_user.id)
            )
            query = query.where(Device.site_id.in_(allowed_sites))
            count_query = count_query.where(Device.site_id.in_(allowed_sites))

        # Padrão para operador_matriz: se bancada não foi fornecido (bancada is None), filtra bancada por padrão
        if is_matriz_operator(current_user) and not is_admin_user(current_user) and bancada is None:
            bancada = True

        now_minus_48h = datetime.utcnow() - timedelta(hours=48)

        has_apps_subq = exists().where(
            DeviceSoftware.device_id == Device.id,
            DeviceSoftware.installed.is_(True),
        )

        # Cálculo otimizado de KPIs contextuais (respeitando Filial, Busca e Status sem acoplamento aos toggles de KPI)
        kpi_query = select(
            func.count().filter(Device.sistema.ilike("%windows%")).label("tot_win"),
            func.count().filter(not_(Device.sistema.ilike("%windows%"))).label("tot_lnx"),
            func.count().filter(Device.alerta_hardware.isnot(None)).label("tot_alert"),
            func.count().filter(or_(Device.data_coleta < now_minus_48h, Device.data_coleta.is_(None))).label("tot_inativas"),
            func.count().filter(Device.firewall_status == "pendente").label("tot_fw"),
            func.count().filter(Device.ip.like("192.168.88.%")).label("tot_88"),
            func.count().filter(Device.disco_percentual >= 85).label("tot_crit_disk"),
            func.count().filter(~has_apps_subq).label("tot_sem_apps"),
            func.count().filter(has_apps_subq).label("tot_com_apps"),
        ).where(
            Device.company_id == current_user.company_id,
            Device.active.is_(True),
        )
        if not is_global_viewer:
            kpi_query = kpi_query.where(Device.site_id.in_(allowed_sites))

        p_page = page if isinstance(page, int) else 1
        p_per_page = per_page if isinstance(per_page, int) else 50

        # Filtro de Filial / Loja (Contextual)
        if site_id is not None and isinstance(site_id, int):
            if site_id in (-1, 0):
                query = query.where(Device.site_id.is_(None))
                count_query = count_query.where(Device.site_id.is_(None))
                kpi_query = kpi_query.where(Device.site_id.is_(None))
            else:
                query = query.where(Device.site_id == site_id)
                count_query = count_query.where(Device.site_id == site_id)
                kpi_query = kpi_query.where(Device.site_id == site_id)

        # Filtro de Busca Textual (Contextual)
        filtro_busca = None
        if search and isinstance(search, str) and search.strip():
            termo = f"%{search.strip()}%"
            filtro_busca = or_(
                Device.hostname.ilike(termo),
                Device.ip.ilike(termo),
                Device.mac.ilike(termo),
                Device.rustdesk_id.ilike(termo),
                Device.patrimonio.ilike(termo),
                Device.loja.ilike(termo),
                Device.usuario.ilike(termo),
            )
            query = query.where(filtro_busca)
            count_query = count_query.where(filtro_busca)
            kpi_query = kpi_query.where(filtro_busca)

        # Filtro de Status Operacional (Contextual)
        # Sincronizado com a regra: Windows 10 obrigatoriamente classificado em 'Atualização Necessária' (UPGRADE_REQUIRED)
        if status and isinstance(status, str):
            cond_win10_filter = or_(
                func.coalesce(Device.versao, "").ilike("%windows 10%"),
                func.coalesce(Device.sistema, "").ilike("%windows 10%"),
                func.coalesce(Device.versao, "").ilike("10.0.1904%"),
                func.coalesce(Device.versao, "").ilike("%win10%"),
            )
            if status == "OUTRO":
                cond_status = and_(
                    or_(Device.status.is_(None), not_(Device.status.in_(["OK", "UPGRADE_REQUIRED"]))),
                    not_(cond_win10_filter),
                )
            elif status == "UPGRADE_REQUIRED":
                cond_status = or_(Device.status == "UPGRADE_REQUIRED", cond_win10_filter)
            elif status == "OK":
                cond_status = and_(Device.status == "OK", not_(cond_win10_filter))
            else:
                cond_status = Device.status == status

            query = query.where(cond_status)
            count_query = count_query.where(cond_status)
            kpi_query = kpi_query.where(cond_status)

        # Filtro de Loja por Nome Textual (Contextual)
        if loja and isinstance(loja, str):
            termo_loja = f"%{loja.strip()}%"
            query = query.where(Device.loja.ilike(termo_loja))
            count_query = count_query.where(Device.loja.ilike(termo_loja))
            kpi_query = kpi_query.where(Device.loja.ilike(termo_loja))

        # Execução da agregação dos KPIs contextuais
        kpis_raw = session.execute(kpi_query).one()
        kpis = {
            "total_windows": kpis_raw.tot_win or 0,
            "total_linux": kpis_raw.tot_lnx or 0,
            "total_alertas": kpis_raw.tot_alert or 0,
            "total_inativas": kpis_raw.tot_inativas or 0,
            "total_firewall_pendente": kpis_raw.tot_fw or 0,
            "total_bancada_88": kpis_raw.tot_88 or 0,
            "total_critico_disco": kpis_raw.tot_crit_disk or 0,
            "total_sem_apps": kpis_raw.tot_sem_apps or 0,
            "total_com_apps": kpis_raw.tot_com_apps or 0,
        }

        # Filtros de Refinamento / Toggles da Lista

        if versao and isinstance(versao, str):
            v_clean = versao.strip()
            if re.match(r"^k?ubuntu\b", v_clean, re.I):
                v_num = re.sub(r"^k?ubuntu\s*", "", v_clean, flags=re.I).strip()
                if v_num:
                    cond_ver = and_(
                        Device.sistema.ilike("%ubuntu%"),
                        or_(
                            Device.versao.ilike(f"%{v_num}%"),
                            Device.sistema.ilike(f"%{v_num}%"),
                        ),
                    )
                else:
                    cond_ver = Device.sistema.ilike("%ubuntu%")
            elif re.match(r"^zorin\b", v_clean, re.I):
                v_num = re.sub(r"^zorin(\s*os)?\s*", "", v_clean, flags=re.I).strip()
                if v_num:
                    cond_ver = and_(
                        Device.sistema.ilike("%zorin%"),
                        or_(Device.versao.ilike(f"%{v_num}%"), Device.sistema.ilike(f"%{v_num}%")),
                    )
                else:
                    cond_ver = Device.sistema.ilike("%zorin%")
            elif re.match(r"^windows\b", v_clean, re.I):
                m_rel = re.search(r"\b(2[0-9]H[1-2])\b", v_clean, re.I)
                rel_target = m_rel.group(1).upper() if m_rel else None
                base_os = re.sub(r"\b(2[0-9]H[1-2])\b", "", v_clean, flags=re.I).strip()
                v_num = re.sub(r"^windows\s*", "", base_os, flags=re.I).strip()

                cond_win = or_(Device.sistema.ilike("%windows%"), Device.versao.ilike("%windows%"))
                conds = [cond_win]
                if v_num:
                    conds.append(or_(
                        Device.versao.ilike(f"%{v_num}%"),
                        Device.sistema.ilike(f"%{v_num}%"),
                    ))
                else:
                    # 'Windows' genérico (sem número de versão 10, 11, etc.)
                    conds.append(not_(or_(
                        func.coalesce(Device.versao, "").ilike("%10%"),
                        func.coalesce(Device.versao, "").ilike("%11%"),
                        func.coalesce(Device.sistema, "").ilike("%10%"),
                        func.coalesce(Device.sistema, "").ilike("%11%"),
                    )))
                if rel_target:
                    conds.append(or_(
                        Device.windows_release.ilike(f"%{rel_target}%"),
                        Device.versao.ilike(f"%{rel_target}%"),
                    ))
                elif v_num and "11" in v_num:
                    # Se filtramos 'Windows 11 Pro' sem release 25H2, isola a contagem de máquinas sem 25H2
                    conds.append(or_(
                        Device.windows_release.is_(None),
                        not_(Device.windows_release.ilike("%25H2%")),
                    ))
                cond_ver = and_(*conds)
            elif v_clean.lower() in ("outras versões", "outras versoes", "outros"):
                cond_ver = not_(or_(
                    Device.sistema.ilike("%ubuntu%"),
                    Device.sistema.ilike("%zorin%"),
                    Device.sistema.ilike("%windows%"),
                    Device.versao.ilike("%windows%"),
                ))
            else:
                v_termo = re.sub(r"^(Kubuntu|Ubuntu|Zorin|Windows)\s*", "", v_clean, flags=re.I)
                v_filter = f"%{v_termo}%" if v_termo else f"%{v_clean}%"
                cond_ver = or_(
                    Device.versao.ilike(v_filter),
                    Device.versao.ilike(f"%{v_clean}%"),
                    Device.sistema.ilike(f"%{v_clean}%"),
                )
            query = query.where(cond_ver)
            count_query = count_query.where(cond_ver)

        if firewall_status:
            query = query.where(Device.firewall_status == firewall_status)
            count_query = count_query.where(Device.firewall_status == firewall_status)

        if alerta:
            query = query.where(Device.alerta_hardware.isnot(None))
            count_query = count_query.where(Device.alerta_hardware.isnot(None))

        if inativas:
            cond_inat = or_(Device.data_coleta < now_minus_48h, Device.data_coleta.is_(None))
            query = query.where(cond_inat)
            count_query = count_query.where(cond_inat)

        if bancada:
            query = query.where(Device.ip.like("192.168.88.%"))
            count_query = count_query.where(Device.ip.like("192.168.88.%"))

        if plataforma and isinstance(plataforma, str):
            if plataforma.lower() == "windows":
                query = query.where(Device.sistema.ilike("%windows%"))
                count_query = count_query.where(Device.sistema.ilike("%windows%"))
            elif plataforma.lower() == "linux":
                query = query.where(not_(Device.sistema.ilike("%windows%")))
                count_query = count_query.where(not_(Device.sistema.ilike("%windows%")))

        if disco_critico:
            query = query.where(Device.disco_percentual >= 85)
            count_query = count_query.where(Device.disco_percentual >= 85)

        if sem_apps:
            query = query.where(~has_apps_subq)
            count_query = count_query.where(~has_apps_subq)

        if com_apps:
            query = query.where(has_apps_subq)
            count_query = count_query.where(has_apps_subq)

        if status_conexao and isinstance(status_conexao, str):
            sc = status_conexao.lower().strip()
            if sc == "online":
                now_minus_24h = datetime.utcnow() - timedelta(hours=24)
                cond_online = Device.data_coleta >= now_minus_24h
                query = query.where(cond_online)
                count_query = count_query.where(cond_online)
                kpi_query = kpi_query.where(cond_online)
            elif sc == "offline":
                cond_offline = or_(Device.data_coleta < now_minus_48h, Device.data_coleta.is_(None))
                query = query.where(cond_offline)
                count_query = count_query.where(cond_offline)
                kpi_query = kpi_query.where(cond_offline)
            elif sc == "alerta":
                now_minus_24h = datetime.utcnow() - timedelta(hours=24)
                cond_alerta = and_(Device.data_coleta >= now_minus_48h, Device.data_coleta < now_minus_24h)
                query = query.where(cond_alerta)
                count_query = count_query.where(cond_alerta)
                kpi_query = kpi_query.where(cond_alerta)

        total = session.scalar(count_query) or 0
        offset = (page - 1) * per_page

        # Outer join com Site para suportar ordenação por filial sem jamais ocultar máquinas com site_id=None
        query = query.outerjoin(Site, Device.site_id == Site.id)

        # Ordenação dinâmica com suporte aos campos solicitados
        order_col = Device.hostname
        if ordenar_por == "ip":
            order_col = Device.ip
        elif ordenar_por == "disco":
            order_col = Device.disco_percentual
        elif ordenar_por == "patrimonio":
            order_col = Device.patrimonio
        elif ordenar_por in ("data_coleta", "coleta"):
            order_col = Device.data_coleta
        elif ordenar_por in ("loja", "filial"):
            order_col = func.coalesce(Site.name, Site.code, Device.loja, "")

        if ordem_dir == "desc":
            query = query.order_by(order_col.desc().nullslast())
        else:
            query = query.order_by(order_col.asc().nullsfirst())

        devices = session.scalars(query.offset(offset).limit(per_page)).all()

        # Sites disponíveis para o escopo do usuário
        sites_q = select(Site.id, Site.name, Site.code).where(Site.active.is_(True)).order_by(Site.name)
        if not is_global_viewer:
            sites_q = sites_q.where(Site.id.in_(allowed_sites))
        sites_opts = [{"id": s.id, "name": s.name, "code": s.code} for s in session.execute(sites_q).all()]

        # Faceta dinâmica de versões de SO calculada sobre o contexto ativo
        versoes_query = (
            select(Device.sistema, Device.versao, Device.windows_release)
            .where(
                Device.company_id == current_user.company_id,
                Device.active.is_(True),
            )
            .distinct()
        )
        if not is_global_viewer:
            versoes_query = versoes_query.where(Device.site_id.in_(allowed_sites))
        if site_id is not None and isinstance(site_id, int):
            if site_id in (-1, 0):
                versoes_query = versoes_query.where(Device.site_id.is_(None))
            else:
                versoes_query = versoes_query.where(Device.site_id == site_id)
        if loja and isinstance(loja, str) and loja.strip():
            versoes_query = versoes_query.where(Device.loja.ilike(f"%{loja.strip()}%"))
        if search and isinstance(search, str) and search.strip():
            termo = f"%{search.strip()}%"
            versoes_query = versoes_query.where(
                or_(
                    Device.hostname.ilike(termo),
                    Device.ip.ilike(termo),
                    Device.mac.ilike(termo),
                    Device.rustdesk_id.ilike(termo),
                    Device.patrimonio.ilike(termo),
                    Device.loja.ilike(termo),
                    Device.usuario.ilike(termo),
                )
            )
        if plataforma:
            if plataforma.lower() == "windows":
                versoes_query = versoes_query.where(Device.sistema.ilike("%windows%"))
            elif plataforma.lower() == "linux":
                versoes_query = versoes_query.where(not_(Device.sistema.ilike("%windows%")))

        vers_raw = session.execute(versoes_query).all()
        versoes_opts = formatar_lista_versoes(vers_raw)

        filter_options = {
            "sites": sites_opts,
            "versoes": versoes_opts,
            "plataformas": ["Linux", "Windows"],
        }

        charts_summary = calcular_charts_summary(session, count_query.whereclause, kpis)

        return {
            "items": [normalizar_device_list_item(device) for device in devices],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": ((total + per_page - 1) // per_page) if per_page else 1,
            },
            "kpis": kpis,
            "filter_options": filter_options,
            "charts_summary": charts_summary,
        }


@router.get("/options")
def get_device_filter_options(
    current_user: User = Depends(get_current_user),
):
    """Retorna opções disponíveis para os filtros (sites/filiais e versões de SO)."""
    with Session(engine) as session:
        is_global = is_admin_user(current_user) or is_matriz_operator(current_user)
        sites_q = select(Site.id, Site.name, Site.code).where(Site.active.is_(True)).order_by(Site.name)
        if not is_global:
            allowed = select(user_site_access.c.site_id).where(user_site_access.c.user_id == current_user.id)
            sites_q = sites_q.where(Site.id.in_(allowed))
        sites = [{"id": s.id, "name": s.name, "code": s.code} for s in session.execute(sites_q).all()]

        vers_raw = session.execute(
            select(Device.sistema, Device.versao, Device.windows_release)
            .where(Device.company_id == current_user.company_id, Device.active.is_(True))
            .distinct()
        ).all()

        return {
            "sites": sites,
            "versoes": formatar_lista_versoes(vers_raw),
            "plataformas": ["Linux", "Windows"],
        }


def calcular_site_vlan_ips(
    session: Session,
    company_id: int,
    site_id: int,
    range_id: Optional[int] = None,
    exclude_device_id: Optional[int] = None,
) -> list[dict[str, Any]]:
    """
    Calcula as faixas de IP/VLAN da loja (SiteIpRange), identificando:
    - free_ips: Lista ordenada de todos os IPs 100% livres naquela faixa
      (não utilizados por devices ativos nem por network_assets).
    - workstation_used_ips: Lista contendo exclusivamente os IPs em uso por
      Estações de Trabalho ativas (Device) naquela faixa.
    """
    stmt = (
        select(SiteIpRange)
        .where(
            SiteIpRange.company_id == company_id,
            SiteIpRange.site_id == site_id,
        )
        .order_by(SiteIpRange.nome.asc())
    )
    if range_id:
        stmt = stmt.where(SiteIpRange.id == range_id)

    ranges = session.scalars(stmt).all()
    if not ranges:
        return []

    net_assets = session.scalars(
        select(NetworkAsset.ip).where(
            NetworkAsset.company_id == company_id,
            NetworkAsset.ip.isnot(None),
        )
    ).all()

    occupied_ips = set()
    for ip_val in net_assets:
        if ip_val and ip_val.strip():
            occupied_ips.add(ip_val.strip())

    dev_stmt = select(Device).where(
        Device.company_id == company_id,
        Device.active.is_(True),
        Device.ip.isnot(None),
    )
    if exclude_device_id:
        dev_stmt = dev_stmt.where(Device.id != exclude_device_id)

    active_devs = session.scalars(dev_stmt).all()

    devs_by_ip: dict[str, Device] = {}
    for d in active_devs:
        clean_ip = (d.ip or "").strip()
        if clean_ip and not is_subnet_88(clean_ip):
            occupied_ips.add(clean_ip)
            if clean_ip not in devs_by_ip:
                devs_by_ip[clean_ip] = d
        clean_def = (d.ip_definitivo or "").strip()
        if clean_def and not is_subnet_88(clean_def):
            occupied_ips.add(clean_def)

    result_ranges = []
    for r in ranges:
        try:
            s_ip = ipaddress.IPv4Address(r.ip_inicio.strip())
            e_ip = ipaddress.IPv4Address(r.ip_fim.strip())
            s_int = int(s_ip)
            e_int = int(e_ip)
        except Exception:
            continue

        if s_int > e_int:
            continue

        vlan_id = None
        m = re.search(r"vlan\s*(\d+)", r.nome or "", re.IGNORECASE)
        if m:
            try:
                vlan_id = int(m.group(1))
            except Exception:
                vlan_id = None

        gw_int = None
        if r.gateway and r.gateway.strip():
            try:
                gw_int = int(ipaddress.IPv4Address(r.gateway.strip()))
            except Exception:
                gw_int = None

        net_obj = None
        if r.mascara and r.mascara.strip():
            try:
                m_str = r.mascara.strip().lstrip('/')
                if m_str.isdigit():
                    net_obj = ipaddress.IPv4Network(f"{r.ip_inicio.strip()}/{int(m_str)}", strict=False)
                else:
                    net_obj = ipaddress.IPv4Network(f"{r.ip_inicio.strip()}/{m_str}", strict=False)
            except Exception:
                net_obj = None

        net_start_int = int(net_obj.network_address) if net_obj else None
        net_end_int = int(net_obj.broadcast_address) if net_obj else None
        is_class_c_or_smaller = (net_obj.prefixlen >= 24) if net_obj else ((e_int - s_int + 1) <= 256)

        free_ips = []
        workstation_used_ips = []

        max_span = min(e_int - s_int + 1, 8192)
        for cur_int in range(s_int, s_int + max_span):
            cur_ip_str = str(ipaddress.IPv4Address(cur_int))
            last_octet = cur_int & 0xFF

            if gw_int is not None and cur_int == gw_int:
                continue

            if cur_ip_str in occupied_ips:
                continue

            # Se for /24 ou menor, descarta .0 e .255 tradicionais
            # Se for sub-rede maior (ex: /20), descarta apenas o IP de rede e broadcast da sub-rede
            if is_class_c_or_smaller:
                if last_octet == 0 or last_octet == 255:
                    continue
            else:
                if (net_start_int is not None and cur_int == net_start_int) or (net_end_int is not None and cur_int == net_end_int):
                    continue

            free_ips.append(cur_ip_str)

        for ip_str, d in devs_by_ip.items():
            try:
                ip_int = int(ipaddress.IPv4Address(ip_str))
                if s_int <= ip_int <= e_int:
                    workstation_used_ips.append({
                        "ip": ip_str,
                        "device_id": d.id,
                        "hostname": d.hostname or "Sem Hostname",
                        "patrimonio": d.patrimonio or "",
                        "sistema": f"{d.sistema or ''} {d.versao or ''}".strip(),
                    })
            except Exception:
                continue

        workstation_used_ips.sort(key=lambda x: int(ipaddress.IPv4Address(x["ip"])))

        result_ranges.append({
            "id": r.id,
            "name": r.nome,
            "vlan_id": vlan_id,
            "ip_start": r.ip_inicio,
            "ip_end": r.ip_fim,
            "gateway": r.gateway or "",
            "mask": r.mascara or "",
            "free_count": len(free_ips),
            "workstations_count": len(workstation_used_ips),
            "free_ips": free_ips,
            "workstation_used_ips": workstation_used_ips,
        })

    return result_ranges


@router.get("/site-vlan-ips", response_model=SiteVlanIpsResponse)
def get_site_vlan_ips(
    site_id: int,
    range_id: Optional[int] = None,
    exclude_device_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
):
    """
    Retorna as faixas de rede/VLANs cadastradas da filial, com contagens
    e listas mastigadas de IPs livres (free_ips) e IPs em uso por estações (workstation_used_ips).
    """
    with Session(engine) as session:
        site = session.scalar(
            select(Site).where(
                Site.id == site_id,
                Site.company_id == current_user.company_id,
                Site.active.is_(True),
            )
        )
        if not site:
            raise HTTPException(status_code=404, detail="Filial não encontrada ou inativa.")

        ranges = calcular_site_vlan_ips(
            session=session,
            company_id=current_user.company_id,
            site_id=site_id,
            range_id=range_id,
            exclude_device_id=exclude_device_id,
        )

        return {
            "site_id": site.id,
            "site_name": site.name,
            "site_code": site.code or "",
            "ranges": ranges,
        }


@router.get("/{device_id}", response_model=DeviceDetailResponse)
def get_device(
    device_id: int,
    current_user: User = Depends(get_current_user),
):
    """Retorna detalhes completos de hardware, discos, rede e periféricos de um dispositivo."""
    with Session(engine) as session:
        device = session.scalar(
            select(Device).where(
                Device.id == device_id,
                Device.company_id == current_user.company_id,
            )
        )
        if not device:
            raise HTTPException(status_code=404, detail="Dispositivo não encontrado")

        is_global_viewer = is_admin_user(current_user) or is_matriz_operator(current_user)
        if not is_global_viewer:
            allowed = session.scalar(
                select(user_site_access.c.site_id)
                .where(
                    user_site_access.c.user_id == current_user.id,
                    user_site_access.c.site_id == device.site_id,
                )
            )
            if not allowed:
                raise HTTPException(status_code=403, detail="Acesso não autorizado a este dispositivo.")

        history_count = session.scalar(
            select(func.count(DeviceHistory.id))
            .where(
                DeviceHistory.device_id == device.id,
                DeviceHistory.campo.notin_(IGNORED_HISTORY_FIELDS),
            )
        ) or 0

        is_operator = not is_admin_user(current_user)
        return normalizar_device_detail(device, history_count=history_count, is_operator=is_operator)


@router.get("/patrimonio/lookup")
def lookup_patrimonio(
    patrimonio: str = Query(...),
    current_device_id: Optional[int] = Query(default=None),
    current_user: User = Depends(get_current_user),
):
    """
    Consulta em tempo real se o número de patrimônio já existe no inventário
    (pesquisando em Device e NetworkAsset). Retorna dados do ativo anterior e comparativo de divergências.
    """
    nums = extrair_digitos_patrimonio(patrimonio)
    if not nums:
        return {"exists": False, "patrimonio_formatado": "", "message": "Patrimônio sem dígitos"}

    pat_formatado = f"pat.{nums}"

    with Session(engine) as session:
        match_info = resolver_ativo_por_patrimonio(
            session=session,
            company_id=current_user.company_id,
            pat_formatado=pat_formatado,
            nums=nums,
            exclude_device_id=current_device_id,
        )

        if not match_info["exists"]:
            return {
                "exists": False,
                "patrimonio_formatado": pat_formatado,
                "message": "Nenhum ativo anterior encontrado com este patrimônio.",
            }

        curr_dev = None
        if current_device_id:
            curr_dev = session.scalar(
                select(Device).where(
                    Device.id == current_device_id,
                    Device.company_id == current_user.company_id,
                )
            )

        fam_ant = match_info["fam_ant"]
        old_so = match_info["old_so"]
        old_mac = match_info["old_mac"]
        old_hostname = match_info["old_hostname"]
        old_ip = match_info["old_ip"]

        so_atual = f"{curr_dev.sistema or ''} {curr_dev.versao or ''}".strip() if curr_dev else ""
        fam_atual = classificar_familia_so(curr_dev.sistema, curr_dev.versao) if curr_dev else ""
        so_divergente = bool(curr_dev and match_info["existing_dev"] and fam_ant != fam_atual)

        mac_ant = old_mac
        mac_atual = curr_dev.mac or "" if curr_dev else ""
        mac_divergente = bool(
            curr_dev
            and mac_ant
            and mac_atual
            and mac_ant.lower().replace("-", ":") != mac_atual.lower().replace("-", ":")
        )

        host_ant = old_hostname
        host_atual = curr_dev.hostname or "" if curr_dev else ""
        host_divergente = bool(curr_dev and host_ant and host_atual and host_ant.lower() != host_atual.lower())

        return {
            "exists": True,
            "patrimonio_formatado": pat_formatado,
            "tipo_origem": match_info["existing_asset_dict"]["tipo_origem"],
            "linked_device_id": match_info["linked_device_id"],
            "linked_network_asset_id": match_info["linked_network_asset_id"],
            "tem_conflito": match_info["tem_conflito"],
            "conflitos": match_info["conflitos"],
            "existing_device": match_info["existing_asset_dict"],
            "comparativo": {
                "so_divergente": so_divergente,
                "so_anterior": old_so,
                "so_atual": so_atual,
                "familia_anterior": fam_ant,
                "familia_atual": fam_atual,
                "mac_divergente": mac_divergente,
                "mac_anterior": mac_ant,
                "mac_atual": mac_atual,
                "host_divergente": host_divergente,
                "host_anterior": host_ant,
                "host_atual": host_atual,
                "ip_anterior": old_ip,
                "parece_mesmo_equipamento": not mac_divergente and not host_divergente,
            },
        }


@router.get("/{device_id}/history")
def get_device_history(
    device_id: int,
    limit: int = Query(default=100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
):
    """Retorna o histórico de alterações críticas de um dispositivo."""
    with Session(engine) as session:
        device = session.scalar(
            select(Device).where(
                Device.id == device_id,
                Device.company_id == current_user.company_id,
            )
        )
        if not device:
            raise HTTPException(status_code=404, detail="Dispositivo não encontrado")

        p_limit = limit if isinstance(limit, int) and limit > 0 else 100
        histories = session.scalars(
            select(DeviceHistory)
            .where(
                DeviceHistory.device_id == device_id,
                DeviceHistory.campo.notin_(IGNORED_HISTORY_FIELDS),
            )
            .order_by(DeviceHistory.data_alteracao.desc())
            .limit(p_limit)
        ).all()

        return [
            {
                "id": h.id,
                "campo": h.campo,
                "valor_anterior": h.valor_anterior,
                "valor_novo": h.valor_novo,
                "data_alteracao": formatar_data_brasilia(h.data_alteracao, incluir_segundos=True),
            }
            for h in histories
        ]


@router.post("/{device_id}/clear-alert")
def clear_device_alert(
    device_id: int,
    current_user: User = Depends(get_current_user),
):
    """Limpa o alerta de hardware/MAC pendente de um dispositivo (exclusivo para Administrador)."""
    if not is_admin_user(current_user):
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
    """Exclui permanentemente um dispositivo e seu histórico do inventário (exclusivo para Administrador)."""
    if not is_admin_user(current_user):
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


@router.patch("/{device_id}/patrimonio")
def update_device_patrimonio(
    device_id: int,
    payload: DevicePatrimonioIn,
    current_user: User = Depends(get_current_user),
):
    """
    Atualiza o campo manual de patrimônio.
    - Operador matriz pode editar a primeira vez (enquanto não homologado).
    - Após confirmação pelo admin, torna-se imutável para operador matriz.
    - Administradores podem editar a qualquer momento.
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

        admin_flag = is_admin_user(current_user)
        matriz_flag = is_matriz_operator(current_user)

        if not admin_flag and not matriz_flag:
            raise HTTPException(
                status_code=403,
                detail="Você não tem permissão para editar o patrimônio deste equipamento.",
            )

        if matriz_flag and not admin_flag:
            if not is_subnet_88(device.ip):
                raise HTTPException(
                    status_code=403,
                    detail="Operadores da matriz só possuem permissão para cadastrar ou alterar patrimônio em máquinas na bancada (192.168.88.x).",
                )
            if device.firewall_status == "confirmado":
                raise HTTPException(
                    status_code=403,
                    detail="O patrimônio já foi homologado pelo administrador e está bloqueado para alteração.",
                )

        patrimonio_formatado = formatar_patrimonio(payload.patrimonio)
        if not patrimonio_formatado:
            raise HTTPException(status_code=400, detail="O patrimônio deve conter dígitos numéricos (ex: pat.35192).")

        validar_restricao_bancada_patrimonio(device, patrimonio_formatado, current_user)

        antigo = device.patrimonio
        device.patrimonio = patrimonio_formatado
        device.updated_at = datetime.utcnow()

        operador_nome = current_user.full_name or current_user.username
        if antigo != patrimonio_formatado:
            session.add(
                DeviceHistory(
                    device_id=device.id,
                    campo="PATRIMONIO",
                    valor_anterior=antigo or "(vazio)",
                    valor_novo=patrimonio_formatado,
                    alterado_por=operador_nome,
                    data_alteracao=datetime.utcnow(),
                )
            )

        session.commit()
        return {
            "status": "ok",
            "patrimonio": patrimonio_formatado,
            "message": "Patrimônio atualizado com sucesso.",
        }


@router.post("/{device_id}/firewall-solicitar")
def solicitar_firewall(
    device_id: int,
    payload: Optional[DeviceFirewallSolicitarIn] = None,
    current_user: User = Depends(get_current_user),
):
    """
    Marca a máquina para homologação e liberação no firewall.
    Disponível para operador matriz e administradores.
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

        if not is_admin_user(current_user):
            if not is_matriz_operator(current_user):
                raise HTTPException(
                    status_code=403,
                    detail="Apenas administradores e operadores da matriz podem marcar máquinas para cadastro no firewall.",
                )
            if not is_subnet_88(device.ip):
                raise HTTPException(
                    status_code=403,
                    detail="Operadores da matriz só possuem permissão para solicitar firewall em máquinas na bancada (192.168.88.x).",
                )
            if device.firewall_status == "confirmado":
                raise HTTPException(
                    status_code=403,
                    detail="O cadastro no firewall desta máquina já foi confirmado pelo administrador.",
                )

        if payload and payload.patrimonio:
            pat_novo = formatar_patrimonio(payload.patrimonio)
            if pat_novo:
                validar_restricao_bancada_patrimonio(device, pat_novo, current_user)
                device.patrimonio = pat_novo

        operador_nome = current_user.full_name or current_user.username
        device.firewall_status = "pendente"
        device.firewall_solicitado_por = operador_nome
        device.firewall_solicitado_em = datetime.utcnow()
        device.updated_at = datetime.utcnow()

        session.add(
            DeviceHistory(
                device_id=device.id,
                campo="FIREWALL_STATUS",
                valor_anterior=device.firewall_status or "nenhum",
                valor_novo=f"Pendente - Solicitado por {operador_nome}",
            )
        )

        session.commit()
        return {
            "status": "ok",
            "firewall_status": "pendente",
            "firewall_solicitado_por": operador_nome,
            "firewall_solicitado_em": device.firewall_solicitado_em.strftime("%Y-%m-%d %H:%M:%S"),
            "patrimonio": device.patrimonio,
            "message": "Máquina marcada para cadastro no firewall com sucesso.",
        }


@router.post("/{device_id}/firewall-confirmar")
def confirmar_firewall(
    device_id: int,
    current_user: User = Depends(get_current_user),
):
    """Confirma que a máquina foi liberada no firewall. Exclusivo para administradores."""
    if not is_admin_user(current_user):
        raise HTTPException(
            status_code=403,
            detail="Apenas administradores podem confirmar a liberação no firewall.",
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

        admin_nome = current_user.full_name or current_user.username
        device.firewall_status = "confirmado"
        device.firewall_confirmado_por = admin_nome
        device.firewall_confirmado_em = datetime.utcnow()
        device.updated_at = datetime.utcnow()

        session.add(
            DeviceHistory(
                device_id=device.id,
                campo="FIREWALL_STATUS",
                valor_anterior="pendente",
                valor_novo=f"Confirmado por {admin_nome}",
            )
        )

        session.commit()
        return {
            "status": "ok",
            "firewall_status": "confirmado",
            "firewall_confirmado_por": admin_nome,
            "firewall_confirmado_em": device.firewall_confirmado_em.strftime("%Y-%m-%d %H:%M:%S"),
            "message": f"Cadastro no firewall confirmado por {admin_nome}.",
        }


@router.post("/{device_id}/solicitar-recadastro")
def solicitar_recadastro(
    device_id: int,
    payload: DeviceSolicitarRecadastroIn,
    current_user: User = Depends(get_current_user),
):
    """
    Submissão do cadastro/recadastro realizada pelo operador.
    Valida patrimônio, detecta divergência de SO e registra licença Windows se solicitada.
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

        if not is_admin_user(current_user):
            if not is_matriz_operator(current_user):
                raise HTTPException(
                    status_code=403,
                    detail="Apenas administradores e operadores autorizados podem solicitar recadastro de máquinas.",
                )
            if not is_subnet_88(device.ip):
                raise HTTPException(
                    status_code=403,
                    detail="Operadores da matriz só possuem permissão para cadastrar ou alterar patrimônio em máquinas na bancada (192.168.88.x).",
                )
            if device.firewall_status == "confirmado":
                raise HTTPException(
                    status_code=403,
                    detail="O patrimônio já foi homologado pelo administrador e está bloqueado para alteração.",
                )

        pat_formatado = formatar_patrimonio(payload.patrimonio)
        if not pat_formatado:
            raise HTTPException(status_code=400, detail="O patrimônio deve conter números válidos.")

        validar_restricao_bancada_patrimonio(device, pat_formatado, current_user)

        nums = extrair_digitos_patrimonio(payload.patrimonio)
        existing_other = session.scalar(
            select(Device).where(
                Device.company_id == current_user.company_id,
                or_(
                    Device.patrimonio.ilike(pat_formatado),
                    Device.patrimonio.ilike(f"%{nums}%"),
                ),
                Device.id != device.id,
                Device.active.is_(True),
            )
        )

        so_divergente = False
        fam_atual = classificar_familia_so(device.sistema, device.versao)

        if existing_other:
            fam_ant = classificar_familia_so(existing_other.sistema, existing_other.versao)
            if fam_ant != fam_atual:
                so_divergente = True
                if not payload.confirmacao_mudanca_so:
                    so_ant_str = f"{existing_other.sistema or ''} {existing_other.versao or ''}".strip()
                    so_atual_str = f"{device.sistema or ''} {device.versao or ''}".strip()
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"Divergência de Sistema Operacional detectada! "
                            f"O patrimônio {pat_formatado} pertencia à máquina '{existing_other.hostname}' "
                            f"com {so_ant_str}, e a máquina atual reporta {so_atual_str}. "
                            f"Confirme explicitamente que a alteração de sistema operacional é intencional para prosseguir."
                        ),
                    )

        operador_nome = current_user.full_name or current_user.username
        device.patrimonio = pat_formatado
        device.firewall_status = "pendente"
        device.firewall_solicitado_por = operador_nome
        device.firewall_solicitado_em = datetime.utcnow()
        device.licenca_windows_solicitada = bool(payload.licenca_windows_solicitada)
        device.motivo_alteracao = payload.motivo
        if existing_other and so_divergente:
            device.so_anterior = f"{existing_other.sistema or ''} {existing_other.versao or ''}".strip()
        device.updated_at = datetime.utcnow()

        hist_msg = f"Solicitado por {operador_nome}. Patrimônio: {pat_formatado}."
        if payload.licenca_windows_solicitada:
            hist_msg += " [Nova licença Windows necessária marcada]."
        if so_divergente and device.so_anterior:
            hist_msg += f" [Mudança de SO confirmada: de {device.so_anterior} para {device.sistema}]."
        if payload.motivo:
            hist_msg += f" Motivo: {payload.motivo}."

        session.add(
            DeviceHistory(
                device_id=device.id,
                campo="SOLICITACAO_RECADASTRO",
                valor_anterior=device.firewall_status or "nenhum",
                valor_novo=hist_msg[:1000],
                alterado_por=operador_nome,
                data_alteracao=datetime.utcnow(),
            )
        )

        session.commit()
        return {
            "status": "ok",
            "device_id": device.id,
            "firewall_status": "pendente",
            "firewall_solicitado_por": operador_nome,
            "firewall_solicitado_em": device.firewall_solicitado_em.strftime("%Y-%m-%d %H:%M:%S"),
            "patrimonio": pat_formatado,
            "licenca_windows_solicitada": device.licenca_windows_solicitada,
            "message": "Solicitação de recadastro e homologação enviada com sucesso.",
        }


@router.get("/{device_id}/approval-context")
def get_approval_context(
    device_id: int,
    current_user: User = Depends(get_current_user),
):
    """
    Retorna todo o contexto estruturado para o Modal de Ajuste Cadastral:
    Seção A: Dados recebidos da máquina
    Seção B: Correspondência com ativo anterior (Device e NetworkAsset) e divergências
    Seção C: Loja resolvida, faixas de IP disponíveis, IPs ocupados e sugestão de IP anterior
    """
    with Session(engine) as session:
        device = session.scalar(
            select(Device)
            .options(selectinload(Device.site))
            .where(
                Device.id == device_id,
                Device.company_id == current_user.company_id,
            )
        )
        if not device:
            raise HTTPException(status_code=404, detail="Dispositivo não encontrado")

        is_88 = is_subnet_88(device.ip)
        site_name = device.site.name if device.site else device.loja or ""

        match_info = {
            "exists": False,
            "existing_asset_dict": None,
            "tem_conflito": False,
            "conflitos": [],
            "existing_dev": None,
            "existing_net": None,
            "old_hostname": "",
            "old_ip": "",
            "old_mac": "",
            "old_site_id": None,
        }

        if device.patrimonio:
            nums = extrair_digitos_patrimonio(device.patrimonio)
            if nums:
                pat_formatado = f"pat.{nums}"
                match_info = resolver_ativo_por_patrimonio(
                    session=session,
                    company_id=current_user.company_id,
                    pat_formatado=pat_formatado,
                    nums=nums,
                    exclude_device_id=device.id,
                )

        divergencias = []
        so_divergente = False
        ip_anterior_sugerido = ""

        if match_info["exists"]:
            existing_dev = match_info["existing_dev"]
            host_val = match_info["old_hostname"]
            ip_val = match_info["old_ip"]
            mac_val = match_info["old_mac"]
            site_id_val = match_info["old_site_id"]

            old_host = host_val or ""
            new_host = device.hostname or ""
            if old_host and new_host and old_host.lower() != new_host.lower():
                divergencias.append({"campo": "Hostname", "anterior": old_host, "atual": new_host})

            old_ip_disp = ip_val or "(não registrado)"
            new_ip_disp = device.ip or ""
            if old_ip_disp != new_ip_disp:
                divergencias.append({"campo": "IP", "anterior": old_ip_disp, "atual": new_ip_disp})

            old_mac_disp = mac_val or ""
            new_mac_disp = device.mac or ""
            if old_mac_disp and new_mac_disp and old_mac_disp.lower().replace("-", ":") != new_mac_disp.lower().replace("-", ":"):
                divergencias.append({"campo": "MAC", "anterior": old_mac_disp, "atual": new_mac_disp})

            if existing_dev:
                old_so_str = f"{existing_dev.sistema or ''} {existing_dev.versao or ''}".strip()
                new_so_str = f"{device.sistema or ''} {device.versao or ''}".strip()
                fam_old = classificar_familia_so(existing_dev.sistema, existing_dev.versao)
                fam_new = classificar_familia_so(device.sistema, device.versao)
                if fam_old != fam_new or old_so_str.lower() != new_so_str.lower():
                    so_divergente = (fam_old != fam_new)
                    divergencias.append({"campo": "Sistema Operacional", "anterior": old_so_str, "atual": new_so_str})

            # Sugestão de IP: prioriza IP corporativo do ativo anterior
            if ip_val and is_valid_ipv4_non_bench(ip_val):
                ip_anterior_sugerido = ip_val
            elif device.ip_definitivo and is_valid_ipv4_non_bench(device.ip_definitivo):
                ip_anterior_sugerido = device.ip_definitivo
            elif device.ip and is_valid_ipv4_non_bench(device.ip):
                ip_anterior_sugerido = device.ip
        else:
            if device.ip_definitivo and is_valid_ipv4_non_bench(device.ip_definitivo):
                ip_anterior_sugerido = device.ip_definitivo
            elif device.ip and is_valid_ipv4_non_bench(device.ip):
                ip_anterior_sugerido = device.ip

        all_sites = session.scalars(
            select(Site)
            .where(Site.company_id == current_user.company_id, Site.active.is_(True))
            .order_by(Site.code.asc())
        ).all()
        sites_list = [{"id": s.id, "name": s.name, "code": s.code} for s in all_sites]

        # Determinação automática da filial sugerida (suggested_site_id)
        suggested_site_id = None
        suggested_site_name = ""
        suggested_site_code = ""
        matched_by = None

        # 1. Filial do ativo anterior de mesmo patrimônio
        if match_info.get("old_site_id"):
            old_s = session.scalar(
                select(Site).where(
                    Site.id == match_info["old_site_id"],
                    Site.company_id == current_user.company_id,
                    Site.active.is_(True),
                )
            )
            if old_s:
                suggested_site_id = old_s.id
                suggested_site_name = old_s.name
                suggested_site_code = old_s.code or ""
                matched_by = "Ativo anterior (mesmo patrimônio)"

        # 2. Regras de identificadores de loja (SiteIdentifier / prefixo do hostname)
        if not suggested_site_id:
            sim_res = simular_identificacao_site(
                hostname=device.hostname,
                company_id=current_user.company_id,
                db=session,
                loja=device.loja,
                ip=device.ip,
            )
            if sim_res and sim_res.get("matched"):
                suggested_site_id = sim_res.get("site_id")
                suggested_site_name = sim_res.get("site_name") or ""
                suggested_site_code = sim_res.get("site_code") or ""
                matched_by = sim_res.get("matched_by") or "Prefixo de Hostname"

        # 3. Filial já associada ao dispositivo (se existente e fora de bancada)
        if not suggested_site_id and device.site_id:
            cur_s = session.scalar(
                select(Site).where(
                    Site.id == device.site_id,
                    Site.company_id == current_user.company_id,
                    Site.active.is_(True),
                )
            )
            if cur_s:
                suggested_site_id = cur_s.id
                suggested_site_name = cur_s.name
                suggested_site_code = cur_s.code or ""
                matched_by = "Dispositivo atual"

        # Fallback se ainda não houver loja
        if not suggested_site_id and all_sites:
            suggested_site_id = all_sites[0].id
            suggested_site_name = all_sites[0].name
            suggested_site_code = all_sites[0].code or ""
            matched_by = "Padrão"

        resolved_site_id = suggested_site_id or device.site_id

        # Calcula faixas de VLAN e IPs livres / ocupados mastigados pelo Back-end
        vlan_ranges = []
        if resolved_site_id:
            vlan_ranges = calcular_site_vlan_ips(
                session=session,
                company_id=current_user.company_id,
                site_id=resolved_site_id,
                exclude_device_id=device.id,
            )

        faixas_list = []
        ips_ocupados = set()
        if resolved_site_id:
            faixas = session.scalars(
                select(SiteIpRange)
                .where(SiteIpRange.site_id == resolved_site_id, SiteIpRange.company_id == current_user.company_id)
                .order_by(SiteIpRange.nome.asc())
            ).all()
            faixas_list = [
                {
                    "id": f.id,
                    "nome": f.nome,
                    "ip_inicio": f.ip_inicio,
                    "ip_fim": f.ip_fim,
                    "gateway": f.gateway or "",
                    "mascara": f.mascara or "",
                }
                for f in faixas
            ]

            dev_ips = session.scalars(
                select(Device.ip).where(
                    Device.site_id == resolved_site_id,
                    Device.company_id == current_user.company_id,
                    Device.id != device.id,
                    Device.active.is_(True),
                    Device.ip.isnot(None),
                )
            ).all()
            for ip_item in dev_ips:
                if ip_item and not is_subnet_88(ip_item):
                    ips_ocupados.add(ip_item)

            net_ips = session.scalars(
                select(NetworkAsset.ip).where(
                    NetworkAsset.site_id == resolved_site_id,
                    NetworkAsset.company_id == current_user.company_id,
                    NetworkAsset.ip.isnot(None),
                )
            ).all()
            for ip_item in net_ips:
                if ip_item:
                    ips_ocupados.add(ip_item)

        return {
            "device": {
                "id": device.id,
                "hostname": device.hostname,
                "ip": device.ip or "",
                "ip_definitivo": device.ip_definitivo or "",
                "mac": device.mac or "",
                "sistema": device.sistema or "",
                "versao": device.versao or "",
                "loja": site_name,
                "site_id": device.site_id,
                "patrimonio": device.patrimonio or "",
                "firewall_status": device.firewall_status or "pendente",
                "firewall_solicitado_por": device.firewall_solicitado_por or "",
                "firewall_solicitado_em": device.firewall_solicitado_em.strftime("%Y-%m-%d %H:%M:%S") if device.firewall_solicitado_em else "",
                "licenca_windows_solicitada": bool(device.licenca_windows_solicitada),
                "motivo_alteracao": device.motivo_alteracao or "",
                "so_anterior": device.so_anterior or "",
                "is_rede_formatacao": is_88,
            },
            "existing_asset": match_info["existing_asset_dict"],
            "tem_conflito": match_info["tem_conflito"],
            "conflitos": match_info["conflitos"],
            "divergencias": divergencias,
            "so_divergente": so_divergente,
            "network_context": {
                "resolved_site_id": resolved_site_id,
                "suggested_site_id": suggested_site_id,
                "suggested_site_name": suggested_site_name,
                "suggested_site_code": suggested_site_code,
                "matched_by": matched_by,
                "sites": sites_list,
                "faixas": faixas_list,
                "ips_ocupados": sorted(list(ips_ocupados)),
                "ip_anterior_sugerido": ip_anterior_sugerido,
                "ip_confiavel": bool(ip_anterior_sugerido),
                "vlan_ranges": vlan_ranges,
            },
        }


@router.post("/{device_id}/aprovar-cadastro")
def aprovar_cadastro(
    device_id: int,
    payload: DeviceAprovarCadastroIn,
    current_user: User = Depends(get_current_user),
):
    """
    Decisão final do administrador:
    - Valida o IP definitivo
    - Detecta conflito de IP em uso com opção de sobrescrita
    - Vincula ao ativo anterior substituído (em Device ou NetworkAsset)
    - Define status como homologado e registra auditoria completa
    """
    if not is_admin_user(current_user):
        raise HTTPException(
            status_code=403,
            detail="Apenas administradores podem aprovar e concluir o cadastro de equipamentos.",
        )

    ip_def = payload.ip_definitivo.strip()
    try:
        ipaddress.IPv4Address(ip_def)
    except Exception:
        raise HTTPException(status_code=400, detail=f"O IP definitivo '{ip_def}' não é um endereço IPv4 válido.")

    with Session(engine) as session:
        device = session.scalar(
            select(Device).where(
                Device.id == device_id,
                Device.company_id == current_user.company_id,
            )
        )
        if not device:
            raise HTTPException(status_code=404, detail="Dispositivo não encontrado")

        target_site = session.scalar(
            select(Site).where(
                Site.id == payload.site_id,
                Site.company_id == current_user.company_id,
                Site.active.is_(True),
            )
        )
        if not target_site:
            raise HTTPException(status_code=400, detail="Filial / Loja selecionada inválida ou inativa.")

        outro_com_ip = session.scalar(
            select(Device).where(
                Device.company_id == current_user.company_id,
                Device.ip == ip_def,
                Device.id != device.id,
                Device.id != (payload.vincular_ativo_existente_id or -1),
                Device.active.is_(True),
            )
        )
        outro_net_ip = session.scalar(
            select(NetworkAsset).where(
                NetworkAsset.company_id == current_user.company_id,
                NetworkAsset.ip == ip_def,
                NetworkAsset.id != (payload.vincular_network_asset_id or -1),
            )
        )

        if (outro_com_ip or outro_net_ip) and not payload.confirmar_sobrescrita_ip:
            detalhe_ocupante = f"estação '{outro_com_ip.hostname}'" if outro_com_ip else f"ativo de rede '{outro_net_ip.nome}'"
            raise HTTPException(
                status_code=409,
                detail=f"Conflito de IP: O endereço {ip_def} já está em uso pela {detalhe_ocupante} da loja. Selecione outro IP ou confirme a substituição.",
            )

        admin_nome = current_user.full_name or current_user.username
        ip_antigo = device.ip
        site_antigo = device.loja

        # Se houver outra estação com este IP e o admin confirmou a sobrescrita/reutilização de IP:
        # Libera o IP da estação anterior para evitar duplicidade de IP ativo no banco
        if outro_com_ip and payload.confirmar_sobrescrita_ip:
            if not payload.vincular_ativo_existente_id or payload.vincular_ativo_existente_id != outro_com_ip.id:
                session.add(
                    DeviceHistory(
                        device_id=outro_com_ip.id,
                        campo="IP_SOBRESCRITO",
                        valor_anterior=outro_com_ip.ip,
                        valor_novo="(liberado por reuso)",
                        alterado_por=admin_nome,
                        data_alteracao=datetime.utcnow(),
                    )
                )
                outro_com_ip.ip = None
                outro_com_ip.updated_at = datetime.utcnow()

        # Vinculação e aposentadoria de estação de trabalho anterior
        if payload.vincular_ativo_existente_id and payload.vincular_ativo_existente_id != device.id:
            antigo_ativo = session.scalar(
                select(Device).where(
                    Device.id == payload.vincular_ativo_existente_id,
                    Device.company_id == current_user.company_id,
                )
            )
            if antigo_ativo:
                session.add(
                    DeviceHistory(
                        device_id=antigo_ativo.id,
                        campo="RECADASTRO_SUBSTITUICAO",
                        valor_anterior=f"Ativo anterior substituído por recadastro (ID novo: {device.id})",
                        valor_novo=f"Recadastrado com Hostname {device.hostname}, MAC {device.mac}, SO {device.sistema}",
                        alterado_por=admin_nome,
                        data_alteracao=datetime.utcnow(),
                    )
                )
                antigo_ativo.active = False
                antigo_ativo.updated_at = datetime.utcnow()

        # Vinculação e sincronização com NetworkAsset
        if payload.vincular_network_asset_id:
            antigo_net = session.scalar(
                select(NetworkAsset).where(
                    NetworkAsset.id == payload.vincular_network_asset_id,
                    NetworkAsset.company_id == current_user.company_id,
                )
            )
            if antigo_net:
                antigo_net.ip = ip_def
                if device.mac:
                    antigo_net.mac = device.mac
                if device.hostname:
                    antigo_net.nome = device.hostname
                antigo_net.site_id = target_site.id
                antigo_net.updated_at = datetime.utcnow()
                antigo_obs = antigo_net.observacoes or ""
                nova_obs = f"Homologado e sincronizado com a estação '{device.hostname}' por {admin_nome} em {datetime.utcnow().strftime('%d/%m/%Y %H:%M')}."
                antigo_net.observacoes = f"{antigo_obs}\n{nova_obs}".strip() if antigo_obs else nova_obs
                session.add(antigo_net)

        device.site_id = target_site.id
        device.loja = target_site.name
        device.ip = ip_def
        device.ip_definitivo = ip_def

        if payload.patrimonio:
            novo_pat = formatar_patrimonio(payload.patrimonio)
            if novo_pat and device.patrimonio != novo_pat:
                antigo_pat = device.patrimonio
                device.patrimonio = novo_pat
                session.add(
                    DeviceHistory(
                        device_id=device.id,
                        campo="PATRIMONIO",
                        valor_anterior=antigo_pat or "(vazio)",
                        valor_novo=novo_pat,
                        alterado_por=admin_nome,
                        data_alteracao=datetime.utcnow(),
                    )
                )

        device.firewall_status = "confirmado"
        device.firewall_confirmado_por = admin_nome
        device.firewall_confirmado_em = datetime.utcnow()
        device.observacao_admin = payload.observacao_admin
        device.updated_at = datetime.utcnow()

        hist_detalhes = (
            f"Cadastro homologado por {admin_nome}. "
            f"IP Definitivo: {ip_def} (anterior: {ip_antigo}). "
            f"Loja: {target_site.name}. "
            f"MAC: {device.mac}."
        )
        if device.licenca_windows_solicitada:
            hist_detalhes += " [Solicitação de licença Windows registrada]."
        if payload.observacao_admin:
            hist_detalhes += f" Obs: {payload.observacao_admin}."

        session.add(
            DeviceHistory(
                device_id=device.id,
                campo="HOMOLOGACAO_CONCLUIDA",
                valor_anterior=f"IP {ip_antigo} | {site_antigo or 'Sem Loja'}",
                valor_novo=hist_detalhes[:1000],
                alterado_por=admin_nome,
                data_alteracao=datetime.utcnow(),
            )
        )

        session.commit()
        return {
            "status": "ok",
            "device_id": device.id,
            "hostname": device.hostname,
            "ip": ip_def,
            "ip_definitivo": ip_def,
            "mac": device.mac,
            "patrimonio": device.patrimonio,
            "site_id": target_site.id,
            "site_name": target_site.name,
            "firewall_status": "confirmado",
            "firewall_confirmado_por": admin_nome,
            "firewall_confirmado_em": device.firewall_confirmado_em.strftime("%Y-%m-%d %H:%M:%S"),
            "message": f"Cadastro do equipamento {device.hostname} concluído com sucesso com IP definitivo {ip_def}.",
        }


@router.post("/{device_id}/rejeitar-cadastro")
def rejeitar_cadastro(
    device_id: int,
    payload: DeviceRejeitarCadastroIn,
    current_user: User = Depends(get_current_user),
):
    """Rejeição administrativa da solicitação de cadastro, registrando obrigatoriamente o motivo."""
    if not is_admin_user(current_user):
        raise HTTPException(
            status_code=403,
            detail="Apenas administradores podem rejeitar solicitações de cadastro.",
        )

    motivo = payload.motivo.strip()
    if not motivo:
        raise HTTPException(status_code=400, detail="O preenchimento do motivo da rejeição é obrigatório.")

    with Session(engine) as session:
        device = session.scalar(
            select(Device).where(
                Device.id == device_id,
                Device.company_id == current_user.company_id,
            )
        )
        if not device:
            raise HTTPException(status_code=404, detail="Dispositivo não encontrado")

        admin_nome = current_user.full_name or current_user.username
        device.firewall_status = "rejeitado"
        device.observacao_admin = f"Rejeitado por {admin_nome}: {motivo}"
        device.updated_at = datetime.utcnow()

        session.add(
            DeviceHistory(
                device_id=device.id,
                campo="RECADASTRO_REJEITADO",
                valor_anterior=device.firewall_status or "pendente",
                valor_novo=f"Rejeitado por {admin_nome}. Motivo: {motivo}"[:1000],
                alterado_por=admin_nome,
                data_alteracao=datetime.utcnow(),
            )
        )

        session.commit()
        return {
            "status": "ok",
            "device_id": device.id,
            "firewall_status": "rejeitado",
            "message": f"Solicitação de cadastro rejeitada por {admin_nome}.",
        }
