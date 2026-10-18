export interface RemoteAccessFeatures {
  desktop_sharing: boolean
  file_transfer: boolean
  uac_support: boolean
  unlimited_concurrent: boolean
}

export interface RemoteAccessUser {
  username: string
  full_name?: string | null
  is_admin: boolean
}

export interface RemoteAccessConfig {
  enabled: boolean
  mesh_port: number
  mesh_url: string
  server_host: string
  features: RemoteAccessFeatures
  user: RemoteAccessUser
}

export type SessionTabMode = 'desktop' | 'files' | 'terminal'

export interface ActiveRemoteSession {
  deviceId: number
  hostname: string
  ip?: string | null
  url: string
  tab: SessionTabMode
}
