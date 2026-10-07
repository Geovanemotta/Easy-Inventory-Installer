from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class NetworkAssetBase(BaseModel):
    nome: str = Field(..., min_length=2, max_length=150, description="Nome identificador do ativo")
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


class NetworkAssetOut(NetworkAssetBase):
    id: int
    company_id: int
    site_nome: Optional[str] = None
    site_codigo: Optional[str] = None
    status_online: Optional[bool] = None
    ultimo_ping: Optional[datetime] = None
    tempo_resposta_ms: Optional[int] = None
    origem: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PingResultOut(BaseModel):
    asset_id: int
    ip: str
    online: bool
    tempo_resposta_ms: Optional[int] = None
    timestamp: datetime


class ImportResultOut(BaseModel):
    total_linhas: int
    criados: int
    atualizados: int
    ignorados: int
    erros: list[str] = []


class BulkDeleteIn(BaseModel):
    ids: list[int] = Field(..., min_length=1, description="Lista de IDs de ativos para exclusão em massa")


class ScanBatchIn(BaseModel):
    asset_ids: Optional[list[int]] = Field(default=None, description="Lista opcional de IDs de ativos para escanear especificamente")
    site_id: Optional[int] = Field(default=None, description="Filtra por loja caso asset_ids não seja informado")
