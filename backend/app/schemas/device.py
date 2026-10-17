from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# =====================================================================
# Request Schemas (Entradas das Rotas de Dispositivos)
# =====================================================================

class DevicePatrimonioIn(BaseModel):
    patrimonio: str = Field(
        ...,
        description="Código de patrimônio do equipamento (ex: pat.35192 ou 35192)",
    )


class DeviceFirewallSolicitarIn(BaseModel):
    patrimonio: Optional[str] = Field(
        default=None,
        description="Patrimônio informado ou atualizado no momento da solicitação de liberação",
    )


class DeviceSolicitarRecadastroIn(BaseModel):
    patrimonio: str = Field(
        ...,
        description="Código de patrimônio informado para o recadastro",
    )
    confirmacao_mudanca_so: bool = Field(
        default=False,
        description="Confirmação explícita em caso de divergência de família de SO",
    )
    licenca_windows_solicitada: bool = Field(
        default=False,
        description="Indica se é necessária uma nova licença Windows",
    )
    motivo: Optional[str] = Field(
        default=None,
        description="Motivo ou justificativa da alteração/recadastro",
    )


class DeviceAprovarCadastroIn(BaseModel):
    site_id: int = Field(
        ...,
        description="ID da loja/filial definitiva do equipamento",
    )
    ip_definitivo: str = Field(
        ...,
        description="Endereço IP corporativo definitivo fixado na loja",
    )
    vincular_ativo_existente_id: Optional[int] = Field(
        default=None,
        description="ID da estação anterior em Device a ser substituída",
    )
    vincular_network_asset_id: Optional[int] = Field(
        default=None,
        description="ID do ativo em NetworkAsset a ser sincronizado",
    )
    patrimonio: Optional[str] = Field(
        default=None,
        description="Patrimônio ajustado pelo administrador, se necessário",
    )
    observacao_admin: Optional[str] = Field(
        default=None,
        description="Observações administrativas sobre a homologação",
    )
    confirmar_sobrescrita_ip: bool = Field(
        default=False,
        description="Força a atribuição do IP mesmo se já estiver em uso por outro ativo",
    )


class DeviceRejeitarCadastroIn(BaseModel):
    motivo: str = Field(
        ...,
        description="Justificativa obrigatória da rejeição do cadastro",
    )


# =====================================================================
# Response Schemas (Modelos de Dados de Resposta e Estruturas Auxiliares)
# =====================================================================

class DeviceConflictItem(BaseModel):
    id: int
    tipo_registro: str
    hostname: Optional[str] = None
    ip: Optional[str] = None
    mac: Optional[str] = None
    loja: Optional[str] = None
    site_id: Optional[int] = None


class DeviceExistingAsset(BaseModel):
    id: Optional[int] = None
    tipo_origem: str
    linked_device_id: Optional[int] = None
    linked_network_asset_id: Optional[int] = None
    hostname: Optional[str] = ""
    loja: Optional[str] = ""
    site_id: Optional[int] = None
    ip: Optional[str] = ""
    mac: Optional[str] = ""
    sistema: Optional[str] = ""
    versao: Optional[str] = ""
    patrimonio: Optional[str] = ""
    familia_so: Optional[str] = ""
    origem: Optional[str] = "estacao"


class DeviceComparativo(BaseModel):
    so_divergente: bool = False
    so_anterior: str = ""
    so_atual: str = ""
    familia_anterior: str = ""
    familia_atual: str = ""
    mac_divergente: bool = False
    mac_anterior: str = ""
    mac_atual: str = ""
    host_divergente: bool = False
    host_anterior: str = ""
    host_atual: str = ""
    ip_anterior: str = ""
    parece_mesmo_equipamento: bool = True


class DeviceLookupResponse(BaseModel):
    exists: bool
    patrimonio_formatado: str = ""
    message: Optional[str] = None
    tipo_origem: Optional[str] = None
    linked_device_id: Optional[int] = None
    linked_network_asset_id: Optional[int] = None
    tem_conflito: bool = False
    conflitos: List[DeviceConflictItem] = []
    existing_device: Optional[DeviceExistingAsset] = None
    comparativo: Optional[DeviceComparativo] = None


class SiteOption(BaseModel):
    id: int
    name: str
    code: str


class SiteIpRangeOption(BaseModel):
    id: int
    nome: str
    ip_inicio: str
    ip_fim: str
    gateway: str = ""
    mascara: str = ""


class DeviceNetworkContext(BaseModel):
    resolved_site_id: Optional[int] = None
    sites: List[SiteOption] = []
    faixas: List[SiteIpRangeOption] = []
    ips_ocupados: List[str] = []
    ip_anterior_sugerido: str = ""
    ip_confiavel: bool = False


class DeviceDetailContext(BaseModel):
    id: int
    hostname: str
    ip: str = ""
    ip_definitivo: str = ""
    mac: str = ""
    sistema: str = ""
    versao: str = ""
    loja: str = ""
    site_id: Optional[int] = None
    patrimonio: str = ""
    firewall_status: str = "pendente"
    firewall_solicitado_por: str = ""
    firewall_solicitado_em: str = ""
    licenca_windows_solicitada: bool = False
    motivo_alteracao: str = ""
    so_anterior: str = ""
    is_rede_formatacao: bool = False


class DivergenciaItem(BaseModel):
    campo: str
    anterior: str
    atual: str


class DeviceApprovalContextResponse(BaseModel):
    device: DeviceDetailContext
    existing_asset: Optional[Dict[str, Any]] = None
    tem_conflito: bool = False
    conflitos: List[DeviceConflictItem] = []
    divergencias: List[DivergenciaItem] = []
    so_divergente: bool = False
    network_context: DeviceNetworkContext


class DeviceHistoryItem(BaseModel):
    id: int
    campo: str
    valor_anterior: Optional[str] = None
    valor_novo: Optional[str] = None
    data_alteracao: str = ""


class DeviceListItem(BaseModel):
    id: int
    company_id: int
    site_id: Optional[int] = None
    hostname: str
    loja: Optional[str] = None
    ip: Optional[str] = None
    mac: Optional[str] = None
    sistema: Optional[str] = None
    versao: Optional[str] = None
    status: Optional[str] = None
    processador: Optional[str] = None
    ram_total: Optional[str] = None
    disco_total: Optional[str] = None
    disco_usado: Optional[str] = None
    disco_livre: Optional[str] = None
    disco_percentual: Optional[int] = None
    rustdesk_id: Optional[str] = None
    data_coleta: Optional[datetime] = None
    patrimonio: Optional[str] = None
    firewall_status: Optional[str] = None
    firewall_solicitado_por: Optional[str] = None
    firewall_solicitado_em: Optional[datetime] = None
    firewall_confirmado_por: Optional[str] = None
    firewall_confirmado_em: Optional[datetime] = None
    active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DevicePagination(BaseModel):
    page: int
    per_page: int
    total: int
    total_pages: int


class DeviceListResponse(BaseModel):
    items: List[DeviceListItem]
    pagination: DevicePagination


class DeviceActionResponse(BaseModel):
    status: str = "ok"
    message: str
