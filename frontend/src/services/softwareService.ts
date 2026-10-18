import { apiRequest } from '@/services/apiClient';
import {
  SoftwareCatalogResponse,
  SoftwareDevicesResponse,
  SoftwareFilterParams,
  SoftwarePackageItem,
} from '@/types/software';

export const softwareService = {
  async getCatalog(params?: SoftwareFilterParams): Promise<SoftwareCatalogResponse> {
    const query = new URLSearchParams();
    if (params?.site_id !== undefined && params?.site_id !== null) {
      query.set('site_id', String(params.site_id));
    }
    if (params?.plataforma && params.plataforma !== 'todas') {
      query.set('plataforma', params.plataforma);
    }
    if (params?.categoria && params.categoria !== 'todas') {
      query.set('categoria', params.categoria);
    }
    if (params?.search) {
      query.set('search', params.search);
    }

    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<SoftwareCatalogResponse>(`/software${qs}`);
  },

  async getSoftwareDevices(
    softwareId: number,
    params?: { site_id?: number | null; search?: string },
  ): Promise<SoftwareDevicesResponse> {
    const query = new URLSearchParams();
    if (params?.site_id !== undefined && params?.site_id !== null) {
      query.set('site_id', String(params.site_id));
    }
    if (params?.search) {
      query.set('search', params.search);
    }

    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<SoftwareDevicesResponse>(`/software/${softwareId}/devices${qs}`);
  },

  async getDeviceSoftware(
    deviceId: number,
  ): Promise<{ device_id: number; total: number; packages: SoftwarePackageItem[] }> {
    return apiRequest<{ device_id: number; total: number; packages: SoftwarePackageItem[] }>(
      `/devices/${deviceId}/software`,
    );
  },
};
