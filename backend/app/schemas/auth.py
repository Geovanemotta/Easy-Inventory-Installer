from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str | None = None
    token_type: str | None = None
    requires_2fa: bool = False
    setup_2fa_required: bool = False
    temp_token: str | None = None
    secret: str | None = None
    qr_code: str | None = None
    otpauth_url: str | None = None


class Verify2FARequest(BaseModel):
    temp_token: str
    code: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str | None
    full_name: str
    company_id: int
    is_superadmin: bool
    roles: list[str] = []
    has_ad_session: bool = False
    two_factor_enabled: bool = False
