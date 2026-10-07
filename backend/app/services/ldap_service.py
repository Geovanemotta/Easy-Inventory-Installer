import logging
import re
import socket
import time
from typing import Any, Dict, List, Optional, Tuple

import ldap3
from ldap3 import ALL, Connection, Server, Tls
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ad_config import ADConfig
from app.models.role import Role
from app.models.site import Site
from app.models.user import User
from app.models.user_site_access import user_site_access

logger = logging.getLogger(__name__)


def extract_cn_from_dn(dn: str) -> str:
    """Extrai o valor de CN a partir de um Distinguished Name ou nome simples."""
    s = str(dn).strip()
    m = re.match(r"^CN=([^,]+)", s, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    if "\\" in s:
        return s.split("\\", 1)[1].strip()
    return s


def normalize_ad_name(name: str) -> str:
    """
    Normaliza nomes de grupos/contas do AD para comparação robusta
    (remove prefixo CN=, domínio DOMAIN\, sufixo @dominio, espaços extras, maiúsculo).
    """
    s = str(name).strip().upper()
    if s.startswith("CN="):
        s = extract_cn_from_dn(s).upper()
    if "\\" in s:
        s = s.split("\\", 1)[1].strip()
    if "@" in s:
        s = s.split("@", 1)[0].strip()
    return re.sub(r"\s+", " ", s).strip()


def test_tcp_connectivity(host: str, port: int, timeout_sec: float = 3.0) -> Tuple[bool, str]:
    """Testa se o host e a porta estão acessíveis via TCP antes de tentar o LDAP."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout_sec)
        sock.connect((host, port))
        sock.close()
        return True, "Porta acessível"
    except socket.timeout:
        return False, f"Tempo limite esgotado conectando a {host}:{port} ({timeout_sec}s)."
    except Exception as e:
        return False, f"Falha de rede ao conectar em {host}:{port} - {e}"


def test_ldap_connection(config: ADConfig | Dict[str, Any]) -> Dict[str, Any]:
    """
    Testa a conectividade com o Active Directory e valida as credenciais
    do usuário de serviço (ou bind anônimo).
    """
    if isinstance(config, ADConfig):
        host = config.server_host
        port = config.server_port
        use_ssl = config.use_ssl
        use_tls = config.use_tls
        domain = config.domain
        base_dn = config.base_dn
        bind_user = config.bind_user
        bind_password = config.bind_password
    else:
        host = str(config.get("server_host", "")).strip()
        port = int(config.get("server_port") or (636 if config.get("use_ssl") else 389))
        use_ssl = bool(config.get("use_ssl", False))
        use_tls = bool(config.get("use_tls", False))
        domain = str(config.get("domain", "")).strip()
        base_dn = str(config.get("base_dn", "")).strip()
        bind_user = config.get("bind_user")
        bind_password = config.get("bind_password")

    if not host:
        return {
            "success": False,
            "message": "Endereço do servidor AD (Host) não informado.",
            "diagnostic": "host_missing",
        }

    # 1. Teste de conexão TCP inicial
    tcp_ok, tcp_msg = test_tcp_connectivity(host, port, timeout_sec=4.0)
    if not tcp_ok:
        return {
            "success": False,
            "message": f"Não foi possível alcançar o servidor {host}:{port}.",
            "diagnostic": tcp_msg,
            "suggestion": "Verifique se a VPN corporativa está ativa e se as rotas/firewalls permitem conexão nesta porta.",
        }

    # 2. Configuração e teste LDAP
    t0 = time.time()
    try:
        server = Server(
            host,
            port=port,
            use_ssl=use_ssl,
            get_info=ALL,
            connect_timeout=5,
        )

        user_bind = bind_user
        if user_bind and "@" not in user_bind and "\\" not in user_bind and domain and not user_bind.upper().startswith("CN="):
            user_bind = f"{user_bind}@{domain}"

        conn = Connection(
            server,
            user=user_bind,
            password=bind_password,
            auto_bind=True,
            auto_referrals=False,
            raise_exceptions=True,
        )

        if use_tls and not use_ssl:
            conn.start_tls()

        latency_ms = round((time.time() - t0) * 1000, 1)

        # Informações do servidor obtidas
        info = {}
        if server.info:
            info["naming_contexts"] = list(server.info.naming_contexts or [])
            info["supported_ldap_versions"] = list(server.info.supported_ldap_versions or [])

        conn.unbind()

        return {
            "success": True,
            "message": f"Conexão com o Active Directory estabelecida com sucesso ({latency_ms} ms)!",
            "latency_ms": latency_ms,
            "server_host": host,
            "server_port": port,
            "bind_type": "Autenticado (Service Account)" if bind_user else "Anônimo",
            "server_info": info,
        }

    except ldap3.core.exceptions.LDAPInvalidCredentialsResult:
        return {
            "success": False,
            "message": "Credenciais do usuário de serviço (Bind User/Password) inválidas no AD.",
            "diagnostic": "invalid_credentials",
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Erro durante a comunicação LDAP: {e}",
            "diagnostic": str(e),
        }


def search_user_in_ad(
    conn: Connection,
    base_dn: str,
    search_filter: str,
    username: str,
) -> Optional[Dict[str, Any]]:
    """Procura um usuário no AD e retorna seus atributos principais e grupos."""
    filter_str = search_filter.replace("{username}", username)
    conn.search(
        search_base=base_dn,
        search_filter=filter_str,
        attributes=[
            "distinguishedName",
            "sAMAccountName",
            "userPrincipalName",
            "displayName",
            "mail",
            "memberOf",
            "objectGUID",
            "userAccountControl",
        ],
    )

    if not conn.entries:
        return None

    entry = conn.entries[0]
    user_dn = str(entry.entry_dn)
    found_groups: set[str] = set()

    # 1. Atributo memberOf da entrada do usuário (com extração de CN e formato original)
    raw_groups = []
    if hasattr(entry, "memberOf") and entry.memberOf:
        if hasattr(entry.memberOf, "values"):
            raw_groups = list(entry.memberOf.values)
        elif isinstance(entry.memberOf, (list, tuple, set)):
            raw_groups = list(entry.memberOf)
        else:
            raw_groups = [str(entry.memberOf)]

    for g in raw_groups:
        g_str = str(g).strip()
        if g_str:
            found_groups.add(g_str)
            cn = extract_cn_from_dn(g_str)
            if cn:
                found_groups.add(cn)

    # 2. Busca reversa por grupos no AD onde o usuário é membro
    try:
        group_filter = f"(&(objectClass=group)(member={user_dn}))"
        conn.search(
            search_base=base_dn,
            search_filter=group_filter,
            attributes=["cn", "sAMAccountName", "distinguishedName"],
            size_limit=200,
        )
        for g_entry in conn.entries:
            cn = str(getattr(g_entry, "cn", "") or "")
            sam = str(getattr(g_entry, "sAMAccountName", "") or "")
            dn = str(g_entry.entry_dn)
            if cn:
                found_groups.add(cn)
            if sam:
                found_groups.add(sam)
            if dn:
                found_groups.add(dn)
    except Exception as e:
        logger.warning(f"Aviso ao consultar grupos reversos para {user_dn}: {e}")

    groups = sorted(list(found_groups), key=lambda x: x.lower())

    return {
        "dn": user_dn,
        "username": str(getattr(entry, "sAMAccountName", username)),
        "display_name": str(getattr(entry, "displayName", "") or ""),
        "email": str(getattr(entry, "mail", "") or ""),
        "groups": groups,
        "guid": str(getattr(entry, "objectGUID", "") or ""),
    }


def authenticate_ldap_user(
    db: Session,
    username: str,
    password: str,
    company_id: int = 1,
) -> Optional[User]:
    """
    Autentica um usuário no Active Directory (LDAP/LDAPS).
    Se autenticado com sucesso, executa o JIT (Just-In-Time Provisioning),
    atualizando ou cadastrando o usuário no PostgreSQL.
    """
    clean_username = username.strip()
    if not clean_username or not password:
        return None

    # Remove domínio se digitado (ex: DOMINIO\joao -> joao)
    if "\\" in clean_username:
        clean_username = clean_username.split("\\", 1)[1]
    elif "@" in clean_username:
        clean_username = clean_username.split("@", 1)[0]

    # Carrega configuração ativa do AD para a empresa
    config = db.scalar(
        select(ADConfig).where(
            ADConfig.company_id == company_id,
            ADConfig.enabled.is_(True),
        )
    )

    if not config or not config.server_host:
        return None

    host = config.server_host
    port = config.server_port or (636 if config.use_ssl else 389)
    domain = config.domain

    try:
        server = Server(
            host,
            port=port,
            use_ssl=config.use_ssl,
            connect_timeout=4,
        )

        user_info: Optional[Dict[str, Any]] = None

        # Estratégia 1: Consulta prévia via Service Account (Recomendada)
        if config.bind_user and config.bind_password:
            service_bind = config.bind_user
            if "@" not in service_bind and "\\" not in service_bind and domain and not service_bind.upper().startswith("CN="):
                service_bind = f"{service_bind}@{domain}"

            service_conn = Connection(
                server,
                user=service_bind,
                password=config.bind_password,
                auto_bind=True,
                auto_referrals=False,
                raise_exceptions=True,
            )

            user_info = search_user_in_ad(
                service_conn,
                config.base_dn,
                config.user_search_filter,
                clean_username,
            )
            service_conn.unbind()

            if not user_info:
                logger.info(f"Usuário '{clean_username}' não localizado no AD com o filtro configurado.")
                return None

            # Testa as credenciais do usuário usando seu DN exato
            user_conn = Connection(
                server,
                user=user_info["dn"],
                password=password,
                auto_bind=False,
                auto_referrals=False,
            )
            if not user_conn.bind():
                logger.warning(f"Credenciais inválidas no AD para o usuário '{clean_username}'.")
                return None
            user_conn.unbind()

        else:
            # Estratégia 2: Direct User Bind
            user_bind = f"{clean_username}@{domain}" if domain else clean_username
            user_conn = Connection(
                server,
                user=user_bind,
                password=password,
                auto_bind=False,
                auto_referrals=False,
            )
            if not user_conn.bind():
                return None

            # Tenta buscar os dados do usuário autenticado
            if config.base_dn:
                user_info = search_user_in_ad(
                    user_conn,
                    config.base_dn,
                    config.user_search_filter,
                    clean_username,
                )
            user_conn.unbind()

        # Monta os dados finais do usuário
        full_name = (user_info and user_info.get("display_name")) or clean_username
        email = (user_info and user_info.get("email")) or None
        ad_groups = (user_info and user_info.get("groups")) or []
        ad_dn = (user_info and user_info.get("dn")) or None
        ad_guid = (user_info and user_info.get("guid")) or None

        # Validação de privilégios de superadmin via grupos do AD
        is_superadmin = False
        super_ad_groups = [g.upper().strip() for g in (config.superadmin_groups or [])]
        user_groups_upper = [g.upper().strip() for g in ad_groups]
        user_groups_norm = {normalize_ad_name(g) for g in ad_groups if g}

        for sag in super_ad_groups:
            if sag in user_groups_upper or normalize_ad_name(sag) in user_groups_norm:
                is_superadmin = True
                break

        # Sincronização Just-In-Time (JIT) com PostgreSQL
        user = db.scalar(
            select(User).where(
                User.company_id == company_id,
                User.username == clean_username,
            )
        )

        if user:
            # Atualiza dados existentes
            user.full_name = full_name or user.full_name
            if email:
                user.email = email
            user.auth_source = "ad"
            user.ad_dn = ad_dn or user.ad_dn
            user.ad_guid = ad_guid or user.ad_guid
            user.active = True
            user.is_superadmin = is_superadmin
        else:
            # Cria novo usuário provisionado via AD
            user = User(
                company_id=company_id,
                username=clean_username,
                email=email,
                full_name=full_name,
                password_hash=None,
                auth_source="ad",
                ad_dn=ad_dn,
                ad_guid=ad_guid,
                is_superadmin=is_superadmin,
                active=True,
            )
            db.add(user)
            db.flush()

            # Papel padrão se configurado
            if config.default_role_id:
                role = db.get(Role, config.default_role_id)
                if role and role not in user.roles:
                    user.roles.append(role)

        # Mapeamento dinâmico de lojas/sites baseado em group_mappings
        # Exemplo de mapping: {"loja-01-inventario": {"sites": ["01"], "role": "operator"}}
        if config.group_mappings and isinstance(config.group_mappings, dict):
            allowed_sites = set()
            mapped_roles = set()

            for grp, mapping in config.group_mappings.items():
                grp_norm = normalize_ad_name(grp)
                if grp.upper().strip() in user_groups_upper or grp_norm in user_groups_norm:
                    if isinstance(mapping, dict):
                        sites_list = mapping.get("sites", [])
                        for s in sites_list:
                            allowed_sites.add(str(s).upper().strip())
                        r = mapping.get("role")
                        if r:
                            mapped_roles.add(str(r).lower().strip())
                    elif isinstance(mapping, list):
                        for s in mapping:
                            allowed_sites.add(str(s).upper().strip())

            # Se for operador matriz, garante acesso global irrestrito a todas as lojas
            if "operador_matriz" in mapped_roles:
                allowed_sites.add("*")

            # Se o usuário não for superadmin, sincroniza as lojas permitidas
            if not is_superadmin and allowed_sites:
                db_sites = db.scalars(
                    select(Site).where(
                        Site.company_id == company_id,
                        Site.active.is_(True),
                    )
                ).all()

                # Limpa acessos existentes e aplica novos
                db.execute(
                    user_site_access.delete().where(user_site_access.c.user_id == user.id)
                )

                for site in db_sites:
                    st_code = site.code.upper().strip()
                    code_num = st_code.lstrip("0") or "0"
                    st_name = (site.name or "").upper().strip()
                    st_aliases = {
                        st_code,
                        f"LOJA-{st_code}",
                        f"LOJA-{int(code_num):02d}" if code_num.isdigit() else st_code,
                        f"LOJA {st_code}",
                        f"LOJA {int(code_num):02d}" if code_num.isdigit() else st_code,
                        f"LJ{st_code}",
                        f"LJ{int(code_num):02d}" if code_num.isdigit() else st_code,
                        f"LJ {st_code}",
                        f"L{st_code}",
                        f"L{int(code_num):02d}" if code_num.isdigit() else st_code,
                        code_num,
                        f"{int(code_num):02d}" if code_num.isdigit() else st_code,
                        str(site.id),
                        st_name,
                    }
                    if "*" in allowed_sites or any(a in allowed_sites for a in st_aliases) or any(s in st_aliases for s in allowed_sites):
                        db.execute(
                            user_site_access.insert().values(
                                user_id=user.id,
                                site_id=site.id,
                            )
                        )

            # Sincroniza perfis mapeados pelo AD
            if mapped_roles:
                managed_slugs = {"admin", "operator", "operador_matriz"}
                # Remove papéis gerenciados antigos para manter em sincronia com o AD
                user.roles = [r for r in user.roles if r.slug not in managed_slugs or r.slug in mapped_roles]
                for r_slug in mapped_roles:
                    role = db.scalar(select(Role).where(Role.slug == r_slug))
                    if role and role not in user.roles:
                        user.roles.append(role)

        db.commit()
        db.refresh(user)
        logger.info(f"Usuário do AD '{clean_username}' autenticado e sincronizado com sucesso no banco!")
        return user

    except Exception as e:
        logger.error(f"Erro na autenticação LDAP para '{clean_username}': {e}", exc_info=True)
        return None
