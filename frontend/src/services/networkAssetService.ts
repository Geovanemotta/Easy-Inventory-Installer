import { apiRequest, API_URL, authStorage } from '@/services/apiClient';
import {
  NetworkAsset,
  NetworkAssetInput,
  NetworkAssetKPIs,
  PingResult,
  ImportResult,
  ScanBatchInput,
  NetworkAssetFilterParams,
  SweeperStatus,
} from '@/types/networkAsset';
import { SiteIpRange } from '@/types/site';
import { licenseService } from '@/services/licenseService';
import type { LicenseAssignInput } from '@/types/license';

export const networkAssetService = {
  async listAssets(params: NetworkAssetFilterParams = {}): Promise<NetworkAsset[]> {
    const query = new URLSearchParams();
    if (params.site_id !== undefined && params.site_id !== null) {
      query.set('site_id', String(params.site_id));
    }
    if (params.tipo) query.set('tipo', params.tipo);
    if (params.status_online !== undefined && params.status_online !== null) {
      query.set('status_online', String(params.status_online));
    }
    if (params.search) query.set('search', params.search);
    if (params.filtro_ocupacao && params.filtro_ocupacao !== 'todos') {
      query.set('filtro_ocupacao', params.filtro_ocupacao);
    }
    if (params.faixa_id) query.set('faixa_id', String(params.faixa_id));

    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<NetworkAsset[]>(`/network-assets${qs}`);
  },

  async getKPIs(params: NetworkAssetFilterParams = {}): Promise<NetworkAssetKPIs> {
    const query = new URLSearchParams();
    if (params.site_id !== undefined && params.site_id !== null) {
      query.set('site_id', String(params.site_id));
    }
    if (params.faixa_id) query.set('faixa_id', String(params.faixa_id));
    if (params.tipo) query.set('tipo', params.tipo);
    if (params.search) query.set('search', params.search);
    if (params.filtro_ocupacao && params.filtro_ocupacao !== 'todos') {
      query.set('filtro_ocupacao', params.filtro_ocupacao);
    }
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<NetworkAssetKPIs>(`/network-assets/kpis${qs}`);
  },

  async listIpRanges(siteId?: number | null): Promise<SiteIpRange[]> {
    const q = siteId ? `?site_id=${siteId}` : '';
    return apiRequest<SiteIpRange[]>(`/network-assets/ranges${q}`);
  },

  async createAsset(data: NetworkAssetInput): Promise<NetworkAsset> {
    return apiRequest<NetworkAsset>('/network-assets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateAsset(id: number, data: Partial<NetworkAssetInput>): Promise<NetworkAsset> {
    return apiRequest<NetworkAsset>(`/network-assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteAsset(id: number): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>(`/network-assets/${id}`, {
      method: 'DELETE',
    });
  },

  async bulkDeleteAssets(ids: number[]): Promise<{ success: boolean; removidos: number }> {
    return apiRequest<{ success: boolean; removidos: number }>('/network-assets/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },

  async bulkDelete(ids: number[]): Promise<{ success: boolean; removidos: number }> {
    return this.bulkDeleteAssets(ids);
  },

  async pingAsset(id: number, ip?: string): Promise<PingResult> {
    const query = ip ? `?ip=${encodeURIComponent(ip)}` : '';
    return apiRequest<PingResult>(`/network-assets/${id}/ping${query}`, {
      method: 'POST',
    });
  },

  async pingDirectIp(ip: string): Promise<PingResult> {
    return apiRequest<PingResult>(`/network-assets/ping-ip?ip=${encodeURIComponent(ip)}`, {
      method: 'POST',
    });
  },

  async assignLicense(data: LicenseAssignInput) {
    return licenseService.assignLicense(data);
  },

  async getAvailableLicenses(params?: {
    categoria?: 'windows' | 'office' | string;
    site_id?: number | null;
    chave_atual?: string | null;
  }) {
    return licenseService.getAvailableLicenses(params);
  },

  async scanBatch(data: ScanBatchInput): Promise<PingResult[]> {
    return apiRequest<PingResult[]>('/network-assets/scan-batch', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async importCSV(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    const token = authStorage.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}/network-assets/import-csv`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Falha ao importar arquivo CSV.');
    }

    return res.json();
  },

  async downloadTemplate(): Promise<void> {
    const token = authStorage.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}/network-assets/template-csv`, {
      headers,
    });
    if (!res.ok) {
      throw new Error('Falha ao baixar modelo CSV');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_ativos_rede.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  exportCSV(assets: NetworkAsset[]): void {
    if (assets.length === 0) {
      throw new Error('Nenhum ativo para exportar.');
    }

    const headers = [
      'LOCALIZACAO',
      'IP',
      'TIPO',
      'NOME',
      'PATRIMONIO',
      'MAC',
      'FILIAL_SISTEMA',
      'STATUS_ONLINE',
      'LATENCIA_MS',
      'ULTIMO_PING',
      'OBSERVACOES',
    ];

    const rows = assets.map((a) => [
      `"${(a.localizacao || '').replace(/"/g, '""')}"`,
      `"${a.ip || ''}"`,
      `"${(a.tipo || '').replace(/"/g, '""')}"`,
      `"${(a.nome || '').replace(/"/g, '""')}"`,
      `"${a.patrimonio || ''}"`,
      `"${a.mac || ''}"`,
      `"${(a.site_codigo || a.site_nome || '').replace(/"/g, '""')}"`,
      a.status_online === true ? 'Online' : a.status_online === false ? 'Offline' : 'NaoTestado',
      a.tempo_resposta_ms !== null && a.tempo_resposta_ms !== undefined ? String(a.tempo_resposta_ms) : '',
      a.ultimo_ping ? new Date(a.ultimo_ping).toLocaleString('pt-BR') : '',
      `"${(a.observacoes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ativos_de_rede_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  getTemplateDownloadUrl(): string {
    return `${API_URL}/network-assets/template-csv`;
  },

  async getSweeperStatus(): Promise<SweeperStatus> {
    return apiRequest<SweeperStatus>('/network-assets/sweeper-status');
  },

  async toggleSweeper(enabled?: boolean): Promise<SweeperStatus> {
    return apiRequest<SweeperStatus>('/network-assets/sweeper-toggle', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  },
};
