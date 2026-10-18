import { apiRequest } from '@/services/apiClient';
import {
  Site,
  SiteKPIs,
  SiteCreateInput,
  SiteUpdateInput,
  SiteSimulationRequest,
  SiteSimulationResponse,
  SiteReclassifyRequest,
  SiteReclassifyResponse,
  SiteIpRange,
  SiteIpRangeInput,
} from '@/types/site';

export const siteService = {
  async listSites(includeInactive: boolean = true): Promise<Site[]> {
    const q = includeInactive ? '?include_inactive=true' : '';
    return apiRequest<Site[]>(`/sites${q}`);
  },

  async getSiteKPIs(): Promise<SiteKPIs> {
    return apiRequest<SiteKPIs>('/sites/kpis');
  },

  async createSite(data: SiteCreateInput): Promise<Site> {
    return apiRequest<Site>('/sites', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateSite(id: number, data: SiteUpdateInput): Promise<Site> {
    return apiRequest<Site>(`/sites/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteSite(id: number): Promise<{ detail: string; deactivated: boolean }> {
    return apiRequest<{ detail: string; deactivated: boolean }>(`/sites/${id}`, {
      method: 'DELETE',
    });
  },

  async simulateMatch(data: SiteSimulationRequest): Promise<SiteSimulationResponse> {
    return apiRequest<SiteSimulationResponse>('/sites/simulate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async reclassifySites(data: SiteReclassifyRequest): Promise<SiteReclassifyResponse> {
    return apiRequest<SiteReclassifyResponse>('/sites/reclassify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Gerenciamento de Faixas de IP / VLANs
  async listIpRanges(siteId?: number | null): Promise<SiteIpRange[]> {
    const q = siteId ? `?site_id=${siteId}` : '';
    return apiRequest<SiteIpRange[]>(`/network-assets/ranges${q}`);
  },

  async createIpRange(data: SiteIpRangeInput): Promise<SiteIpRange> {
    return apiRequest<SiteIpRange>('/network-assets/ranges', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateIpRange(id: number, data: Partial<SiteIpRangeInput>): Promise<SiteIpRange> {
    return apiRequest<SiteIpRange>(`/network-assets/ranges/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteIpRange(id: number): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>(`/network-assets/ranges/${id}`, {
      method: 'DELETE',
    });
  },
};
