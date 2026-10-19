import asyncio
import csv
import io
import ipaddress
import math
import platform
import re
import time
import unicodedata
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from app.database import engine
from app.models.device import Device
from app.models.device_history import DeviceHistory
from app.models.network_asset import NetworkAsset
from app.models.site import Site
from app.models.site_ip_range import SiteIpRange
from app.models.software_license import SoftwareLicense
from app.models.user import User
from app.models.user_site_access import user_site_access
from app.services.license_service import calcular_mapa_uso_chaves, normalizar_chave
from app.services.device_normalizer import mascarar_chave_serial, normalizar_so
from app.schemas.network_asset import (
    ImportResultOut,
    NetworkAssetCreate,
    NetworkAssetKPIs,
    NetworkAssetListResponse,
    NetworkAssetOut,
    NetworkAssetUpdate,
    PingResultOut,
    SiteIpRangeCreate,
    SiteIpRangeOut,
    SiteIpRangeUpdate,
)


def normalizar_mac(m: Optional[str]) -> Optional[str]:
    if not m:
        return None
    bruto = str(m).strip().lower()
    hex_chars = re.sub(r"[^0-9a-f]", "", bruto)
    if len(hex_chars) == 12:
        return ":".join(hex_chars[i : i + 2] for i in range(0, 12, 2))
    return bruto.replace("-", ":")


def formatar_so_estacao(sistema: Optional[str], versao: Optional[str]) -> Optional[str]:
    """Padroniza o SO da estação utilizando as regras canônicas de normalizar_so."""
    if not sistema and not versao:
        return None
    info = normalizar_so(sistema, versao)
    return info.get("so_formatado")


def is_operator_user(user: Optional[User]) -> bool:
    """Verifica se o usuário não é administrador (deve ter chaves de SO e Office mascaradas)."""
    if not user or getattr(user, "is_superadmin", False):
        return False
    role_slugs = [r.slug for r in getattr(user, "roles", [])] if getattr(user, "roles", None) else []
    return "admin" not in role_slugs


def obter_sites_permitidos(db: Session, current_user: User) -> Optional[List[int]]:
    if current_user.is_superadmin:
        return None

    role_slugs = [r.slug for r in current_user.roles] if current_user.roles else []
    if "admin" in role_slugs or "operador_matriz" in role_slugs:
        return None

    site_ids = db.scalars(
        select(user_site_access.c.site_id).where(
            user_site_access.c.user_id == current_user.id
        )
    ).all()
    return list(site_ids)


def formatar_codigo_filial(site_nome: Optional[str], site_codigo: Optional[str]) -> str:
    """Retorna código de filial normalizado no mesmo padrão do inventário (ex: 'LOJA-01', 'MATRIZ')."""
    n = str(site_nome or "").strip().upper()
    c = str(site_codigo or "").strip().upper()

    if not n and not c:
        return "Sem Filial"

    # Matriz e Administrativo Central
    if "MATRIZ" in n or "MATRIZ" in c or n == "AC" or c == "AC" or c in ("LOG", "TI", "FLV", "CP02"):
        return "MATRIZ"

    # Outros / Sem filial
    if n == "OUTROS" or c == "OUTROS":
        return "Sem Filial"

    # Combos (ex: Combo 01, C01, CB01)
    if "COMBO" in n or "COMBO" in c or c.startswith("CB") or (c.startswith("C") and re.match(r"^C\d+$", c)):
        m = re.search(r"\d+", c) or re.search(r"\d+", n)
        return f"COMBO-{m.group(0).zfill(2)}" if m else "COMBO"

    # Lojas (ex: Giassi Loja 04, LOJA 04, LJ04, L04, ou código puramente numérico '04')
    if "LOJA" in n or "LOJA" in c or c.startswith("LJ") or c.startswith("L") or n.startswith("LJ") or n.startswith("L") or re.match(r"^\d+$", c):
        m = re.search(r"\d+", c) or re.search(r"\d+", n)
        if m:
            return f"LOJA-{m.group(0).zfill(2)}"

    return c or n or "Sem Filial"


def formatar_marca_modelo(fabricante: Optional[str], modelo: Optional[str]) -> Optional[str]:
    """Retorna marca e modelo limpos sem placeholders OEM."""
    fab = str(fabricante or "").strip()
    mod = str(modelo or "").strip()
    if fab.lower() in ("to be filled by o.e.m.", "system manufacturer", "none", "null", "undefined"):
        fab = ""
    if mod.lower() in ("to be filled by o.e.m.", "system product name", "none", "null", "undefined"):
        mod = ""
    if fab and mod:
        if mod.lower().startswith(fab.lower()):
            return mod
        return f"{fab} {mod}"
    return fab or mod or None


def formatar_asset_out(asset: NetworkAsset, is_operator: bool = False) -> NetworkAssetOut:
    site_nome = asset.site.name if asset.site else None
    site_codigo = asset.site.code if asset.site else None
    filial_cod = formatar_codigo_filial(site_nome, site_codigo)
    marca_mod = formatar_marca_modelo(asset.fabricante, asset.modelo)
    return NetworkAssetOut(
        id=asset.id,
        company_id=asset.company_id,
        site_id=asset.site_id,
        site_nome=site_nome,
        site_codigo=site_codigo,
        filial_codigo=filial_cod,
        nome=asset.nome,
        tipo=asset.tipo,
        ip=asset.ip,
        mac=asset.mac,
        patrimonio=asset.patrimonio,
        fabricante=asset.fabricante,
        modelo=asset.modelo,
        marca_modelo=marca_mod,
        numero_serie=asset.numero_serie,
        localizacao=asset.localizacao,
        status_online=asset.status_online,
        ultimo_ping=asset.ultimo_ping,
        tempo_resposta_ms=asset.tempo_resposta_ms,
        observacoes=asset.observacoes,
        origem=asset.origem,
        serial_windows=mascarar_chave_serial(asset.serial_windows) if is_operator else asset.serial_windows,
        serial_office=mascarar_chave_serial(asset.serial_office) if is_operator else asset.serial_office,
        created_at=asset.created_at,
        updated_at=asset.updated_at,
    )


def calcular_kpis_de_lista(assets: List[NetworkAssetOut]) -> NetworkAssetKPIs:
    total = len(assets)
    online = 0
    offline = 0
    nao_testado = 0
    impressoras = 0
    switches = 0
    aps = 0
    outros = 0
    estacoes = 0
    livres = 0
    ativos = 0
    max_ping_ts = 0.0
    ultimo_ping_dt: Optional[datetime] = None

    for a in assets:
        if a.status_online is True:
            online += 1
        elif a.status_online is False:
            offline += 1
        else:
            nao_testado += 1

        if a.origem == "estacao":
            estacoes += 1
        elif a.origem == "livre":
            livres += 1
        elif a.origem in ("manual", "planilha"):
            ativos += 1

        t = (a.tipo or "").upper()
        if "IMPRESSORA" in t:
            impressoras += 1
        elif "SWITCH" in t or "ROTEADOR" in t or "FIREWALL" in t:
            switches += 1
        elif any(k in t for k in ("POINT", "WIFI", "ANTENA", "UNIFI", "ACCESS POINT")) or re.search(r"\bAP\b", t):
            aps += 1
        else:
            outros += 1

        if a.ultimo_ping:
            try:
                ts = a.ultimo_ping.timestamp() if a.ultimo_ping.tzinfo else a.ultimo_ping.replace(tzinfo=timezone.utc).timestamp()
                if ts > max_ping_ts:
                    max_ping_ts = ts
                    ultimo_ping_dt = a.ultimo_ping
            except Exception:
                pass

    return NetworkAssetKPIs(
        total=total,
        online=online,
        offline=offline,
        nao_testado=nao_testado,
        impressoras=impressoras,
        switches=switches,
        aps=aps,
        outros=outros,
        estacoes=estacoes,
        livres=livres,
        ativos=ativos,
        testados=online + offline,
        ultimo_ping=ultimo_ping_dt.isoformat() if ultimo_ping_dt else None,
    )


