from typing import List, Optional
from pydantic import BaseModel


class SiteResponse(BaseModel):
    id: int
    company_id: int
    name: str
    code: str
    active: bool
    identifiers: List[str] = []
    devices_count: int = 0
    network_assets_count: int = 0

    class Config:
        from_attributes = True



class SiteCreate(BaseModel):
    name: str
    code: str
    active: bool = True
    identifiers: List[str] = []


class SiteUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    active: Optional[bool] = None
    identifiers: Optional[List[str]] = None


class SiteSimulationRequest(BaseModel):
    hostname: str
    loja: Optional[str] = None


class SiteSimulationResponse(BaseModel):
    matched: bool
    site_id: Optional[int] = None
    site_name: Optional[str] = None
    site_code: Optional[str] = None
    matched_by: Optional[str] = None
    details: str


class SiteReclassifyRequest(BaseModel):
    only_unassigned: bool = True
    site_id: Optional[int] = None


class ReclassifiedDeviceItem(BaseModel):
    device_id: int
    hostname: str
    old_site: Optional[str] = None
    new_site: str


class SiteReclassifyResponse(BaseModel):
    total_scanned: int
    total_reclassified: int
    changes: List[ReclassifiedDeviceItem]
