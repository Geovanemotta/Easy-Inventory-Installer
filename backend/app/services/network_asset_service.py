import asyncio
import csv
import io
import ipaddress
import platform
import re
import time
import unicodedata
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from app.models.device import Device
from app.models.network_asset import NetworkAsset
from app.models.site import Site
from app.models.site_ip_range import SiteIpRange
from app.models.user import User
from app.models.user_site_access import user_site_access
from app.schemas.network_asset import (
    ImportResultOut,
    NetworkAssetCreate,
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
    combined = f"{sistema or ''} {versao or ''}".strip()
    if not combined:
        return None
    c_lower = combined.lower()
    if "windows 11" in c_lower or "win 11" in c_lower:
        return "Windows 11"
    if "windows 10" in c_lower or "win 10" in c_lower:
        return "Windows 10"
    if "windows 7" in c_lower or "win 7" in c_lower:
        return "Windows 7"
    if "windows server" in c_lower:
        return "Windows Server"
    if "windows" in c_lower:
        return "Windows"
    if "zorin" in c_lower:
        return "Linux Zorin"
    if "kubuntu" in c_lower:
        return "Linux Kubuntu"
    if "ubuntu" in c_lower:
        return "Linux Ubuntu"
    if "mint" in c_lower:
        return "Linux Mint"
    if "debian" in c_lower:
        return "Linux Debian"
    if "fedora" in c_lower:
        return "Linux Fedora"
    if "centos" in c_lower:
        return "Linux CentOS"
    if "red hat" in c_lower or "rhel" in c_lower:
        return "Linux Red Hat"
    if "linux" in c_lower:
        return "Linux"
    return combined[:30]


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


def formatar_asset_out(asset: NetworkAsset) -> NetworkAssetOut:
    site_nome = asset.site.name if asset.site else None
    site_codigo = asset.site.code if asset.site else None
    return NetworkAssetOut(
        id=asset.id,
        company_id=asset.company_id,
        site_id=asset.site_id,
        site_nome=site_nome,
        site_codigo=site_codigo,
        nome=asset.nome,
        tipo=asset.tipo,
        ip=asset.ip,
        mac=asset.mac,
        patrimonio=asset.patrimonio,
        fabricante=asset.fabricante,
        modelo=asset.modelo,
        numero_serie=asset.numero_serie,
        localizacao=asset.localizacao,
        status_online=asset.status_online,
        ultimo_ping=asset.ultimo_ping,
        tempo_resposta_ms=asset.tempo_resposta_ms,
        observacoes=asset.observacoes,
        origem=asset.origem,
        created_at=asset.created_at,
        updated_at=asset.updated_at,
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
) -> List[NetworkAssetOut]:
    sites_permitidos = obter_sites_permitidos(db, current_user)
    if sites_permitidos is not None and site_id is not None and site_id not in sites_permitidos:
        return []

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

    def get_faixa_nome(ip_str: Optional[str]) -> Optional[str]:
        if not ip_str:
            return None
        try:
            val = int(ipaddress.IPv4Address(ip_str.strip()))
            for r_obj, s_int, e_int in parsed_ranges:
                if s_int <= val <= e_int:
                    return r_obj.nome
        except Exception:
            pass
        return None

    all_items: List[NetworkAssetOut] = []
    occupied_ips = set()

    # 2. Carrega Ativos de Rede cadastrados (manual / planilha)
    stmt_assets = select(NetworkAsset).where(NetworkAsset.company_id == current_user.company_id)
    if sites_permitidos is not None:
        stmt_assets = stmt_assets.where(NetworkAsset.site_id.in_(sites_permitidos))
    if site_id is not None:
        stmt_assets = stmt_assets.where(NetworkAsset.site_id == site_id)

    assets_db = db.scalars(stmt_assets).all()
    for a in assets_db:
        item = formatar_asset_out(a)
        item.faixa_nome = get_faixa_nome(a.ip)
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
    if site_id is not None:
        stmt_devs = stmt_devs.where(Device.site_id == site_id)

    devices_db = db.scalars(stmt_devs).all()
    for d in devices_db:
        clean_ip = d.ip.strip() if d.ip else None
        site_nome = d.site.name if d.site else None
        site_codigo = d.site.code if d.site else None
        so_formatado = formatar_so_estacao(d.sistema, d.versao)
        dev_item = NetworkAssetOut(
            id=None,
            company_id=d.company_id,
            site_id=d.site_id,
            site_nome=site_nome,
            site_codigo=site_codigo,
            nome=d.hostname,
            tipo="Estação de Trabalho",
            ip=clean_ip,
            mac=d.mac,
            patrimonio=d.patrimonio,
            fabricante=None,  # Evita poluir com fabricante da placa-mãe
            modelo=None,      # Evita poluir com modelo da placa-mãe
            numero_serie=None,
            localizacao=site_nome or d.loja or "Estação",
            status_online=(d.status == "online") if d.status else None,
            ultimo_ping=d.data_coleta,
            tempo_resposta_ms=None,
            observacoes=None,  # Sem observações duplicadas
            origem="estacao",
            device_id=d.id,
            faixa_nome=get_faixa_nome(clean_ip),
            sistema_operacional=so_formatado,
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
                    free_item = NetworkAssetOut(
                        id=None,
                        company_id=r_obj.company_id,
                        site_id=r_obj.site_id,
                        site_nome=r_obj.site.name if r_obj.site else None,
                        site_codigo=r_obj.site.code if r_obj.site else None,
                        nome="(Disponível)",
                        tipo="Livre / Disponível",
                        ip=ip_str,
                        mac=None,
                        patrimonio=None,
                        fabricante=None,
                        modelo=None,
                        numero_serie=None,
                        localizacao=r_obj.nome,
                        status_online=None,
                        ultimo_ping=None,
                        tempo_resposta_ms=None,
                        observacoes=f"Endereço IP livre na faixa {r_obj.nome}",
                        origem="livre",
                        device_id=None,
                        faixa_nome=r_obj.nome,
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
            it.faixa_nome,
            it.site_nome,
            it.site_codigo,
        ]
        all_items = [
            it for it in all_items
            if any(s in (c or "").lower() for c in campos(it))
        ]

    # 10. Ordenação numérica por IP IPv4
    def sort_key(it: NetworkAssetOut):
        if not it.ip:
            return (1, 0xFFFFFFFF, it.nome or "")
        try:
            return (0, int(ipaddress.IPv4Address(it.ip.strip())), it.nome or "")
        except Exception:
            return (1, 0xFFFFFFFF, it.nome or "")

    all_items.sort(key=sort_key)
    return all_items


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


async def ping_asset_by_id(
    db: Session,
    current_user: User,
    asset_id: int,
) -> Optional[PingResultOut]:
    asset = db.scalar(
        select(NetworkAsset).where(
            NetworkAsset.id == asset_id,
            NetworkAsset.company_id == current_user.company_id,
        )
    )
    if not asset or not asset.ip:
        return None

    online, latency = await ping_ip(asset.ip)
    now = datetime.utcnow()
    asset.status_online = online
    asset.ultimo_ping = now
    asset.tempo_resposta_ms = latency
    db.commit()

    return PingResultOut(
        asset_id=asset.id,
        ip=asset.ip,
        online=online,
        tempo_resposta_ms=latency,
        timestamp=now,
    )


async def ping_direct(
    ip: str,
) -> PingResultOut:
    online, latency = await ping_ip(ip)
    return PingResultOut(
        asset_id=None,
        ip=ip,
        online=online,
        tempo_resposta_ms=latency,
        timestamp=datetime.utcnow(),
    )


async def scan_assets_batch(
    db: Session,
    current_user: User,
    site_id: Optional[int] = None,
    asset_ids: Optional[List[int]] = None,
) -> List[PingResultOut]:
    stmt = select(NetworkAsset).where(
        NetworkAsset.company_id == current_user.company_id,
        NetworkAsset.ip.isnot(None),
    )
    if asset_ids:
        stmt = stmt.where(NetworkAsset.id.in_(asset_ids))
    elif site_id:
        stmt = stmt.where(NetworkAsset.site_id == site_id)

    assets = db.scalars(stmt).all()
    if not assets:
        return []

    sem = asyncio.Semaphore(25)  # até 25 testes simultâneos

    async def check_one(asset: NetworkAsset):
        async with sem:
            online, latency = await ping_ip(asset.ip)
            return asset, online, latency

    tasks = [check_one(a) for a in assets]
    results = await asyncio.gather(*tasks)

    now = datetime.utcnow()
    output = []
    for asset, online, latency in results:
        asset.status_online = online
        asset.ultimo_ping = now
        asset.tempo_resposta_ms = latency
        output.append(
            PingResultOut(
                asset_id=asset.id,
                ip=asset.ip,
                online=online,
                tempo_resposta_ms=latency,
                timestamp=now,
            )
        )

    db.commit()
    return output


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

    # Carrega todas as estações de trabalho ativas da empresa que possuem IP (proteção contra sobrescrita)
    devices_db = db.scalars(
        select(Device).where(
            Device.company_id == current_user.company_id,
            Device.active == True,
            Device.ip.isnot(None),
        )
    ).all()
    device_ip_map = {}
    for dev in devices_db:
        if dev.ip and dev.ip.strip():
            device_ip_map[dev.ip.strip()] = dev

    criados = 0
    atualizados = 0
    ignorados = 0
    erros = []
    conflitos_estacao = []

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

        # Validação de proteção: Impede sobrescrever IP já pertencente a uma estação do inventário
        if ip and ip in device_ip_map:
            dev = device_ip_map[ip]
            conflitos_estacao.append({
                "linha": num_linha,
                "ip": ip,
                "nome_planilha": nome,
                "estacao_nome": dev.hostname,
                "estacao_patrimonio": dev.patrimonio,
                "mensagem": f"Linha {num_linha}: O IP {ip} ('{nome}') já pertence à estação '{dev.hostname}' (Patrimônio: {dev.patrimonio or 'N/A'}). Importação ignorada para não sobrescrever a estação.",
            })
            ignorados += 1
            continue

        mac = normalizar_mac(get_val("mac"))
        patrimonio = get_val("patrimonio")
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
                    NetworkAsset.patrimonio == patrimonio,
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
            NetworkAsset.site_id.in_(site_ids),
            NetworkAsset.ip.isnot(None),
        )
    ).all()

    device_ips = db.scalars(
        select(Device.ip).where(
            Device.company_id == current_user.company_id,
            Device.active == True,
            Device.site_id.in_(site_ids),
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
