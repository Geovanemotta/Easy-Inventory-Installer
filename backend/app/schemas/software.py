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
    software_id: int
    identifier: str
    nome: str
    tipo: Optional[str] = None
    origem: Optional[str] = None
    installed: bool = True
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    packages: List[SoftwarePackageItem] = []


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
