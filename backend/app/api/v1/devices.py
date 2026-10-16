from datetime import datetime
import ipaddress
import re
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies.auth import get_current_user
from app.database import engine
from app.models import Device, User
from app.models.device_history import DeviceHistory
from app.models.network_asset import NetworkAsset
from app.models.site import Site
from app.models.site_ip_range import SiteIpRange
from app.models.user_site_access import user_site_access
from app.services.inventory_service import is_subnet_88


class DevicePatrimonioIn(BaseModel):
    patrimonio: str


class DeviceFirewallSolicitarIn(BaseModel):
    patrimonio: str | None = None


class DeviceSolicitarRecadastroIn(BaseModel):
    patrimonio: str
    confirmacao_mudanca_so: bool = False
    licenca_windows_solicitada: bool = False
    motivo: str | None = None


class DeviceAprovarCadastroIn(BaseModel):
    site_id: int
    ip_definitivo: str
    vincular_ativo_existente_id: int | None = None
    vincular_network_asset_id: int | None = None
    patrimonio: str | None = None
    observacao_admin: str | None = None
    confirmar_sobrescrita_ip: bool = False


def is_valid_ipv4_non_bench(ip_str: str | None) -> bool:
    if not ip_str or not str(ip_str).strip():
        return False
    try:
        addr = ipaddress.IPv4Address(str(ip_str).strip())
        return not is_subnet_88(str(addr))
    except Exception:
        return False


class DeviceRejeitarCadastroIn(BaseModel):
    motivo: str


def classificar_familia_so(sistema: str | None, versao: str | None) -> str:
    texto = f"{sistema or ''} {versao or ''}".lower()
    if any(k in texto for k in ["win", "windows", "microsoft"]):
        return "Windows"
    if any(k in texto for k in ["linux", "ubuntu", "zorin", "debian", "kubuntu", "mint", "centos", "fedora", "rhel"]):
        return "Linux"
    if "mac" in texto or "darwin" in texto:
        return "macOS"
    return (sistema or "Desconhecido").strip().capitalize()


def is_admin_user(user: User) -> bool:
    if user.is_superadmin:
        return True
    roles = [r.slug for r in user.roles] if user.roles else []
    return "admin" in roles


def is_matriz_operator(user: User) -> bool:
    roles = [r.slug for r in user.roles] if user.roles else []
    return "operador_matriz" in roles


router = APIRouter(
    prefix="/devices",
    tags=["Devices"],
)


