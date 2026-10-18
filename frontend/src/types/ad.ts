export interface ADConfig {
  id?: number
  enabled: boolean
  server_host: string
  server_port: number
  use_ssl: boolean
  use_tls: boolean
  domain: string
  base_dn: string
  bind_user?: string | null
  bind_password?: string | null
  has_bind_password?: boolean
  user_search_filter: string
  superadmin_groups: string[]
  group_mappings: Record<string, any>
  auto_sync_on_login: boolean
}

export interface ADGroup {
  name: string
  description: string
  dn: string
}

export interface TestConnectionResult {
  success: boolean
  message: string
  latency_ms?: number
  diagnostic?: string
  suggestion?: string
  server_info?: any
}

export interface TestUserResult {
  authenticated: boolean
  message: string
  display_name?: string
  email?: string
  groups?: string[]
  would_be_superadmin?: boolean
  mapped_sites?: string[]
  mapped_roles?: string[]
}

export type Role = 'operator' | 'admin' | 'operador_matriz'
export type SiteKind = 'loja' | 'combo' | 'outros'

export interface ManagedUser {
  id: number
  username: string
  full_name: string
  email?: string | null
  auth_source: string
  active: boolean
  is_superadmin: boolean
  two_factor_enabled: boolean
  roles: string[]
  created_at?: string | null
}
