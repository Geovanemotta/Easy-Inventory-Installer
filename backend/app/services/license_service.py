import re
from datetime import datetime
from typing import Any, Dict, List, Optional
from collections import defaultdict

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.device import Device
from app.models.device_history import DeviceHistory
from app.models.network_asset import NetworkAsset
from app.models.site import Site
from app.models.software_license import SoftwareLicense
from app.models.user import User
from app.schemas.software_license import (
    LicenseAssignIn,
    LicenseAvailableOut,
    LicenseCreate,
    LicenseDeviceItem,
    LicenseOut,
    LicenseStatsOut,
    LicenseUpdate,
)


def normalizar_chave(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    val = raw.strip().upper()
    # Se a chave foi colada sem hífens mas tem 25 caracteres alfanuméricos padrão Microsoft
    clean_chars = re.sub(r"[^A-Z0-9]", "", val)
    if len(clean_chars) == 25 and "-" not in val:
        return "-".join(clean_chars[i : i + 5] for i in range(0, 25, 5))
    return val


def calcular_mapa_uso_chaves(db: Session, company_id: int) -> Dict[str, int]:
    """Calcula dinamicamente a contagem de computadores e ativos usando cada serial."""
    uso_map: Dict[str, int] = defaultdict(int)

    # 1. Estações de Trabalho (devices)
    devs = db.scalars(
        select(Device).where(
            Device.company_id == company_id,
            Device.active == True,
            or_(Device.serial_windows.isnot(None), Device.serial_office.isnot(None)),
        )
    ).all()

    for d in devs:
        if d.serial_windows:
            k = d.serial_windows.strip().upper()
            if k:
                uso_map[k] += 1
        if d.serial_office:
            k = d.serial_office.strip().upper()
            if k:
                uso_map[k] += 1

    # 2. Ativos de Rede (network_assets)
    assets = db.scalars(
        select(NetworkAsset).where(
            NetworkAsset.company_id == company_id,
            or_(NetworkAsset.serial_windows.isnot(None), NetworkAsset.serial_office.isnot(None)),
        )
    ).all()

    for a in assets:
        if a.serial_windows:
            k = a.serial_windows.strip().upper()
            if k:
                uso_map[k] += 1
        if a.serial_office:
            k = a.serial_office.strip().upper()
            if k:
                uso_map[k] += 1

    return uso_map


def formatar_license_out(lic: SoftwareLicense, uso_count: int) -> LicenseOut:
    disp = max(0, lic.quantidade_total - uso_count)
    return LicenseOut(
        id=lic.id,
        company_id=lic.company_id,
        site_id=lic.site_id,
        site_nome=lic.site.name if lic.site else None,
        site_codigo=lic.site.code if lic.site else None,
        categoria=lic.categoria,
        software_nome=lic.software_nome,
        chave=lic.chave,
        tipo_licenca=lic.tipo_licenca,
        nota_fiscal=lic.nota_fiscal,
        quantidade_total=lic.quantidade_total,
        quantidade_em_uso=uso_count,
        quantidade_disponivel=disp,
        esgotada=(disp <= 0),
        observacoes=lic.observacoes,
        data_aquisicao=lic.data_aquisicao,
        created_at=lic.created_at,
        updated_at=lic.updated_at,
    )


def listar_licencas(
    db: Session,
    current_user: User,
    site_id: Optional[int] = None,
    categoria: Optional[str] = None,
    status: Optional[str] = None,  # 'todas' | 'disponiveis' | 'esgotadas'
    search: Optional[str] = None,
    software_nome: Optional[str] = None,
) -> List[LicenseOut]:
    uso_map = calcular_mapa_uso_chaves(db, current_user.company_id)

    stmt = select(SoftwareLicense).where(SoftwareLicense.company_id == current_user.company_id)

    if site_id is not None:
        if site_id == 0:
            stmt = stmt.where(SoftwareLicense.site_id.is_(None))
        else:
            stmt = stmt.where(SoftwareLicense.site_id == site_id)

    if categoria and categoria.strip() and categoria.lower() != "todos":
        stmt = stmt.where(SoftwareLicense.categoria == categoria.strip().lower())

    if software_nome and software_nome.strip() and software_nome.lower() != "todos":
        stmt = stmt.where(SoftwareLicense.software_nome == software_nome.strip())

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                SoftwareLicense.software_nome.ilike(term),
                SoftwareLicense.chave.ilike(term),
                SoftwareLicense.nota_fiscal.ilike(term),
                SoftwareLicense.observacoes.ilike(term),
            )
        )

    stmt = stmt.order_by(SoftwareLicense.software_nome.asc(), SoftwareLicense.created_at.desc())
    lics = db.scalars(stmt).all()

    resultados: List[LicenseOut] = []
    for l in lics:
        u = uso_map.get(l.chave.strip().upper(), 0)
        item = formatar_license_out(l, u)

        if status == "disponiveis" and item.esgotada:
            continue
        if status == "esgotadas" and not item.esgotada:
            continue

        resultados.append(item)

    return resultados