@router.get("/")
def list_devices(
    search: str | None = Query(
        default=None,
        description="Busca por hostname, IP, MAC ou RustDesk ID.",
    ),
    site_id: int | None = Query(
        default=None,
        description="Filtra por site.",
    ),
    status: str | None = Query(
        default=None,
        description="Filtra pelo status do dispositivo.",
    ),
    page: int = Query(
        default=1,
        ge=1,
    ),
    per_page: int = Query(
        default=50,
        ge=1,
        le=200,
    ),
    current_user: User = Depends(get_current_user),
    sistema: str | None = None,
    versao: str | None = None,
):
    with Session(engine) as session:

        # ---------------------------------------------------------
        # Base: somente devices da empresa do usuário
        # ---------------------------------------------------------

        query = select(Device).where(
            Device.company_id == current_user.company_id,
        )

        count_query = select(
            func.count(Device.id)
        ).where(
            Device.company_id == current_user.company_id,
        )

        # ---------------------------------------------------------
        # Controle de acesso por site
        # ---------------------------------------------------------

        role_slugs = [r.slug for r in current_user.roles] if current_user.roles else []
        is_global_viewer = current_user.is_superadmin or any(
            r in ("admin", "operador_matriz") for r in role_slugs
        )

        if not is_global_viewer:

            allowed_sites = (
                select(user_site_access.c.site_id)
                .where(
                    user_site_access.c.user_id
                    == current_user.id
                )
            )

            query = query.where(
                Device.site_id.in_(allowed_sites)
            )

            count_query = count_query.where(
                Device.site_id.in_(allowed_sites)
            )

        # ---------------------------------------------------------
        # Filtro por site
        # ---------------------------------------------------------

        if site_id is not None:

            query = query.where(
                Device.site_id == site_id
            )

            count_query = count_query.where(
                Device.site_id == site_id
            )

        # ---------------------------------------------------------
        # Busca
        # ---------------------------------------------------------

        if search:

            termo = f"%{search.strip()}%"

            filtro_busca = or_(
                Device.hostname.ilike(termo),
                Device.ip.ilike(termo),
                Device.mac.ilike(termo),
                Device.rustdesk_id.ilike(termo),
            )

            query = query.where(filtro_busca)
            count_query = count_query.where(filtro_busca)

        # ---------------------------------------------------------
        # Status
        # ---------------------------------------------------------

        if status:

            query = query.where(
                Device.status == status
            )

            count_query = count_query.where(
                Device.status == status
            )

        # ---------------------------------------------------------
        # Sistema
        # ---------------------------------------------------------

        if sistema:

            query = query.where(
                Device.sistema == sistema
            )

            count_query = count_query.where(
                Device.sistema == sistema
            )

        # ---------------------------------------------------------
        # Versão
        # ---------------------------------------------------------

        if versao:

            query = query.where(
                Device.versao == versao
            )

            count_query = count_query.where(
                Device.versao == versao
            )

        # ---------------------------------------------------------
        # Total
        # ---------------------------------------------------------

        total = session.scalar(
            count_query
        ) or 0

        # ---------------------------------------------------------
        # Paginação
        # ---------------------------------------------------------

        offset = (page - 1) * per_page

        devices = session.scalars(
            query
            .order_by(Device.hostname)
            .offset(offset)
            .limit(per_page)
        ).all()

        # ---------------------------------------------------------
        # Resposta
        # ---------------------------------------------------------

        return {
            "items": [
                {
                    "id": device.id,
                    "company_id": device.company_id,
                    "site_id": device.site_id,
                    "hostname": device.hostname,
                    "loja": device.loja,
                    "ip": device.ip,
                    "mac": device.mac,
                    "sistema": device.sistema,
                    "versao": device.versao,
                    "status": device.status,
                    "processador": device.processador,
                    "ram_total": device.ram_total,
                    "disco_total": device.disco_total,
                    "disco_usado": device.disco_usado,
                    "disco_livre": device.disco_livre,
                    "disco_percentual": device.disco_percentual,
                    "rustdesk_id": device.rustdesk_id,
                    "data_coleta": device.data_coleta,
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
                for device in devices
            ],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": (
                    (total + per_page - 1)
                    // per_page
                ),
            },
        }


IGNORED_HISTORY_FIELDS = {
    "USUARIO",
    "DOMINIO",
    "RUSTDESK_ID",
    "PERIFERICOS",
}


