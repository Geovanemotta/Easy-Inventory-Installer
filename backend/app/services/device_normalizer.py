import ipaddress
import json
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple


# =====================================================================
# Constantes de Normalização e Listas de Exclusão
# =====================================================================

PLACEHOLDERS_OEM = {
    "to be filled by o.e.m.",
    "to be filled by oem",
    "system manufacturer",
    "system product name",
    "default string",
    "none",
    "all series",
    "unknown",
    "not applicable",
    "n/a",
    "na",
    "standard pc",
    "chassis manufacture",
    "type2 - board manufacturer",
    "chassis serial number",
    "0",
    "null",
}

NOMES_DISTROS_LINUX = [
    (re.compile(r"^k?ubuntu\b", re.I), "Kubuntu"),
    (re.compile(r"^zorin(\s*os)?\b", re.I), "Zorin"),
    (re.compile(r"^(linux\s*)?mint\b", re.I), "Linux Mint"),
    (re.compile(r"^debian\b", re.I), "Debian"),
    (re.compile(r"^fedora\b", re.I), "Fedora"),
    (re.compile(r"^(rhel|red\s*hat(\s*enterprise\s*linux)?)\b", re.I), "Red Hat"),
    (re.compile(r"^centos\b", re.I), "CentOS"),
    (re.compile(r"^rocky(\s*linux)?\b", re.I), "Rocky Linux"),
    (re.compile(r"^opensuse\b", re.I), "openSUSE"),
    (re.compile(r"^arch(\s*linux)?\b", re.I), "Arch Linux"),
    (re.compile(r"^alpine\b", re.I), "Alpine"),
]


# =====================================================================
# 1. Normalização de Rede (IPs Principais, Secundários e Extras)
# =====================================================================

def eh_ip_valido(ip_str: str) -> bool:
    """Verifica se a string é um IPv4 ou IPv6 válido e não é loopback ou inválido."""
    if not ip_str:
        return False
    limpo = ip_str.strip()
    if limpo.startswith("127.") or limpo in ("::1", "0.0.0.0", "localhost"):
        return False
    try:
        ip_obj = ipaddress.ip_address(limpo)
        return not ip_obj.is_loopback and not ip_obj.is_unspecified
    except ValueError:
        return False


def normalizar_mac(mac: Optional[str]) -> Optional[str]:
    """Padroniza endereço MAC no formato xx:xx:xx:xx:xx:xx minúsculo."""
    if not mac:
        return None
    bruto = str(mac).strip().lower()
    hex_chars = re.sub(r"[^0-9a-f]", "", bruto)
    if len(hex_chars) == 12:
        return ":".join(hex_chars[i : i + 2] for i in range(0, 12, 2))
    return bruto.replace("-", ":")


def normalizar_ips(
    ip: Optional[str],
    ip_secundario: Optional[str] = None,
    extra_data: Any = None,
) -> Tuple[Optional[str], Optional[str], List[str]]:
    """
    Consolida e normaliza endereços IP:
    - Extrai IPs de device.ip, device.ip_secundario e extra_data (ips, ip2, ip_extra).
    - Remove loopbacks (127.0.0.1), caracteres estranhos e duplicidades mantendo a ordem.
    - Retorna (ip_principal, ip_secundario_str, ips_extras_list).
    """
    candidatos_brutos: List[str] = []

    if ip:
        candidatos_brutos.append(str(ip))
    if ip_secundario:
        candidatos_brutos.append(str(ip_secundario))

    if isinstance(extra_data, dict):
        for k in ("ips", "ip_secundario", "ip2", "ip_extra", "secondary_ips"):
            val = extra_data.get(k)
            if isinstance(val, list):
                candidatos_brutos.extend([str(x) for x in val if x])
            elif isinstance(val, str) and val.strip():
                candidatos_brutos.append(val)

        # Adapters de rede se existirem
        adapters = extra_data.get("network_adapters") or extra_data.get("adapters")
        if isinstance(adapters, list):
            for ad in adapters:
                if isinstance(ad, dict):
                    ad_ip = ad.get("ip") or ad.get("ip_address")
                    if ad_ip:
                        candidatos_brutos.append(str(ad_ip))

    # Separa por vírgula, ponto-e-vírgula, barra vertical ou espaço
    ips_limpos: List[str] = []
    seen = set()

    for item in candidatos_brutos:
        partes = re.split(r"[,;|\s]+", str(item).strip())
        for p in partes:
            p_limpo = p.strip()
            if eh_ip_valido(p_limpo) and p_limpo not in seen:
                seen.add(p_limpo)
                ips_limpos.append(p_limpo)

    if not ips_limpos:
        return (ip or None, ip_secundario or None, [])

    # Se o IP original era válido, mantém ele como principal
    ip_orig_limpo = (ip or "").strip()
    if ip_orig_limpo in ips_limpos:
        ip_principal = ip_orig_limpo
    else:
        ip_principal = ips_limpos[0]

    ips_extras = [x for x in ips_limpos if x != ip_principal]
    ip_sec_str = ", ".join(ips_extras) if ips_extras else None

    return (ip_principal, ip_sec_str, ips_extras)


# =====================================================================
# 2. Normalização de Tamanho (Bytes, MB, GB)
# =====================================================================

def tamanho_para_mb(val: Any) -> float:
    """Converte strings como '7,6Gi', '7.8 GB', '16384 MB', '222.7 GB', '109G' para megabytes numéricos."""
    if val is None:
        return 0.0
    v_str = str(val).strip().replace(",", ".")
    m = re.match(r"^([\d.]+)\s*([KMGT])?i?B?$", v_str, re.I)
    if not m:
        try:
            return float(v_str)
        except ValueError:
            return 0.0

    num = float(m.group(1))
    unidade = (m.group(2) or "M").upper()
    multiplicadores = {
        "K": 1.0 / 1024.0,
        "M": 1.0,
        "G": 1024.0,
        "T": 1048576.0,
    }
    return num * multiplicadores.get(unidade, 1.0)


