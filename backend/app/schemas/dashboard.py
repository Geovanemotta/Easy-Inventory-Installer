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