def obter_estatisticas_licencas(
    db: Session,
    current_user: User,
    site_id: Optional[int] = None,
) -> LicenseStatsOut:
    uso_map = calcular_mapa_uso_chaves(db, current_user.company_id)

    stmt = select(SoftwareLicense).where(SoftwareLicense.company_id == current_user.company_id)
    if site_id is not None:
        if site_id == 0:
            stmt = stmt.where(SoftwareLicense.site_id.is_(None))
        else:
            stmt = stmt.where(SoftwareLicense.site_id == site_id)

    lics = db.scalars(stmt).all()

    total_licencas = 0
    total_em_uso = 0
    total_esgotadas = 0

    por_cat = {
        "windows": {"total": 0, "em_uso": 0, "disponivel": 0, "esgotadas": 0},
        "office": {"total": 0, "em_uso": 0, "disponivel": 0, "esgotadas": 0},
        "outro": {"total": 0, "em_uso": 0, "disponivel": 0, "esgotadas": 0},
    }

    filiais_map = defaultdict(lambda: {"total": 0, "em_uso": 0, "disponivel": 0})

    for l in lics:
        u = uso_map.get(l.chave.strip().upper(), 0)
        total_licencas += l.quantidade_total
        total_em_uso += u
        disp = max(0, l.quantidade_total - u)
        esg = disp <= 0
        if esg:
            total_esgotadas += 1

        cat = l.categoria.lower() if l.categoria in por_cat else "outro"
        por_cat[cat]["total"] += l.quantidade_total
        por_cat[cat]["em_uso"] += u
        por_cat[cat]["disponivel"] += disp
        if esg:
            por_cat[cat]["esgotadas"] += 1

        s_nome = l.site.name if l.site else "Geral / Matriz"
        filiais_map[s_nome]["total"] += l.quantidade_total
        filiais_map[s_nome]["em_uso"] += u
        filiais_map[s_nome]["disponivel"] += disp

    total_disp = max(0, total_licencas - total_em_uso)

    filiais_list = [
        {
            "filial": f_nome,
            "total": d["total"],
            "em_uso": d["em_uso"],
            "disponivel": d["disponivel"],
        }
        for f_nome, d in sorted(filiais_map.items())
    ]

    return LicenseStatsOut(
        total_licencas=total_licencas,
        total_em_uso=total_em_uso,
        total_disponiveis=total_disp,
        total_esgotadas=total_esgotadas,
        por_categoria=por_cat,
        por_filial=filiais_list,
    )