def listar_network_assets(
    db: Session,
    current_user: User,
    site_id: Optional[int] = None,
    tipo: Optional[str] = None,
    status_online: Optional[bool] = None,
    search: Optional[str] = None,
    filtro_ocupacao: Optional[str] = None,
    faixa_id: Optional[int] = None,
    grupo: Optional[str] = None,
    page: int = 1,
    per_page: int = 50,
    sort_by: Optional[str] = "ip",
    sort_dir: Optional[str] = "asc",
    export_all: bool = False,
) -> NetworkAssetListResponse:
    sites_permitidos = obter_sites_permitidos(db, current_user)
    if sites_permitidos is not None and site_id is not None and site_id not in sites_permitidos:
        return NetworkAssetListResponse(
            items=[],
            total=0,
            page=page,
            per_page=per_page,
            total_pages=1,
            kpis=NetworkAssetKPIs(),
        )

    # 1. Carrega Faixas de IPs configuradas
    stmt_ranges = select(SiteIpRange).where(SiteIpRange.company_id == current_user.company_id)
    if sites_permitidos is not None:
        stmt_ranges = stmt_ranges.where(SiteIpRange.site_id.in_(sites_permitidos))
    if site_id is not None:
        stmt_ranges = stmt_ranges.where(SiteIpRange.site_id == site_id)
    if faixa_id is not None:
        stmt_ranges = stmt_ranges.where(SiteIpRange.id == faixa_id)

    ranges_db = db.scalars(stmt_ranges).all()

    # Prepara ranges para busca rápida de nome da faixa e geração de IPs livres
    parsed_ranges = []
    for r in ranges_db:
        try:
            s_int = int(ipaddress.IPv4Address(r.ip_inicio.strip()))
            e_int = int(ipaddress.IPv4Address(r.ip_fim.strip()))
            if e_int >= s_int:
                parsed_ranges.append((r, s_int, e_int))
        except Exception:
            continue

    def get_faixa_info(ip_str: Optional[str]) -> tuple[Optional[str], Optional[str]]:
        if not ip_str:
            return None, None
        try:
            val = int(ipaddress.IPv4Address(ip_str.strip()))
            for r_obj, s_int, e_int in parsed_ranges:
                if s_int <= val <= e_int:
                    nome_f = r_obj.nome.strip()
                    m_vlan = re.search(r"\b(vlan\s*\d+)\b", nome_f, re.I)
                    vlan_str = m_vlan.group(1).upper() if m_vlan else nome_f
                    return nome_f, vlan_str
        except Exception:
            pass
        return None, None

    all_items: List[NetworkAssetOut] = []
    occupied_ips = set()

    # 2. Carrega Ativos de Rede cadastrados (manual / planilha)
    stmt_assets = select(NetworkAsset).where(NetworkAsset.company_id == current_user.company_id)
    if sites_permitidos is not None:
        stmt_assets = stmt_assets.where(NetworkAsset.site_id.in_(sites_permitidos))
    if site_id is not None:
        stmt_assets = stmt_assets.where(NetworkAsset.site_id == site_id)

    is_operator = is_operator_user(current_user)

    assets_db = db.scalars(stmt_assets).all()
    for a in assets_db:
        item = formatar_asset_out(a, is_operator=is_operator)
        f_nome, f_vlan = get_faixa_info(a.ip)
        item.faixa_nome = f_nome
        item.vlan = f_vlan
        all_items.append(item)
        if a.ip and a.ip.strip():
            occupied_ips.add(a.ip.strip())

    # 3. Carrega Estações de Trabalho (Device) vinculadas à empresa/loja
    stmt_devs = select(Device).where(
        Device.company_id == current_user.company_id,
        Device.active == True,
        Device.ip.isnot(None),
    )
    if sites_permitidos is not None:
        stmt_devs = stmt_devs.where(Device.site_id.in_(sites_permitidos))

    all_devs = db.scalars(stmt_devs).all()

    # Todos os dispositivos ativos da empresa ocupam o seu respectivo IP na rede
    for d in all_devs:
        if d.ip and d.ip.strip():
            occupied_ips.add(d.ip.strip())

    # Se uma loja específica estiver selecionada, lista as estações dessa loja
    # e também qualquer estação ativa cujo IP pertença a uma das faixas desta loja
    def dev_visivel_na_loja(d: Device) -> bool:
        if site_id is None:
            return True
        if d.site_id == site_id:
            return True
        if d.ip and parsed_ranges:
            try:
                v = int(ipaddress.IPv4Address(d.ip.strip()))
                return any(s_int <= v <= e_int for _, s_int, e_int in parsed_ranges)
            except Exception:
                pass
        return False

    devices_db = [d for d in all_devs if dev_visivel_na_loja(d)]
    for d in devices_db:
        clean_ip = d.ip.strip() if d.ip else None
        site_nome = d.site.name if d.site else (d.loja or None)
        site_codigo = d.site.code if d.site else None
        filial_cod = formatar_codigo_filial(site_nome, site_codigo)
        so_lower = (d.sistema or "").lower()
        familia_so = "Linux" if any(k in so_lower for k in ("lin", "kubuntu", "ubuntu", "zorin", "debian")) else "Windows"
        so_formatado = formatar_so_estacao(d.sistema, d.versao)
        serial_win = getattr(d, "serial_windows", None) or (d.extra_data.get("serial_windows") if isinstance(d.extra_data, dict) else None)
        serial_off = getattr(d, "serial_office", None) or (d.extra_data.get("serial_office") if isinstance(d.extra_data, dict) else None)
        if is_operator:
            serial_win = mascarar_chave_serial(serial_win)
            serial_off = mascarar_chave_serial(serial_off)
        lat_estacao = d.extra_data.get("tempo_resposta_ms") if isinstance(d.extra_data, dict) else None
        st_online_estacao = d.extra_data.get("status_online") if isinstance(d.extra_data, dict) else None
        ping_raw = d.extra_data.get("ultimo_ping") if isinstance(d.extra_data, dict) else None
        dt_ping = None
        if ping_raw:
            try:
                dt_ping = datetime.fromisoformat(ping_raw)
            except Exception:
                dt_ping = None
        f_nome, f_vlan = get_faixa_info(clean_ip)
        dev_item = NetworkAssetOut(
            id=-d.id,
            company_id=d.company_id,
            site_id=d.site_id,
            site_nome=site_nome,
            site_codigo=site_codigo,
            filial_codigo=filial_cod,
            nome=d.hostname,
            tipo="Estação de Trabalho",
            ip=clean_ip,
            mac=d.mac,
            patrimonio=d.patrimonio,
            fabricante=d.fabricante,
            modelo=d.modelo,
            marca_modelo=familia_so,
            numero_serie=None,
            localizacao=site_nome or d.loja or "Estação",
            status_online=st_online_estacao,
            ultimo_ping=dt_ping,
            tempo_resposta_ms=lat_estacao,
            observacoes=None,  # Sem observações duplicadas
            origem="estacao",
            device_id=d.id,
            faixa_nome=f_nome,
            vlan=f_vlan,
            sistema_operacional=so_formatado,
            serial_windows=serial_win,
            serial_office=serial_off,
            created_at=d.created_at,
            updated_at=d.updated_at,
        )
        all_items.append(dev_item)
        if clean_ip:
            occupied_ips.add(clean_ip)

    # 4. Gera IPs Livres / Disponíveis a partir das faixas configuradas
    deve_gerar_livres = (site_id is not None) or (faixa_id is not None) or (filtro_ocupacao == "livres")
    if deve_gerar_livres:
        for r_obj, s_int, e_int in parsed_ranges:
            total_range = e_int - s_int + 1
            limite = min(total_range, 2048)
            for ip_val in range(s_int, s_int + limite):
                ip_str = str(ipaddress.IPv4Address(ip_val))
                if ip_str not in occupied_ips:
                    site_nome = r_obj.site.name if r_obj.site else None
                    site_codigo = r_obj.site.code if r_obj.site else None
                    filial_cod = formatar_codigo_filial(site_nome, site_codigo)
                    nome_f = r_obj.nome.strip()
                    m_vlan = re.search(r"\b(vlan\s*\d+)\b", nome_f, re.I)
                    vlan_str = m_vlan.group(1).upper() if m_vlan else nome_f
                    free_item = NetworkAssetOut(
                        id=None,
                        company_id=r_obj.company_id,
                        site_id=r_obj.site_id,
                        site_nome=site_nome,
                        site_codigo=site_codigo,
                        filial_codigo=filial_cod,
                        nome="—",
                        tipo="—",
                        ip=ip_str,
                        mac=None,
                        patrimonio=None,
                        fabricante=None,
                        modelo=None,
                        marca_modelo=None,
                        numero_serie=None,
                        localizacao=r_obj.nome,
                        status_online=None,
                        ultimo_ping=None,
                        tempo_resposta_ms=None,
                        observacoes=f"Endereço IP livre na faixa {r_obj.nome}",
                        origem="livre",
                        device_id=None,
                        faixa_nome=r_obj.nome,
                        vlan=vlan_str,
                        created_at=r_obj.created_at,
                        updated_at=r_obj.updated_at,
                    )
                    all_items.append(free_item)

    # 5. Aplica filtro de faixa (se especificado)
    if faixa_id is not None:
        target_range = next((pr for pr in parsed_ranges if pr[0].id == faixa_id), None)
        if target_range:
            _, s_int, e_int = target_range
            filtrados_faixa = []
            for it in all_items:
                if not it.ip:
                    continue
                try:
                    val = int(ipaddress.IPv4Address(it.ip.strip()))
                    if s_int <= val <= e_int:
                        filtrados_faixa.append(it)
                except Exception:
                    continue
            all_items = filtrados_faixa

    # 6. Aplica filtro_ocupacao
    if filtro_ocupacao:
        f_oc = filtro_ocupacao.lower().strip()
        if f_oc == "ocupados":
            all_items = [it for it in all_items if it.origem != "livre"]
        elif f_oc == "livres":
            all_items = [it for it in all_items if it.origem == "livre"]
        elif f_oc == "estacoes":
            all_items = [it for it in all_items if it.origem == "estacao"]
        elif f_oc == "ativos":
            all_items = [it for it in all_items if it.origem in ("manual", "planilha")]

    # 7. Aplica filtro de tipo
    if tipo and tipo != "todos":
        tipo_up = tipo.upper().strip()
        all_items = [it for it in all_items if (it.tipo or "").upper().strip() == tipo_up]

    # 7.1 Aplica filtro de grupo (impressora, rede, wifi)
    if grupo and grupo.strip():
        g = grupo.lower().strip()
        if g == "impressora":
            all_items = [it for it in all_items if "IMPRESSORA" in (it.tipo or "").upper()]
        elif g == "rede":
            all_items = [
                it for it in all_items
                if any(k in (it.tipo or "").upper() for k in ("SWITCH", "ROTEADOR", "FIREWALL"))
            ]
        elif g == "wifi":
            all_items = [
                it for it in all_items
                if any(k in (it.tipo or "").upper() for k in ("POINT", "WIFI", "ANTENA", "UNIFI", "ACCESS POINT")) or re.search(r"\bAP\b", (it.tipo or "").upper())
            ]

    # 8. Aplica status_online
    if status_online is not None:
        all_items = [it for it in all_items if it.status_online == status_online]

    # 9. Aplica busca textual
    if search and search.strip():
        s = search.lower().strip()
        campos = lambda it: [
            it.nome,
            it.ip,
            it.mac,
            it.patrimonio,
            it.fabricante,
            it.modelo,
            it.localizacao,
            it.tipo,
            it.faixa_nome,
            it.site_nome,
            it.site_codigo,
            it.observacoes,
        ]
        all_items = [
            it for it in all_items
            if any(s in (c or "").lower() for c in campos(it))
        ]

    # 10. Calcula KPIs consolidados sobre todo o universo filtrado
    kpis = calcular_kpis_de_lista(all_items)

    # 11. Ordenação Server-Side (com suporte a ordenação numérica por octeto de IPv4)
    def parse_ip_key(ip_str: Optional[str]) -> Tuple[int, int, str]:
        if not ip_str:
            return (1, 0xFFFFFFFF, "")
        try:
            return (0, int(ipaddress.IPv4Address(ip_str.strip())), "")
        except Exception:
            return (1, 0xFFFFFFFF, "")

    def get_sort_key(it: NetworkAssetOut, field: str):
        f = (field or "ip").lower().strip()
        if f == "ip":
            return parse_ip_key(it.ip)
        elif f == "filial":
            return (it.filial_codigo or it.site_nome or "").lower()
        elif f == "nome":
            return (it.nome or "").lower()
        elif f == "tipo":
            return (it.tipo or "").lower()
        elif f == "patrimonio":
            return (it.patrimonio or "").lower()
        elif f == "mac":
            return (it.mac or "").lower()
        elif f == "vlan":
            return (it.vlan or it.faixa_nome or "").lower()
        elif f == "status":
            return 2 if it.status_online is True else 1 if it.status_online is False else 0
        return parse_ip_key(it.ip)

    reverse_sort = (sort_dir or "asc").lower() == "desc"
    all_items.sort(key=lambda it: get_sort_key(it, sort_by or "ip"), reverse=reverse_sort)

    # 12. Paginação Server-Side
    total = len(all_items)
    page_num = max(1, page)
    per_page_num = max(1, min(per_page, 5000))
    total_pages = max(1, math.ceil(total / per_page_num))

    if export_all:
        page_items = all_items
    else:
        start_idx = (page_num - 1) * per_page_num
        end_idx = start_idx + per_page_num
        page_items = all_items[start_idx:end_idx]

    return NetworkAssetListResponse(
        items=page_items,
        total=total,
        page=page_num,
        per_page=per_page_num,
        total_pages=total_pages,
        kpis=kpis,
    )


