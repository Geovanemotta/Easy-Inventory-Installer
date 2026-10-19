from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


# =====================================================================
# Response Schemas para Softwares e Pacotes de um Dispositivo
# =====================================================================

class SoftwarePackageItem(BaseModel):
    """Detalhes de um pacote individual instalado associado a um software."""
    id: int
    pacote: str
    versao: Optional[str] = None
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None


class DeviceSoftwareItem(BaseModel):
    """Software registrado e instalado no dispositivo."""
    id: Optional[str] = None
    software_id: int
    identifier: str
    nome: str
    tipo: Optional[str] = None
    origem: Optional[str] = None
    installed: bool = True
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    packages: List[SoftwarePackageItem] = []
    pacotes: List[SoftwarePackageItem] = []


class DeviceSoftwareHeader(BaseModel):
    """Metadados resumidos da máquina dona dos softwares."""
    id: int
    hostname: str
    site_id: Optional[int] = None
    ip: Optional[str] = None
    mac: Optional[str] = None


class DeviceSoftwareListResponse(BaseModel):
    """Resposta consolidada da rota GET /devices/{device_id}/software."""
    device: DeviceSoftwareHeader
    software: List[DeviceSoftwareItem]
    total: int


# =====================================================================
# Schemas para Catálogo Geral de Softwares e Aplicativos (AppsPage)
# =====================================================================

class SoftwareVersionCount(BaseModel):
    versao: str
    count: int
    is_latest: bool = False
    is_outdated: bool = False


class BrowserComplianceSummary(BaseModel):
    software_id: int
    identifier: str
    software_nome: str
    total_instalacoes: int
    mais_recente: str
    total_atualizadas: int
    total_desatualizadas: int
    taxa_conformidade: float


class SoftwareCatalogItem(BaseModel):
    id: int
    identifier: str
    nome: str
    tipo: str  # 'aplicativo', 'agente', 'runtime', 'ferramenta'
    origem: Optional[str] = None
    total_instalacoes: int = 0
    percentual_parque: float = 0.0
    ultima_versao: Optional[str] = None
    versao_mais_recente: Optional[str] = None
    total_versoes: int = 0
    total_atualizadas: int = 0
    total_desatualizadas: int = 0
    taxa_conformidade: float = 100.0
    versoes: List[SoftwareVersionCount] = []


class SoftwareCatalogKPIs(BaseModel):
    total_softwares: int = 0
    total_instalacoes: int = 0
    total_maquinas_inventariadas: int = 0
    maquinas_com_apps: int = 0
    maquinas_sem_apps: int = 0
    aplicativos: int = 0
    agentes: int = 0
    runtimes: int = 0
    ferramentas: int = 0
    outros: int = 0


class SoftwareCatalogResponse(BaseModel):
    items: List[SoftwareCatalogItem]
    kpis: SoftwareCatalogKPIs
    navegadores_conformidade: List[BrowserComplianceSummary] = []
    total: int
    page: int = 1
    per_page: int = 25
    total_pages: int = 1


class SoftwareDeviceDetail(BaseModel):
    device_id: int
    hostname: str
    ip: Optional[str] = None
    mac: Optional[str] = None
    sistema: Optional[str] = None
    versao_so: Optional[str] = None
    plataforma: str = "Linux"  # "Linux" | "Windows"
    site_id: Optional[int] = None
    site_nome: Optional[str] = None
    site_codigo: Optional[str] = None
    versao_software: str = ""
    is_latest: bool = False
    status_conformidade: str = "latest"  # "latest" | "outdated" | "unknown"
    pacotes: List[SoftwarePackageItem] = []
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None


class SoftwareDevicesResponse(BaseModel):
    software: SoftwareCatalogItem
    devices: List[SoftwareDeviceDetail]
    mais_recente: Optional[str] = None
    total_atualizadas: int = 0
    total_desatualizadas: int = 0
    taxa_conformidade: float = 100.0
    total: int

