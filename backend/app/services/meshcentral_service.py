import json
import logging
import os
from pathlib import Path
from typing import List, Optional

from ldap3 import ALL, Connection, Server

from app.models.ad_config import ADConfig

logger = logging.getLogger("giassi_app.meshcentral")

MESHCENTRAL_CONFIG_PATHS = [
    Path("/app/meshcentral/config.json"),
    Path(__file__).resolve().parents[3] / "meshcentral" / "config.json",
]


def get_meshcentral_config_file() -> Optional[Path]:
    for p in MESHCENTRAL_CONFIG_PATHS:
        if p.exists():
            return p
    return None


def resolve_group_dns_in_ad(
    server_host: str,
    server_port: int,
    bind_user: Optional[str],
    bind_password: Optional[str],
    base_dn: str,
    group_names: List[str],
    use_ssl: bool = False,
) -> List[str]:
    """Consulta o Active Directory para encontrar os Distinguished Names (DNs) completos dos grupos informados."""
    if not group_names or not bind_user or not bind_password or not server_host or not base_dn:
        return group_names

    resolved_dns = []
    try:
        server = Server(server_host, port=server_port, use_ssl=use_ssl, get_info=ALL, connect_timeout=4.0)
        conn = Connection(server, user=bind_user, password=bind_password, auto_bind=True)

        for gname in group_names:
            gname_clean = gname.strip()
            if not gname_clean:
                continue

            # Se já for um Distinguished Name completo (começa com CN=)
            if gname_clean.upper().startswith("CN="):
                resolved_dns.append(gname_clean)
                continue

            # Busca no AD por cn exato do grupo
            search_filter = f"(&(objectClass=group)(cn={gname_clean}))"
            conn.search(base_dn, search_filter, attributes=["distinguishedName"])
            if conn.entries:
                resolved_dns.append(str(conn.entries[0].entry_dn))
            else:
                # Fallback: inclui o nome original se não encontrado de imediato
                resolved_dns.append(gname_clean)

        conn.unbind()
    except Exception as e:
        logger.warning(f"Não foi possível consultar DNs de grupos no AD ({e}). Usando nomes informados.")
        return group_names

    return resolved_dns