@router.get("/{device_id}/history")
def get_device_history(
    device_id: int,
    limit: int = Query(default=100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
):
    """
    Retorna o histórico de alterações críticas (hardware, IP, hostname, patrimônio) de um dispositivo.
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

        histories = session.scalars(
            select(DeviceHistory)
            .where(
                DeviceHistory.device_id == device_id,
                DeviceHistory.campo.notin_(IGNORED_HISTORY_FIELDS),
            )
            .order_by(DeviceHistory.data_alteracao.desc())
            .limit(limit)
        ).all()

        return [
            {
                "id": h.id,
                "campo": h.campo,
                "valor_anterior": h.valor_anterior,
                "valor_novo": h.valor_novo,
                "data_alteracao": h.data_alteracao.strftime("%d/%m/%Y %H:%M:%S") if h.data_alteracao else "",
            }
            for h in histories
        ]


@router.post("/{device_id}/clear-alert")
def clear_device_alert(
    device_id: int,
    current_user: User = Depends(get_current_user),
):
    """
    Limpa o alerta de hardware/MAC pendente de um dispositivo (exclusivo para Administrador).
    """
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
    """
    Exclui permanentemente um dispositivo e seu histórico do inventário (exclusivo para Administrador).
    """
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
    - Operador matriz pode editar a primeira vez (enquanto não confirmado).
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

        if matriz_flag and not admin_flag and device.firewall_status == "confirmado":
            raise HTTPException(
                status_code=403,
                detail="O patrimônio já foi homologado pelo administrador e está bloqueado para alteração.",
            )

        val = payload.patrimonio.strip()
        nums = re.sub(r"[^0-9]", "", val)
        if not nums:
            raise HTTPException(status_code=400, detail="O patrimônio deve conter dígitos numéricos (ex: pat.35192).")
        patrimonio_formatado = f"pat.{nums}"

        # Bloqueio de alteração de patrimônio existente fora da faixa 192.168.88.0/24 para operador
        if not admin_flag:
            dev_is_bench = is_subnet_88(device.ip)
            dev_has_pat = bool(device.patrimonio and device.patrimonio.strip())
            if not dev_is_bench and dev_has_pat:
                if device.patrimonio.strip().lower() != patrimonio_formatado.lower():
                    raise HTTPException(
                        status_code=403,
                        detail="O patrimônio deste equipamento não pode ser alterado fora da faixa de preparação (192.168.88.0/24).",
                    )

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
    payload: DeviceFirewallSolicitarIn | None = None,
    current_user: User = Depends(get_current_user),
):
    """
    Marca a máquina nova para homologação e cadastro no firewall.
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

        if not is_admin_user(current_user) and not is_matriz_operator(current_user):
            raise HTTPException(
                status_code=403,
                detail="Apenas administradores e operadores da matriz podem marcar máquinas para cadastro no firewall.",
            )

        if payload and payload.patrimonio:
            nums = re.sub(r"[^0-9]", "", payload.patrimonio.strip())
            if nums:
                pat_novo = f"pat.{nums}"
                if not is_admin_user(current_user):
                    dev_is_bench = is_subnet_88(device.ip)
                    dev_has_pat = bool(device.patrimonio and device.patrimonio.strip())
                    if not dev_is_bench and dev_has_pat:
                        if device.patrimonio.strip().lower() != pat_novo.lower():
                            raise HTTPException(
                                status_code=403,
                                detail="O patrimônio deste equipamento não pode ser alterado fora da faixa de preparação (192.168.88.0/24).",
                            )
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
    """
    Confirma que a máquina foi cadastrada no firewall.
    Exclusivo para administradores.
    """
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


@router.get("/patrimonio/lookup")
def lookup_patrimonio(
    patrimonio: str = Query(...),
    current_device_id: int | None = Query(default=None),
    current_user: User = Depends(get_current_user),
):
    """
    Consulta em tempo real se o número de patrimônio informado já existe no inventário
    (pesquisando tanto em estações Device quanto em ativos importados NetworkAsset).
    Retorna os dados cadastrais do ativo existente, IP sugerido e análise de discrepâncias.
    """
    nums = re.sub(r"[^0-9]", "", patrimonio.strip())
    if not nums:
        return {"exists": False, "patrimonio_formatado": "", "message": "Patrimônio sem dígitos"}

    pat_formatado = f"pat.{nums}"

    with Session(engine) as session:
        # 1. Busca em Device (estações de trabalho ativas)
        stmt_dev = (
            select(Device)
            .options(selectinload(Device.site))
            .where(
                Device.company_id == current_user.company_id,
                or_(
                    Device.patrimonio.ilike(pat_formatado),
                    Device.patrimonio.ilike(f"%{nums}%"),
                ),
                Device.active.is_(True),
            )
        )
        if current_device_id:
            stmt_dev = stmt_dev.where(Device.id != current_device_id)

        matching_devs = session.scalars(stmt_dev).all()

        # 2. Busca em NetworkAsset (ativos de rede e importações de planilha)
        stmt_net = (
            select(NetworkAsset)
            .options(selectinload(NetworkAsset.site))
            .where(
                NetworkAsset.company_id == current_user.company_id,
                or_(
                    NetworkAsset.patrimonio.ilike(pat_formatado),
                    NetworkAsset.patrimonio.ilike(f"%{nums}%"),
                ),
            )
        )
        matching_nets = session.scalars(stmt_net).all()

        if not matching_devs and not matching_nets:
            return {
                "exists": False,
                "patrimonio_formatado": pat_formatado,
                "message": "Nenhum ativo anterior encontrado com este patrimônio.",
            }

        # Conflitos / Inconsistências se houver múltiplos registros
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
            dev_candidate = matching_devs[0]
            net_candidate = matching_nets[0]
            same_ip = bool(dev_candidate.ip and net_candidate.ip and dev_candidate.ip == net_candidate.ip)
            same_mac = bool(
                dev_candidate.mac
                and net_candidate.mac
                and dev_candidate.mac.lower().replace("-", ":") == net_candidate.mac.lower().replace("-", ":")
            )
            same_name = bool(
                dev_candidate.hostname
                and net_candidate.nome
                and dev_candidate.hostname.lower() == net_candidate.nome.lower()
            )
            if same_ip or same_mac or same_name or (dev_candidate.site_id and dev_candidate.site_id == net_candidate.site_id):
                tem_conflito = False

        existing_dev = matching_devs[0] if matching_devs else None
        existing_net = matching_nets[0] if matching_nets else None

        curr_dev = None
        if current_device_id:
            curr_dev = session.scalar(
                select(Device).where(
                    Device.id == current_device_id,
                    Device.company_id == current_user.company_id,
                )
            )

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

            # Prioriza IP corporativo válido de NetworkAsset ou Device (que não seja da bancada .88)
            old_ip = ""
            if existing_net and is_valid_ipv4_non_bench(existing_net.ip):
                old_ip = existing_net.ip.strip()
            elif is_valid_ipv4_non_bench(existing_dev.ip):
                old_ip = existing_dev.ip.strip()
            elif is_valid_ipv4_non_bench(existing_dev.ip_definitivo):
                old_ip = existing_dev.ip_definitivo.strip()

            old_mac = existing_dev.mac or (existing_net.mac if existing_net else "")
            old_so = f"{existing_dev.sistema or ''} {existing_dev.versao or ''}".strip()
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
            fam_ant = classificar_familia_so(existing_net.tipo, existing_net.modelo)
            origem_val = existing_net.origem or "planilha"

        so_atual = f"{curr_dev.sistema or ''} {curr_dev.versao or ''}".strip() if curr_dev else ""
        fam_atual = classificar_familia_so(curr_dev.sistema, curr_dev.versao) if curr_dev else ""
        so_divergente = bool(curr_dev and existing_dev and fam_ant != fam_atual)

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
            "tipo_origem": tipo_origem,
            "linked_device_id": linked_dev_id,
            "linked_network_asset_id": linked_net_id,
            "tem_conflito": tem_conflito,
            "conflitos": conflitos if tem_conflito else [],
            "existing_device": {
                "id": linked_dev_id or linked_net_id,
                "tipo_origem": tipo_origem,
                "hostname": old_hostname,
                "loja": old_loja,
                "site_id": old_site_id,
                "ip": old_ip,
                "mac": old_mac,
                "sistema": old_so,
                "versao": (existing_dev.versao if existing_dev else (existing_net.modelo or "")) or "",
                "patrimonio": pat_formatado,
                "familia_so": fam_ant,
                "origem": origem_val,
            },
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


@router.post("/{device_id}/solicitar-recadastro")
def solicitar_recadastro(
    device_id: int,
    payload: DeviceSolicitarRecadastroIn,
    current_user: User = Depends(get_current_user),
):
    """
    Submissão do cadastro/recadastro realizada pelo operador.
    Valida patrimônio, bloqueia alteração fora da bancada .88 para patrimônio preenchido,
    detecta divergência de SO e registra licença Windows se informada.
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

        if not is_admin_user(current_user) and not is_matriz_operator(current_user):
            raise HTTPException(
                status_code=403,
                detail="Apenas administradores e operadores autorizados podem solicitar recadastro de máquinas.",
            )

        nums = re.sub(r"[^0-9]", "", payload.patrimonio.strip())
        if not nums:
            raise HTTPException(status_code=400, detail="O patrimônio deve conter números válidos.")
        pat_formatado = f"pat.{nums}"

        # Bloqueio estrito de alteração de patrimônio fora da faixa 192.168.88.0/24 para operador
        admin_flag = is_admin_user(current_user)
        if not admin_flag:
            dev_is_bench = is_subnet_88(device.ip)
            dev_has_pat = bool(device.patrimonio and device.patrimonio.strip())
            if not dev_is_bench and dev_has_pat:
                if device.patrimonio.strip().lower() != pat_formatado.lower():
                    raise HTTPException(
                        status_code=403,
                        detail="O patrimônio deste equipamento não pode ser alterado fora da faixa de preparação (192.168.88.0/24).",
                    )

        # Busca ativo existente correspondente em Device
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
        fam_ant = None
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
    Seção B: Correspondência com ativo existente (pesquisando em Device e NetworkAsset)
    Seção C: Loja resolvida, faixas de IP, IPs ocupados e sugestão de IP anterior
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

        matching_devs = []
        matching_nets = []
        conflitos = []
        tem_conflito = False

        if device.patrimonio:
            nums = re.sub(r"[^0-9]", "", device.patrimonio)
            if nums:
                pat_formatado = f"pat.{nums}"
                # 1. Busca em Device
                matching_devs = session.scalars(
                    select(Device)
                    .options(selectinload(Device.site))
                    .where(
                        Device.company_id == current_user.company_id,
                        or_(
                            Device.patrimonio.ilike(pat_formatado),
                            Device.patrimonio.ilike(f"%{nums}%"),
                        ),
                        Device.id != device.id,
                        Device.active.is_(True),
                    )
                ).all()

                # 2. Busca em NetworkAsset
                matching_nets = session.scalars(
                    select(NetworkAsset)
                    .options(selectinload(NetworkAsset.site))
                    .where(
                        NetworkAsset.company_id == current_user.company_id,
                        or_(
                            NetworkAsset.patrimonio.ilike(pat_formatado),
                            NetworkAsset.patrimonio.ilike(f"%{nums}%"),
                        ),
                    )
                ).all()

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
            dev_candidate = matching_devs[0]
            net_candidate = matching_nets[0]
            same_ip = bool(dev_candidate.ip and net_candidate.ip and dev_candidate.ip == net_candidate.ip)
            same_mac = bool(
                dev_candidate.mac
                and net_candidate.mac
                and dev_candidate.mac.lower().replace("-", ":") == net_candidate.mac.lower().replace("-", ":")
            )
            same_name = bool(
                dev_candidate.hostname
                and net_candidate.nome
                and dev_candidate.hostname.lower() == net_candidate.nome.lower()
            )
            if same_ip or same_mac or same_name or (dev_candidate.site_id and dev_candidate.site_id == net_candidate.site_id):
                tem_conflito = False

        existing_dev = matching_devs[0] if matching_devs else None
        existing_net = matching_nets[0] if matching_nets else None

        existing_asset_dict = None
        divergencias = []
        so_divergente = False
        ip_anterior_sugerido = ""
        resolved_site_id = device.site_id

        if existing_dev or existing_net:
            linked_dev_id = existing_dev.id if existing_dev else None
            linked_net_id = existing_net.id if existing_net else None

            if existing_dev:
                tipo_orig = "ambos" if existing_net else "device"
                host_val = existing_dev.hostname or (existing_net.nome if existing_net else "")
                loja_val = (
                    existing_dev.site.name
                    if existing_dev.site
                    else (
                        existing_dev.loja
                        or (existing_net.site.name if (existing_net and existing_net.site) else (existing_net.localizacao if existing_net else ""))
                    )
                )
                site_id_val = existing_dev.site_id or (existing_net.site_id if existing_net else None)

                # Prioriza IP de rede de trabalho (que não seja da faixa de formatação .88)
                ip_val = ""
                if existing_net and is_valid_ipv4_non_bench(existing_net.ip):
                    ip_val = existing_net.ip.strip()
                elif is_valid_ipv4_non_bench(existing_dev.ip):
                    ip_val = existing_dev.ip.strip()
                elif is_valid_ipv4_non_bench(existing_dev.ip_definitivo):
                    ip_val = existing_dev.ip_definitivo.strip()

                mac_val = existing_dev.mac or (existing_net.mac if existing_net else "")
                so_val = existing_dev.sistema or ""
                versao_val = existing_dev.versao or ""
                origem_val = getattr(existing_dev, "origem", "estacao")
            else:
                tipo_orig = "network_asset"
                host_val = existing_net.nome or ""
                loja_val = existing_net.site.name if existing_net.site else (existing_net.localizacao or "")
                site_id_val = existing_net.site_id
                ip_val = existing_net.ip.strip() if is_valid_ipv4_non_bench(existing_net.ip) else ""
                mac_val = existing_net.mac or ""
                so_val = existing_net.tipo or "Ativo Importado"
                versao_val = existing_net.modelo or ""
                origem_val = existing_net.origem or "planilha"

            existing_asset_dict = {
                "id": linked_dev_id or linked_net_id,
                "tipo_origem": tipo_orig,
                "linked_device_id": linked_dev_id,
                "linked_network_asset_id": linked_net_id,
                "hostname": host_val,
                "ip": ip_val,
                "mac": mac_val,
                "sistema": so_val,
                "versao": versao_val,
                "loja": loja_val,
                "site_id": site_id_val,
                "patrimonio": device.patrimonio or "",
                "origem": origem_val,
            }

            if not resolved_site_id and site_id_val:
                resolved_site_id = site_id_val

            # Divergências
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

            # Sugestão de IP:
            # 1. IP corporativo anterior de NetworkAsset ou Device
            if ip_val and is_valid_ipv4_non_bench(ip_val):
                ip_anterior_sugerido = ip_val
            elif device.ip_definitivo and is_valid_ipv4_non_bench(device.ip_definitivo):
                ip_anterior_sugerido = device.ip_definitivo
            elif device.ip and is_valid_ipv4_non_bench(device.ip):
                ip_anterior_sugerido = device.ip
            else:
                ip_anterior_sugerido = ""
        else:
            # Equipamento novo (sem correspondência anterior)
            if device.ip_definitivo and is_valid_ipv4_non_bench(device.ip_definitivo):
                ip_anterior_sugerido = device.ip_definitivo
            elif device.ip and is_valid_ipv4_non_bench(device.ip):
                ip_anterior_sugerido = device.ip
            else:
                ip_anterior_sugerido = ""

        all_sites = session.scalars(
            select(Site)
            .where(Site.company_id == current_user.company_id, Site.active.is_(True))
            .order_by(Site.code.asc())
        ).all()

        sites_list = [{"id": s.id, "name": s.name, "code": s.code} for s in all_sites]

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
            for ip_val in dev_ips:
                if ip_val and not is_subnet_88(ip_val):
                    ips_ocupados.add(ip_val)

            net_ips = session.scalars(
                select(NetworkAsset.ip).where(
                    NetworkAsset.site_id == resolved_site_id,
                    NetworkAsset.company_id == current_user.company_id,
                    NetworkAsset.ip.isnot(None),
                )
            ).all()
            for ip_val in net_ips:
                if ip_val:
                    ips_ocupados.add(ip_val)

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
            "existing_asset": existing_asset_dict,
            "tem_conflito": tem_conflito,
            "conflitos": conflitos if tem_conflito else [],
            "divergencias": divergencias,
            "so_divergente": so_divergente,
            "network_context": {
                "resolved_site_id": resolved_site_id,
                "sites": sites_list,
                "faixas": faixas_list,
                "ips_ocupados": sorted(list(ips_ocupados)),
                "ip_anterior_sugerido": ip_anterior_sugerido,
                "ip_confiavel": bool(ip_anterior_sugerido),
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
    - Valida IP definitivo
    - Detecta conflito de IP com aviso/confirmação
    - Vincula ao ativo existente se aplicável, preservando o histórico
    - Define o status como confirmado e grava auditoria completa no DeviceHistory
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

        # Se vinculando a um ativo existente em Device no recadastro
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

        # Se vinculando a um ativo existente em NetworkAsset
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
            nums = re.sub(r"[^0-9]", "", payload.patrimonio)
            if nums:
                novo_pat = f"pat.{nums}"
                if device.patrimonio != novo_pat:
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
    """
    Rejeição administrativa da solicitação de cadastro, registrando obrigatoriamente o motivo.
    """
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
