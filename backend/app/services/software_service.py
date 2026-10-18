import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Set
from fastapi import HTTPException
from sqlalchemy import distinct, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.device import Device
from app.models.device_software import DeviceSoftware
from app.models.software import Software
from app.models.software_package import SoftwarePackage
from app.models.site import Site
from app.models.user import User
from app.models.user_site_access import user_site_access
from app.schemas.software import (
    BrowserComplianceSummary,
    SoftwareCatalogItem,
    SoftwareCatalogKPIs,
    SoftwareCatalogResponse,
    SoftwareDeviceDetail,
    SoftwareDevicesResponse,
    SoftwarePackageItem,
    SoftwareVersionCount,
)

# Filtro de pacotes de ruído (traduções, idiomas, documentações)
NOISE_SOFTWARE_REGEX = re.compile(
    r"(-locale-|-locale$|-l10n|-help-|language-pack|language-support)", re.IGNORECASE
)

# Agrupamento canônico de softwares duplicados (ex: Firefox Web Browser + Firefox -> Mozilla Firefox)
CANONICAL_APPS: Dict[str, Dict[str, Any]] = {
    "firefox": {
        "canonical_name": "Mozilla Firefox",
        "canonical_identifier": "firefox",
        "canonical_tipo": "aplicativo",
        "identifiers": {"firefox", "firefox-esr"},
        "primary_id": 41,
    },
    "microsoft-edge": {
        "canonical_name": "Microsoft Edge",
        "canonical_identifier": "microsoft-edge",
        "canonical_tipo": "aplicativo",
        "identifiers": {"microsoft-edge", "microsoft-edge-stable"},
        "primary_id": 199,
    },
    "google-chrome": {
        "canonical_name": "Google Chrome",
        "canonical_identifier": "google-chrome",
        "canonical_tipo": "aplicativo",
        "identifiers": {"google-chrome", "google-chrome-stable"},
        "primary_id": 8,
    },
}

IDENTIFIER_TO_CANONICAL: Dict[str, str] = {}
for _c_key, _c_info in CANONICAL_APPS.items():
    for _ident in _c_info["identifiers"]:
        IDENTIFIER_TO_CANONICAL[_ident] = _c_key


def _categoria_priority(tipo: Optional[str]) -> int:
    """Prioridade de exibição no catálogo: aplicativos e agentes sempre no topo."""
    t = (tipo or "").strip().lower()
    if t == "aplicativo":
        return 1
    elif t == "agente":
        return 2
    elif t == "runtime":
        return 3
    elif t == "ferramenta":
        return 4
    return 5


def _is_global_user(user: User) -> bool:
    """Verifica se o usuário possui escopo global (superadmin, admin ou operador da matriz)."""
    if user.is_superadmin:
        return True
    roles = [r.slug for r in user.roles] if user.roles else []
    return any(r in ("admin", "operador_matriz") for r in roles)


def _obter_sites_permitidos(db: Session, user: User) -> Optional[List[int]]:
    if _is_global_user(user):
        return None
    allowed = db.scalars(
        select(user_site_access.c.site_id).where(user_site_access.c.user_id == user.id)
    ).all()
    return list(allowed)


def _determinar_plataforma(sistema: Optional[str]) -> str:
    s = (sistema or "").lower()
    if any(k in s for k in ("linux", "ubuntu", "debian", "fedora", "centos", "redhat", "suse", "mint", "arch")):
        return "Linux"
    return "Windows"


def natural_version_key(v: Optional[str]) -> List[int]:
    """Extrai segmentos numéricos de uma string de versão para ordenação semântica correta.
    Ignora epoch (ex: '1:' ou '2:') e sufixos de build (-1, ~ds3, +dfsg) para permitir
    comparação entre Linux e Windows. Ex: '155.0.8059.82' > '154.0.8037.97-1'.
    """
    if not v:
        return []
    clean = re.sub(r"^\d+:", "", str(v).strip())
    matches = re.findall(r"\d+", clean)
    return [int(x) for x in matches] if matches else []


def comparar_versoes(v1: Optional[str], v2: Optional[str]) -> int:
    """Retorna 1 se v1 > v2, -1 se v1 < v2, ou 0 se equivalentes."""
    k1 = natural_version_key(v1)
    k2 = natural_version_key(v2)
    if not k1 and not k2:
        return 0
    if not k1:
        return -1
    if not k2:
        return 1
    if k1 > k2:
        return 1
    elif k1 < k2:
        return -1
    return 0