def sync_meshcentral_ad_config(ad_config: ADConfig) -> bool:
    """
    Sincroniza automaticamente as configurações e grupos do Active Directory
    com o arquivo config.json do servidor MeshCentral.
    """
    cfg_file = get_meshcentral_config_file()
    if not cfg_file:
        logger.warning("Arquivo meshcentral/config.json não localizado para sincronização.")
        return False

    try:
        with open(cfg_file, "r", encoding="utf-8") as f:
            mesh_data = json.load(f)

        if "domains" not in mesh_data or "" not in mesh_data["domains"]:
            logger.warning("Estrutura de domains não encontrada no config.json do MeshCentral.")
            return False

        domain_default = mesh_data["domains"][""]

        # Sincroniza SERVER_HOST e portas dinâmicas se configurados no ambiente (.env)
        server_env = os.getenv("SERVER_HOST", "").strip()
        port_mesh = os.getenv("PORT_MESHCENTRAL", "4443").strip()
        if server_env:
            current_certs = [x.strip() for x in mesh_data.get("settings", {}).get("cert", "").split(",") if x.strip()]
            if server_env not in current_certs:
                current_certs.insert(0, server_env)
            for default_host in ["localhost", "127.0.0.1"]:
                if default_host not in current_certs:
                    current_certs.append(default_host)
            mesh_data.setdefault("settings", {})["cert"] = ",".join(current_certs)
            mesh_data.setdefault("settings", {})["ignoreAgentHashCheck"] = True
            domain_default["certUrl"] = f"https://{server_env}:{port_mesh}/"
            domain_default["ignoreAgentHashCheck"] = True
            domain_default["force2factor"] = True
            if "local" in mesh_data.get("domains", {}):
                mesh_data["domains"]["local"]["certUrl"] = f"https://{server_env}:{port_mesh}/local"

        if not ad_config.enabled or not ad_config.server_host.strip():
            # Se o AD estiver desativado no inventário, remove a autenticação forçada no MeshCentral
            domain_default.pop("auth", None)
            domain_default.pop("LDAPOptions", None)
            domain_default.pop("LDAPSiteAdminGroups", None)
            domain_default.pop("LDAPUserRequiredGroupMembership", None)
            domain_default["newAccounts"] = True
        else:
            # Em modo LDAP, o domínio 'local' permite login de administradores locais sem registro anônimo
            if "local" in mesh_data.get("domains", {}):
                mesh_data["domains"]["local"]["newAccounts"] = False
            # 1. Identifica os grupos de Superadmin
            super_groups = [g.strip() for g in (ad_config.superadmin_groups or []) if g.strip()]

            # 2. Identifica os grupos mapeados para 'operador_matriz' e 'admin'
            operador_groups = []
            if ad_config.group_mappings and isinstance(ad_config.group_mappings, dict):
                for grp_name, mapping in ad_config.group_mappings.items():
                    if isinstance(mapping, dict):
                        role_slug = str(mapping.get("role", "")).lower().strip()
                        if role_slug in ("operador_matriz", "admin", "remote_access"):
                            operador_groups.append(grp_name.strip())

            # 3. Resolve os DNs oficiais no Active Directory
            server_host = ad_config.server_host.strip()
            server_port = ad_config.server_port or 389
            bind_user = ad_config.bind_user.strip() if ad_config.bind_user else None
            bind_password = ad_config.bind_password
            base_dn = ad_config.base_dn.strip()

            all_groups = list(set(super_groups + operador_groups))
            resolved_dns = resolve_group_dns_in_ad(
                server_host=server_host,
                server_port=server_port,
                bind_user=bind_user,
                bind_password=bind_password,
                base_dn=base_dn,
                group_names=all_groups,
                use_ssl=ad_config.use_ssl,
            )

            # Separa os DNs resolvidos entre Administradores e Operadores
            admin_dns = [dn for dn in resolved_dns if any(sg.upper() in dn.upper() for sg in super_groups)]
            required_login_dns = resolved_dns if resolved_dns else all_groups

            # 4. Formata o filtro de busca no formato esperado pelo MeshCentral
            filter_mesh = "(&(objectClass=user)(sAMAccountName={{username}}))"

            # 5. Aplica a configuração LDAP no MeshCentral
            domain_default["auth"] = "ldap"
            proto = "ldaps" if ad_config.use_ssl else "ldap"
            ldap_options = {
                "url": f"{proto}://{server_host}:{server_port}",
                "bindDN": bind_user or "",
                "bindCredentials": bind_password or "",
                "searchBase": base_dn,
                "searchFilter": filter_mesh,
            }
            if ad_config.use_ssl:
                ldap_options["tlsOptions"] = {
                    "rejectUnauthorized": False
                }
            domain_default["LDAPOptions"] = ldap_options
            domain_default["LDAPUserKey"] = "sAMAccountName"
            domain_default["LDAPUserName"] = "displayName"
            domain_default["LDAPUserEmail"] = "mail"
            domain_default["LDAPUserGroups"] = "memberOf"
            domain_default["LDAPSiteAdminGroups"] = admin_dns
            domain_default["LDAPUserRequiredGroupMembership"] = required_login_dns

        with open(cfg_file, "w", encoding="utf-8") as f:
            json.dump(mesh_data, f, indent=2, ensure_ascii=False)

        logger.info(f"Sincronização do AD com MeshCentral aplicada com sucesso em {cfg_file}!")
        return True
    except Exception as ex:
        logger.error(f"Erro ao sincronizar AD com MeshCentral: {ex}", exc_info=True)
        return False


def reset_meshcentral_user_2fa(username: str) -> bool:
    """
    Remove as credenciais e chaves de 2FA do usuário no banco NeDB do MeshCentral,
    permitindo que ele vincule um novo celular/dispositivo no próximo login.
    """
    if not username:
        return False
    try:
        import subprocess
        cmd = ["docker", "exec", "giassi-meshcentral", "node", "/opt/meshcentral/reset_2fa.js", username.strip()]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        logger.info(f"Reset de 2FA MeshCentral ({username}): {res.stdout.strip()}")
        return res.returncode == 0
    except Exception as e:
        logger.warning(f"Não foi possível resetar 2FA no container giassi-meshcentral ({e})")
        return False