def formatar_mb(mb: float) -> str:
    """Formata valor em MB para string legível ('8 GB', '512 MB')."""
    if mb <= 0:
        return "0 MB"
    if mb >= 1024:
        gb = mb / 1024.0
        # Se for quase inteiro (ex: 7.99 ou 15.98)
        if abs(gb - round(gb)) < 0.15:
            return f"{round(gb)} GB"
        return f"{gb:.1f} GB"
    return f"{round(mb)} MB"


def padronizar_tamanho_str(val: Optional[str]) -> Optional[str]:
    """Padroniza tamanho textual cru (ex: '219G' -> '219 GB', '7,6Gi' -> '8 GB')."""
    if not val:
        return None
    mb = tamanho_para_mb(val)
    if mb > 0:
        return formatar_mb(mb)
    return str(val).strip()


# =====================================================================
# 3. Normalização de Sistema Operacional, Versão, Build e Release
# =====================================================================

def normalizar_so(
    sistema: Optional[str],
    versao: Optional[str],
    build: Optional[str] = None,
    windows_release: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Padroniza informações do Sistema Operacional:
    - Remove ruídos corporativos da Microsoft ('Microsoft ', '(R)', '®').
    - Normaliza distros Linux com grafia oficial (Ubuntu, Zorin OS, Mint, etc.).
    - Retorna so_formatado, familia_so ('Windows' ou 'Linux'), windows_release limpo.
    """
    s_raw = str(sistema or "").strip()
    v_raw = str(versao or "").strip()
    full_raw = f"{s_raw} {v_raw}".strip()

    is_windows = bool(re.search(r"windows", full_raw, re.I))
    familia_so = "Windows" if is_windows else "Linux"

    if is_windows:
        alvo = v_raw if re.search(r"windows", v_raw, re.I) else s_raw
        if not alvo:
            alvo = "Windows"
        limpo = re.sub(r"microsoft\s*", "", alvo, flags=re.I)
        limpo = re.sub(r"\(r\)|®|\(tm\)", "", limpo, flags=re.I)
        limpo = re.sub(r"\s+", " ", limpo).strip()
        limpo = re.sub(r"^windows", "Windows", limpo, flags=re.I)

        # Versão Release / Feature Update real enviada pelo agente (ex: '25H2', '24H2', '23H2', '22H2')
        # Não faz dedução por build! Apenas utiliza a release real registrada ou explícita.
        rel_limpo = None
        if windows_release:
            rel_limpo = str(windows_release).strip()
            rel_limpo = re.sub(r"^windows\s*", "", rel_limpo, flags=re.I).strip()
            m_rel = re.search(r"\b(2[0-9]H[1-2])\b", rel_limpo, re.I)
            if m_rel:
                rel_limpo = m_rel.group(1).upper()
            elif not rel_limpo or rel_limpo.lower() in ("none", "null", ""):
                rel_limpo = None

        # Se a própria string da versão já contiver a release explicitamente (ex: 'Windows 11 Pro 25H2')
        if not rel_limpo:
            m_rel = re.search(r"\b(2[0-9]H[1-2])\b", full_raw, re.I)
            if m_rel:
                rel_limpo = m_rel.group(1).upper()

        # Incorpora a release de feature diretamente no so_formatado apenas se informada
        so_formatado = limpo or "Windows"
        if rel_limpo:
            # Se a string ainda não contém a release, anexa
            if not re.search(r"\b" + re.escape(rel_limpo) + r"\b", so_formatado, re.I):
                so_formatado = f"{so_formatado} {rel_limpo}".strip()

        return {
            "familia_so": "Windows",
            "so_formatado": so_formatado,
            "windows_release_formatado": rel_limpo,
            "build_formatado": str(build).strip() if build else None,
        }

    # Tratamento para Linux: se contém 'linux' e o nome de uma distro, remove o 'linux' genérico
    texto_so = full_raw
    # Remove 'linux' ou 'gnu/linux' isolado se houver distro específica
    tem_distro = any(re.search(r"\b" + d + r"\b", texto_so, re.I) for d in ("ubuntu", "kubuntu", "zorin", "mint", "debian", "fedora", "centos", "rocky", "opensuse", "arch", "redhat", "rhel"))
    if tem_distro:
        texto_so = re.sub(r"\b(gnu/)?linux\b", "", texto_so, flags=re.I).strip()
        texto_so = re.sub(r"\s+", " ", texto_so).strip()

    # 1. Regra Canônica Específica para Kubuntu / Ubuntu (Kubuntu 26.04, Kubuntu 24.04, Kubuntu 22.04, Kubuntu 20.04)
    if re.search(r"\b(k?ubuntu)\b", texto_so, re.I):
        m_ver = re.search(r"\b(26\.04|24\.04|22\.04|20\.04|\d{2}\.\d{2})\b", texto_so)
        if m_ver:
            so_encontrado = f"Kubuntu {m_ver.group(1)}"
        else:
            so_encontrado = "Kubuntu"
    # 2. Regra Canônica Específica para Zorin (Zorin 18, Zorin 17 - sem 'OS' nem decimais)
    elif re.search(r"\bzorin\b", texto_so, re.I):
        m_ver = re.search(r"\b(\d+)\b", texto_so)
        if m_ver:
            so_encontrado = f"Zorin {m_ver.group(1)}"
        else:
            so_encontrado = "Zorin"
    else:
        so_encontrado = None
        for padrao, nome_canonico in NOMES_DISTROS_LINUX:
            m = padrao.search(texto_so)
            if m:
                resto = padrao.sub("", texto_so).strip()
                resto = re.sub(r"\s+", " ", resto).strip()
                so_encontrado = f"{nome_canonico} {resto}".strip()
                break

        if not so_encontrado:
            if texto_so:
                so_encontrado = texto_so[0].upper() + texto_so[1:]
            else:
                so_encontrado = "Linux"

    return {
        "familia_so": "Linux",
        "so_formatado": so_encontrado,
        "windows_release_formatado": None,
        "build_formatado": str(build).strip() if build else None,
    }


# =====================================================================
# 4. Normalização de Hardware (Processador, RAM, Fabricante/Modelo, Serial)
# =====================================================================

def normalizar_processador(cpu: Optional[str]) -> Optional[str]:
    """Limpa ruídos repetitivos do processador como (R), (TM), @ 2.50GHz e 'CPU' duplicado."""
    if not cpu:
        return None
    txt = str(cpu).strip()
    txt = re.sub(r"\((R|TM|r|tm)\)", "", txt)
    txt = re.sub(r"\bCPU\b", "", txt)
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt or None


def normalizar_ram(
    ram_total: Optional[str],
    ram_tipo: Optional[str] = None,
) -> Dict[str, Any]:
    """Padroniza memória RAM total e tipo de memória."""
    mb = tamanho_para_mb(ram_total)
    ram_formatada = formatar_mb(mb) if mb > 0 else (ram_total or None)

    tipo_limpo = None
    if ram_tipo:
        t_str = str(ram_tipo).strip()
        if t_str.lower() not in PLACEHOLDERS_OEM:
            tipo_limpo = t_str

    return {
        "ram_total_formatada": ram_formatada,
        "ram_tipo_limpo": tipo_limpo,
    }


def normalizar_fabricante_modelo(
    fabricante: Optional[str],
    modelo: Optional[str],
    serial: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Filtra strings genéricas de OEM ('To Be Filled By O.E.M.', 'System manufacturer')
    e produz modelo_formatado conciso.
    """
    def limpar_campo(val: Optional[str]) -> Optional[str]:
        if not val:
            return None
        v = str(val).strip()
        if v.lower() in PLACEHOLDERS_OEM:
            return None
        return v

    fab = limpar_campo(fabricante)
    mod = limpar_campo(modelo)
    ser = limpar_campo(serial)

    # Evita duplicação de fabricante no modelo (ex: 'Dell Inc.' e 'Dell OptiPlex 3050')
    partes = []
    if fab:
        partes.append(fab)
    if mod:
        if fab and mod.lower().startswith(fab.lower()):
            partes = [mod]
        else:
            partes.append(mod)

    modelo_completo = " ".join(partes) if partes else "Não informado"

    return {
        "fabricante_limpo": fab,
        "modelo_limpo": mod,
        "serial_limpo": ser,
        "modelo_formatado": modelo_completo,
    }


# =====================================================================
# 5. Normalização de Datas e Status de Comunicação
# =====================================================================

def formatar_data_brasilia(dt: Optional[datetime], incluir_segundos: bool = True) -> str:
    """Converte e formata datetime UTC no fuso horário oficial de Brasília (America/Sao_Paulo, UTC-3)."""
    if not dt:
        return ""
    if dt.tzinfo is not None:
        dt_bsb = dt.astimezone(timezone(timedelta(hours=-3)))
    else:
        dt_utc = dt.replace(tzinfo=timezone.utc)
        dt_bsb = dt_utc.astimezone(timezone(timedelta(hours=-3)))
    fmt = "%d/%m/%Y %H:%M:%S" if incluir_segundos else "%d/%m/%Y %H:%M"
    return dt_bsb.strftime(fmt)


def normalizar_datas_e_status(
    data_coleta: Optional[datetime],
    now: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Calcula tempo relativo ('há 15m', 'há 3h', 'há 2 dias'), status_conexao
    ('online', 'alerta', 'offline') e formatação pt-BR de data_coleta.
    """
    if not data_coleta:
        return {
            "data_coleta_formatada": None,
            "tempo_relativo_coleta": "Sem envio (+48h)",
            "status_conexao": "offline",
            "status_conexao_label": "Inativa (+48h)",
        }

    agora = now or datetime.utcnow()
    # Compatibiliza timezone (naive vs aware)
    d_coleta = data_coleta
    if d_coleta.tzinfo is not None:
        try:
            from datetime import timezone
            d_coleta = d_coleta.astimezone(timezone.utc).replace(tzinfo=None)
        except Exception:
            d_coleta = d_coleta.replace(tzinfo=None)

    # Se data_coleta for no futuro por skew de relógio, trata como agora
    diff = max(timedelta(seconds=0), agora - d_coleta)
    diff_horas = diff.total_seconds() / 3600.0

    # Formatação pt-BR da data no fuso de Brasília (UTC-3)
    data_formatada = formatar_data_brasilia(data_coleta, incluir_segundos=False)

    if diff_horas < 1.0:
        minutos = max(1, int(diff.total_seconds() / 60.0))
        tempo_rel = f"há {minutos}m"
        status = "online"
        label = "Ativa (< 24h)"
    elif diff_horas < 24.0:
        horas = int(diff_horas)
        tempo_rel = f"há {horas}h"
        status = "online"
        label = "Ativa (< 24h)"
    elif diff_horas < 48.0:
        horas = int(diff_horas)
        tempo_rel = f"há {horas}h"
        status = "alerta"
        label = "Atenção (24h - 48h)"
    else:
        dias = int(diff_horas / 24.0)
        tempo_rel = f"há {dias} dia{'s' if dias > 1 else ''}"
        status = "offline"
        label = f"Inativa (+48h)"

    return {
        "data_coleta_formatada": data_formatada,
        "tempo_relativo_coleta": tempo_rel,
        "status_conexao": status,
        "status_conexao_label": label,
    }


def eh_windows_10(
    sistema: Optional[str] = None,
    versao: Optional[str] = None,
    so_formatado: Optional[str] = None,
) -> bool:
    """Verifica se o dispositivo é Windows 10 (qualquer edição ou build 10.0.1904x)."""
    textos = [str(x) for x in (so_formatado, versao, sistema) if x]
    comb = " ".join(textos)
    if not comb:
        return False
    return bool(
        re.search(r"windows\s*10\b", comb, re.I)
        or re.search(r"\bwin10\b", comb, re.I)
        or re.search(r"\b10\.0\.1904\d\b", comb, re.I)
    )


def normalizar_status_operacional(
    status: Optional[str],
    sistema: Optional[str] = None,
    versao: Optional[str] = None,
    so_formatado: Optional[str] = None,
) -> Tuple[str, str, str]:
    """
    Padroniza o status operacional da máquina (idêntico ao V1):
    - Se for Windows 10 (qualquer edição) -> obrigatoriamente ('Atualização Necessária', 'warning', 'UPGRADE_REQUIRED')
    - status == 'OK' -> ('Atualizada', 'ok', 'OK')
    - status == 'UPGRADE_REQUIRED' -> ('Atualização Necessária', 'warning', 'UPGRADE_REQUIRED')
    - outro/desconhecido/fora do padrão -> ('Desatualizada', 'danger', 'OUTRO')
    Retorna (status_operacional_label, status_operacional_nivel, status_operacional_codigo).
    """
    if eh_windows_10(sistema, versao, so_formatado):
        return "Atualização Necessária", "warning", "UPGRADE_REQUIRED"

    s_clean = str(status or "").strip().upper()
    if s_clean == "OK":
        return "Atualizada", "ok", "OK"
    elif s_clean == "UPGRADE_REQUIRED":
        return "Atualização Necessária", "warning", "UPGRADE_REQUIRED"
    else:
        return "Desatualizada", "danger", "OUTRO"


# =====================================================================
# 6. Normalização Estruturada de Discos e Análise de Disco
# =====================================================================

REGEX_NVME = re.compile(
    r"\b(nvme|nvm_express)\b|pcie.*ssd|\b(snvs|snv3|snv2|sfyrs)\b|"
    r"samsung.*(970|980|990|pm981|pm991|pm9a1)|wd.*(sn[3-8]\d\d|black\s+sn)|"
    r"crucial.*(p[1-5]|t[5-7]\d\d)|kingston.*(nv1|nv2|nv3|renegade|kc[23]000)",
    re.I,
)

REGEX_VIRTUAL = re.compile(
    r"\b(vmware|qemu|vbox|virtualbox|virtual\s*disk|vhd|vd[a-z]|virtio)\b",
    re.I,
)

REGEX_SSD = re.compile(
    r"\b(ssd|solid\s*state)\b|"
    r"\b(sa400|suv400|bx500|mx500|adata\s*su|sandisk\s*ssd|kingston\s*ssd|crucial\s*ssd|"
    r"lexar\s*ssd|patriot\s*ssd|netac\s*ssd|kingspec|xraydisk|goldenfire|biostar\s*ssd)\b|"
    r"\bwds\d+[a-z0-9]*\b|samsung.*(850|860|870)\s*(evo|qvo|pro)",
    re.I,
)

REGEX_HDD = re.compile(
    r"\b(hdd|mechanical|hard\s*disk|hard\s*drive)\b|"
    r"\b(st\d{3,4}[a-z0-9]*|wd\d{4}[a-z0-9]*|wd\d{2}ez[a-z0-9]*|toshiba\s*dt|hgst|hitachi|"
    r"barracuda|caviar\s*blue|caviar\s*black|5400\s*rpm|7200\s*rpm)\b",
    re.I,
)


def normalizar_tipo_armazenamento(device: Any) -> str:
    """
    Classifica de forma inteligente o tipo de armazenamento principal do dispositivo:
    'NVMe', 'SSD', 'HDD', 'Virtual' ou 'Não Identificado'.

    Inspeciona em ordem de prioridade:
    1. Discos reportados pelo agente (analise_disco / extra_data / storage / discos).
    2. Atributos explícitos (type, media_type, bus_type, interface, rotational).
    3. Modelos e device paths conhecidos (nvme, SA400, SUV400, ST500, WD10EZ, etc.).
    4. Modelo da máquina / placa-mãe para detecção de máquinas virtuais (VMware, QEMU, VBOX).
    5. Fallback para 'Não Identificado' se ausente no import legado.
    """
    if device is None:
        return "Não Identificado"

    def _get(attr: str, default=None):
        if isinstance(device, dict):
            return device.get(attr, default)
        return getattr(device, attr, default)

    # 1. Atributo direto pré-classificado se já existir e for válido
    tipo_direto = _get("disco_tipo")
    if tipo_direto and isinstance(tipo_direto, str):
        td_clean = tipo_direto.strip()
        if td_clean in ("NVMe", "SSD", "HDD", "Virtual"):
            return td_clean
        td_l = td_clean.lower()
        if "nvme" in td_l:
            return "NVMe"
        if "ssd" in td_l or "solid" in td_l:
            return "SSD"
        if "hdd" in td_l or "hard" in td_l or "mec" in td_l:
            return "HDD"
        if any(v in td_l for v in ("virtual", "vmware", "qemu", "vbox")):
            return "Virtual"

    # Coleta de todos os itens de disco candidatos
    candidatos_discos: List[Dict[str, Any]] = []

    # A) analise_disco
    raw_analise = _get("analise_disco")
    if isinstance(raw_analise, str):
        try:
            raw_analise = json.loads(raw_analise)
        except Exception:
            raw_analise = None

    if isinstance(raw_analise, list):
        for item in raw_analise:
            if isinstance(item, dict):
                candidatos_discos.append(item)
    elif isinstance(raw_analise, dict):
        for key in ("unidades", "discos", "disks", "drives", "storage", "particoes"):
            sub = raw_analise.get(key)
            if isinstance(sub, list):
                for item in sub:
                    if isinstance(item, dict):
                        candidatos_discos.append(item)

    # B) extra_data
    raw_extra = _get("extra_data")
    if isinstance(raw_extra, str):
        try:
            raw_extra = json.loads(raw_extra)
        except Exception:
            raw_extra = None

    if isinstance(raw_extra, dict):
        for key in ("storage", "discos", "disks", "disk_info", "armazenamento"):
            sub = raw_extra.get(key)
            if isinstance(sub, list):
                for item in sub:
                    if isinstance(item, dict):
                        candidatos_discos.append(item)
            elif isinstance(sub, dict):
                candidatos_discos.append(sub)

    # C) perifericos
    raw_perif = _get("perifericos")
    if isinstance(raw_perif, list):
        for p in raw_perif:
            if isinstance(p, dict):
                p_tipo = str(p.get("tipo") or "").lower()
                if p_tipo in ("armazenamento", "disco", "disk", "storage", "drive"):
                    candidatos_discos.append(p)

    def _classificar_item(item: Dict[str, Any]) -> Optional[str]:
        """Avalia atributos e strings de um único item de disco."""
        # 1. Checagem de tipo explícito reportado pelo agente
        media_type = str(item.get("media_type") or item.get("mediaType") or "").strip()
        bus_type = str(item.get("bus_type") or item.get("busType") or item.get("interface") or item.get("tipo") or item.get("type") or "").strip()
        rota_val = item.get("rotational") if "rotational" in item else item.get("rota")

        # Prioridade NVMe por bus ou media
        if re.search(r"\bnvme\b", f"{bus_type} {media_type}", re.I):
            return "NVMe"
        if re.search(r"\b(vmware|qemu|vbox|virtual)\b", f"{bus_type} {media_type}", re.I):
            return "Virtual"
        if re.search(r"\b(ssd|solid\s*state)\b", media_type, re.I):
            return "SSD"
        if re.search(r"\b(hdd|mechanical|hard\s*disk)\b", media_type, re.I):
            return "HDD"

        # rotational: se False / 0 -> SSD; se True / 1 -> HDD
        if rota_val is not None:
            if rota_val is False or rota_val == 0 or str(rota_val).strip().lower() in ("0", "false"):
                return "SSD"
            if rota_val is True or rota_val == 1 or str(rota_val).strip().lower() in ("1", "true"):
                return "HDD"

        # 2. Checagem por modelo, nome e caminho do dispositivo
        model_str = str(
            item.get("modelo")
            or item.get("model")
            or item.get("nome")
            or item.get("name")
            or item.get("friendly_name")
            or item.get("caption")
            or item.get("ponto_montagem")
            or item.get("device")
            or ""
        ).strip()

        if model_str:
            if REGEX_NVME.search(model_str) or re.search(r"/dev/nvme", model_str, re.I):
                return "NVMe"
            if REGEX_VIRTUAL.search(model_str):
                return "Virtual"
            if REGEX_SSD.search(model_str):
                return "SSD"
            if REGEX_HDD.search(model_str):
                return "HDD"

        return None

    # Primeiro: Avalia se existe unidade de sistema identificada (C: ou /)
    tipos_detectados: List[str] = []
    for d_item in candidatos_discos:
        t_res = _classificar_item(d_item)
        if not t_res:
            continue

        pm = str(d_item.get("ponto_montagem") or d_item.get("device") or "").strip().upper()
        # Se for a partição do sistema operacional, assume prioridade absoluta
        if pm in ("C:", "/", "/ROOT"):
            return t_res

        tipos_detectados.append(t_res)

    # Hierarquia padrão para múltiplos discos sem partição de SO explícita:
    # NVMe > SSD > Virtual > HDD
    if "NVMe" in tipos_detectados:
        return "NVMe"
    if "SSD" in tipos_detectados:
        return "SSD"
    if "Virtual" in tipos_detectados:
        return "Virtual"
    if "HDD" in tipos_detectados:
        return "HDD"

    # 3. Fallback: Checa metadados globais da máquina (modelo, fabricante, alerta_hardware)
    fab_str = str(_get("fabricante") or "").strip()
    mod_str = str(_get("modelo") or "").strip()
    full_hw = f"{fab_str} {mod_str}".strip()

    if REGEX_VIRTUAL.search(full_hw):
        return "Virtual"
    if REGEX_NVME.search(mod_str):
        return "NVMe"
    if REGEX_SSD.search(mod_str):
        return "SSD"
    if REGEX_HDD.search(mod_str):
        return "HDD"

    alerta_hw = str(_get("alerta_hardware") or "").strip()
    if alerta_hw:
        # Se tiver menção específica não dúbia
        if re.search(r"\b(nvme)\b", alerta_hw, re.I):
            return "NVMe"
        if re.search(r"troca\s+de\s+ssd\b", alerta_hw, re.I) and not re.search(r"troca\s+de\s+ssd/hd", alerta_hw, re.I):
            return "SSD"
        if re.search(r"troca\s+de\s+hd\b", alerta_hw, re.I) and not re.search(r"troca\s+de\s+ssd/hd", alerta_hw, re.I):
            return "HDD"

    return "Não Identificado"


def normalizar_analise_disco(
    analise_raw: Any,
    disco_total: Optional[str] = None,
    disco_usado: Optional[str] = None,
    disco_livre: Optional[str] = None,
    disco_percentual: Optional[int] = None,
) -> Dict[str, Any]:
    r"""
    Estrutura e padroniza analise_disco:
    - Unidades de disco (Windows C:\, D:\ ou Linux /, /mnt/storage) com percentual e GB padronizados.
    - Preserva todas as unidades secundárias e partições extras enviadas por Linux e Windows.
    - Perfis de usuários e subpastas com tamanhos limpos e ordenação.
    - Logs em /var/log com maiores itens.
    - Se unidades estiver vazio, sintetiza a unidade principal baseada nos dados do dispositivo.
    """
    if isinstance(analise_raw, str):
        try:
            analise_raw = json.loads(analise_raw)
        except Exception:
            pass

    executada = False
    unidades: List[Dict[str, Any]] = []
    top_usuarios: List[Dict[str, Any]] = []
    var_log_itens: List[Dict[str, Any]] = []

    raw_u = []
    raw_usr = []
    raw_vl = []

    if isinstance(analise_raw, list):
        executada = len(analise_raw) > 0
        raw_u = analise_raw
    elif isinstance(analise_raw, dict):
        executada = bool(analise_raw.get("executada", False))
        raw_u = (
            analise_raw.get("unidades")
            or analise_raw.get("particoes")
            or analise_raw.get("drives")
            or analise_raw.get("discos")
            or []
        )
        raw_usr = analise_raw.get("top_usuarios") or analise_raw.get("usuarios") or []
        raw_vl = analise_raw.get("var_log") or []

    # Unidades / Partições
    if isinstance(raw_u, list):
        for u in raw_u:
            if isinstance(u, dict):
                pm = str(
                    u.get("ponto_montagem")
                    or u.get("montagem")
                    or u.get("letra")
                    or u.get("device")
                    or u.get("drive")
                    or ""
                ).strip()
                if not pm:
                    continue

                # Ignorar pseudo-filesystems e camadas efêmeras de contêineres Docker/Containerd no Linux
                if re.search(r"/(docker|containerd)/(rootfs|overlay2|overlayfs|containers)/", pm, re.I):
                    continue
                if pm.startswith(("/var/lib/docker/", "/var/lib/containerd/")):
                    continue
                if pm.startswith(("/sys/firmware/efi/efivars", "/sys/kernel/")):
                    continue

                pct_val = u.get("percentual") or u.get("percentual_usado") or 0
                try:
                    pct_num = float(str(pct_val).replace("%", "").replace(",", ".").strip())
                except ValueError:
                    pct_num = 0.0

                rotulo = u.get("rotulo") or u.get("label")
                if not rotulo:
                    pm_norm = pm.upper()
                    if pm == "/" or pm_norm == "C:":
                        rotulo = "Sistema"
                    elif pm == "/boot":
                        rotulo = "Boot"
                    elif pm == "/boot/efi":
                        rotulo = "EFI"
                    elif pm.startswith(("/mnt", "/media", "/dados", "/data", "/storage")):
                        rotulo = "Armazenamento"

                unidades.append({
                    "ponto_montagem": pm,
                    "tipo_fs": u.get("tipo_fs") or u.get("fstype"),
                    "rotulo": rotulo,
                    "total": padronizar_tamanho_str(u.get("total")),
                    "usado": padronizar_tamanho_str(u.get("usado")),
                    "livre": padronizar_tamanho_str(u.get("livre")),
                    "percentual": round(pct_num, 1),
                })

    # Usuários e Pastas
    if isinstance(raw_usr, list):
        for usr in raw_usr:
            if isinstance(usr, dict):
                u_nome = usr.get("usuario") or usr.get("nome") or "Desconhecido"
                u_tam = padronizar_tamanho_str(usr.get("tamanho"))
                u_mb = tamanho_para_mb(usr.get("tamanho"))

                pastas_limpas: List[Dict[str, Any]] = []
                sub = usr.get("pastas") or usr.get("subpastas")
                if isinstance(sub, list):
                    for p in sub:
                        if isinstance(p, dict):
                            pastas_limpas.append({
                                "pasta": p.get("pasta") or p.get("nome") or "Pasta",
                                "caminho": p.get("caminho") or "",
                                "tamanho": padronizar_tamanho_str(p.get("tamanho")),
                                "tamanho_mb": round(tamanho_para_mb(p.get("tamanho")), 2),
                            })

                top_usuarios.append({
                    "usuario": u_nome,
                    "tamanho": u_tam,
                    "tamanho_mb": round(u_mb, 2),
                    "pastas": pastas_limpas,
                })

    # Var Log (Linux)
    if isinstance(raw_vl, dict):
        itens_vl = raw_vl.get("top_itens") or []
    elif isinstance(raw_vl, list):
        itens_vl = raw_vl
    else:
        itens_vl = []

    if isinstance(itens_vl, list):
        for it in itens_vl:
            if isinstance(it, dict):
                var_log_itens.append({
                    "nome": it.get("nome") or it.get("pasta") or "log",
                    "caminho": it.get("caminho") or "",
                    "tamanho": padronizar_tamanho_str(it.get("tamanho")),
                    "tamanho_mb": round(tamanho_para_mb(it.get("tamanho")), 2),
                })

    # Fallback: Se não havia lista de unidades válidas, mas o dispositivo tem disco_total, sintetiza unidade C: / /
    if not unidades and disco_total:
        pct_dev = disco_percentual or 0
        unidades.append({
            "ponto_montagem": "Disco Principal",
            "tipo_fs": None,
            "rotulo": "Sistema",
            "total": padronizar_tamanho_str(disco_total),
            "usado": padronizar_tamanho_str(disco_usado),
            "livre": padronizar_tamanho_str(disco_livre),
            "percentual": float(pct_dev),
        })

    # Resumo consolidado de usuários
    soma_usr_mb = sum(u["tamanho_mb"] for u in top_usuarios)
    resumo_usuarios = {
        "total_usuarios": len(top_usuarios),
        "soma_tamanho_formatada": formatar_mb(soma_usr_mb) if soma_usr_mb > 0 else "0 MB",
        "soma_tamanho_mb": round(soma_usr_mb, 2),
    }

    # Resumo de /var/log
    soma_log_mb = sum(it["tamanho_mb"] for it in var_log_itens)
    resumo_var_log = {
        "total_itens": len(var_log_itens),
        "tamanho_total": formatar_mb(soma_log_mb) if soma_log_mb > 0 else "0 MB",
        "top_itens": var_log_itens,
    }

    return {
        "executada": executada or bool(top_usuarios or var_log_itens or len(unidades) > 0),
        "unidades": unidades,
        "top_usuarios": top_usuarios,
        "usuarios": top_usuarios,
        "var_log": resumo_var_log,
        "resumo_usuarios": resumo_usuarios,
    }


# =====================================================================
# 7. Normalização e Categorização de Periféricos
# =====================================================================

def normalizar_perifericos(perifericos_raw: Any) -> Dict[str, Any]:
    """
    Padroniza lista de periféricos conectando ícones, limpando seriais/fabricantes
    e agrupando por categorias sem ruídos.
    """
    itens_padronizados: List[Dict[str, Any]] = []
    agrupados: Dict[str, List[Dict[str, Any]]] = {
        "monitores": [],
        "armazenamento_usb": [],
        "smartphones": [],
        "impressoras": [],
        "teclados": [],
        "mouses": [],
        "outros": [],
    }

    lista_fonte = perifericos_raw if isinstance(perifericos_raw, list) else []

    for idx, p in enumerate(lista_fonte):
        if not isinstance(p, dict):
            continue

        tipo_bruto = str(p.get("tipo") or "outro").lower().strip()
        nome_bruto = str(p.get("nome") or "Dispositivo").strip()

        # Classificação do tipo canônico
        if "monitor" in tipo_bruto or "display" in tipo_bruto or "tela" in tipo_bruto:
            tipo_canonico = "monitor"
            cat_grupo = "monitores"
        elif "smartphone" in tipo_bruto or "celular" in tipo_bruto or "mtp" in tipo_bruto:
            tipo_canonico = "smartphone"
            cat_grupo = "smartphones"
        elif "armazenamento" in tipo_bruto or "storage" in tipo_bruto or "pendrive" in tipo_bruto or "flash" in tipo_bruto:
            tipo_canonico = "armazenamento_usb"
            cat_grupo = "armazenamento_usb"
        elif "impressora" in tipo_bruto or "printer" in tipo_bruto:
            tipo_canonico = "impressora"
            cat_grupo = "impressoras"
        elif "teclado" in tipo_bruto or "keyboard" in tipo_bruto:
            tipo_canonico = "teclado"
            cat_grupo = "teclados"
        elif "mouse" in tipo_bruto:
            tipo_canonico = "mouse"
            cat_grupo = "mouses"
        else:
            tipo_canonico = "outro"
            cat_grupo = "outros"

        # Limpeza de campos
        def limpo_ou_none(v: Any) -> Optional[str]:
            if not v:
                return None
            s = str(v).strip()
            if s.lower() in PLACEHOLDERS_OEM or s in ("0", ""):
                return None
            return s

        fab = limpo_ou_none(p.get("fabricante"))
        ser = limpo_ou_none(p.get("serial"))
        con = limpo_ou_none(p.get("conexao"))
        cap = padronizar_tamanho_str(limpo_ou_none(p.get("capacidade")))
        det = limpo_ou_none(p.get("detalhes"))

        item_normalizado = {
            "id": idx + 1,
            "tipo": tipo_canonico,
            "nome": nome_bruto,
            "fabricante": fab,
            "serial": ser,
            "conexao": con,
            "capacidade": cap,
            "detalhes": det,
        }

        itens_padronizados.append(item_normalizado)
        agrupados[cat_grupo].append(item_normalizado)

    return {
        "itens": itens_padronizados,
        "agrupados": agrupados,
        "total": len(itens_padronizados),
        "total_monitores": len(agrupados["monitores"]),
        "total_usb": len(agrupados["armazenamento_usb"]),
    }


# =====================================================================
# 8. Orquestradores Principais de Normalização de Dispositivos
# =====================================================================

def normalizar_device_list_item(device: Any) -> Dict[str, Any]:
    """
    Normaliza todos os campos de um registro de Device para retorno em listagens (DeviceListItem).
    Aplica:
    - Normalização de IPs (IP principal garantido, ip_secundario string e ips_extras: List[str]).
    - Normalização de SO (so_formatado limpo e familia_so 'Windows'|'Linux').
    - Limpeza de CPU, RAM e Discos.
    - Datas formatadas em pt-BR e cálculo de tempo_relativo_coleta + status_conexao.
    """
    # 1. IPs
    ip_princ, ip_sec_str, ips_extras = normalizar_ips(
        device.ip,
        device.ip_secundario,
        getattr(device, "extra_data", None),
    )

    # 2. SO
    win_rel = getattr(device, "windows_release", None)
    if not win_rel and isinstance(getattr(device, "extra_data", None), dict):
        win_rel = device.extra_data.get("windows_release") or device.extra_data.get("release")
    so_info = normalizar_so(device.sistema, device.versao, getattr(device, "build", None), win_rel)

    # 3. CPU e RAM
    cpu_limpo = normalizar_processador(device.processador)
    ram_info = normalizar_ram(device.ram_total, getattr(device, "ram_tipo", None))

    # 4. Discos
    d_total_fmt = padronizar_tamanho_str(device.disco_total)
    d_usado_fmt = padronizar_tamanho_str(device.disco_usado)
    d_livre_fmt = padronizar_tamanho_str(device.disco_livre)

    pct_disco = device.disco_percentual
    if pct_disco is None and device.disco_usado and device.disco_total:
        u_mb = tamanho_para_mb(device.disco_usado)
        t_mb = tamanho_para_mb(device.disco_total)
        if t_mb > 0:
            pct_disco = int(round((u_mb / t_mb) * 100))

    disco_nivel = "bad" if (pct_disco or 0) >= 85 else "warn" if (pct_disco or 0) >= 70 else "ok"

    # 5. Datas e Status Conexão
    status_info = normalizar_datas_e_status(device.data_coleta)

    # 6. Status Operacional (idêntico ao V1)
    st_op_label, st_op_nivel, st_op_cod = normalizar_status_operacional(
        device.status,
        sistema=device.sistema,
        versao=device.versao,
        so_formatado=so_info["so_formatado"],
    )

    # Normalização de Loja / Filial sem duplicações do tipo [MATRIZ] MATRIZ
    loja_val = device.loja
    if not loja_val and getattr(device, "site", None):
        loja_val = device.site.name
    if loja_val:
        loja_val = re.sub(r"^\[([^\]]+)\]\s*\1$", r"\1", str(loja_val).strip(), flags=re.I)

    return {
        "id": device.id,
        "company_id": device.company_id,
        "site_id": device.site_id,
        "hostname": device.hostname,
        "loja": loja_val,
        "ip": ip_princ,
        "ip_secundario": ip_sec_str,
        "ips_extras": ips_extras,
        "mac": normalizar_mac(device.mac),
        "sistema": so_info["so_formatado"] or device.sistema,
        "versao": so_info["windows_release_formatado"] or device.versao,
        "so_formatado": so_info["so_formatado"],
        "familia_so": so_info["familia_so"],
        "status": st_op_cod,
        "status_operacional_label": st_op_label,
        "status_operacional_nivel": st_op_nivel,
        "status_operacional_codigo": st_op_cod,
        "alerta_hardware": device.alerta_hardware,
        "processador": device.processador,
        "processador_formatado": cpu_limpo,
        "ram_total": device.ram_total,
        "ram_total_formatada": ram_info["ram_total_formatada"],
        "disco_total": device.disco_total,
        "disco_total_formatado": d_total_fmt,
        "disco_usado": device.disco_usado,
        "disco_usado_formatado": d_usado_fmt,
        "disco_livre": device.disco_livre,
        "disco_livre_formatado": d_livre_fmt,
        "disco_percentual": pct_disco,
        "disco_nivel": disco_nivel,
        "disco_tipo": normalizar_tipo_armazenamento(device),
        "rustdesk_id": device.rustdesk_id,
        "data_coleta": device.data_coleta,
        "data_coleta_formatada": status_info["data_coleta_formatada"],
        "tempo_relativo_coleta": status_info["tempo_relativo_coleta"],
        "status_conexao": status_info["status_conexao"],
        "status_conexao_label": status_info["status_conexao_label"],
        "patrimonio": device.patrimonio,
        "firewall_status": device.firewall_status,
        "firewall_solicitado_por": device.firewall_solicitado_por,
        "firewall_solicitado_em": device.firewall_solicitado_em,
        "firewall_confirmado_por": device.firewall_confirmado_por,
        "firewall_confirmado_em": device.firewall_confirmado_em,
        "active": device.active,
        "created_at": device.created_at,
        "updated_at": device.updated_at,
    }


def mascarar_chave_serial(chave: Optional[str]) -> Optional[str]:
    """
    Mascara irreversivelmente chaves de ativação de Windows e Office para perfis restritos (operator).
    Exemplo: XXXXX-12345-ABCDE-67890-FGHIJ -> XXXXX-•••••-•••••-•••••-•••••
    """
    if not chave or str(chave).strip().lower() in ("none", "null", "-", ""):
        return None
    ch = str(chave).strip()
    partes = ch.split("-")
    if len(partes) >= 2:
        return f"{partes[0]}-" + "-".join(["•••••" for _ in partes[1:]])
    if len(ch) > 5:
        return f"{ch[:5]}-•••••-•••••-•••••-•••••"
    return "•••••-•••••-•••••-•••••-•••••"


def normalizar_device_detail(device: Any, history_count: int = 0, is_operator: bool = False) -> Dict[str, Any]:
    """
    Normaliza registro completo de Device para retorno detalhado (DeviceDetailResponse).
    Inclui todos os campos de DeviceListItem mais:
    - Fabricante, Modelo e Serial sem ruídos de OEM ('To Be Filled By O.E.M.').
    - Discos, Pastas de Usuários e Logs estruturados em analise_disco.
    - Periféricos categorizados e agrupados.
    - Chaves de produto (Windows e Office) mascaradas quando o usuário for operator.
    """
    base = normalizar_device_list_item(device)

    # Fabricante e Modelo
    fab_mod = normalizar_fabricante_modelo(
        device.fabricante,
        device.modelo,
        device.serial,
    )

    # Análise de Disco
    analise_norm = normalizar_analise_disco(
        device.analise_disco,
        disco_total=device.disco_total,
        disco_usado=device.disco_usado,
        disco_livre=device.disco_livre,
        disco_percentual=base["disco_percentual"],
    )

    # Periféricos
    perif_norm = normalizar_perifericos(device.perifericos)

    win_rel = getattr(device, "windows_release", None)
    if not win_rel and isinstance(getattr(device, "extra_data", None), dict):
        win_rel = device.extra_data.get("windows_release") or device.extra_data.get("release")
    so_info = normalizar_so(device.sistema, device.versao, getattr(device, "build", None), win_rel)

    # Is rede de formatação (192.168.88.x)
    is_rede_formatacao = bool(base["ip"] and base["ip"].startswith("192.168.88."))

    s_win = getattr(device, "serial_windows", None)
    s_off = getattr(device, "serial_office", None)
    if is_operator:
        s_win = mascarar_chave_serial(s_win)
        s_off = mascarar_chave_serial(s_off)

    base.update({
        "fabricante": device.fabricante,
        "fabricante_limpo": fab_mod["fabricante_limpo"],
        "modelo": device.modelo,
        "modelo_limpo": fab_mod["modelo_limpo"],
        "modelo_formatado": fab_mod["modelo_formatado"],
        "serial": device.serial,
        "serial_limpo": fab_mod["serial_limpo"],
        "dominio": device.dominio,
        "usuario": device.usuario,
        "build": device.build,
        "ram_tipo": getattr(device, "ram_tipo", None),
        "windows_release": win_rel,
        "windows_release_formatado": so_info["windows_release_formatado"],
        "serial_windows": s_win,
        "serial_office": s_off,
        "analise_disco": analise_norm,
        "perifericos": perif_norm["itens"],
        "perifericos_agrupados": perif_norm["agrupados"],
        "extra_data": device.extra_data if device.extra_data is not None else {},
        "ip_definitivo": device.ip_definitivo,
        "licenca_windows_solicitada": bool(device.licenca_windows_solicitada),
        "motivo_alteracao": device.motivo_alteracao,
        "observacao_admin": device.observacao_admin,
        "motivo_upgrade": getattr(device, "motivo_upgrade", None),
        "so_anterior": device.so_anterior,
        "is_rede_formatacao": is_rede_formatacao,
        "history_count": history_count,
    })

    return base
