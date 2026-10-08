from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.database import engine
from app.models.ad_config import ADConfig
from app.models.site import Site
from app.models.user import User
from app.services.ldap_service import (
    test_ldap_connection,
    search_user_in_ad,
    normalize_ad_name,
    get_site_aliases,
)
from ldap3 import ALL, Connection, Server
from ldap3.core.exceptions import LDAPInvalidCredentialsResult, LDAPInvalidFilterError
from ldap3.operation.search import parse_filter

router = APIRouter(
    prefix="/ad",
    tags=["Active Directory"],
)


class ADConfigSchema(BaseModel):
    enabled: bool = False
    server_host: str = Field(default="", description="IP ou FQDN do Domain Controller")
    server_port: int = Field(default=389, description="Porta LDAP (389) ou LDAPS (636)")
    use_ssl: bool = False
    use_tls: bool = False
    domain: str = Field(default="", description="Domínio AD (ex: empresa.com.br ou EMPRESA)")
    base_dn: str = Field(default="", description="Base DN de pesquisa (ex: DC=empresa,DC=corp)")
    bind_user: Optional[str] = Field(default=None, description="Usuário de serviço (ex: svc-inventario@empresa.com.br)")
    bind_password: Optional[str] = Field(default=None, description="Senha da conta de serviço")
    user_search_filter: str = Field(
        default="(&(objectClass=user)(sAMAccountName={username}))",
        description="Filtro de busca de usuário no AD",
    )
    superadmin_groups: List[str] = Field(default_factory=list, description="Grupos do AD com acesso de superadmin")
    group_mappings: Dict[str, Any] = Field(default_factory=dict, description="Mapeamento de grupos para lojas/permissões")
    auto_sync_on_login: bool = True


class TestAuthRequest(BaseModel):
    username: str
    password: str


@router.get("/config")
def get_ad_config(
    current_user: User = Depends(get_current_user),
):
    """Retorna a configuração do Active Directory para a empresa."""
    with Session(engine) as session:
        cfg = session.scalar(
            select(ADConfig).where(ADConfig.company_id == current_user.company_id)
        )

        if not cfg:
            return {
                "enabled": False,
                "server_host": "",
                "server_port": 389,
                "use_ssl": False,
                "use_tls": False,
                "domain": "",
                "base_dn": "",
                "bind_user": "",
                "has_bind_password": False,
                "user_search_filter": "(&(objectClass=user)(sAMAccountName={username}))",
                "superadmin_groups": ["Domain Admins"],
                "group_mappings": {},
                "auto_sync_on_login": True,
            }

        return {
            "id": cfg.id,
            "enabled": cfg.enabled,
            "server_host": cfg.server_host,
            "server_port": cfg.server_port,
            "use_ssl": cfg.use_ssl,
            "use_tls": cfg.use_tls,
            "domain": cfg.domain,
            "base_dn": cfg.base_dn,
            "bind_user": cfg.bind_user or "",
            "has_bind_password": bool(cfg.bind_password),
            "user_search_filter": cfg.user_search_filter,
            "superadmin_groups": cfg.superadmin_groups or [],
            "group_mappings": cfg.group_mappings or {},
            "auto_sync_on_login": cfg.auto_sync_on_login,
        }


@router.get("/groups")
def list_ad_groups(
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    """
    Consulta dinamicamente os grupos de segurança existentes no Active Directory
    para facilitar o mapeamento com lojas e perfis.
    """
    if not current_user.is_superadmin:
        raise HTTPException(status_code=403, detail="Acesso restrito.")

    with Session(engine) as session:
        cfg = session.scalar(
            select(ADConfig).where(ADConfig.company_id == current_user.company_id)
        )
        if not cfg or not cfg.server_host:
            return {"groups": [], "total": 0}

        try:
            server = Server(
                cfg.server_host,
                port=cfg.server_port,
                use_ssl=cfg.use_ssl,
                connect_timeout=4,
            )

            s_bind = cfg.bind_user
            if s_bind and "@" not in s_bind and "\\" not in s_bind and cfg.domain and not s_bind.upper().startswith("CN="):
                s_bind = f"{s_bind}@{cfg.domain}"

            conn = Connection(
                server,
                user=s_bind,
                password=cfg.bind_password,
                auto_bind=True,
                auto_referrals=False,
            )

            search_filter = "(objectClass=group)"
            if search and search.strip():
                clean_term = search.strip().replace("*", "")
                search_filter = f"(&(objectClass=group)(cn=*{clean_term}*))"

            conn.search(
                search_base=cfg.base_dn,
                search_filter=search_filter,
                attributes=["cn", "sAMAccountName", "description", "distinguishedName"],
                size_limit=150,
            )

            groups = []
            for entry in conn.entries:
                name = str(getattr(entry, "cn", "") or getattr(entry, "sAMAccountName", ""))
                desc = str(getattr(entry, "description", "") or "")
                dn = str(entry.entry_dn)
                if name:
                    groups.append({
                        "name": name,
                        "description": desc,
                        "dn": dn,
                    })

            conn.unbind()
            groups.sort(key=lambda x: x["name"].lower())
            return {"groups": groups, "total": len(groups)}

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Não foi possível consultar os grupos do Active Directory: {e}",
            )


