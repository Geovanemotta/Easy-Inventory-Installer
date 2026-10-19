from typing import List, Optional
from pydantic import BaseModel, Field


# =====================================================================
# Response Schemas para Métricas e Resumo do Dashboard
# =====================================================================

class DashboardDevicesMetrics(BaseModel):
    """Contagem geral de dispositivos computacionais."""
    total: int = 0
    active: int = 0


class DashboardSitesMetrics(BaseModel):
    """Contagem de filiais/lojas visíveis para o usuário."""
    total: int = 0


class DashboardSoftwareMetrics(BaseModel):
    """Contagem de softwares distintos inventariados."""
    total: int = 0


class DashboardDevicesBySite(BaseModel):
    """Estatística de máquinas agrupadas por filial."""
    site_id: Optional[int] = None
    site: Optional[str] = None
    code: Optional[str] = None
    total: int = 0


class DashboardDevicesByVersion(BaseModel):
    """Estatística de máquinas agrupadas por versão do SO."""
    versao: str = "Não informado"
    total: int = 0


class DashboardDevicesByStatus(BaseModel):
    """Estatística de máquinas agrupadas por status de integridade."""
    status: str = "Não informado"
    total: int = 0


class DashboardSummaryResponse(BaseModel):
    """Resposta consolidada da rota GET /dashboard/summary."""
    devices: DashboardDevicesMetrics
    sites: DashboardSitesMetrics
    software: DashboardSoftwareMetrics
    devices_by_site: List[DashboardDevicesBySite]
    devices_by_version: List[DashboardDevicesByVersion]
    devices_by_status: List[DashboardDevicesByStatus]


# =====================================================================
# Response Schemas para Relatórios Analíticos (/dashboard/reports)
# =====================================================================

class ReportGroupItem(BaseModel):
    chave: str
    total: int
    percentual: float


class ReportMachineItem(BaseModel):
    id: int
    hostname: str
    ip: Optional[str] = None
    so: str
    versao_so: Optional[str] = None
    site_id: Optional[int] = None
    filial: str
    valor_campo: str
    rustdesk_id: Optional[str] = None
    status: Optional[str] = None
    data_coleta: Optional[str] = None


class ReportSummaryResponse(BaseModel):
    campo: str
    nome_campo: str
    total_maquinas: int
    total_grupos: int
    grupos: List[ReportGroupItem]
    maquinas: List[ReportMachineItem]
    page: int = 1
    per_page: int = 50
    total_pages: int = 1
    maquinas_total: int = 0


# =====================================================================
# Response Schemas para Gráficos de Distribuição (/dashboard/charts)
# =====================================================================

class ChartSliceItem(BaseModel):
    label: str
    total: int
    percentual: float
    color: str


class DashboardChartsResponse(BaseModel):
    total_maquinas: int
    sistema_operacional: List[ChartSliceItem]
    memoria_ram: List[ChartSliceItem]
    tipo_ram: List[ChartSliceItem]
    tipo_disco: List[ChartSliceItem]
    status_coleta: List[ChartSliceItem]
    filiais: List[ChartSliceItem]