def criar_network_asset(
    db: Session,
    current_user: User,
    data: NetworkAssetCreate,
) -> NetworkAssetOut:
    mac_norm = normalizar_mac(data.mac)
    asset = NetworkAsset(
        company_id=current_user.company_id,
        site_id=data.site_id,
        nome=data.nome.strip(),
        tipo=data.tipo.strip() if data.tipo else "Impressora",
        ip=data.ip.strip() if data.ip else None,
        mac=mac_norm,
        patrimonio=data.patrimonio.strip() if data.patrimonio else None,
        fabricante=data.fabricante.strip() if data.fabricante else None,
        modelo=data.modelo.strip() if data.modelo else None,
        numero_serie=data.numero_serie.strip() if data.numero_serie else None,
        localizacao=data.localizacao.strip() if data.localizacao else None,
        observacoes=data.observacoes.strip() if data.observacoes else None,
        serial_windows=data.serial_windows.strip() if getattr(data, "serial_windows", None) and data.serial_windows.strip() else None,
        serial_office=data.serial_office.strip() if getattr(data, "serial_office", None) and data.serial_office.strip() else None,
        origem="manual",
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return formatar_asset_out(asset)


def atualizar_network_asset(
    db: Session,
    current_user: User,
    asset_id: int,
    data: NetworkAssetUpdate,
) -> Optional[NetworkAssetOut]:
    asset = db.scalar(
        select(NetworkAsset).where(
            NetworkAsset.id == asset_id,
            NetworkAsset.company_id == current_user.company_id,
        )
    )
    if not asset:
        return None

    update_dict = data.model_dump(exclude_unset=True)
    if "mac" in update_dict:
        update_dict["mac"] = normalizar_mac(update_dict["mac"])

    for k, v in update_dict.items():
        if isinstance(v, str):
            v = v.strip() or None
        setattr(asset, k, v)

    asset.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(asset)
    return formatar_asset_out(asset)


def excluir_network_asset(
    db: Session,
    current_user: User,
    asset_id: int,
) -> bool:
    asset = db.scalar(
        select(NetworkAsset).where(
            NetworkAsset.id == asset_id,
            NetworkAsset.company_id == current_user.company_id,
        )
    )
    if not asset:
        return False

    db.delete(asset)
    db.commit()
    return True


def excluir_network_assets_lote(
    db: Session,
    current_user: User,
    ids: list[int],
) -> int:
    if not ids:
        return 0

    stmt = delete(NetworkAsset).where(
        NetworkAsset.id.in_(ids),
        NetworkAsset.company_id == current_user.company_id,
    )
    result = db.execute(stmt)
    db.commit()
    return int(result.rowcount or 0)


# ==============================================================================
# TESTE DE CONECTIVIDADE / PING ASSÍNCRONO
# ==============================================================================

async def ping_ip(ip: str, timeout_sec: float = 1.2) -> Tuple[bool, Optional[int]]:
    """
    Testa se um IP responde a ICMP Ping ou a portas de serviços comuns (80, 443, 9100).
    """
    if not ip or not ip.strip():
        return False, None

    clean_ip = ip.strip()
    is_win = platform.system().lower() == "windows"
    param = "-n" if is_win else "-c"
    timeout_param = "-w" if is_win else "-W"
    timeout_val = str(int(timeout_sec * 1000)) if is_win else str(int(timeout_sec))

    cmd = ["ping", param, "1", timeout_param, timeout_val, clean_ip]
    start = time.time()
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        await asyncio.wait_for(proc.wait(), timeout=timeout_sec + 0.5)
        if proc.returncode == 0:
            latency = int((time.time() - start) * 1000)
            return True, max(latency, 1)
    except Exception:
        pass

    # Fallback rápido: teste de portas TCP comuns (9100 RAW, 80 HTTP, 443 HTTPS, 22 SSH)
    for port in (9100, 80, 443, 22):
        start = time.time()
        try:
            _, writer = await asyncio.wait_for(
                asyncio.open_connection(clean_ip, port), timeout=0.6
            )
            writer.close()
            await writer.wait_closed()
            latency = int((time.time() - start) * 1000)
            return True, max(latency, 1)
        except Exception:
            continue

    return False, None


_ping_history: Dict[Tuple[int, str], List[float]] = {}


def verificar_rate_limit_ping(user_id: int, target_ip: str) -> None:
    """
    Trava de segurança contra flood: Limita a no máximo 3 tentativas consecutivas
    para a mesma máquina/IP dentro da janela de 1 minuto (por usuário).
    Na 4ª tentativa seguida, bloqueia com HTTP 429 informando os segundos restantes.
    """
    if not target_ip:
        return
    ip_key = target_ip.strip().lower()
    key = (user_id, ip_key)
    now = time.time()

    # Filtra histórico mantendo apenas tentativas dentro dos últimos 60 segundos
    history = [t for t in _ping_history.get(key, []) if (now - t) < 60.0]

    if len(history) >= 3:
        oldest = history[0]
        segundos_restantes = max(1, int(math.ceil((oldest + 60.0) - now)))
        raise HTTPException(
            status_code=429,
            detail=f"Limite de 3 tentativas consecutivas atingido para este equipamento. Aguarde {segundos_restantes} segundos para testar novamente.",
        )

    history.append(now)
    _ping_history[key] = history


async def ping_asset_by_id(
    db: Session,
    current_user: User,
    asset_id: int,
    ip: Optional[str] = None,
    device_id: Optional[int] = None,
) -> Optional[PingResultOut]:
    target_ip = ip.strip() if ip else None
    target_asset: Optional[NetworkAsset] = None
    target_dev: Optional[Device] = None

    # 1. Se device_id foi informado ou asset_id é virtual negativo (< 0), busca prioritariamente em Device
    effective_dev_id = device_id or (abs(asset_id) if asset_id < 0 else None)
    if effective_dev_id:
        target_dev = db.scalar(
            select(Device).where(
                Device.id == effective_dev_id,
                Device.company_id == current_user.company_id,
            )
        )
        if target_dev and target_dev.ip:
            target_ip = target_dev.ip.strip()

    # 2. Se asset_id > 0 e não achou target_dev, busca em NetworkAsset
    if not target_dev and asset_id > 0:
        target_asset = db.scalar(
            select(NetworkAsset).where(
                NetworkAsset.id == asset_id,
                NetworkAsset.company_id == current_user.company_id,
            )
        )
        if target_asset and target_asset.ip:
            target_ip = target_asset.ip.strip()

    # 3. Fallback: se não encontrou em NetworkAsset com asset_id > 0, tenta achar Device com esse mesmo ID
    if not target_asset and not target_dev and asset_id > 0:
        target_dev = db.scalar(
            select(Device).where(
                Device.id == asset_id,
                Device.company_id == current_user.company_id,
            )
        )
        if target_dev and target_dev.ip:
            target_ip = target_dev.ip.strip()

    # 4. Fallback por IP se fornecido
    if not target_ip and ip:
        target_ip = ip.strip()

    if not target_ip:
        return None

    # Trava de Rate Limit / Cooldown (máx 3 tentativas consecutivas dentro de 1 minuto)
    verificar_rate_limit_ping(current_user.id if current_user else 0, target_ip)

    # Executa o teste de conectividade ICMP real
    online, latency = await ping_ip(target_ip)
    now = datetime.utcnow()

    # Persiste em NetworkAsset se existir
    if not target_asset:
        target_asset = db.scalar(
            select(NetworkAsset).where(
                NetworkAsset.company_id == current_user.company_id,
                NetworkAsset.ip == target_ip,
            )
        )
    if target_asset:
        target_asset.status_online = online
        target_asset.ultimo_ping = now
        target_asset.tempo_resposta_ms = latency

    # Persiste em Device se existir
    if not target_dev:
        target_dev = db.scalar(
            select(Device).where(
                Device.company_id == current_user.company_id,
                Device.ip == target_ip,
                Device.active == True,
            )
        )
    if target_dev:
        extra = dict(target_dev.extra_data or {})
        extra["status_online"] = online
        extra["ultimo_ping"] = now.isoformat()
        if latency is not None:
            extra["tempo_resposta_ms"] = latency
        target_dev.extra_data = extra

    db.commit()

    return PingResultOut(
        asset_id=asset_id,
        ip=target_ip,
        online=online,
        status_online=online,
        tempo_resposta_ms=latency,
        timestamp=now,
        ultimo_ping=now,
    )


async def ping_direct(
    ip: str,
    db: Optional[Session] = None,
    current_user: Optional[User] = None,
) -> PingResultOut:
    clean_ip = ip.strip() if ip else ""
    verificar_rate_limit_ping(current_user.id if current_user else 0, clean_ip)

    online, latency = await ping_ip(clean_ip)
    now = datetime.utcnow()
    asset_id = None

    if db and current_user:
        clean_ip = ip.strip()
        # Atualiza NetworkAsset se houver
        asset = db.scalar(
            select(NetworkAsset).where(
                NetworkAsset.company_id == current_user.company_id,
                NetworkAsset.ip == clean_ip,
            )
        )
        if asset:
            asset_id = asset.id
            asset.status_online = online
            asset.ultimo_ping = now
            asset.tempo_resposta_ms = latency

        # Atualiza Device (Estação) se houver
        dev = db.scalar(
            select(Device).where(
                Device.company_id == current_user.company_id,
                Device.ip == clean_ip,
                Device.active == True,
            )
        )
        if dev:
            # IMPORTANTE: NÃO alterar dev.status (conformidade de SO) nem dev.data_coleta (inventário do agente)
            extra = dict(dev.extra_data or {})
            extra["status_online"] = online
            extra["ultimo_ping"] = now.isoformat()
            if latency is not None:
                extra["tempo_resposta_ms"] = latency
            dev.extra_data = extra

        db.commit()

    return PingResultOut(
        asset_id=asset_id,
        ip=ip,
        online=online,
        status_online=online,
        tempo_resposta_ms=latency,
        timestamp=now,
        ultimo_ping=now,
    )


async def scan_assets_batch(
    db: Session,
    current_user: User,
    site_id: Optional[int] = None,
    asset_ids: Optional[List[int]] = None,
    ips: Optional[List[str]] = None,
) -> List[PingResultOut]:
    ip_set = set()
    if ips:
        for ip in ips:
            clean = (ip or "").strip()
            if clean:
                ip_set.add(clean)

    # 1. Coleta registros de NetworkAsset
    stmt_assets = select(NetworkAsset).where(
        NetworkAsset.company_id == current_user.company_id,
        NetworkAsset.ip.isnot(None),
    )
    if asset_ids:
        stmt_assets = stmt_assets.where(NetworkAsset.id.in_(asset_ids))
    elif site_id:
        stmt_assets = stmt_assets.where(NetworkAsset.site_id == site_id)

    matching_assets = db.scalars(stmt_assets).all()
    if not ips:
        for a in matching_assets:
            if a.ip and a.ip.strip():
                ip_set.add(a.ip.strip())

        # Coleta estações de trabalho ativas
        stmt_devs = select(Device).where(
            Device.company_id == current_user.company_id,
            Device.active == True,
            Device.ip.isnot(None),
        )
        if site_id:
            stmt_devs = stmt_devs.where(Device.site_id == site_id)
        matching_devs = db.scalars(stmt_devs).all()
        for d in matching_devs:
            if d.ip and d.ip.strip():
                ip_set.add(d.ip.strip())

    if not ip_set:
        return []

    unique_ips = list(ip_set)
    sem = asyncio.Semaphore(30)  # até 30 pings simultâneos

    async def check_ip(ip_addr: str):
        async with sem:
            online, latency = await ping_ip(ip_addr)
            return ip_addr, online, latency

    tasks = [check_ip(ip) for ip in unique_ips]
    results = await asyncio.gather(*tasks)

    now = datetime.utcnow()
    res_map = {ip: (online, latency) for ip, online, latency in results}

    # Atualiza NetworkAssets no banco
    stmt_all_assets = select(NetworkAsset).where(
        NetworkAsset.company_id == current_user.company_id,
        NetworkAsset.ip.in_(unique_ips),
    )
    assets_to_update = db.scalars(stmt_all_assets).all()
    asset_by_ip = {}
    for a in assets_to_update:
        if a.ip:
            asset_by_ip[a.ip] = a
            if a.ip in res_map:
                on, lat = res_map[a.ip]
                a.status_online = on
                a.ultimo_ping = now
                a.tempo_resposta_ms = lat

    # Atualiza Devices (Estações) no banco
    stmt_all_devs = select(Device).where(
        Device.company_id == current_user.company_id,
        Device.active == True,
        Device.ip.in_(unique_ips),
    )
    devs_to_update = db.scalars(stmt_all_devs).all()
    for d in devs_to_update:
        if d.ip and d.ip in res_map:
            on, lat = res_map[d.ip]
            # IMPORTANTE: NÃO alterar d.status (conformidade de SO) nem d.data_coleta (inventário do agente)
            extra = dict(d.extra_data or {})
            extra["status_online"] = on
            extra["ultimo_ping"] = now.isoformat()
            if lat is not None:
                extra["tempo_resposta_ms"] = lat
            d.extra_data = extra

    db.commit()

    output = []
    for ip, online, latency in results:
        a = asset_by_ip.get(ip)
        output.append(
            PingResultOut(
                asset_id=a.id if a else None,
                ip=ip,
                online=online,
                tempo_resposta_ms=latency,
                timestamp=now,
            )
        )
    return output


# ==============================================================================
# MOTOR DE PING AUTOMÁTICO ESCALONADO EM BACKGROUND (SWEEPER)
# ==============================================================================

logger = logging.getLogger("background_ping_sweeper")
logger.setLevel(logging.INFO)

_sweeper_enabled: bool = True
_sweeper_last_run: Optional[datetime] = None
_sweeper_last_checked_count: int = 0
_sweeper_total_monitored: int = 0
_priority_site_id: Optional[int] = None
_priority_site_timestamp: float = 0.0


def registrar_priority_site(site_id: Optional[int]) -> None:
    """Registra uma filial prioritária para os próximos ciclos de ping em background."""
    global _priority_site_id, _priority_site_timestamp
    if site_id and site_id > 0:
        _priority_site_id = site_id
        _priority_site_timestamp = time.time()
    else:
        _priority_site_id = None
        _priority_site_timestamp = 0.0


def get_sweeper_status() -> Dict[str, Any]:
    """Retorna métricas em tempo real do motor de ping em background."""
    global _priority_site_id, _priority_site_timestamp
    active_priority = _priority_site_id if (time.time() - _priority_site_timestamp) < 90.0 else None
    return {
        "enabled": _sweeper_enabled,
        "last_run": _sweeper_last_run.isoformat() if _sweeper_last_run else None,
        "last_checked_count": _sweeper_last_checked_count,
        "total_monitored": _sweeper_total_monitored,
        "priority_site_id": active_priority,
    }


def toggle_sweeper(enabled: Optional[bool] = None) -> Dict[str, Any]:
    """Permite ao administrador pausar ou retomar o motor de ping automático."""
    global _sweeper_enabled
    if enabled is not None:
        _sweeper_enabled = enabled
    else:
        _sweeper_enabled = not _sweeper_enabled
    return get_sweeper_status()


async def executar_ciclo_sweeper() -> int:
    """
    Executa 1 ciclo suave do motor de ping em background:
    - Seleciona micro-lote de até 25 IPs entre NetworkAsset e Device (ativos)
    - Prioriza nunca verificados (ultimo_ping nulo) e depois os mais antigos (LRC)
    - Prioriza a filial aberta na interface (_priority_site_id) se houver
    - Dispara pings com concorrência máxima de 8 simultâneos e timeout curto de 1s
    - Grava o resultado em lote único (1 commit único)
    """
    global _sweeper_last_run, _sweeper_last_checked_count, _sweeper_total_monitored
    global _priority_site_id, _priority_site_timestamp

    if not _sweeper_enabled:
        return 0

    active_priority_site = _priority_site_id if (time.time() - _priority_site_timestamp) < 90.0 else None

    with Session(engine) as session:
        # 1. Carrega candidatos de NetworkAsset
        assets_q = select(
            NetworkAsset.id,
            NetworkAsset.ip,
            NetworkAsset.ultimo_ping,
            NetworkAsset.site_id,
        ).where(
            NetworkAsset.ip.isnot(None),
            NetworkAsset.ip != "",
        )
        assets_rows = session.execute(assets_q).all()

        # 2. Carrega candidatos de Device (estações de trabalho ativas com IP)
        devs_q = select(
            Device.id,
            Device.ip,
            Device.extra_data,
            Device.site_id,
        ).where(
            Device.active.is_(True),
            Device.ip.isnot(None),
            Device.ip != "",
        )
        devs_rows = session.execute(devs_q).all()

        targets_by_ip: Dict[str, Tuple[Optional[datetime], Optional[int]]] = {}

        for a_id, a_ip, a_ultimo, a_site in assets_rows:
            clean = (a_ip or "").strip()
            if not clean:
                continue
            dt = a_ultimo.replace(tzinfo=None) if a_ultimo else None
            targets_by_ip[clean] = (dt, a_site)

        for d_id, d_ip, d_extra, d_site in devs_rows:
            clean = (d_ip or "").strip()
            if not clean:
                continue
            dt = None
            if isinstance(d_extra, dict) and d_extra.get("ultimo_ping"):
                try:
                    dt = datetime.fromisoformat(d_extra["ultimo_ping"]).replace(tzinfo=None)
                except Exception:
                    dt = None
            if clean not in targets_by_ip or (dt is None and targets_by_ip[clean][0] is not None):
                targets_by_ip[clean] = (dt, d_site)

        _sweeper_total_monitored = len(targets_by_ip)
        if not targets_by_ip:
            return 0

        epoch = datetime(1970, 1, 1)

        def sort_key(item: Tuple[str, Tuple[Optional[datetime], Optional[int]]]):
            dt, _ = item[1]
            return (0 if dt is None else 1, dt or epoch)

        batch_ips: List[str] = []

        # Se houver loja prioritária, seleciona primeiro os alvos dessa filial
        if active_priority_site:
            site_candidates = [
                (ip, meta) for ip, meta in targets_by_ip.items()
                if meta[1] == active_priority_site
            ]
            site_candidates.sort(key=sort_key)
            for ip, _ in site_candidates[:25]:
                batch_ips.append(ip)

        # Completa o restante até 25 com os alvos mais desatualizados de outras filiais
        if len(batch_ips) < 25:
            remaining_needed = 25 - len(batch_ips)
            already_selected = set(batch_ips)
            general_candidates = [
                (ip, meta) for ip, meta in targets_by_ip.items()
                if ip not in already_selected
            ]
            general_candidates.sort(key=sort_key)
            for ip, _ in general_candidates[:remaining_needed]:
                batch_ips.append(ip)

        if not batch_ips:
            return 0

        # Dispara os pings concorrentes limitados a 8 simultâneos
        sem = asyncio.Semaphore(8)

        async def check_ip(ip_addr: str):
            async with sem:
                online, latency = await ping_ip(ip_addr, timeout_sec=1.0)
                return ip_addr, online, latency

        results = await asyncio.gather(*(check_ip(ip) for ip in batch_ips))
        now = datetime.utcnow()
        res_map = {ip: (on, lat) for ip, on, lat in results}

        # Atualiza NetworkAssets no banco
        db_assets = session.scalars(
            select(NetworkAsset).where(NetworkAsset.ip.in_(batch_ips))
        ).all()
        for a in db_assets:
            if a.ip and a.ip in res_map:
                on, lat = res_map[a.ip]
                a.status_online = on
                a.ultimo_ping = now
                a.tempo_resposta_ms = lat

        # Atualiza Devices no banco
        db_devs = session.scalars(
            select(Device).where(Device.ip.in_(batch_ips), Device.active.is_(True))
        ).all()
        for d in db_devs:
            if d.ip and d.ip in res_map:
                on, lat = res_map[d.ip]
                extra = dict(d.extra_data or {})
                extra["status_online"] = on
                extra["ultimo_ping"] = now.isoformat()
                if lat is not None:
                    extra["tempo_resposta_ms"] = lat
                d.extra_data = extra

        session.commit()

        _sweeper_last_run = now
        _sweeper_last_checked_count = len(batch_ips)
        return len(batch_ips)


async def iniciar_background_ping_sweeper():
    """Worker assíncrono em background que roda ciclos leves de ping a cada 20 segundos."""
    await asyncio.sleep(3)
    print("[Sweeper] Motor de ping automático escalonado (sweeper) iniciado.", flush=True)
    logger.info("Motor de ping automático escalonado (sweeper) iniciado.")
    while True:
        try:
            if _sweeper_enabled:
                count = await executar_ciclo_sweeper()
                if count > 0:
                    print(f"[Sweeper] Ciclo concluído: {count} IPs verificados em background.", flush=True)
                    logger.info(f"[Sweeper] Ciclo concluído: {count} IPs verificados em background.")
        except asyncio.CancelledError:
            print("[Sweeper] Motor de ping automático (sweeper) finalizado.", flush=True)
            logger.info("Motor de ping automático (sweeper) finalizado.")
            break
        except Exception as e:
            print(f"[Sweeper] Erro durante ciclo de ping: {e}", flush=True)
            logger.error(f"[Sweeper] Erro durante ciclo de ping: {e}")

        try:
            await asyncio.sleep(20)
        except asyncio.CancelledError:
            break


# ==============================================================================
# IMPORTAÇÃO E GERAÇÃO DE MODELO CSV
# ==============================================================================

def mapear_colunas_csv(header: List[str]) -> Dict[str, int]:
    col_map = {}
    for idx, col in enumerate(header):
        nfkd = unicodedata.normalize("NFKD", str(col))
        sem_acento = "".join([char for char in nfkd if not unicodedata.combining(char)])
        c = re.sub(r"[^a-z0-9]", "", sem_acento.lower().strip())
        if c in ("nome", "equipamento", "dispositivo", "hostname", "ativo"):
            col_map["nome"] = idx
        elif c in ("tipo", "categoria", "tipodeequipamento"):
            col_map["tipo"] = idx
        elif c in ("ip", "enderecoip", "ipv4", "ipaddress"):
            col_map["ip"] = idx
        elif c in ("mac", "enderecomac", "macaddress"):
            col_map["mac"] = idx
        elif c in ("patrimonio", "tombamento", "tag", "npatrimonio", "patrimonioid", "pat"):
            col_map["patrimonio"] = idx
        elif c in ("localizacao", "local", "setor", "ambiente", "localidade", "loja", "filial", "site", "unidade"):
            col_map["localizacao"] = idx
        elif c in ("fabricante", "marca", "vendor"):
            col_map["fabricante"] = idx
        elif c in ("modelo", "model"):
            col_map["modelo"] = idx
        elif c in ("serie", "nserie", "serial", "serialnumber"):
            col_map["numero_serie"] = idx
        elif c in ("observacao", "observacoes", "obs", "detalhes"):
            col_map["observacoes"] = idx
        elif c in ("serialwindows", "chavewindows", "licencawindows", "winserial", "keywindows", "chavewin", "windowskey"):
            col_map["serial_windows"] = idx
        elif c in ("serialoffice", "chaveoffice", "licencaoffice", "officeserial", "keyoffice", "officekey"):
            col_map["serial_office"] = idx
    return col_map


def processar_csv_importacao(
    db: Session,
    current_user: User,
    csv_content: str,
) -> ImportResultOut:
    if not csv_content or not csv_content.strip():
        return ImportResultOut(total_linhas=0, criados=0, atualizados=0, ignorados=0, erros=["Arquivo CSV vazio"])

    first_lines = csv_content.strip().splitlines()[:10]
    sample = "\n".join(first_lines)

    # Detecção inteligente do delimitador (tab, ponto e vírgula, vírgula)
    tab_count = sample.count("\t")
    semi_count = sample.count(";")
    comma_count = sample.count(",")

    if tab_count > semi_count and tab_count > comma_count:
        delimiter = "\t"
    elif semi_count >= comma_count and semi_count > 0:
        delimiter = ";"
    elif comma_count > 0:
        delimiter = ","
    else:
        delimiter = ";"

    f = io.StringIO(csv_content.strip())
    reader = csv.reader(f, delimiter=delimiter)
    linhas = list(reader)
    if not linhas:
        return ImportResultOut(total_linhas=0, criados=0, atualizados=0, ignorados=0, erros=["Arquivo CSV vazio"])

    header = linhas[0]
    col_map = mapear_colunas_csv(header)
    if "nome" not in col_map:
        return ImportResultOut(
            total_linhas=0,
            criados=0,
            atualizados=0,
            ignorados=0,
            erros=["Coluna obrigatória 'Nome' ou 'Equipamento' não encontrada no cabeçalho."],
        )

    # Carrega lojas da empresa para associação rápida por nome ou código
    sites = db.scalars(select(Site).where(Site.company_id == current_user.company_id)).all()
    sites_map = {}
    for s in sites:
        c_code = s.code.lower().strip()
        c_name = s.name.lower().strip()
        clean_code = re.sub(r"[^a-z0-9]", "", c_code)
        clean_name = re.sub(r"[^a-z0-9]", "", c_name)

        sites_map[c_code] = s.id
        sites_map[clean_code] = s.id
        sites_map[f"lj{c_code}"] = s.id
        sites_map[f"lj{clean_code}"] = s.id
        sites_map[f"lj-{clean_code}"] = s.id
        sites_map[f"loja{clean_code}"] = s.id
        sites_map[f"loja {clean_code}"] = s.id
        sites_map[clean_name] = s.id
        sites_map[c_name] = s.id

    # Carrega todas as estações de trabalho ativas da empresa (proteção contra sobrescrita e sincronização de patrimônio)
    devices_db = db.scalars(
        select(Device).where(
            Device.company_id == current_user.company_id,
            Device.active == True,
        )
    ).all()
    device_ip_map = {}
    device_name_map = {}
    for dev in devices_db:
        if dev.ip and dev.ip.strip():
            device_ip_map[dev.ip.strip()] = dev
        if dev.hostname and dev.hostname.strip():
            device_name_map[dev.hostname.strip().lower()] = dev

    criados = 0
    atualizados = 0
    ignorados = 0
    erros = []
    conflitos_estacao = []

    # Mapa de controle de licenças e cotas para validação
    lics_db = db.scalars(
        select(SoftwareLicense).where(SoftwareLicense.company_id == current_user.company_id)
    ).all()
    lic_map = {l.chave.upper().strip(): l for l in lics_db}
    uso_lic_map = calcular_mapa_uso_chaves(db, current_user.company_id)

    for num_linha, row in enumerate(linhas[1:], start=2):
        if not row or not any(row):
            continue

        def get_val(campo: str) -> Optional[str]:
            idx = col_map.get(campo)
            if idx is not None and idx < len(row):
                v = row[idx].strip()
                return v if v else None
            return None

        nome = get_val("nome")
        if not nome:
            ignorados += 1
            continue

        tipo = get_val("tipo") or "Impressora"
        ip = get_val("ip")
        if ip:
            ip = ip.strip()

        patrimonio_raw = get_val("patrimonio")
        patrimonio_formatado = None
        if patrimonio_raw:
            nums = re.sub(r"[^0-9]", "", patrimonio_raw.strip())
            patrimonio_formatado = f"pat.{nums}" if nums else patrimonio_raw.strip()

        # Validação de proteção: Impede sobrescrever estação de trabalho (por IP ou por Nome)
        dev = None
        motivo_match = None
        if ip and ip in device_ip_map:
            dev = device_ip_map[ip]
            motivo_match = f"IP {ip}"
        elif nome and nome.strip().lower() in device_name_map:
            dev = device_name_map[nome.strip().lower()]
            motivo_match = f"Nome '{nome}'"

        if dev:
            patrimonio_atualizado = False
            antigo = dev.patrimonio

            # Sincroniza o número de patrimônio se informado na linha da planilha
            if patrimonio_formatado and antigo != patrimonio_formatado:
                dev.patrimonio = patrimonio_formatado
                dev.updated_at = datetime.utcnow()
                db.add(
                    DeviceHistory(
                        device_id=dev.id,
                        campo="PATRIMONIO",
                        valor_anterior=antigo or "(vazio)",
                        valor_novo=patrimonio_formatado,
                    )
                )
                db.add(dev)
                patrimonio_atualizado = True
                atualizados += 1
            else:
                ignorados += 1

            # Sincronização de seriais Windows e Office respeitando cotas disponíveis
            win_raw = get_val("serial_windows")
            off_raw = get_val("serial_office")
            win_key = normalizar_chave(win_raw)
            off_key = normalizar_chave(off_raw)

            if win_key:
                if win_key in lic_map:
                    lic_obj = lic_map[win_key]
                    u = uso_lic_map.get(win_key, 0)
                    if dev.serial_windows and dev.serial_windows.upper() == win_key:
                        pass
                    elif u >= lic_obj.quantidade_total:
                        erros.append(f"Linha {num_linha}: Chave Windows '{win_key}' esgotada no controle de licenças. Atribuição cancelada.")
                        win_key = None
                if win_key and dev.serial_windows != win_key:
                    ant_win = dev.serial_windows
                    dev.serial_windows = win_key
                    dev.updated_at = datetime.utcnow()
                    uso_lic_map[win_key] = uso_lic_map.get(win_key, 0) + 1
                    db.add(DeviceHistory(device_id=dev.id, campo="SERIAL_WINDOWS", valor_anterior=ant_win or "(vazio)", valor_novo=win_key))
                    db.add(dev)

            if off_key:
                if off_key in lic_map:
                    lic_obj = lic_map[off_key]
                    u = uso_lic_map.get(off_key, 0)
                    if dev.serial_office and dev.serial_office.upper() == off_key:
                        pass
                    elif u >= lic_obj.quantidade_total:
                        erros.append(f"Linha {num_linha}: Chave Office '{off_key}' esgotada no controle de licenças. Atribuição cancelada.")
                        off_key = None
                if off_key and dev.serial_office != off_key:
                    ant_off = dev.serial_office
                    dev.serial_office = off_key
                    dev.updated_at = datetime.utcnow()
                    uso_lic_map[off_key] = uso_lic_map.get(off_key, 0) + 1
                    db.add(DeviceHistory(device_id=dev.id, campo="SERIAL_OFFICE", valor_anterior=ant_off or "(vazio)", valor_novo=off_key))
                    db.add(dev)

            if patrimonio_atualizado:
                msg = (
                    f"Linha {num_linha}: Estação '{dev.hostname}' identificada ({motivo_match}). "
                    f"Ativo mantido como estação de trabalho e patrimônio atualizado para '{patrimonio_formatado}'."
                )
            elif patrimonio_formatado and dev.patrimonio == patrimonio_formatado:
                msg = (
                    f"Linha {num_linha}: Estação '{dev.hostname}' identificada ({motivo_match}). "
                    f"Ativo mantido como estação de trabalho (Patrimônio '{dev.patrimonio}' já vinculado)."
                )
            else:
                msg = (
                    f"Linha {num_linha}: Estação '{dev.hostname}' identificada ({motivo_match}) "
                    f"(Patrimônio: {dev.patrimonio or 'N/A'}). Importação ignorada para não sobrescrever a estação."
                )

            conflitos_estacao.append({
                "linha": num_linha,
                "ip": ip or dev.ip,
                "nome_planilha": nome,
                "estacao_nome": dev.hostname,
                "estacao_patrimonio": dev.patrimonio,
                "patrimonio_atualizado": patrimonio_atualizado,
                "patrimonio_novo": patrimonio_formatado if patrimonio_raw else None,
                "mensagem": msg,
            })
            continue

        mac = normalizar_mac(get_val("mac"))
        patrimonio = patrimonio_formatado
        fabricante = get_val("fabricante")
        modelo = get_val("modelo")
        numero_serie = get_val("numero_serie")
        localizacao = get_val("localizacao")
        observacoes = get_val("observacoes")

        # Associação de filial pelo código da loja (ex: LJ01, 01, Loja 01)
        site_id = None
        if localizacao:
            l_key = localizacao.lower().strip()
            l_clean = re.sub(r"[^a-z0-9]", "", l_key)
            site_id = sites_map.get(l_key) or sites_map.get(l_clean)
            if not site_id:
                # Tenta casar números (ex: "LJ01" -> "01" ou "1")
                m = re.search(r"\d+", l_key)
                if m:
                    num_str = m.group(0)
                    site_id = sites_map.get(num_str.zfill(2)) or sites_map.get(str(int(num_str)))

        # Upsert: Busca por patrimônio existente OU mac OU ip
        asset = None
        if patrimonio:
            asset = db.scalar(
                select(NetworkAsset).where(
                    NetworkAsset.company_id == current_user.company_id,
                    or_(
                        NetworkAsset.patrimonio == patrimonio,
                        NetworkAsset.patrimonio == patrimonio_raw,
                    ),
                )
            )
        if not asset and mac:
            asset = db.scalar(
                select(NetworkAsset).where(
                    NetworkAsset.company_id == current_user.company_id,
                    NetworkAsset.mac == mac,
                )
            )
        if not asset and ip:
            asset = db.scalar(
                select(NetworkAsset).where(
                    NetworkAsset.company_id == current_user.company_id,
                    NetworkAsset.ip == ip,
                )
            )

        # Validação de seriais para Ativo de Rede
        win_raw = get_val("serial_windows")
        off_raw = get_val("serial_office")
        win_key = normalizar_chave(win_raw)
        off_key = normalizar_chave(off_raw)

        if win_key and win_key in lic_map:
            lic_obj = lic_map[win_key]
            u = uso_lic_map.get(win_key, 0)
            cur_key = asset.serial_windows if asset else None
            if not (cur_key and cur_key.upper() == win_key) and u >= lic_obj.quantidade_total:
                erros.append(f"Linha {num_linha}: Chave Windows '{win_key}' esgotada no controle de licenças.")
                win_key = None
            elif win_key:
                uso_lic_map[win_key] = u + 1

        if off_key and off_key in lic_map:
            lic_obj = lic_map[off_key]
            u = uso_lic_map.get(off_key, 0)
            cur_key = asset.serial_office if asset else None
            if not (cur_key and cur_key.upper() == off_key) and u >= lic_obj.quantidade_total:
                erros.append(f"Linha {num_linha}: Chave Office '{off_key}' esgotada no controle de licenças.")
                off_key = None
            elif off_key:
                uso_lic_map[off_key] = u + 1

        try:
            if asset:
                # Atualização
                asset.nome = nome
                if tipo: asset.tipo = tipo
                if site_id: asset.site_id = site_id
                if ip: asset.ip = ip
                if mac: asset.mac = mac
                if patrimonio: asset.patrimonio = patrimonio
                if fabricante: asset.fabricante = fabricante
                if modelo: asset.modelo = modelo
                if numero_serie: asset.numero_serie = numero_serie
                if localizacao: asset.localizacao = localizacao
                if win_key: asset.serial_windows = win_key
                if off_key: asset.serial_office = off_key
                if observacoes:
                    asset.observacoes = (
                        f"{asset.observacoes}\n{observacoes}" if asset.observacoes else observacoes
                    )
                asset.origem = "planilha"
                asset.updated_at = datetime.utcnow()
                atualizados += 1
            else:
                # Inserção
                novo = NetworkAsset(
                    company_id=current_user.company_id,
                    site_id=site_id,
                    nome=nome,
                    tipo=tipo,
                    ip=ip,
                    mac=mac,
                    patrimonio=patrimonio,
                    fabricante=fabricante,
                    modelo=modelo,
                    numero_serie=numero_serie,
                    localizacao=localizacao,
                    serial_windows=win_key,
                    serial_office=off_key,
                    observacoes=observacoes,
                    origem="planilha",
                )
                db.add(novo)
                criados += 1
        except Exception as e:
            erros.append(f"Linha {num_linha} ({nome}): {str(e)}")

    db.commit()
    return ImportResultOut(
        total_linhas=len(linhas) - 1,
        criados=criados,
        atualizados=atualizados,
        ignorados=ignorados,
        erros=erros[:15],
        conflitos_estacao=conflitos_estacao,
    )


# ==============================================================================
# GESTÃO DE FAIXAS DE IP (IPAM / SUBNETS / VLANS)
# ==============================================================================

def listar_ip_ranges(
    db: Session,
    current_user: User,
    site_id: Optional[int] = None,
) -> List[SiteIpRangeOut]:
    stmt = select(SiteIpRange).where(SiteIpRange.company_id == current_user.company_id)
    sites_permitidos = obter_sites_permitidos(db, current_user)
    if sites_permitidos is not None:
        stmt = stmt.where(SiteIpRange.site_id.in_(sites_permitidos))
    if site_id is not None:
        stmt = stmt.where(SiteIpRange.site_id == site_id)

    ranges = db.scalars(stmt.order_by(SiteIpRange.nome.asc())).all()
    if not ranges:
        return []

    site_ids = list({r.site_id for r in ranges})

    asset_ips = db.scalars(
        select(NetworkAsset.ip).where(
            NetworkAsset.company_id == current_user.company_id,
            NetworkAsset.ip.isnot(None),
        )
    ).all()

    device_ips = db.scalars(
        select(Device.ip).where(
            Device.company_id == current_user.company_id,
            Device.active == True,
            Device.ip.isnot(None),
        )
    ).all()

    occupied_ints = set()
    for ip_str in list(asset_ips) + list(device_ips):
        if ip_str and ip_str.strip():
            try:
                occupied_ints.add(int(ipaddress.IPv4Address(ip_str.strip())))
            except Exception:
                pass

    out = []
    for r in ranges:
        try:
            s_int = int(ipaddress.IPv4Address(r.ip_inicio.strip()))
            e_int = int(ipaddress.IPv4Address(r.ip_fim.strip()))
            total_ips = max(e_int - s_int + 1, 0)
        except Exception:
            s_int = 0
            e_int = 0
            total_ips = 0

        ocupados = sum(1 for val in occupied_ints if s_int <= val <= e_int)
        livres = max(total_ips - ocupados, 0)

        out.append(
            SiteIpRangeOut(
                id=r.id,
                company_id=r.company_id,
                site_id=r.site_id,
                site_nome=r.site.name if r.site else None,
                site_codigo=r.site.code if r.site else None,
                nome=r.nome,
                ip_inicio=r.ip_inicio,
                ip_fim=r.ip_fim,
                gateway=r.gateway,
                mascara=r.mascara,
                observacoes=r.observacoes,
                total_ips=total_ips,
                ips_ocupados=ocupados,
                ips_livres=livres,
                created_at=r.created_at,
                updated_at=r.updated_at,
            )
        )
    return out


def criar_ip_range(
    db: Session,
    current_user: User,
    data: SiteIpRangeCreate,
) -> SiteIpRangeOut:
    site = db.scalar(
        select(Site).where(
            Site.id == data.site_id,
            Site.company_id == current_user.company_id,
        )
    )
    if not site:
        raise HTTPException(status_code=404, detail="Filial/Loja não encontrada.")

    try:
        s_int = int(ipaddress.IPv4Address(data.ip_inicio.strip()))
        e_int = int(ipaddress.IPv4Address(data.ip_fim.strip()))
    except ValueError:
        raise HTTPException(status_code=400, detail="Endereço IP inicial ou final inválido.")

    if e_int < s_int:
        raise HTTPException(status_code=400, detail="O IP final deve ser maior ou igual ao IP inicial.")

    total = e_int - s_int + 1
    if total > 2048:
        raise HTTPException(status_code=400, detail="O intervalo de IPs não pode conter mais de 2048 endereços.")

    range_obj = SiteIpRange(
        company_id=current_user.company_id,
        site_id=data.site_id,
        nome=data.nome.strip(),
        ip_inicio=data.ip_inicio.strip(),
        ip_fim=data.ip_fim.strip(),
        gateway=data.gateway.strip() if data.gateway else None,
        mascara=data.mascara.strip() if data.mascara else None,
        observacoes=data.observacoes.strip() if data.observacoes else None,
    )
    db.add(range_obj)
    db.commit()
    db.refresh(range_obj)
    ranges = listar_ip_ranges(db, current_user, site_id=range_obj.site_id)
    created = next((r for r in ranges if r.id == range_obj.id), None)
    if not created:
        raise HTTPException(status_code=500, detail="Erro ao carregar faixa recém-criada.")
    return created


def atualizar_ip_range(
    db: Session,
    current_user: User,
    range_id: int,
    data: SiteIpRangeUpdate,
) -> Optional[SiteIpRangeOut]:
    range_obj = db.scalar(
        select(SiteIpRange).where(
            SiteIpRange.id == range_id,
            SiteIpRange.company_id == current_user.company_id,
        )
    )
    if not range_obj:
        return None

    update_dict = data.model_dump(exclude_unset=True)
    if "site_id" in update_dict and update_dict["site_id"] is not None:
        novo_site_id = update_dict["site_id"]
        site_obj = db.scalar(
            select(Site).where(
                Site.id == novo_site_id,
                Site.company_id == current_user.company_id,
            )
        )
        if not site_obj:
            raise HTTPException(status_code=400, detail="Filial destino não encontrada ou inválida.")
        range_obj.site_id = novo_site_id
    if "ip_inicio" in update_dict or "ip_fim" in update_dict:
        novo_inicio = update_dict.get("ip_inicio", range_obj.ip_inicio)
        novo_fim = update_dict.get("ip_fim", range_obj.ip_fim)
        try:
            s_int = int(ipaddress.IPv4Address(novo_inicio.strip()))
            e_int = int(ipaddress.IPv4Address(novo_fim.strip()))
        except ValueError:
            raise HTTPException(status_code=400, detail="Endereço IP inicial ou final inválido.")
        if e_int < s_int:
            raise HTTPException(status_code=400, detail="O IP final deve ser maior ou igual ao IP inicial.")
        if (e_int - s_int + 1) > 2048:
            raise HTTPException(status_code=400, detail="O intervalo de IPs não pode conter mais de 2048 endereços.")

    for k, v in update_dict.items():
        if isinstance(v, str):
            v = v.strip() or None
        setattr(range_obj, k, v)

    range_obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(range_obj)
    ranges = listar_ip_ranges(db, current_user, site_id=range_obj.site_id)
    return next((r for r in ranges if r.id == range_id), None)


def excluir_ip_range(
    db: Session,
    current_user: User,
    range_id: int,
) -> bool:
    range_obj = db.scalar(
        select(SiteIpRange).where(
            SiteIpRange.id == range_id,
            SiteIpRange.company_id == current_user.company_id,
        )
    )
    if not range_obj:
        return False
    db.delete(range_obj)
    db.commit()
    return True


def gerar_csv_modelo() -> str:
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerow([
        "LOCALIZACAO",
        "IP",
        "TIPO",
        "NOME",
        "PATRIMONIO",
        "MAC",
    ])
    exemplos = [
        ("LJ01", "192.168.4.5", "IMPRESSORA", "L02-PROMO-35192", "pat.35192", "b4:2e:99:f2:a1:68"),
        ("LJ01", "192.168.4.6", "ACESS POINT", "L02-PROMO-35193", "pat.35193", "b4:2e:99:f2:a1:69"),
        ("LJ01", "192.168.4.7", "SWITCH", "L02-PROMO-35194", "pat.35194", "b4:2e:99:f2:a1:70"),
        ("LJ01", "192.168.4.8", "BALANÇA", "L02-PROMO-35195", "pat.35195", "b4:2e:99:f2:a1:71"),
        ("LJ01", "192.168.4.9", "TERMINAL CONSULTA", "L02-PROMO-35196", "pat.35196", "b4:2e:99:f2:a1:72"),
        ("LJ01", "192.168.4.10", "DESKTOP", "L02-PROMO-35197", "pat.35197", "b4:2e:99:f2:a1:73"),
        ("LJ01", "192.168.4.11", "RELOGIO PONTO", "L02-PROMO-35198", "pat.35198", "b4:2e:99:f2:a1:74"),
        ("LJ01", "192.168.4.12", "NOTEBOOK", "L02-PROMO-35199", "pat.35199", "b4:2e:99:f2:a1:75"),
        ("LJ01", "192.168.4.13", "CENTRAL TELEFONICA", "L02-PROMO-35200", "pat.35200", "b4:2e:99:f2:a1:76"),
        ("LJ01", "192.168.4.14", "LEITOR BIOMETRICO", "L02-PROMO-35201", "pat.35201", "b4:2e:99:f2:a1:77"),
        ("LJ01", "192.168.4.15", "TOTEM", "L02-PROMO-35202", "pat.35202", "b4:2e:99:f2:a1:78"),
        ("LJ01", "192.168.4.16", "COLETOR", "L02-PROMO-35203", "pat.35203", "b4:2e:99:f2:a1:79"),
        ("LJ01", "192.168.4.17", "TABLET", "L02-PROMO-35204", "pat.35204", "b4:2e:99:f2:a1:80"),
        ("LJ01", "192.168.4.18", "CELULAR", "L02-PROMO-35205", "pat.35205", "b4:2e:99:f2:a1:81"),
        ("LJ01", "192.168.4.19", "SMARTPHONE", "L02-PROMO-35206", "pat.35206", "b4:2e:99:f2:a1:82"),
        ("LJ01", "192.168.4.20", "SMART-BOX", "L02-PROMO-35207", "pat.35207", "b4:2e:99:f2:a1:83"),
        ("LJ01", "192.168.4.21", "TELEFONE MOVEL", "L02-PROMO-35208", "pat.35208", "b4:2e:99:f2:a1:84"),
        ("LJ01", "192.168.4.23", "ROTEADOR", "L02-PROMO-35210", "pat.35210", "b4:2e:99:f2:a1:86"),
        ("LJ01", "192.168.4.24", "VOIP", "L02-PROMO-35211", "pat.35211", "b4:2e:99:f2:a1:87"),
        ("LJ01", "192.168.4.25", "COFRE ELETRONICO", "L02-PROMO-35212", "pat.35212", "b4:2e:99:f2:a1:88"),
        ("LJ01", "192.168.4.26", "PDV", "L02-PROMO-35213", "pat.35213", "b4:2e:99:f2:a1:89"),
        ("LJ01", "192.168.4.27", "CANCELA ESTACIONAMENTO", "L02-PROMO-35214", "pat.35214", "b4:2e:99:f2:a1:90"),
        ("LJ01", "192.168.4.28", "LEITOR FACIAL", "L02-PROMO-35215", "pat.35215", "b4:2e:99:f2:a1:91"),
        ("LJ01", "192.168.4.29", "CLIMATIZAÇÃO", "L02-PROMO-35216", "pat.35216", "b4:2e:99:f2:a1:92"),
        ("LJ01", "192.168.4.30", "FIREWALL", "L02-PROMO-35217", "pat.35217", "b4:2e:99:f2:a1:93"),
        ("LJ01", "192.168.4.31", "DVR/CFTV", "L02-PROMO-35218", "pat.35218", "b4:2e:99:f2:a1:94"),
        ("LJ01", "192.168.4.32", "TERMINAL", "L02-PROMO-35219", "pat.35219", "b4:2e:99:f2:a1:95"),
        ("LJ01", "192.168.4.34", "ESTEIRA", "L02-PROMO-35221", "pat.35221", "b4:2e:99:f2:a1:97"),
    ]
    for ex in exemplos:
        writer.writerow(list(ex))
    return output.getvalue()


def calcular_kpis_network_assets(
    db: Session,
    current_user: User,
    site_id: Optional[int] = None,
    faixa_id: Optional[int] = None,
    tipo: Optional[str] = None,
    search: Optional[str] = None,
    filtro_ocupacao: Optional[str] = None,
    grupo: Optional[str] = None,
) -> NetworkAssetKPIs:
    res = listar_network_assets(
        db=db,
        current_user=current_user,
        site_id=site_id,
        faixa_id=faixa_id,
        tipo=tipo,
        search=search,
        filtro_ocupacao=filtro_ocupacao,
        grupo=grupo,
        export_all=True,
    )
    return res.kpis

