from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class LicenseBase(BaseModel):
    site_id: Optional[int] = None
    categoria: str = Field(default="windows", description="windows | office | outro")
    software_nome: str = Field(..., min_length=2, max_length=150)
    chave: str = Field(..., min_length=5, max_length=100)
    tipo_licenca: Optional[str] = "OEM"
    nota_fiscal: Optional[str] = None
    quantidade_total: int = Field(default=1, ge=1)
    observacoes: Optional[str] = None
    data_aquisicao: Optional[datetime] = None


class LicenseCreate(LicenseBase):
    pass


class LicenseUpdate(BaseModel):
    site_id: Optional[int] = None
    categoria: Optional[str] = None
    software_nome: Optional[str] = None
    chave: Optional[str] = None
    tipo_licenca: Optional[str] = None
    nota_fiscal: Optional[str] = None
    quantidade_total: Optional[int] = Field(default=None, ge=1)
    observacoes: Optional[str] = None
    data_aquisicao: Optional[datetime] = None


class LicenseOut(LicenseBase):
    id: int
    company_id: int
    site_nome: Optional[str] = None
    site_codigo: Optional[str] = None
    quantidade_em_uso: int = 0
    quantidade_disponivel: int = 0
    esgotada: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LicenseAvailableOut(BaseModel):
    id: int
    chave: str
    software_nome: str
    categoria: str
    tipo_licenca: Optional[str] = None
    nota_fiscal: Optional[str] = None
    site_id: Optional[int] = None
    site_nome: Optional[str] = None
    quantidade_total: int
    quantidade_em_uso: int
    quantidade_disponivel: int
    esgotada: bool


class LicenseDeviceItem(BaseModel):
    id: int
    hostname: str
    tipo: str
    ip: Optional[str] = None
    site_nome: Optional[str] = None
    site_codigo: Optional[str] = None
    patrimonio: Optional[str] = None
    slot: str  # 'windows' | 'office'
    origem: str  # 'estacao' | 'ativo'
    data_coleta: Optional[datetime] = None


class LicenseStatsOut(BaseModel):
    total_licencas: int
    total_em_uso: int
    total_disponiveis: int
    total_esgotadas: int
    por_categoria: Dict[str, Dict[str, int]]
    por_filial: List[Dict[str, Any]]


class LicenseAssignIn(BaseModel):
    device_id: Optional[int] = None
    network_asset_id: Optional[int] = None
    slot: str = Field(..., description="windows | office")
    chave: Optional[str] = Field(default=None, description="Chave da licença ou vazio para desvincular")