def _is_browser(nome: str, identifier: str) -> bool:
    s = f"{nome} {identifier}".lower()
    # Exclui pacotes locale/l10n da identificação de navegadores
    if NOISE_SOFTWARE_REGEX.search(s):
        return False
    return any(
        b in s
        for b in (
            "chrome",
            "chromium",
            "firefox",
            "edge",
            "brave",
            "opera",
            "safari",
            "vivaldi",
        )
    )


def obter_catalogo_softwares(
    db: Session,
    current_user: User,
    site_id: Optional[int] = None,
    plataforma: Optional[str] = None,
    categoria: Optional[str] = None,
    search: Optional[str] = None,
) -> SoftwareCatalogResponse:
    sites_permitidos = _obter_sites_permitidos(db, current_user)
    if sites_permitidos is not None and site_id is not None and site_id not in sites_permitidos:
        return SoftwareCatalogResponse(
            items=[],
            kpis=SoftwareCatalogKPIs(),
            navegadores_conformidade=[],
            total=0,
        )

    # 1. Total de máquinas inventariadas no recorte
    stmt_maqs = select(func.count(distinct(Device.id))).where(
        Device.company_id == current_user.company_id,
        Device.active == True,
    )
    if sites_permitidos is not None:
        stmt_maqs = stmt_maqs.where(Device.site_id.in_(sites_permitidos))
    if site_id is not None:
        stmt_maqs = stmt_maqs.where(Device.site_id == site_id)
    if plataforma:
        p_low = plataforma.strip().lower()
        if p_low == "linux":
            stmt_maqs = stmt_maqs.where(
                or_(
                    Device.sistema.ilike("%linux%"),
                    Device.sistema.ilike("%ubuntu%"),
                    Device.sistema.ilike("%debian%"),
                    Device.sistema.ilike("%fedora%"),
                    Device.sistema.ilike("%centos%"),
                )
            )
        elif p_low == "windows":
            stmt_maqs = stmt_maqs.where(Device.sistema.ilike("%windows%"))

    total_maqs = db.scalar(stmt_maqs) or 1

    # 1.1 Contagem operacional de máquinas com e sem inventário de apps
    stmt_com_apps = (
        select(func.count(distinct(DeviceSoftware.device_id)))
        .join(Device, Device.id == DeviceSoftware.device_id)
        .where(
            Device.company_id == current_user.company_id,
            Device.active == True,
            DeviceSoftware.installed == True,
        )
    )
    if sites_permitidos is not None:
        stmt_com_apps = stmt_com_apps.where(Device.site_id.in_(sites_permitidos))
    if site_id is not None:
        stmt_com_apps = stmt_com_apps.where(Device.site_id == site_id)
    if plataforma:
        p_low = plataforma.strip().lower()
        if p_low == "linux":
            stmt_com_apps = stmt_com_apps.where(
                or_(
                    Device.sistema.ilike("%linux%"),
                    Device.sistema.ilike("%ubuntu%"),
                    Device.sistema.ilike("%debian%"),
                    Device.sistema.ilike("%fedora%"),
                    Device.sistema.ilike("%centos%"),
                )
            )
        elif p_low == "windows":
            stmt_com_apps = stmt_com_apps.where(Device.sistema.ilike("%windows%"))

    com_apps = db.scalar(stmt_com_apps) or 0
    sem_apps = max(0, total_maqs - com_apps)

    # 2. Contagem de instalações por Software (excluindo pacotes de ruído)
    stmt_soft = (
        select(
            Software.id,
            Software.identifier,
            Software.nome,
            Software.tipo,
            Software.origem,
            func.count(distinct(Device.id)).label("total_devices"),
        )
        .join(DeviceSoftware, DeviceSoftware.software_id == Software.id)
        .join(Device, Device.id == DeviceSoftware.device_id)
        .where(
            Device.company_id == current_user.company_id,
            Device.active == True,
            DeviceSoftware.installed == True,
        )
    )

    # Filtro SQL para ocultar pacotes de tradução / idioma / help
    stmt_soft = stmt_soft.where(
        ~Software.identifier.ilike("%-locale-%"),
        ~Software.identifier.ilike("%-locale"),
        ~Software.identifier.ilike("%-l10n%"),
        ~Software.identifier.ilike("%-help-%"),
        ~Software.identifier.ilike("%language-pack%"),
        ~Software.identifier.ilike("%language-support%"),
        ~Software.nome.ilike("%-locale-%"),
        ~Software.nome.ilike("%-locale"),
        ~Software.nome.ilike("%-l10n%"),
    )

    if sites_permitidos is not None:
        stmt_soft = stmt_soft.where(Device.site_id.in_(sites_permitidos))
    if site_id is not None:
        stmt_soft = stmt_soft.where(Device.site_id == site_id)
    if plataforma:
        p_low = plataforma.strip().lower()
        if p_low == "linux":
            stmt_soft = stmt_soft.where(
                or_(
                    Device.sistema.ilike("%linux%"),
                    Device.sistema.ilike("%ubuntu%"),
                    Device.sistema.ilike("%debian%"),
                    Device.sistema.ilike("%fedora%"),
                    Device.sistema.ilike("%centos%"),
                )
            )
        elif p_low == "windows":
            stmt_soft = stmt_soft.where(Device.sistema.ilike("%windows%"))

    if search and search.strip():
        s = f"%{search.strip()}%"
        stmt_soft = stmt_soft.where(
            or_(
                Software.nome.ilike(s),
                Software.identifier.ilike(s),
            )
        )

    if categoria and categoria.strip() and categoria.lower() != "todas":
        stmt_soft = stmt_soft.where(func.lower(Software.tipo) == categoria.strip().lower())

    stmt_soft = stmt_soft.group_by(
        Software.id,
        Software.identifier,
        Software.nome,
        Software.tipo,
        Software.origem,
    )

    soft_rows = db.execute(stmt_soft).all()

    if not soft_rows:
        return SoftwareCatalogResponse(
            items=[],
            kpis=SoftwareCatalogKPIs(
                total_maquinas_inventariadas=total_maqs,
                maquinas_com_apps=com_apps,
                maquinas_sem_apps=sem_apps,
            ),
            navegadores_conformidade=[],
            total=0,
        )

    software_ids = [r.id for r in soft_rows]

    # 3. Resolução de Versões agrupadas em lote
    stmt_vers = (
        select(
            Software.id,
            SoftwarePackage.versao,
            func.count(distinct(Device.id)).label("cnt"),
        )
        .join(DeviceSoftware, DeviceSoftware.software_id == Software.id)
        .join(SoftwarePackage, SoftwarePackage.device_software_id == DeviceSoftware.id)
        .join(Device, Device.id == DeviceSoftware.device_id)
        .where(
            Software.id.in_(software_ids),
            Device.company_id == current_user.company_id,
            Device.active == True,
            DeviceSoftware.installed == True,
        )
    )

    if sites_permitidos is not None:
        stmt_vers = stmt_vers.where(Device.site_id.in_(sites_permitidos))
    if site_id is not None:
        stmt_vers = stmt_vers.where(Device.site_id == site_id)
    if plataforma:
        p_low = plataforma.strip().lower()
        if p_low == "linux":
            stmt_vers = stmt_vers.where(
                or_(
                    Device.sistema.ilike("%linux%"),
                    Device.sistema.ilike("%ubuntu%"),
                    Device.sistema.ilike("%debian%"),
                    Device.sistema.ilike("%fedora%"),
                    Device.sistema.ilike("%centos%"),
                )
            )
        elif p_low == "windows":
            stmt_vers = stmt_vers.where(Device.sistema.ilike("%windows%"))

    stmt_vers = stmt_vers.group_by(
        Software.id,
        SoftwarePackage.versao,
    )

    ver_rows = db.execute(stmt_vers).all()
    raw_vers_by_soft: Dict[int, List[Dict[str, Any]]] = {}
    for s_id, ver, cnt in ver_rows:
        clean_v = (ver or "").strip()
        raw_vers_by_soft.setdefault(s_id, []).append({"versao": clean_v, "count": cnt})

    # 4. Agrupamento canônico de softwares duplicados (ex: Firefox + Firefox ESR -> Mozilla Firefox)
    # Map: canonical_key_or_id -> consolidated dict
    consolidated_items: Dict[str, Dict[str, Any]] = {}
    seen_canonical_ids: Set[int] = set()

    for r in soft_rows:
        ident_lower = (r.identifier or "").lower().strip()
        c_key = IDENTIFIER_TO_CANONICAL.get(ident_lower)

        if c_key:
            c_info = CANONICAL_APPS[c_key]
            group_key = f"canonical_{c_key}"
            if group_key not in consolidated_items:
                consolidated_items[group_key] = {
                    "id": c_info["primary_id"],
                    "identifier": c_info["canonical_identifier"],
                    "nome": c_info["canonical_name"],
                    "tipo": c_info["canonical_tipo"],
                    "origem": r.origem,
                    "software_ids": set(),
                    "raw_versions": [],
                }
            consolidated_items[group_key]["software_ids"].add(r.id)
            seen_canonical_ids.add(r.id)
            consolidated_items[group_key]["raw_versions"].extend(raw_vers_by_soft.get(r.id, []))
        else:
            item_key = f"single_{r.id}"
            consolidated_items[item_key] = {
                "id": r.id,
                "identifier": r.identifier,
                "nome": r.nome,
                "tipo": r.tipo or "aplicativo",
                "origem": r.origem,
                "software_ids": {r.id},
                "raw_versions": raw_vers_by_soft.get(r.id, []),
            }

    # Para grupos canônicos com múltiplos IDs, faz a contagem de máquinas reais desduplicadas
    for k, data in consolidated_items.items():
        sids = list(data["software_ids"])
        if len(sids) > 1:
            stmt_c_cnt = select(func.count(distinct(Device.id))).join(
                DeviceSoftware, DeviceSoftware.device_id == Device.id
            ).where(
                DeviceSoftware.software_id.in_(sids),
                DeviceSoftware.installed == True,
                Device.company_id == current_user.company_id,
                Device.active == True,
            )
            if sites_permitidos is not None:
                stmt_c_cnt = stmt_c_cnt.where(Device.site_id.in_(sites_permitidos))
            if site_id is not None:
                stmt_c_cnt = stmt_c_cnt.where(Device.site_id == site_id)
            if plataforma:
                p_low = plataforma.strip().lower()
                if p_low == "linux":
                    stmt_c_cnt = stmt_c_cnt.where(
                        or_(
                            Device.sistema.ilike("%linux%"),
                            Device.sistema.ilike("%ubuntu%"),
                            Device.sistema.ilike("%debian%"),
                            Device.sistema.ilike("%fedora%"),
                            Device.sistema.ilike("%centos%"),
                        )
                    )
                elif p_low == "windows":
                    stmt_c_cnt = stmt_c_cnt.where(Device.sistema.ilike("%windows%"))
            data["total_devices"] = db.scalar(stmt_c_cnt) or 1
        else:
            single_r = next((r for r in soft_rows if r.id == sids[0]), None)
            data["total_devices"] = single_r.total_devices if single_r else 1

    # 5. Montagem dos itens do catálogo com Regra de Conformidade Restrita a Aplicativo/Agente
    items: List[SoftwareCatalogItem] = []
    browser_compliance_list: List[BrowserComplianceSummary] = []
    cat_counts = {"aplicativo": 0, "agente": 0, "runtime": 0, "ferramenta": 0, "outro": 0}
    total_instalacoes = 0

    for _, data in consolidated_items.items():
        item_tipo = (data["tipo"] or "aplicativo").lower().strip()
        is_app_or_agent = item_tipo in ("aplicativo", "agente")

        # Agrupa versões combinando contagens
        raw_list = data["raw_versions"]
        combined_counts: Dict[str, int] = {}
        for v_item in raw_list:
            v_str = (v_item["versao"] or "").strip()
            combined_counts[v_str] = combined_counts.get(v_str, 0) + v_item["count"]

        valid_versions = [vk for vk in combined_counts.keys() if vk]

        # Determina a versão mais recente semanticamente
        mais_recente: Optional[str] = None
        if valid_versions:
            sorted_by_semver = sorted(
                valid_versions,
                key=lambda v: natural_version_key(v),
                reverse=True,
            )
            mais_recente = sorted_by_semver[0]

        # Constrói objetos SoftwareVersionCount e calcula conformidade
        formatted_versoes: List[SoftwareVersionCount] = []
        total_atualizadas = 0

        # Ordena as versões: mais recentes primeiro
        sorted_version_keys = sorted(
            combined_counts.keys(),
            key=lambda v: natural_version_key(v),
            reverse=True,
        )

        for vk in sorted_version_keys:
            v_display = vk or "Sem versão"
            eh_recente = bool(
                is_app_or_agent
                and mais_recente
                and vk
                and comparar_versoes(vk, mais_recente) >= 0
            )
            eh_antiga = bool(
                is_app_or_agent
                and mais_recente
                and vk
                and comparar_versoes(vk, mais_recente) < 0
            )
            if eh_recente:
                total_atualizadas += combined_counts[vk]

            formatted_versoes.append(
                SoftwareVersionCount(
                    versao=v_display,
                    count=combined_counts[vk],
                    is_latest=eh_recente,
                    is_outdated=eh_antiga,
                )
            )

        tot_devices = data["total_devices"]
        pct = round((tot_devices / max(total_maqs, 1)) * 100, 1)

        # Regra de negócio: Alerta de desatualização EXCLUSIVO para aplicativo e agente
        if is_app_or_agent:
            total_desatualizadas = max(0, tot_devices - total_atualizadas)
            taxa_conf = (
                round((total_atualizadas / max(tot_devices, 1)) * 100, 1)
                if mais_recente
                else 100.0
            )
        else:
            total_desatualizadas = 0
            total_atualizadas = tot_devices
            taxa_conf = 100.0

        if item_tipo in cat_counts:
            cat_counts[item_tipo] += 1
        else:
            cat_counts["outro"] += 1

        total_instalacoes += tot_devices

        catalog_item = SoftwareCatalogItem(
            id=data["id"],
            identifier=data["identifier"],
            nome=data["nome"],
            tipo=data["tipo"],
            origem=data["origem"],
            total_instalacoes=tot_devices,
            percentual_parque=pct,
            ultima_versao=mais_recente,
            versao_mais_recente=mais_recente,
            total_versoes=len(formatted_versoes),
            total_atualizadas=total_atualizadas,
            total_desatualizadas=total_desatualizadas,
            taxa_conformidade=taxa_conf,
            versoes=formatted_versoes,
        )
        items.append(catalog_item)

        # Resumo de conformidade para navegadores reais (apenas aplicativo)
        if is_app_or_agent and _is_browser(data["nome"], data["identifier"]) and tot_devices > 0:
            browser_compliance_list.append(
                BrowserComplianceSummary(
                    software_id=data["id"],
                    identifier=data["identifier"],
                    software_nome=data["nome"],
                    total_instalacoes=tot_devices,
                    mais_recente=mais_recente or "N/D",
                    total_atualizadas=total_atualizadas,
                    total_desatualizadas=total_desatualizadas,
                    taxa_conformidade=taxa_conf,
                )
            )

    # Ordenação padrão: aplicativo e agente primeiro, depois ordenados por instalações DESC
    if not categoria or categoria.strip().lower() == "todas":
        items.sort(
            key=lambda it: (
                _categoria_priority(it.tipo),
                -it.total_instalacoes,
                it.nome.lower(),
            )
        )
    else:
        items.sort(key=lambda it: (-it.total_instalacoes, it.nome.lower()))

    # Ordena navegadores: Google Chrome estável primeiro, depois por número de instalações
    browser_compliance_list.sort(
        key=lambda b: (
            0 if "chrome" in b.identifier.lower() and "beta" not in b.identifier.lower() else 1,
            -b.total_instalacoes,
        )
    )

    kpis = SoftwareCatalogKPIs(
        total_softwares=len(items),
        total_instalacoes=total_instalacoes,
        total_maquinas_inventariadas=total_maqs,
        maquinas_com_apps=com_apps,
        maquinas_sem_apps=sem_apps,
        aplicativos=cat_counts["aplicativo"],
        agentes=cat_counts["agente"],
        runtimes=cat_counts["runtime"],
        ferramentas=cat_counts["ferramenta"],
        outros=cat_counts["outro"],
    )

    return SoftwareCatalogResponse(
        items=items,
        kpis=kpis,
        navegadores_conformidade=browser_compliance_list,
        total=len(items),
    )


