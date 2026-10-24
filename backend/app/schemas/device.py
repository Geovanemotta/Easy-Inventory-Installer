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
    send_operator_email: bool = Field(
        default=False,
        description="Se verdadeiro, dispara o e-mail para a operadora solicitando a reserva no Firewall",
    )
    operator_email: Optional[str] = Field(
        default=None,
        description="E-mail da operadora",
    )
    sender_email: Optional[str] = Field(
        default=None,
        description="E-mail do remetente (admin)",
    )
    circuito: Optional[str] = Field(
        default=None,
        description="Identificador do circuito da loja (ex: 'link-filial01')",
    )
    vlan_name: Optional[str] = Field(
        default=None,
        description="Nome da VLAN (ex: 'VLAN 10 - CAIXAS')",
    )


class DeviceFirewallEmailIn(BaseModel):
    operator_email: str = Field(..., description="E-mail de destino da operadora")
    sender_email: str = Field(..., description="E-mail do remetente (admin logado)")
    circuito: str = Field(..., description="Identificador do circuito da filial")
    vlan_name: str = Field(default="", description="Nome da VLAN")
    ip_address: str = Field(..., description="Endereço IP corporativo a ser reservado")
    mac_address: str = Field(..., description="Endereço MAC da estação")


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


class WorkstationUsedIp(BaseModel):
    ip: str
    device_id: int
    hostname: str
    patrimonio: str = ""
    sistema: str = ""


class SiteVlanIpRange(BaseModel):
    id: int
    name: str
    vlan_id: Optional[int] = None
    ip_start: str
    ip_end: str
    gateway: str = ""
    mask: str = ""
    free_count: int = 0
    workstations_count: int = 0
    free_ips: List[str] = Field(default_factory=list)
    workstation_used_ips: List[WorkstationUsedIp] = Field(default_factory=list)


class SiteVlanIpsResponse(BaseModel):
    site_id: int
    site_name: str = ""
    site_code: str = ""
    ranges: List[SiteVlanIpRange] = Field(default_factory=list)


class DeviceNetworkContext(BaseModel):
    resolved_site_id: Optional[int] = None
    suggested_site_id: Optional[int] = None
    suggested_site_name: str = ""
    suggested_site_code: str = ""
    matched_by: Optional[str] = None
    sites: List[SiteOption] = []
    faixas: List[SiteIpRangeOption] = []
    ips_ocupados: List[str] = []
    ip_anterior_sugerido: str = ""
    ip_confiavel: bool = False
    vlan_ranges: List[SiteVlanIpRange] = Field(default_factory=list)


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
    ip_secundario: Optional[str] = None
    ips_extras: List[str] = Field(default_factory=list)
    mac: Optional[str] = None
    sistema: Optional[str] = None
    versao: Optional[str] = None
    so_formatado: Optional[str] = None
    familia_so: Optional[str] = None
    status: Optional[str] = None
    status_operacional_label: Optional[str] = "Atualizada"
    status_operacional_nivel: Optional[str] = "ok"
    status_operacional_codigo: Optional[str] = "OK"
    alerta_hardware: Optional[str] = None
    processador: Optional[str] = None
    processador_formatado: Optional[str] = None
    ram_total: Optional[str] = None
    ram_total_formatada: Optional[str] = None
    ram_tipo: Optional[str] = None
    ram_tipo_limpo: Optional[str] = None
    disco_total: Optional[str] = None
    disco_total_formatado: Optional[str] = None
    disco_usado: Optional[str] = None
    disco_usado_formatado: Optional[str] = None
    disco_livre: Optional[str] = None
    disco_livre_formatado: Optional[str] = None
    disco_percentual: Optional[int] = None
    disco_nivel: Optional[str] = None
    disco_tipo: Optional[str] = None
    rustdesk_id: Optional[str] = None
    data_coleta: Optional[datetime] = None
    data_coleta_formatada: Optional[str] = None
    tempo_relativo_coleta: Optional[str] = None
    status_conexao: Optional[str] = None
    status_conexao_label: Optional[str] = None
    patrimonio: Optional[str] = None
    firewall_status: Optional[str] = None
    firewall_solicitado_por: Optional[str] = None
    firewall_solicitado_em: Optional[datetime] = None
    firewall_confirmado_por: Optional[str] = None
    firewall_confirmado_em: Optional[datetime] = None
    active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DeviceKPIs(BaseModel):
    total_linux: int = 0
    total_windows: int = 0
    total_alertas: int = 0
    total_inativas: int = 0
    total_firewall_pendente: int = 0
    total_bancada_88: int = 0
    total_critico_disco: int = 0
    total_sem_apps: int = 0
    total_com_apps: int = 0


class DeviceDetailResponse(DeviceListItem):
    fabricante: Optional[str] = None
    fabricante_limpo: Optional[str] = None
    modelo: Optional[str] = None
    modelo_limpo: Optional[str] = None
    modelo_formatado: Optional[str] = None
    serial: Optional[str] = None
    serial_limpo: Optional[str] = None
    dominio: Optional[str] = None
    usuario: Optional[str] = None
    build: Optional[str] = None
    ram_tipo: Optional[str] = None
    windows_release: Optional[str] = None
    windows_release_formatado: Optional[str] = None
    serial_windows: Optional[str] = None
    serial_office: Optional[str] = None
    analise_disco: Optional[Any] = None
    perifericos: Optional[Any] = None
    perifericos_agrupados: Optional[Dict[str, Any]] = None
    extra_data: Optional[Any] = None
    ip_definitivo: Optional[str] = None
    licenca_windows_solicitada: bool = False
    motivo_alteracao: Optional[str] = None
    observacao_admin: Optional[str] = None
    motivo_upgrade: Optional[str] = None
    so_anterior: Optional[str] = None
    is_rede_formatacao: bool = False
    history_count: int = 0


class DevicePagination(BaseModel):
    page: int
    per_page: int
    total: int
    total_pages: int


class DeviceSiteFilterOption(BaseModel):
    id: int
    name: str
    code: str


class DeviceFilterOptions(BaseModel):
    sites: List[DeviceSiteFilterOption] = []
    versoes: List[str] = []
    plataformas: List[str] = ["Linux", "Windows"]


class ChartSlice(BaseModel):
    label: str
    count: int
    percent: float
    color: str


class DonutChartData(BaseModel):
    title: str
    subtitle: Optional[str] = None
    total: int
    slices: List[ChartSlice] = []


class DeviceChartsSummary(BaseModel):
    plataforma: DonutChartData
    status: DonutChartData
    conectividade: Optional[DonutChartData] = None
    versoes: Optional[DonutChartData] = None


class DeviceListResponse(BaseModel):
    items: List[DeviceListItem]
    pagination: DevicePagination
    kpis: Optional[DeviceKPIs] = None
    filter_options: Optional[DeviceFilterOptions] = None
    charts_summary: Optional[DeviceChartsSummary] = None


class DeviceActionResponse(BaseModel):
    status: str = "ok"
    message: str