@router.post("/config")
def save_ad_config(
    data: ADConfigSchema,
    current_user: User = Depends(get_current_user),
):
    """Salva ou atualiza a configuração do Active Directory (Requer superadmin)."""
    if not current_user.is_superadmin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem configurar o Active Directory.")

    with Session(engine) as session:
        cfg = session.scalar(
            select(ADConfig).where(ADConfig.company_id == current_user.company_id)
        )

        if not cfg:
            cfg = ADConfig(company_id=current_user.company_id)
            session.add(cfg)

        cfg.enabled = data.enabled
        cfg.server_host = data.server_host.strip()
        cfg.server_port = data.server_port
        cfg.use_ssl = data.use_ssl
        cfg.use_tls = data.use_tls
        cfg.domain = data.domain.strip()
        cfg.base_dn = data.base_dn.strip()
        cfg.bind_user = data.bind_user.strip() if data.bind_user else None

        # Só atualiza a senha se foi enviada uma nova
        if data.bind_password and data.bind_password != "******":
            cfg.bind_password = data.bind_password

        filter_val = data.user_search_filter.strip() if data.user_search_filter else "(&(objectClass=user)(sAMAccountName={username}))"
        if "{username}" not in filter_val:
            raise HTTPException(status_code=400, detail="O filtro LDAP precisa conter a tag {username} para busca do usuário.")
        try:
            parse_filter(filter_val.replace("{username}", "testuser"), None, False, False, None, False)
        except LDAPInvalidFilterError as e:
            raise HTTPException(status_code=400, detail=f"Sintaxe do filtro LDAP inválida: {e}")
        except Exception:
            pass

        cfg.user_search_filter = filter_val
        cfg.superadmin_groups = [g.strip() for g in data.superadmin_groups if g.strip()]
        cfg.group_mappings = data.group_mappings
        cfg.auto_sync_on_login = data.auto_sync_on_login

        session.commit()

        return {
            "status": "success",
            "message": "Configurações do Active Directory salvas com sucesso!",
            "enabled": cfg.enabled,
        }


@router.post("/test")
def test_connection(
    data: Optional[ADConfigSchema] = None,
    current_user: User = Depends(get_current_user),
):
    """
    Testa a conectividade com o servidor do Active Directory (TCP + Bind LDAP)
    utilizando os parâmetros fornecidos ou os salvos no banco.
    """
    if not current_user.is_superadmin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem testar a conexão do AD.")

    with Session(engine) as session:
        cfg = session.scalar(
            select(ADConfig).where(ADConfig.company_id == current_user.company_id)
        )

        # Monta dict de teste
        test_dict: Dict[str, Any] = {}
        if data and data.server_host:
            test_dict = data.model_dump()
            # Se senha for mascara, recupera do banco
            if test_dict.get("bind_password") in (None, "", "******") and cfg and cfg.bind_password:
                test_dict["bind_password"] = cfg.bind_password
        elif cfg:
            test_dict = {
                "server_host": cfg.server_host,
                "server_port": cfg.server_port,
                "use_ssl": cfg.use_ssl,
                "use_tls": cfg.use_tls,
                "domain": cfg.domain,
                "base_dn": cfg.base_dn,
                "bind_user": cfg.bind_user,
                "bind_password": cfg.bind_password,
            }
        else:
            raise HTTPException(status_code=400, detail="Nenhum parâmetro de servidor fornecido para teste.")

        result = test_ldap_connection(test_dict)
        return result