def obter_dispositivos_software(
    db: Session,
    current_user: User,
    software_id: int,
    site_id: Optional[int] = None,
    plataforma: Optional[str] = None,
    versao: Optional[str] = None,
    search: Optional[str] = None,
) -> SoftwareDevicesResponse:
    sites_permitidos = _obter_sites_permitidos(db, current_user)
    if sites_permitidos is not None and site_id is not None and site_id not in sites_permitidos:
        raise HTTPException(status_code=403, detail="Acesso não autorizado a esta filial.")

    soft = db.scalar(
        select(Software).where(
            Software.id == software_id,
            Software.company_id == current_user.company_id,
        )
    )
    if not soft:
        raise HTTPException(status_code=404, detail="Software não encontrado.")

    # Verifica se o software faz parte de um grupo canônico (ex: Firefox ESR + Firefox)
    ident_lower = (soft.identifier or "").lower().strip()
    c_key = IDENTIFIER_TO_CANONICAL.get(ident_lower)

    if c_key:
        c_info = CANONICAL_APPS[c_key]
        target_soft_ids = list(
            db.scalars(
                select(Software.id).where(
                    Software.identifier.in_(c_info["identifiers"]),
                    Software.company_id == current_user.company_id,
                )
            ).all()
        )
        display_nome = c_info["canonical_name"]
        display_identifier = c_info["canonical_identifier"]
        display_tipo = c_info["canonical_tipo"]
    else:
        target_soft_ids = [software_id]
        display_nome = soft.nome
        display_identifier = soft.identifier
        display_tipo = soft.tipo or "aplicativo"

    is_app_or_agent = display_tipo.lower() in ("aplicativo", "agente")

    stmt = (
        select(Device, DeviceSoftware)
        .join(DeviceSoftware, DeviceSoftware.device_id == Device.id)
        .options(selectinload(Device.site))
        .where(
            DeviceSoftware.software_id.in_(target_soft_ids),
            DeviceSoftware.installed == True,
            Device.company_id == current_user.company_id,
            Device.active == True,
        )
    )

    if sites_permitidos is not None:
        stmt = stmt.where(Device.site_id.in_(sites_permitidos))
    if site_id is not None:
        stmt = stmt.where(Device.site_id == site_id)

    if plataforma:
        p_low = plataforma.strip().lower()
        if p_low == "linux":
            stmt = stmt.where(
                or_(
                    Device.sistema.ilike("%linux%"),
                    Device.sistema.ilike("%ubuntu%"),
                    Device.sistema.ilike("%debian%"),
                    Device.sistema.ilike("%fedora%"),
                    Device.sistema.ilike("%centos%"),
                )
            )
        elif p_low == "windows":
            stmt = stmt.where(Device.sistema.ilike("%windows%"))

    if search and search.strip():
        s = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Device.hostname).ilike(s),
                Device.ip.ilike(s),
                Device.mac.ilike(s),
                Device.patrimonio.ilike(s),
            )
        )

    stmt = stmt.order_by(Device.hostname.asc())
    rows = db.execute(stmt).all()

    # Deduplica máquinas (caso um dispositivo tenha 2 registros do grupo canônico)
    device_map: Dict[int, Any] = {}
    ds_ids: List[int] = []
    for dev, ds in rows:
        if dev.id not in device_map:
            device_map[dev.id] = (dev, ds)
        ds_ids.append(ds.id)

    # Carrega pacotes
    packages_by_ds: Dict[int, List[SoftwarePackageItem]] = {}
    if ds_ids:
        pkg_rows = db.scalars(
            select(SoftwarePackage)
            .where(SoftwarePackage.device_software_id.in_(ds_ids))
            .order_by(SoftwarePackage.pacote.asc())
        ).all()
        for p in pkg_rows:
            packages_by_ds.setdefault(p.device_software_id, []).append(
                SoftwarePackageItem(
                    id=p.id,
                    pacote=p.pacote,
                    versao=p.versao,
                    first_seen_at=p.first_seen_at,
                    last_seen_at=p.last_seen_at,
                )
            )

    # Determina a versão mais recente geral deste software
    all_known_versions: List[str] = []
    for dev_id, (dev, ds) in device_map.items():
        pkgs = packages_by_ds.get(ds.id, [])
        for p in pkgs:
            if p.versao and p.versao.strip():
                all_known_versions.append(p.versao.strip())

    mais_recente_geral: Optional[str] = None
    if all_known_versions:
        sorted_known = sorted(
            all_known_versions,
            key=lambda v: natural_version_key(v),
            reverse=True,
        )
        mais_recente_geral = sorted_known[0]

    devices_output: List[SoftwareDeviceDetail] = []
    total_atualizadas = 0

    for dev_id, (dev, ds) in device_map.items():
        pkgs = packages_by_ds.get(ds.id, [])
        primary_ver = pkgs[0].versao if pkgs and pkgs[0].versao else ""

        # Filtro de versão se fornecido
        if versao and versao.strip() and versao.lower() != "todas":
            v_filter = versao.strip().lower()
            if primary_ver.lower() != v_filter and not any(p.versao and p.versao.lower() == v_filter for p in pkgs):
                continue

        plat = _determinar_plataforma(dev.sistema)
        site_nome = dev.site.name if dev.site else None
        site_codigo = dev.site.code if dev.site else None

        # Alerta de desatualização apenas para aplicativo e agente
        if is_app_or_agent:
            eh_recente = bool(
                mais_recente_geral
                and primary_ver
                and comparar_versoes(primary_ver, mais_recente_geral) >= 0
            )
            if eh_recente:
                total_atualizadas += 1
            status_conf = "latest" if eh_recente else ("outdated" if primary_ver else "unknown")
        else:
            eh_recente = False
            total_atualizadas += 1
            status_conf = "latest"

        devices_output.append(
            SoftwareDeviceDetail(
                device_id=dev.id,
                hostname=dev.hostname,
                ip=dev.ip,
                mac=dev.mac,
                sistema=dev.sistema,
                versao_so=dev.versao,
                plataforma=plat,
                site_id=dev.site_id,
                site_nome=site_nome,
                site_codigo=site_codigo,
                versao_software=primary_ver,
                is_latest=eh_recente,
                status_conformidade=status_conf,
                pacotes=pkgs,
                first_seen_at=ds.first_seen_at,
                last_seen_at=ds.last_seen_at,
            )
        )

    # Monta distribuição de versões
    version_counts: Dict[str, int] = {}
    for d in devices_output:
        v_key = d.versao_software or "Sem versão"
        version_counts[v_key] = version_counts.get(v_key, 0) + 1

    sorted_version_keys = sorted(
        version_counts.keys(),
        key=lambda v: natural_version_key(v),
        reverse=True,
    )

    versoes_counts_list = [
        SoftwareVersionCount(
            versao=vk,
            count=version_counts[vk],
            is_latest=bool(is_app_or_agent and mais_recente_geral and comparar_versoes(vk, mais_recente_geral) >= 0),
            is_outdated=bool(is_app_or_agent and mais_recente_geral and vk != "Sem versão" and comparar_versoes(vk, mais_recente_geral) < 0),
        )
        for vk in sorted_version_keys
    ]

    total_devices_out = len(devices_output)
    if is_app_or_agent:
        total_desatualizadas = max(0, total_devices_out - total_atualizadas)
        taxa_conf = round((total_atualizadas / max(total_devices_out, 1)) * 100, 1) if mais_recente_geral else 100.0
    else:
        total_desatualizadas = 0
        total_atualizadas = total_devices_out
        taxa_conf = 100.0

    soft_catalog_item = SoftwareCatalogItem(
        id=soft.id,
        identifier=display_identifier,
        nome=display_nome,
        tipo=display_tipo,
        origem=soft.origem,
        total_instalacoes=total_devices_out,
        percentual_parque=round((total_devices_out / 1) * 100, 1),
        ultima_versao=mais_recente_geral,
        versao_mais_recente=mais_recente_geral,
        total_versoes=len(versoes_counts_list),
        total_atualizadas=total_atualizadas,
        total_desatualizadas=total_desatualizadas,
        taxa_conformidade=taxa_conf,
        versoes=versoes_counts_list,
    )

    return SoftwareDevicesResponse(
        software=soft_catalog_item,
        devices=devices_output,
        mais_recente=mais_recente_geral,
        total_atualizadas=total_atualizadas,
        total_desatualizadas=total_desatualizadas,
        taxa_conformidade=taxa_conf,
        total=total_devices_out,
    )