def listar_licencas_disponiveis(
    db: Session,
    current_user: User,
    categoria: Optional[str] = None,
    site_id: Optional[int] = None,
    chave_atual: Optional[str] = None,
) -> List[LicenseAvailableOut]:
    uso_map = calcular_mapa_uso_chaves(db, current_user.company_id)

    stmt = select(SoftwareLicense).where(SoftwareLicense.company_id == current_user.company_id)
    if categoria and categoria.strip() and categoria.lower() != "todos":
        stmt = stmt.where(SoftwareLicense.categoria == categoria.strip().lower())

    if site_id is not None:
        # Permite licenças gerais da matriz (site_id is None) OU da loja específica
        stmt = stmt.where(or_(SoftwareLicense.site_id.is_(None), SoftwareLicense.site_id == site_id))

    stmt = stmt.order_by(SoftwareLicense.software_nome.asc(), SoftwareLicense.created_at.desc())
    lics = db.scalars(stmt).all()

    norm_atual = chave_atual.strip().upper() if chave_atual else None

    out: List[LicenseAvailableOut] = []
    for l in lics:
        u = uso_map.get(l.chave.strip().upper(), 0)
        disp = max(0, l.quantidade_total - u)
        is_cur = norm_atual is not None and l.chave.strip().upper() == norm_atual

        # Só lista se tiver saldo disponível OU se for a chave já atualmente vinculada à máquina
        if disp > 0 or is_cur:
            out.append(
                LicenseAvailableOut(
                    id=l.id,
                    chave=l.chave,
                    software_nome=l.software_nome,
                    categoria=l.categoria,
                    tipo_licenca=l.tipo_licenca,
                    nota_fiscal=l.nota_fiscal,
                    site_id=l.site_id,
                    site_nome=l.site.name if l.site else None,
                    quantidade_total=l.quantidade_total,
                    quantidade_em_uso=u,
                    quantidade_disponivel=disp,
                    esgotada=(disp <= 0),
                )
            )

    return out


def obter_computadores_vinculados(
    db: Session,
    current_user: User,
    license_id: int,
) -> List[LicenseDeviceItem]:
    lic = db.scalar(
        select(SoftwareLicense).where(
            SoftwareLicense.id == license_id,
            SoftwareLicense.company_id == current_user.company_id,
        )
    )
    if not lic:
        raise HTTPException(status_code=404, detail="Licença não encontrada.")

    norm_chave = lic.chave.strip().upper()
    itens: List[LicenseDeviceItem] = []

    # 1. Estações de Trabalho
    devs = db.scalars(
        select(Device).where(
            Device.company_id == current_user.company_id,
            Device.active == True,
            or_(
                Device.serial_windows.ilike(norm_chave),
                Device.serial_office.ilike(norm_chave),
            ),
        )
    ).all()

    for d in devs:
        if d.serial_windows and d.serial_windows.strip().upper() == norm_chave:
            itens.append(
                LicenseDeviceItem(
                    id=d.id,
                    hostname=d.hostname,
                    tipo="Estação de Trabalho",
                    ip=d.ip,
                    site_nome=d.site.name if d.site else None,
                    site_codigo=d.site.code if d.site else None,
                    patrimonio=d.patrimonio,
                    slot="windows",
                    origem="estacao",
                    data_coleta=d.data_coleta,
                )
            )
        if d.serial_office and d.serial_office.strip().upper() == norm_chave:
            itens.append(
                LicenseDeviceItem(
                    id=d.id,
                    hostname=d.hostname,
                    tipo="Estação de Trabalho",
                    ip=d.ip,
                    site_nome=d.site.name if d.site else None,
                    site_codigo=d.site.code if d.site else None,
                    patrimonio=d.patrimonio,
                    slot="office",
                    origem="estacao",
                    data_coleta=d.data_coleta,
                )
            )

    # 2. Ativos de Rede
    assets = db.scalars(
        select(NetworkAsset).where(
            NetworkAsset.company_id == current_user.company_id,
            or_(
                NetworkAsset.serial_windows.ilike(norm_chave),
                NetworkAsset.serial_office.ilike(norm_chave),
            ),
        )
    ).all()

    for a in assets:
        if a.serial_windows and a.serial_windows.strip().upper() == norm_chave:
            itens.append(
                LicenseDeviceItem(
                    id=a.id,
                    hostname=a.nome,
                    tipo=a.tipo,
                    ip=a.ip,
                    site_nome=a.site.name if a.site else None,
                    site_codigo=a.site.code if a.site else None,
                    patrimonio=a.patrimonio,
                    slot="windows",
                    origem="ativo",
                    data_coleta=a.ultimo_ping,
                )
            )
        if a.serial_office and a.serial_office.strip().upper() == norm_chave:
            itens.append(
                LicenseDeviceItem(
                    id=a.id,
                    hostname=a.nome,
                    tipo=a.tipo,
                    ip=a.ip,
                    site_nome=a.site.name if a.site else None,
                    site_codigo=a.site.code if a.site else None,
                    patrimonio=a.patrimonio,
                    slot="office",
                    origem="ativo",
                    data_coleta=a.ultimo_ping,
                )
            )

    return itens


