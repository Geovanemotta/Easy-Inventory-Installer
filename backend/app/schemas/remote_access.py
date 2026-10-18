from typing import Optional
from pydantic import BaseModel, Field


class RemoteAccessFeatures(BaseModel):
    desktop_sharing: bool = True
    file_transfer: bool = True
    uac_support: bool = True
    unlimited_concurrent: bool = True


class RemoteAccessUser(BaseModel):
    username: str
    full_name: Optional[str] = None
    is_admin: bool = False


class RemoteAccessConfigResponse(BaseModel):
    enabled: bool = True
    mesh_port: int = 4443
    mesh_url: str
    server_host: str
    features: RemoteAccessFeatures
    user: RemoteAccessUser
