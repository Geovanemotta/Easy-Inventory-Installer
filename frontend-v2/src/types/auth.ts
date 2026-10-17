export interface User {
  id: number;
  username: string;
  email?: string | null;
  full_name?: string | null;
  company_id: number;
  active: boolean;
  is_superadmin: boolean;
  roles?: string[];
  has_ad_session?: boolean;
  two_factor_enabled?: boolean;
}

export interface LoginResponse {
  access_token?: string;
  token_type?: string;
  requires_2fa?: boolean;
  setup_2fa_required?: boolean;
  temp_token?: string;
  secret?: string;
  qr_code?: string;
  otpauth_url?: string;
}

export interface Verify2FAResponse {
  access_token: string;
  token_type: string;
}
