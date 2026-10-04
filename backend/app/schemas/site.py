from pydantic import BaseModel


class SiteResponse(BaseModel):
    id: int
    company_id: int
    name: str
    code: str
    active: bool
