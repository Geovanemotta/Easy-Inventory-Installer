from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


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


class ADConfigResponse(BaseModel):
    id: Optional[int] = None
    enabled: bool = False
    server_host: str = ""
    server_port: int = 389
    use_ssl: bool = False
    use_tls: bool = False
    domain: str = ""
    base_dn: str = ""
    bind_user: str = ""
    has_bind_password: bool = False
    user_search_filter: str = "(&(objectClass=user)(sAMAccountName={username}))"
    superadmin_groups: List[str] = Field(default_factory=list)
    group_mappings: Dict[str, Any] = Field(default_factory=dict)
    auto_sync_on_login: bool = True


class TestAuthRequest(BaseModel):
    username: str
    password: str


class ADGroupItem(BaseModel):
    name: str
    description: str = ""
    dn: str = ""


class ADGroupsResponse(BaseModel):
    groups: List[ADGroupItem] = Field(default_factory=list)
    total: int = 0


class TestConnectionResponse(BaseModel):
    success: bool
    message: str
    latency_ms: Optional[float] = None
    diagnostic: Optional[str] = None
    suggestion: Optional[str] = None
    server_info: Optional[Dict[str, Any]] = None


class TestUserResponse(BaseModel):
    authenticated: bool
    message: str
    display_name: Optional[str] = None
    email: Optional[str] = None
    groups: List[str] = Field(default_factory=list)
    would_be_superadmin: bool = False
    mapped_sites: List[str] = Field(default_factory=list)
    mapped_roles: List[str] = Field(default_factory=list)
