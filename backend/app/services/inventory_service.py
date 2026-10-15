import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.device import Device
from app.models.device_history import DeviceHistory
from app.models.device_software import DeviceSoftware
from app.models.site import Site
from app.models.site_identifier import SiteIdentifier
from app.models.software import Software
from app.models.software_package import SoftwarePackage
from app.models.user import User
from app.models.user_site_access import user_site_access


def normalizar_mac(m: Optional[str]) -> Optional[str]:
    if not m:
        return None
    bruto = str(m).strip().lower()
    hex_chars = re.sub(r"[^0-9a-f]", "", bruto)
    if len(hex_chars) == 12:
        return ":".join(hex_chars[i : i + 2] for i in range(0, 12, 2))
    return bruto.replace("-", ":")


def converter_percentual(valor: Any) -> Optional[int]:
    if valor is None:
        return None
    v_str = str(valor).strip().replace("%", "")
    try:
        return int(float(v_str))
    except (ValueError, TypeError):
        return None


def converter_data_coleta(valor: Any) -> Optional[datetime]:
    if not valor:
        return None
    v_str = str(valor).strip()
    try:
        return datetime.strptime(v_str, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        try:
            return datetime.fromisoformat(v_str)
        except Exception:
            return None


def simular_identificacao_site(
    hostname: str,
    company_id: int,
    db: Session,
    loja: Optional[str] = None,
) -> Dict[str, Any]:
    h = (hostname or "").upper().strip()
    l_str = str(loja or "").upper().strip() if loja else ""

    # 1. Correspondência direta pelo campo Loja enviado no payload
    if l_str:
        site_by_code = db.scalar(
            select(Site).where(
                Site.company_id == company_id,
                or_(
                    Site.code.ilike(l_str),
                    Site.name.ilike(l_str),
                ),
                Site.active.is_(True),
            )
        )
        if site_by_code:
            return {
                "matched": True,
                "site_id": site_by_code.id,
                "site_name": site_by_code.name,
                "site_code": site_by_code.code,
                "matched_by": f"Campo Loja ('{l_str}')",
                "details": f"Correspondência direta com código/nome da loja '{site_by_code.name}' ({site_by_code.code}).",
            }

        site_by_ident = db.scalar(
            select(Site)
            .join(SiteIdentifier, SiteIdentifier.site_id == Site.id)
            .where(
                SiteIdentifier.company_id == company_id,
                SiteIdentifier.identifier.ilike(l_str),
                SiteIdentifier.active.is_(True),
                Site.active.is_(True),
            )
        )
        if site_by_ident:
            return {
                "matched": True,
                "site_id": site_by_ident.id,
                "site_name": site_by_ident.name,
                "site_code": site_by_ident.code,
                "matched_by": f"Padrão no campo Loja ('{l_str}')",
                "details": f"O valor de loja '{l_str}' corresponde ao padrão cadastrado para '{site_by_ident.name}'.",
            }

    # 2. Busca dinâmica nos Padrões de Nomenclatura (SiteIdentifier) cadastrados no banco
    if h:
        rows = db.execute(
            select(SiteIdentifier.identifier, Site.id, Site.name, Site.code)
            .join(Site, Site.id == SiteIdentifier.site_id)
            .where(
                SiteIdentifier.company_id == company_id,
                SiteIdentifier.active.is_(True),
                Site.active.is_(True),
            )
        ).all()

        # Ordena identificadores por tamanho decrescente (mais específicos primeiro)
        sorted_rows = sorted(rows, key=lambda r: len(r[0]), reverse=True)

        for ident, s_id, s_name, s_code in sorted_rows:
            ident_clean = str(ident).upper().strip()
            if not ident_clean:
                continue

            # Suporte a curinga * (ex: "LJ01*")
            if "*" in ident_clean:
                pattern = "^" + re.escape(ident_clean).replace(r"\*", ".*") + "$"
                if re.match(pattern, h):
                    return {
                        "matched": True,
                        "site_id": s_id,
                        "site_name": s_name,
                        "site_code": s_code,
                        "matched_by": f"Padrão curinga ('{ident_clean}')",
                        "details": f"O hostname '{h}' atende ao padrão curinga '{ident_clean}' de '{s_name}'.",
                    }

            # Prefixo padrão: "LJ01-", "LJ01_", "LJ01." ou igualdade exata
            if (
                h == ident_clean
                or h.startswith(f"{ident_clean}-")
                or h.startswith(f"{ident_clean}_")
                or h.startswith(f"{ident_clean}.")
            ):
                return {
                    "matched": True,
                    "site_id": s_id,
                    "site_name": s_name,
                    "site_code": s_code,
                    "matched_by": f"Prefixo '{ident_clean}'",
                    "details": f"O hostname '{h}' inicia com o prefixo cadastrado '{ident_clean}' de '{s_name}'.",
                }

            # Prefixo alfanumérico sem separador (ex: "LJ01PDV" quando ident é "LJ01")
            if re.search(r"\d$", ident_clean) and h.startswith(ident_clean):
                return {
                    "matched": True,
                    "site_id": s_id,
                    "site_name": s_name,
                    "site_code": s_code,
                    "matched_by": f"Prefixo direto '{ident_clean}'",
                    "details": f"O hostname '{h}' inicia com a sigla '{ident_clean}' de '{s_name}'.",
                }

        # Verifica prefixo direto pelo Site.code se configurado
        all_sites = db.execute(
            select(Site.id, Site.name, Site.code)
            .where(Site.company_id == company_id, Site.active.is_(True))
        ).all()
        for s_id, s_name, s_code in all_sites:
            code_u = s_code.upper().strip()
            if code_u and (h == code_u or h.startswith(f"{code_u}-") or h.startswith(f"{code_u}_")):
                return {
                    "matched": True,
                    "site_id": s_id,
                    "site_name": s_name,
                    "site_code": s_code,
                    "matched_by": f"Código da Loja '{s_code}'",
                    "details": f"O hostname '{h}' corresponde diretamente ao código '{s_code}' de '{s_name}'.",
                }

    # 3. Fallback inteligente via Regex padrão (LJ01, CB01, AC, etc.) para manter retrocompatibilidade
    if h:
        match = re.match(r"^(LJ?\d+|CB?\d+|AC)(?:-|$)", h)
        if match:
            prefixo = match.group(1)
            m_num = re.search(r"\d+", prefixo)
            if m_num:
                num = int(m_num.group(0))
                codes_to_try = (
                    [f"C{num:02d}", f"COMBO-{num:02d}", f"C{num}"]
                    if prefixo.startswith("CB") or prefixo.startswith("C")
                    else [f"{num:02d}", str(num), f"LOJA-{num:02d}"]
                )
                site_regex = db.scalar(
                    select(Site).where(
                        Site.company_id == company_id,
                        Site.code.in_(codes_to_try),
                        Site.active.is_(True),
                    )
                )
                if site_regex:
                    return {
                        "matched": True,
                        "site_id": site_regex.id,
                        "site_name": site_regex.name,
                        "site_code": site_regex.code,
                        "matched_by": f"Reconhecimento padrão ({prefixo})",
                        "details": f"Reconhecido pelo padrão estrutural de filial ({prefixo}) como '{site_regex.name}'.",
                    }

    # 4. Fallback final para 'OUTROS'
    site_outros = db.scalar(
        select(Site).where(
            Site.company_id == company_id,
            Site.code == "OUTROS",
            Site.active.is_(True),
        )
    )
    if site_outros:
        return {
            "matched": False,
            "site_id": site_outros.id,
            "site_name": site_outros.name,
            "site_code": site_outros.code,
            "matched_by": "Fallback (OUTROS)",
            "details": f"Nenhum padrão cadastrado corresponde ao hostname '{h or '(vazio)'}'. Atribuído à categoria de contingência 'OUTROS'.",
        }

    return {
        "matched": False,
        "site_id": None,
        "site_name": None,
        "site_code": None,
        "matched_by": None,
        "details": f"Nenhum padrão encontrado para o hostname '{h or '(vazio)'}'.",
    }


def identificar_site(
    hostname: str,
    company_id: int,
    db: Session,
    loja: Optional[str] = None,
) -> Optional[Site]:
    res = simular_identificacao_site(hostname, company_id, db, loja)
    if res.get("site_id"):
        return db.get(Site, res["site_id"])
    return None



IGNORED_HISTORY_FIELDS = {
    "USUARIO",
    "DOMINIO",
    "RUSTDESK_ID",
    "PERIFERICOS",
}


def registrar_drift(db: Session, device_id: int, campo: str, ant: Any, novo: Any):
    if campo in IGNORED_HISTORY_FIELDS:
        return

    s_ant = str(ant or "").strip()
    s_novo = str(novo or "").strip()
    if s_ant and s_novo and s_ant.lower() != s_novo.lower():
        db.add(
            DeviceHistory(
                device_id=device_id,
                campo=campo,
                valor_anterior=s_ant[:1000],
                valor_novo=s_novo[:1000],
                data_alteracao=datetime.utcnow(),
            )
        )


def upsert_device_from_payload(
    db: Session,
    dados: Dict[str, Any],
    company_id: int = 1,
) -> Device:
    hostname = str(dados.get("hostname", "")).strip()
    ip = str(dados.get("ip", "")).strip() or None
    mac = normalizar_mac(dados.get("mac"))

    if not hostname:
        raise ValueError("Hostname ausente no payload")

    # Localiza se já existe pelo hostname (case-insensitive)
    query = (
        select(Device)
        .where(
            Device.company_id == company_id,
            Device.hostname.ilike(hostname),
        )
        .order_by(Device.updated_at.desc())
    )
    matches = db.scalars(query).all()
    device = matches[0] if matches else None

    # Se houver duplicados legados no banco, remove os excedentes
    if len(matches) > 1:
        for extra_d in matches[1:]:
            db.delete(extra_d)

    DUMMY_MACS = {"02:00:4c:4f:4f:50", "00:00:00:00:00:00", ""}

    # Checagem de Conflito de MAC (Anti-troca de HD/SSD ou Clonagem de Disco)
    conflito_mac_outro = None
    if mac and mac.lower() not in DUMMY_MACS:
        query_conflito = select(Device).where(
            Device.company_id == company_id,
            Device.mac == mac,
            Device.hostname.notilike(hostname),
            Device.active.is_(True),
        )
        conflito_mac_outro = db.scalar(query_conflito)

    site = identificar_site(hostname, company_id, db, loja=dados.get("loja"))
    pct = converter_percentual(dados.get("disco_percentual") or dados.get("porcentagem_disco"))
    data_col = converter_data_coleta(dados.get("data_coleta")) or datetime.utcnow()

    # Separa aplicativos/softwares
    software_payload = {}
    for cat in ("aplicativos", "agentes", "runtimes", "ferramentas"):
        if isinstance(dados.get(cat), list):
            software_payload[cat] = dados[cat]

    if device:
        # 1. Alerta de Conflito de MAC com outro equipamento
        if conflito_mac_outro:
            alerta_msg = (
                f"Conflito de MAC: Endereço {mac} já cadastrado no equipamento "
                f"'{conflito_mac_outro.hostname}' (Possível troca de SSD/HD ou clonagem)"
            )
            device.alerta_hardware = alerta_msg
            registrar_drift(
                db,
                device.id,
                "ALERTA_CONFLITO_MAC",
                f"MAC em {conflito_mac_outro.hostname}",
                f"Detectado em {hostname} ({mac})",
            )
            conflito_mac_outro.alerta_hardware = (
                f"Conflito de MAC: Endereço {mac} foi reportado pelo equipamento "
                f"'{hostname}' (Possível troca de SSD/HD ou clonagem)"
            )
            registrar_drift(
                db,
                conflito_mac_outro.id,
                "ALERTA_CONFLITO_MAC",
                f"MAC em {conflito_mac_outro.hostname}",
                f"Detectado em {hostname} ({mac})",
            )
        # 2. Mudança de MAC no próprio equipamento (placa-mãe substituída ou SSD em outro PC)
        elif (
            device.mac
            and mac
            and device.mac.lower() not in DUMMY_MACS
            and mac.lower() not in DUMMY_MACS
            and device.mac.lower() != mac.lower()
        ):
            alerta_troca = f"Troca de Hardware: MAC alterado de {device.mac} para {mac} (Placa-mãe trocada ou SSD em novo gabinete)"
            device.alerta_hardware = alerta_troca
            registrar_drift(db, device.id, "TROCA_MAC", device.mac, mac)

        # 3. Registro de Hardware Drift e Mudanças Críticas (CPU, RAM, Disco, Placa-Mãe, SO, IP e Hostname)
        if device.hostname and hostname and device.hostname.lower() != hostname.lower():
            registrar_drift(db, device.id, "HOSTNAME", device.hostname, hostname)

        registrar_drift(db, device.id, "MEMORIA_RAM", device.ram_total, dados.get("ram_total"))
        registrar_drift(db, device.id, "TIPO_RAM", device.ram_tipo, dados.get("ram_tipo"))
        registrar_drift(db, device.id, "PROCESSADOR", device.processador, dados.get("processador"))
        registrar_drift(db, device.id, "DISCO_TOTAL", device.disco_total, dados.get("disco_total"))

        old_board = f"{device.fabricante or ''} {device.modelo or ''}".strip()
        new_board = f"{dados.get('fabricante') or ''} {dados.get('modelo') or ''}".strip()
        if old_board and new_board and old_board.lower() != new_board.lower():
            registrar_drift(db, device.id, "PLACA_MAE", old_board, new_board)

        old_os = f"{device.sistema or ''} {device.versao or ''} {device.windows_release or device.build or ''}".strip()
        new_os = f"{dados.get('sistema') or ''} {dados.get('versao') or ''} {dados.get('windows_release') or dados.get('build') or ''}".strip()
        if old_os and new_os and old_os.lower() != new_os.lower():
            registrar_drift(db, device.id, "SISTEMA_OPERACIONAL", old_os, new_os)

        registrar_drift(db, device.id, "ENDERECO_IP", device.ip, ip)

        # Atualiza dispositivo existente
        if site:
            device.site_id = site.id
        device.hostname = hostname
        device.ip = ip or device.ip
        device.mac = mac or device.mac
        device.loja = str(dados.get("loja", "")).strip() or device.loja
        device.sistema = str(dados.get("sistema", "")).strip() or device.sistema
        device.versao = str(dados.get("versao", "")).strip() or device.versao
        device.status = str(dados.get("status", "")).strip() or device.status
        device.processador = str(dados.get("processador", "")).strip() or device.processador
        device.ram_total = str(dados.get("ram_total", "")).strip() or device.ram_total
        device.disco_total = str(dados.get("disco_total", "")).strip() or device.disco_total
        device.disco_usado = str(dados.get("disco_usado", "")).strip() or device.disco_usado
        device.disco_livre = str(dados.get("disco_livre", "")).strip() or device.disco_livre
        if pct is not None:
            device.disco_percentual = pct
        device.rustdesk_id = str(dados.get("rustdesk_id", "")).strip() or device.rustdesk_id

        device.fabricante = str(dados.get("fabricante", "")).strip() or device.fabricante
        device.modelo = str(dados.get("modelo", "")).strip() or device.modelo
        device.serial = str(dados.get("serial", "")).strip() or device.serial
        device.dominio = str(dados.get("dominio", "")).strip() or device.dominio
        device.usuario = str(dados.get("usuario", "")).strip() or device.usuario
        device.build = str(dados.get("build", "")).strip() or device.build
        device.ip_secundario = str(dados.get("ip_secundario") or dados.get("ip2") or "").strip() or device.ip_secundario
        device.ram_tipo = str(dados.get("ram_tipo", "")).strip() or device.ram_tipo
        device.windows_release = str(dados.get("windows_release", "")).strip() or device.windows_release

        if dados.get("analise_disco"):
            device.analise_disco = dados["analise_disco"]
        if "perifericos" in dados:
            device.perifericos = dados.get("perifericos") or []
        if software_payload:
            device.extra_data = software_payload

        device.data_coleta = data_col
        device.active = True
        device.updated_at = datetime.utcnow()
    else:
        # Cria novo dispositivo
        alerta_inicial = None
        if conflito_mac_outro:
            alerta_inicial = (
                f"Conflito de MAC: Endereço {mac} já cadastrado no equipamento "
                f"'{conflito_mac_outro.hostname}' (Possível troca de SSD/HD ou clonagem)"
            )
            conflito_mac_outro.alerta_hardware = (
                f"Conflito de MAC: Endereço {mac} foi detectado na nova máquina "
                f"'{hostname}' (Possível troca de SSD/HD ou clonagem)"
            )
            registrar_drift(
                db,
                conflito_mac_outro.id,
                "ALERTA_CONFLITO_MAC",
                f"MAC em {conflito_mac_outro.hostname}",
                f"Detectado em nova máquina {hostname} ({mac})",
            )

        device = Device(
            company_id=company_id,
            site_id=site.id if site else None,
            hostname=hostname,
            alerta_hardware=alerta_inicial,
            loja=str(dados.get("loja", "")).strip() or None,
            ip=ip,
            mac=mac,
            sistema=str(dados.get("sistema", "")).strip() or None,
            versao=str(dados.get("versao", "")).strip() or None,
            status=str(dados.get("status", "")).strip() or None,
            processador=str(dados.get("processador", "")).strip() or None,
            ram_total=str(dados.get("ram_total", "")).strip() or None,
            disco_total=str(dados.get("disco_total", "")).strip() or None,
            disco_usado=str(dados.get("disco_usado", "")).strip() or None,
            disco_livre=str(dados.get("disco_livre", "")).strip() or None,
            disco_percentual=pct,
            rustdesk_id=str(dados.get("rustdesk_id", "")).strip() or None,
            fabricante=str(dados.get("fabricante", "")).strip() or None,
            modelo=str(dados.get("modelo", "")).strip() or None,
            serial=str(dados.get("serial", "")).strip() or None,
            dominio=str(dados.get("dominio", "")).strip() or None,
            usuario=str(dados.get("usuario", "")).strip() or None,
            build=str(dados.get("build", "")).strip() or None,
            ip_secundario=str(dados.get("ip_secundario") or dados.get("ip2") or "").strip() or None,
            ram_tipo=str(dados.get("ram_tipo", "")).strip() or None,
            windows_release=str(dados.get("windows_release", "")).strip() or None,
            analise_disco=dados.get("analise_disco"),
            perifericos=dados.get("perifericos") or [],
            extra_data=software_payload if software_payload else None,
            data_coleta=data_col,
            active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(device)
        db.flush()

        db.add(
            DeviceHistory(
                device_id=device.id,
                campo="PRIMEIRO_REGISTRO",
                valor_anterior=None,
                valor_novo=f"Dispositivo registrado no inventário ({dados.get('sistema', '')} {dados.get('versao', '')})",
                data_alteracao=datetime.utcnow(),
            )
        )
        if alerta_inicial:
            registrar_drift(
                db,
                device.id,
                "ALERTA_CONFLITO_MAC",
                f"MAC em {conflito_mac_outro.hostname}",
                f"Detectado com hostname {hostname} ({mac})",
            )

    db.commit()
    db.refresh(device)
    return device


def get_devices_for_dashboard(db: Session, current_user: User) -> List[Dict[str, Any]]:
    query = (
        select(Device)
        .options(selectinload(Device.site))
        .where(
            Device.company_id == current_user.company_id,
            Device.active.is_(True),
        )
    )

    role_slugs = [r.slug for r in current_user.roles] if current_user.roles else []
    is_global = current_user.is_superadmin or "admin" in role_slugs or "operador_matriz" in role_slugs

    if not is_global:
        user_sites = db.scalars(
            select(Site)
            .join(user_site_access, user_site_access.c.site_id == Site.id)
            .where(
                user_site_access.c.user_id == current_user.id,
                Site.active.is_(True),
            )
        ).all()

        if not user_sites:
            return []

        allowed_site_ids = [s.id for s in user_sites]
        allowed_loja_terms = set()
        for s in user_sites:
            c = s.code.upper().strip()
            c_num = c.lstrip("0") or "0"
            allowed_loja_terms.add(c)
            allowed_loja_terms.add(f"LJ{c}")
            allowed_loja_terms.add(f"L{c}")
            allowed_loja_terms.add(f"LOJA-{c}")
            allowed_loja_terms.add(f"LOJA {c}")
            if c_num.isdigit():
                num_int = int(c_num)
                allowed_loja_terms.add(f"{num_int:02d}")
                allowed_loja_terms.add(str(num_int))
                allowed_loja_terms.add(f"LJ{num_int:02d}")
                allowed_loja_terms.add(f"L{num_int:02d}")
                allowed_loja_terms.add(f"CB{num_int:02d}")
                allowed_loja_terms.add(f"C{num_int:02d}")
                allowed_loja_terms.add(f"COMBO-{num_int:02d}")

        hostname_prefixes = [f"{t}-" for t in allowed_loja_terms if len(t) >= 2]
        query = query.where(
            or_(
                Device.site_id.in_(allowed_site_ids),
                and_(
                    Device.site_id.is_(None),
                    or_(
                        func.upper(Device.loja).in_(allowed_loja_terms),
                        *[Device.hostname.ilike(f"{p}%") for p in hostname_prefixes],
                    ),
                ),
            )
        )

    devices = db.scalars(query.order_by(Device.hostname, Device.updated_at.desc())).all()

    # Contagem de histórico por device de forma eficiente em lote (filtrando campos de ruído)
    try:
        history_counts = dict(
            db.execute(
                select(DeviceHistory.device_id, func.count(DeviceHistory.id))
                .where(DeviceHistory.campo.notin_(IGNORED_HISTORY_FIELDS))
                .group_by(DeviceHistory.device_id)
            ).all()
        )
    except Exception:
        history_counts = {}

    # Carrega softwares e pacotes em lote para evitar consultas por dispositivo.
    software_by_device: Dict[int, Dict[str, List[Dict[str, Any]]]] = {}
    device_ids = [d.id for d in devices]

    if device_ids:
        software_rows = db.execute(
            select(DeviceSoftware, Software)
            .join(Software, Software.id == DeviceSoftware.software_id)
            .where(
                DeviceSoftware.device_id.in_(device_ids),
                DeviceSoftware.installed.is_(True),
                Software.company_id == current_user.company_id,
            )
            .order_by(Software.nome)
        ).all()

        device_software_ids = [ds.id for ds, _ in software_rows]
        packages_by_device_software: Dict[int, List[Dict[str, str]]] = {}

        if device_software_ids:
            package_rows = db.scalars(
                select(SoftwarePackage)
                .where(
                    SoftwarePackage.device_software_id.in_(device_software_ids)
                )
                .order_by(SoftwarePackage.pacote)
            ).all()

            for package in package_rows:
                packages_by_device_software.setdefault(
                    package.device_software_id, []
                ).append({
                    "pacote": package.pacote,
                    "versao": package.versao,
                })

        categorias = {
            "aplicativo": "aplicativos",
            "aplicativos": "aplicativos",
            "agente": "agentes",
            "agentes": "agentes",
            "runtime": "runtimes",
            "runtimes": "runtimes",
            "ferramenta": "ferramentas",
            "ferramentas": "ferramentas",
        }

        for device_software, software in software_rows:
            tipo = (software.tipo or "").strip().lower()
            categoria = categorias.get(tipo, "aplicativos")

            software_by_device.setdefault(
                device_software.device_id, {}
            ).setdefault(categoria, []).append({
                "id": software.identifier,
                "nome": software.nome,
                "tipo": software.tipo or "",
                "origem": software.origem or "",
                "pacotes": packages_by_device_software.get(
                    device_software.id, []
                ),
            })

    seen_hostnames = set()
    items = []
    for d in devices:
        h_norm = (d.hostname or "").upper().strip()
        if h_norm in seen_hostnames:
            continue
        seen_hostnames.add(h_norm)

        site_name = d.site.name if d.site else None
        site_code = d.site.code if d.site else None
        site_id = d.site_id
        resolved_loja = site_name or d.loja or ""

        item: Dict[str, Any] = {
            "id": d.id,
            "hostname": d.hostname,
            "site_id": site_id,
            "site_code": site_code,
            "site_name": site_name,
            "loja": resolved_loja,
            "ip": d.ip or "",
            "mac": d.mac or "",
            "sistema": d.sistema or "",
            "versao": d.versao or "",
            "status": d.status or "OK",
            "alerta_hardware": d.alerta_hardware or "",
            "history_count": history_counts.get(d.id, 0),
            "processador": d.processador or "",
            "ram_total": d.ram_total or "",
            "disco_total": d.disco_total or "",
            "disco_usado": d.disco_usado or "",
            "disco_livre": d.disco_livre or "",
            "disco_percentual": f"{d.disco_percentual}%" if d.disco_percentual is not None else "",
            "rustdesk_id": d.rustdesk_id or "",
            "fabricante": d.fabricante or "",
            "modelo": d.modelo or "",
            "serial": d.serial or "",
            "dominio": d.dominio or "",
            "usuario": d.usuario or "",
            "build": d.build or "",
            "ip_secundario": d.ip_secundario or "",
            "ram_tipo": d.ram_tipo or (d.extra_data.get("ram_tipo") if isinstance(d.extra_data, dict) else "") or "",
            "windows_release": d.windows_release or (d.extra_data.get("windows_release") if isinstance(d.extra_data, dict) else "") or "",
            "analise_disco": d.analise_disco or {"executada": False},
            "perifericos": d.perifericos or [],
            "data_coleta": (d.data_coleta or d.updated_at).strftime("%Y-%m-%d %H:%M:%S") if (d.data_coleta or d.updated_at) else "",
            "patrimonio": d.patrimonio or "",
            "firewall_status": d.firewall_status or "",
            "firewall_solicitado_por": d.firewall_solicitado_por or "",
            "firewall_solicitado_em": d.firewall_solicitado_em.strftime("%Y-%m-%d %H:%M:%S") if d.firewall_solicitado_em else "",
            "firewall_confirmado_por": d.firewall_confirmado_por or "",
            "firewall_confirmado_em": d.firewall_confirmado_em.strftime("%Y-%m-%d %H:%M:%S") if d.firewall_confirmado_em else "",
        }

        # Mantém os dados legados como alternativa.
        if d.extra_data and isinstance(d.extra_data, dict):
            for cat in ("aplicativos", "agentes", "runtimes", "ferramentas"):
                if cat in d.extra_data:
                    item[cat] = d.extra_data[cat]

        # Os dados relacionais do PostgreSQL têm prioridade por categoria.
        for cat, softwares in software_by_device.get(d.id, {}).items():
            if softwares:
                item[cat] = softwares

        items.append(item)

    return items
