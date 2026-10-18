import { apiRequest } from '@/services/apiClient';
import {
  License,
  LicenseAssignInput,
  LicenseAssignResult,
  LicenseAvailable,
  LicenseDeviceItem,
  LicenseFilterParams,
  LicenseInput,
  LicenseStats,
} from '@/types/license';

export const licenseService = {
  async listLicenses(params?: LicenseFilterParams): Promise<License[]> {
    const query = new URLSearchParams();
    if (params?.site_id !== undefined && params?.site_id !== null) {
      query.set('site_id', String(params.site_id));
    }
    if (params?.categoria && params.categoria !== 'todos') {
      query.set('categoria', params.categoria);
    }
    if (params?.status && params.status !== 'todas') {
      query.set('status', params.status);
    }
    if (params?.search) {
      query.set('search', params.search);
    }
    if (params?.software_nome) {
      query.set('software_nome', params.software_nome);
    }

    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<License[]>(`/licenses${qs}`);
  },

  async getStats(site_id?: number | null): Promise<LicenseStats> {
    const query = new URLSearchParams();
    if (site_id !== undefined && site_id !== null) {
      query.set('site_id', String(site_id));
    }
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<LicenseStats>(`/licenses/stats${qs}`);
  },

  async getAvailableLicenses(params?: {
    categoria?: 'windows' | 'office' | string;
    site_id?: number | null;
    chave_atual?: string | null;
  }): Promise<LicenseAvailable[]> {
    const query = new URLSearchParams();
    if (params?.categoria) query.set('categoria', params.categoria);
    if (params?.site_id !== undefined && params?.site_id !== null) {
      query.set('site_id', String(params.site_id));
    }
    if (params?.chave_atual) query.set('chave_atual', params.chave_atual);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<LicenseAvailable[]>(`/licenses/available${qs}`);
  },

  async getLicenseDevices(licenseId: number): Promise<LicenseDeviceItem[]> {
    return apiRequest<LicenseDeviceItem[]>(`/licenses/${licenseId}/devices`);
  },

  async createLicense(data: LicenseInput): Promise<License> {
    return apiRequest<License>('/licenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateLicense(
    licenseId: number,
    data: Partial<LicenseInput>,
  ): Promise<License> {
    return apiRequest<License>(`/licenses/${licenseId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteLicense(licenseId: number): Promise<{ success: boolean; message?: string }> {
    return apiRequest<{ success: boolean; message?: string }>(`/licenses/${licenseId}`, {
      method: 'DELETE',
    });
  },

  async assignLicense(data: LicenseAssignInput): Promise<LicenseAssignResult> {
    return apiRequest<LicenseAssignResult>('/licenses/assign', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
