from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


# =====================================================================
# Request Schemas (Ingestão de Inventário pelos Agentes)
# =====================================================================

class InventoryPayloadIn(BaseModel):
    """
    Schema flexível para o payload de inventário enviado pelos agentes
    (Bash no Linux e PowerShell no Windows). Permite campos adicionais (extra='allow').
    """
    model_config = ConfigDict(extra="allow")

    hostname: str = Field(
        ...,
        description="Nome da máquina (obrigatório para identificação e deduplicação)",
    )
    ip: str = Field(
        ...,
        description="Endereço IPv4 principal reportado pelo agente",
    )
    mac: Optional[str] = Field(
        default=None,
        description="Endereço MAC da placa de rede principal",
    )
    loja: Optional[str] = Field(
        default=None,
        description="Identificação opcional da loja informada pelo agente",
    )
    sistema: Optional[str] = Field(
        default=None,
        description="Sistema operacional (ex: Windows, Linux, Zorin OS)",
    )
    versao: Optional[str] = Field(
        default=None,
        description="Versão e edição detalhada do sistema operacional",
    )
    status: Optional[str] = Field(
        default="OK",
        description="Status operacional reportado pelo script",
    )
    processador: Optional[str] = Field(
        default=None,
        description="Modelo e frequência do processador",
    )
    ram_total: Optional[str] = Field(
        default=None,
        description="Capacidade total de memória RAM (ex: 8 GB)",
    )
    disco_total: Optional[str] = Field(
        default=None,
        description="Capacidade total da unidade de disco principal",
    )
    disco_usado: Optional[str] = Field(
        default=None,
        description="Espaço em disco utilizado",
    )
    disco_livre: Optional[str] = Field(
        default=None,
        description="Espaço livre em disco",
    )
    disco_percentual: Optional[Any] = Field(
        default=None,
        description="Percentual de uso do disco",
    )
    rustdesk_id: Optional[str] = Field(
        default=None,
        description="ID do cliente RustDesk para acesso remoto",
    )


# =====================================================================
# Response Schemas (Respostas das Rotas de Inventário)
# =====================================================================

class InventoryReceiveResponse(BaseModel):
    """Resposta estruturada em formato JSON do endpoint de ingestão."""
    status: str = "ok"
    device_id: int
    hostname: str
    database: str = "saved"


class InventoryDataResponse(BaseModel):
    """Resposta da rota /inventory/data contendo todos os dispositivos visíveis."""
    items: List[Dict[str, Any]]
    total: int
    source: str = "postgresql"
    timestamp: str
