import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

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


def identificar_site(
    hostname: str,
    company_id: int,
    db: Session,
    loja: Optional[str] = None,
) -> Optional[Site]:
    h = (hostname or "").upper().strip()
    target_identifiers = set()
    target_codes = set()

    # 1. Identificadores via regex
    match = re.match(r"^(LJ?\d+|CB?\d+|AC)(?:-|$)", h)
    if match:
        identificador = match.group(1)
        target_identifiers.add(identificador)
        m_num = re.search(r"\d+", identificador)
        if m_num:
            num = int(m_num.group(0))
            if identificador.startswith("CB") or identificador.startswith("C"):
                target_identifiers.update([f"CB{num:02d}", f"C{num:02d}", f"CB{num}", f"C{num}"])
                target_codes.update([f"C{num:02d}", f"COMBO-{num:02d}", f"C{num}"])
            else:
                target_identifiers.update([f"LJ{num:02d}", f"L{num:02d}", f"LJ{num}", f"L{num}"])
                target_codes.update([f"{num:02d}", str(num), f"LOJA-{num:02d}"])

    # 2. Se a loja foi informada explicitamente no payload
    if loja:
        l_str = str(loja).upper().strip()
        target_codes.add(l_str)
        if l_str.isdigit():
            target_codes.add(f"{int(l_str):02d}")
            target_codes.add(f"LOJA-{int(l_str):02d}")

    # 3. Prefixo no hostname
    if h.startswith("AC-") or h == "MATRIZ":
        target_codes.add("MATRIZ")
        target_identifiers.add("AC")

    # Busca em site_identifiers
    if target_identifiers:
        site_by_ident = db.scalar(
            select(Site)
            .join(SiteIdentifier, SiteIdentifier.site_id == Site.id)
            .where(
                SiteIdentifier.company_id == company_id,
                SiteIdentifier.identifier.in_(target_identifiers),
                SiteIdentifier.active.is_(True),
                Site.active.is_(True),
            )
        )
        if site_by_ident:
            return site_by_ident

    # Busca direta por Site.code
    if target_codes:
        site_by_code = db.scalar(
            select(Site).where(
                Site.company_id == company_id,
                Site.code.in_(target_codes),
                Site.active.is_(True),
            )
        )
        if site_by_code:
            return site_by_code

    # Fallback para OUTROS se existir
    return db.scalar(
        select(Site).where(
            Site.company_id == company_id,
            Site.code == "OUTROS",
            Site.active.is_(True),
        )
    )



def registrar_drift(db: Session, device_id: int, campo: str, ant: Any, novo: Any):
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

        # 3. Registro de Hardware Drift e Mudanças do Sistema
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
        registrar_drift(db, device.id, "RUSTDESK_ID", device.rustdesk_id, dados.get("rustdesk_id"))
        registrar_drift(db, device.id, "USUARIO", device.usuario, dados.get("usuario"))
        registrar_drift(db, device.id, "DOMINIO", device.dominio, dados.get("dominio"))

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
    query = select(Device).where(
        Device.company_id == current_user.company_id,
        Device.active.is_(True),
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

    # Contagem de histórico por device de forma eficiente em lote
    try:
        history_counts = dict(
            db.execute(
                select(DeviceHistory.device_id, func.count(DeviceHistory.id))
                .group_by(DeviceHistory.device_id)
            ).all()
        )
    except Exception:
        history_counts = {}

    seen_hostnames = set()
    items = []
    for d in devices:
        h_norm = (d.hostname or "").upper().strip()
        if h_norm in seen_hostnames:
            continue
        seen_hostnames.add(h_norm)

        item: Dict[str, Any] = {
            "id": d.id,
            "hostname": d.hostname,
            "loja": d.loja or "",
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

        # Inclui softwares se presentes em extra_data
        if d.extra_data and isinstance(d.extra_data, dict):
            for cat in ("aplicativos", "agentes", "runtimes", "ferramentas"):
                if cat in d.extra_data:
                    item[cat] = d.extra_data[cat]

        items.append(item)

    return items
