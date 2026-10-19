from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class NetworkAssetBase(BaseModel):
    nome: str = Field(..., min_length=1, max_length=150, description="Nome identificador do ativo")
    tipo: str = Field(default="Impressora", description="Tipo (Impressora, Switch, Roteador, Access Point, Servidor, Outro)")
    site_id: Optional[int] = Field(default=None, description="ID da filial/loja associada")
    ip: Optional[str] = Field(default=None, description="Endereço IPv4 do equipamento")
    mac: Optional[str] = Field(default=None, description="Endereço MAC do equipamento")
    patrimonio: Optional[str] = Field(default=None, description="Número de patrimônio ou tombamento")
    fabricante: Optional[str] = Field(default=None, description="Fabricante / Marca (ex: HP, Zebra, Cisco)")
    modelo: Optional[str] = Field(default=None, description="Modelo do equipamento")
    numero_serie: Optional[str] = Field(default=None, description="Número de série")
    localizacao: Optional[str] = Field(default=None, description="Local físico ou setor (ex: Frente de Caixa 02)")
    observacoes: Optional[str] = Field(default=None, description="Anotações e detalhes adicionais")
    serial_windows: Optional[str] = Field(default=None, description="Serial/Licença do Windows")
    serial_office: Optional[str] = Field(default=None, description="Serial/Licença do Office")


class NetworkAssetCreate(NetworkAssetBase):
    pass


class NetworkAssetUpdate(BaseModel):
    nome: Optional[str] = None
    tipo: Optional[str] = None
    site_id: Optional[int] = None
    ip: Optional[str] = None
    mac: Optional[str] = None
    patrimonio: Optional[str] = None
    fabricante: Optional[str] = None
    modelo: Optional[str] = None
    numero_serie: Optional[str] = None
    localizacao: Optional[str] = None
    observacoes: Optional[str] = None
    serial_windows: Optional[str] = None
    serial_office: Optional[str] = None


class NetworkAssetOut(NetworkAssetBase):
    id: Optional[int] = None
    company_id: int
    site_nome: Optional[str] = None
    site_codigo: Optional[str] = None
    filial_codigo: Optional[str] = None
    status_online: Optional[bool] = None
    ultimo_ping: Optional[datetime] = None
    tempo_resposta_ms: Optional[int] = None
    origem: str = "manual"
    device_id: Optional[int] = None
    faixa_nome: Optional[str] = None
    vlan: Optional[str] = None
    marca_modelo: Optional[str] = None
    sistema_operacional: Optional[str] = None
    serial_windows: Optional[str] = None
    serial_office: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NetworkAssetKPIs(BaseModel):
    total: int = 0
    online: int = 0
    offline: int = 0
    nao_testado: int = 0
    impressoras: int = 0
    switches: int = 0
    aps: int = 0
    outros: int = 0
    estacoes: int = 0
    livres: int = 0
    ativos: int = 0
    testados: int = 0
    ultimo_ping: Optional[str] = None


class NetworkAssetListResponse(BaseModel):
    items: List[NetworkAssetOut]
    total: int
    page: int
    per_page: int
    total_pages: int
    kpis: NetworkAssetKPIs


class PingResultOut(BaseModel):
    asset_id: Optional[int] = None
    ip: str
    online: bool
    status_online: Optional[bool] = None
    tempo_resposta_ms: Optional[int] = None
    timestamp: datetime
    ultimo_ping: Optional[datetime] = None


class ImportResultOut(BaseModel):
    total_linhas: int
    criados: int
    atualizados: int
    ignorados: int
    erros: List[str] = []
    conflitos_estacao: List[Dict[str, Any]] = []


class BulkDeleteIn(BaseModel):
    ids: List[int] = Field(..., min_length=1, description="Lista de IDs de ativos para exclusão em massa")


class ScanBatchIn(BaseModel):
    asset_ids: Optional[List[int]] = Field(default=None, description="Lista opcional de IDs de ativos para escanear especificamente")
    site_id: Optional[int] = Field(default=None, description="Filtra por loja caso asset_ids não seja informado")
    ips: Optional[List[str]] = Field(default=None, description="Lista opcional de IPs para ping direto")


# =========================================================
# FAIXAS DE IP / SUBNETS / VLANS POR LOJA
# =========================================================

class SiteIpRangeBase(BaseModel):
    site_id: int = Field(..., description="ID da filial/loja")
    nome: str = Field(..., min_length=2, max_length=100, description="Nome da faixa (ex: VLAN 10 - PDVs)")
    ip_inicio: str = Field(..., min_length=7, max_length=45, description="IP Inicial da faixa ou CIDR (ex: 192.168.4.1 ou 10.1.0.0/20)")
    ip_fim: Optional[str] = Field(default=None, max_length=45, description="IP Final da faixa (opcional se informada máscara/CIDR)")
    gateway: Optional[str] = Field(default=None, max_length=45, description="Gateway da sub-rede")
    mascara: Optional[str] = Field(default=None, max_length=45, description="Máscara de sub-rede (ex: 255.255.240.0 ou /20)")
    observacoes: Optional[str] = Field(default=None, max_length=255, description="Observações adicionais")


class SiteIpRangeCreate(SiteIpRangeBase):
    pass


class SiteIpRangeUpdate(BaseModel):
    site_id: Optional[int] = None
    nome: Optional[str] = None
    ip_inicio: Optional[str] = None
    ip_fim: Optional[str] = None
    gateway: Optional[str] = None
    mascara: Optional[str] = None
    observacoes: Optional[str] = None


class SiteIpRangeOut(BaseModel):
    id: int
    company_id: int
    site_id: int
    site_nome: Optional[str] = None
    site_codigo: Optional[str] = None
    nome: str
    ip_inicio: str
    ip_fim: str
    gateway: Optional[str] = None
    mascara: Optional[str] = None
    observacoes: Optional[str] = None
    total_ips: int = 0
    ips_ocupados: int = 0
    ips_livres: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SweeperStatusOut(BaseModel):
    enabled: bool
    last_run: Optional[str] = None
    last_checked_count: int = 0
    total_monitored: int = 0
    priority_site_id: Optional[int] = None


class SweeperToggleIn(BaseModel):
    enabled: Optional[bool] = None