def criar_licenca(
    db: Session,
    current_user: User,
    data: LicenseCreate,
) -> LicenseOut:
    norm_chave = normalizar_chave(data.chave)
    if not norm_chave:
        raise HTTPException(status_code=400, detail="A chave do produto é obrigatória.")

    existente = db.scalar(
        select(SoftwareLicense).where(
            SoftwareLicense.company_id == current_user.company_id,
            SoftwareLicense.chave == norm_chave,
        )
    )
    if existente:
        raise HTTPException(
            status_code=409,
            detail=f"Esta chave ({norm_chave}) já está cadastrada no sistema ({existente.software_nome}). "
                   "Você pode editar o lote existente para aumentar a quantidade total de licenças.",
        )

    nova = SoftwareLicense(
        company_id=current_user.company_id,
        site_id=data.site_id,
        categoria=data.categoria.lower().strip() if data.categoria else "windows",
        software_nome=data.software_nome.strip(),
        chave=norm_chave,
        tipo_licenca=data.tipo_licenca.strip() if data.tipo_licenca else "OEM",
        nota_fiscal=data.nota_fiscal.strip() if data.nota_fiscal else None,
        quantidade_total=data.quantidade_total if data.quantidade_total >= 1 else 1,
        observacoes=data.observacoes.strip() if data.observacoes else None,
        data_aquisicao=data.data_aquisicao,
    )

    db.add(nova)
    db.commit()
    db.refresh(nova)

    uso_map = calcular_mapa_uso_chaves(db, current_user.company_id)
    return formatar_license_out(nova, uso_map.get(nova.chave.upper(), 0))


def atualizar_licenca(
    db: Session,
    current_user: User,
    license_id: int,
    data: LicenseUpdate,
) -> LicenseOut:
    lic = db.scalar(
        select(SoftwareLicense).where(
            SoftwareLicense.id == license_id,
            SoftwareLicense.company_id == current_user.company_id,
        )
    )
    if not lic:
        raise HTTPException(status_code=404, detail="Licença não encontrada.")

    if data.chave is not None:
        norm_chave = normalizar_chave(data.chave)
        if not norm_chave:
            raise HTTPException(status_code=400, detail="A chave não pode ser vazia.")
        # Se alterou a chave, valida unicidade
        if norm_chave != lic.chave:
            existente = db.scalar(
                select(SoftwareLicense).where(
                    SoftwareLicense.company_id == current_user.company_id,
                    SoftwareLicense.chave == norm_chave,
                    SoftwareLicense.id != license_id,
                )
            )
            if existente:
                raise HTTPException(status_code=409, detail=f"A chave {norm_chave} já existe em outro cadastro.")
            lic.chave = norm_chave

    if data.categoria is not None:
        lic.categoria = data.categoria.lower().strip()
    if data.software_nome is not None:
        lic.software_nome = data.software_nome.strip()
    if data.tipo_licenca is not None:
        lic.tipo_licenca = data.tipo_licenca.strip()
    if data.nota_fiscal is not None:
        lic.nota_fiscal = data.nota_fiscal.strip() if data.nota_fiscal.strip() else None
    if data.quantidade_total is not None:
        lic.quantidade_total = data.quantidade_total
    if data.site_id is not None:
        lic.site_id = data.site_id if data.site_id > 0 else None
    if data.observacoes is not None:
        lic.observacoes = data.observacoes.strip() if data.observacoes.strip() else None
    if data.data_aquisicao is not None:
        lic.data_aquisicao = data.data_aquisicao

    lic.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(lic)

    uso_map = calcular_mapa_uso_chaves(db, current_user.company_id)
    return formatar_license_out(lic, uso_map.get(lic.chave.upper(), 0))


def excluir_licenca(
    db: Session,
    current_user: User,
    license_id: int,
) -> Dict[str, Any]:
    lic = db.scalar(
        select(SoftwareLicense).where(
            SoftwareLicense.id == license_id,
            SoftwareLicense.company_id == current_user.company_id,
        )
    )
    if not lic:
        raise HTTPException(status_code=404, detail="Licença não encontrada.")

    uso_map = calcular_mapa_uso_chaves(db, current_user.company_id)
    em_uso = uso_map.get(lic.chave.upper(), 0)

    db.delete(lic)
    db.commit()
    return {
        "success": True,
        "message": f"Licença '{lic.software_nome}' excluída com sucesso.",
        "em_uso_no_momento": em_uso,
    }


