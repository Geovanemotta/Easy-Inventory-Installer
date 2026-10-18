import { apiRequest } from './apiClient'
import type {
  ADConfig,
  ADGroup,
  ManagedUser,
  TestConnectionResult,
  TestUserResult,
} from '../types/ad'

export async function getADConfig(): Promise<ADConfig> {
  return apiRequest<ADConfig>('/ad/config')
}

export async function saveADConfig(data: ADConfig): Promise<{ status: string; message: string; enabled: boolean }> {
  return apiRequest<{ status: string; message: string; enabled: boolean }>('/ad/config', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function testADConnection(data?: Partial<ADConfig>): Promise<TestConnectionResult> {
  return apiRequest<TestConnectionResult>('/ad/test', {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  })
}

export async function testADUser(username: string, password: string): Promise<TestUserResult> {
  return apiRequest<TestUserResult>('/ad/test-user', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export async function getADGroups(search?: string): Promise<{ groups: ADGroup[]; total: number }> {
  const q = search ? `?search=${encodeURIComponent(search)}` : ''
  return apiRequest<{ groups: ADGroup[]; total: number }>(`/ad/groups${q}`)
}

export async function listManagedUsers(): Promise<ManagedUser[]> {
  return apiRequest<ManagedUser[]>('/auth/users')
}

export async function resetUser2FA(userId: number): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(`/auth/users/${userId}/reset-2fa`, {
    method: 'POST',
  })
}
