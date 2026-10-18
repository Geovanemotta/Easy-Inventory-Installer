import { apiRequest } from './apiClient'
import type { RemoteAccessConfig } from '../types/remoteAccess'

export async function getRemoteAccessConfig(): Promise<RemoteAccessConfig> {
  return apiRequest<RemoteAccessConfig>('/remote-access/config')
}