def atribuir_licenca_ativo(
    db: Session,
    current_user: User,
    data: LicenseAssignIn,
) -> Dict[str, Any]:
    """
    Atribui ou desvincula uma licença de um dispositivo/estação ou ativo de rede.
    Atualiza dinamicamente as tabelas de devices ou network_assets e mantém o histórico.
    """
    slot = data.slot.lower().strip()
    if slot not in ("windows", "office"):
        raise HTTPException(status_code=400, detail="O slot deve ser 'windows' ou 'office'.")

    norm_chave = normalizar_chave(data.chave) if data.chave else None

    # Se for vincular uma chave, valida disponibilidade no módulo de licenças
    lic_obj: Optional[SoftwareLicense] = None
    if norm_chave:
        lic_obj = db.scalar(
            select(SoftwareLicense).where(
                SoftwareLicense.company_id == current_user.company_id,
                SoftwareLicense.chave == norm_chave,
            )
        )
        if lic_obj:
            uso_map = calcular_mapa_uso_chaves(db, current_user.company_id)
            u = uso_map.get(norm_chave, 0)
            disp = lic_obj.quantidade_total - u

            # Verifica se o próprio ativo já tem essa chave atribuída (não consome slot extra)
            ja_tem = False
            if data.device_id:
                d_cur = db.get(Device, data.device_id)
                if d_cur:
                    cur_key = (d_cur.serial_windows if slot == "windows" else d_cur.serial_office) or ""
                    if cur_key.strip().upper() == norm_chave:
                        ja_tem = True
            elif data.network_asset_id:
                a_cur = db.get(NetworkAsset, data.network_asset_id)
                if a_cur:
                    cur_key = (a_cur.serial_windows if slot == "windows" else a_cur.serial_office) or ""
                    if cur_key.strip().upper() == norm_chave:
                        ja_tem = True

            if not ja_tem and disp <= 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"A licença '{lic_obj.software_nome}' está esgotada ({lic_obj.quantidade_total} de {lic_obj.quantidade_total} em uso). "
                           "Aumente a quantidade total do lote para vincular a novas máquinas.",
                )

    # Aplicação no alvo
    if data.device_id:
        dev = db.scalar(
            select(Device).where(
                Device.id == data.device_id,
                Device.company_id == current_user.company_id,
            )
        )
        if not dev:
            raise HTTPException(status_code=404, detail="Estação de trabalho não encontrada.")

        antigo = dev.serial_windows if slot == "windows" else dev.serial_office
        if antigo != norm_chave:
            if slot == "windows":
                dev.serial_windows = norm_chave
            else:
                dev.serial_office = norm_chave
            dev.updated_at = datetime.utcnow()

            # Registra no histórico do computador
            db.add(
                DeviceHistory(
                    device_id=dev.id,
                    campo=f"SERIAL_{slot.upper()}",
                    valor_anterior=antigo or "(vazio)",
                    valor_novo=norm_chave or "(desvinculado)",
                )
            )

    elif data.network_asset_id:
        asset = db.scalar(
            select(NetworkAsset).where(
                NetworkAsset.id == data.network_asset_id,
                NetworkAsset.company_id == current_user.company_id,
            )
        )
        if not asset:
            raise HTTPException(status_code=404, detail="Ativo de rede não encontrado.")

        if slot == "windows":
            asset.serial_windows = norm_chave
        else:
            asset.serial_office = norm_chave
        asset.updated_at = datetime.utcnow()
    else:
        raise HTTPException(status_code=400, detail="É necessário informar device_id ou network_asset_id.")

    db.commit()

    return {
        "success": True,
        "slot": slot,
        "chave": norm_chave,
        "software_nome": lic_obj.software_nome if lic_obj else None,
        "message": f"Chave de {slot.capitalize()} {'atribuída' if norm_chave else 'removida'} com sucesso.",
    }