@router.post("/test-user")
def test_user_authentication(
    data: TestAuthRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Valida as credenciais de um usuário específico diretamente no AD
    e lista seus grupos para diagnóstico de permissões.
    """
    if not current_user.is_superadmin:
        raise HTTPException(status_code=403, detail="Acesso restrito.")

    with Session(engine) as session:
        cfg = session.scalar(
            select(ADConfig).where(ADConfig.company_id == current_user.company_id)
        )
        if not cfg or not cfg.server_host:
            raise HTTPException(status_code=400, detail="Active Directory não configurado.")

        clean_user = data.username.strip()
        if "\\" in clean_user:
            clean_user = clean_user.split("\\", 1)[1]
        elif "@" in clean_user:
            clean_user = clean_user.split("@", 1)[0]

        try:
            server = Server(
                cfg.server_host,
                port=cfg.server_port,
                use_ssl=cfg.use_ssl,
                connect_timeout=5,
            )

            # Se tiver conta de serviço, busca os dados
            user_info = None
            if cfg.bind_user and cfg.bind_password:
                s_bind = cfg.bind_user
                if s_bind and "@" not in s_bind and "\\" not in s_bind and cfg.domain and not s_bind.upper().startswith("CN="):
                    s_bind = f"{s_bind}@{cfg.domain}"

                conn = Connection(server, user=s_bind, password=cfg.bind_password, auto_bind=True, auto_referrals=False)
                user_info = search_user_in_ad(conn, cfg.base_dn, cfg.user_search_filter, clean_user)
                conn.unbind()

                if not user_info:
                    return {
                        "authenticated": False,
                        "message": f"Usuário '{clean_user}' não foi encontrado no Base DN com o filtro especificado.",
                    }

                # Testa bind do usuário
                uconn = Connection(server, user=user_info["dn"], password=data.password, auto_bind=False, auto_referrals=False)
                auth_ok = uconn.bind()
                uconn.unbind()
            else:
                u_bind = f"{clean_user}@{cfg.domain}" if cfg.domain else clean_user
                uconn = Connection(server, user=u_bind, password=data.password, auto_bind=False, auto_referrals=False)
                auth_ok = uconn.bind()
                if auth_ok and cfg.base_dn:
                    user_info = search_user_in_ad(uconn, cfg.base_dn, cfg.user_search_filter, clean_user)
                uconn.unbind()

            if not auth_ok:
                return {
                    "authenticated": False,
                    "message": "Credenciais inválidas no Active Directory.",
                }

            groups = (user_info and user_info.get("groups")) or []
            user_groups_upper = [g.upper().strip() for g in groups]
            user_groups_norm = {normalize_ad_name(g) for g in groups if g}
            super_groups = [g.upper().strip() for g in (cfg.superadmin_groups or [])]
            is_super = any(g in super_groups or normalize_ad_name(g) in {normalize_ad_name(sg) for sg in super_groups} for g in groups)

            mapped_site_names = []
            mapped_roles = []
            if is_super:
                mapped_site_names = ["Todas as Lojas (Acesso Global de Superadministrador)"]
                mapped_roles = ["superadmin"]
            elif cfg.group_mappings and isinstance(cfg.group_mappings, dict):
                allowed_site_keys = set()
                for grp, mapping in cfg.group_mappings.items():
                    norm_grp = normalize_ad_name(grp)
                    if grp.upper().strip() in user_groups_upper or norm_grp in user_groups_norm:
                        if isinstance(mapping, dict):
                            r = mapping.get("role")
                            if r:
                                mapped_roles.append(str(r))
                            for s in mapping.get("sites", []):
                                allowed_site_keys.add(str(s).upper().strip())
                        elif isinstance(mapping, list):
                            for s in mapping:
                                allowed_site_keys.add(str(s).upper().strip())

                if "operador_matriz" in mapped_roles:
                    mapped_site_names = ["Todas as Lojas (Acesso Global - Operador Matriz)"]
                elif allowed_site_keys:
                    db_sites = session.scalars(
                        select(Site).where(
                            Site.company_id == current_user.company_id,
                            Site.active.is_(True),
                        )
                    ).all()
                    for site in db_sites:
                        st_aliases = get_site_aliases(site)
                        if "*" in allowed_site_keys or bool(allowed_site_keys & st_aliases):
                            mapped_site_names.append(f"{site.name} ({site.code})")

            return {
                "authenticated": True,
                "message": f"Usuário '{clean_user}' autenticado com sucesso no AD!",
                "display_name": user_info.get("display_name") if user_info else clean_user,
                "email": user_info.get("email") if user_info else "",
                "groups": groups,
                "would_be_superadmin": is_super,
                "mapped_sites": mapped_site_names,
                "mapped_roles": mapped_roles,
            }

        except LDAPInvalidFilterError as e:
            return {
                "authenticated": False,
                "message": f"Filtro LDAP de usuário com erro de sintaxe: {e}. Verifique o campo 'Filtro LDAP de usuário' nas configurações.",
            }
        except LDAPInvalidCredentialsResult:
            return {
                "authenticated": False,
                "message": "Credenciais da conta de serviço (Bind User/Password) inválidas no AD.",
            }
        except Exception as e:
            return {
                "authenticated": False,
                "message": f"Erro ao comunicar com o AD: {e}",
            }
