import { apiRequest } from './apiClient';
import {
  DeviceActionResponse,
  DeviceApprovalContextResponse,
  DeviceAprovarCadastroIn,
  DeviceFirewallSolicitarIn,
  DeviceHistoryItem,
  DeviceListResponse,
  DeviceLookupResponse,
  DevicePatrimonioIn,
  DeviceQueryParams,
  DeviceRejeitarCadastroIn,
  DeviceSolicitarRecadastroIn,
} from '@/types/device';

/**
 * Serviço modular para o consumo das 12 rotas da API de Dispositivos (/devices).
 */
export const deviceService = {
  /**
   * 1. GET /devices/ - Listagem paginada e filtrada de dispositivos
   */
  async listDevices(params: DeviceQueryParams = {}): Promise<DeviceListResponse> {
    const searchParams = new URLSearchParams();

    if (params.search) searchParams.set('search', params.search);
    if (params.site_id !== undefined && params.site_id !== null) {
      searchParams.set('site_id', String(params.site_id));
    }
    if (params.status) searchParams.set('status', params.status);
    if (params.sistema) searchParams.set('sistema', params.sistema);
    if (params.versao) searchParams.set('versao', params.versao);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.per_page) searchParams.set('per_page', String(params.per_page));

    const queryString = searchParams.toString();
    return apiRequest<DeviceListResponse>(`/devices/${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * 2. GET /devices/patrimonio/lookup - Consulta patrimônio em tempo real
   */
  async lookupPatrimonio(
    patrimonio: string,
    currentDeviceId?: number
  ): Promise<DeviceLookupResponse> {
    const searchParams = new URLSearchParams({ patrimonio });
    if (currentDeviceId) {
      searchParams.set('current_device_id', String(currentDeviceId));
    }
    return apiRequest<DeviceLookupResponse>(
      `/devices/patrimonio/lookup?${searchParams.toString()}`
    );
  },

  /**
   * 3. GET /devices/{device_id}/history - Histórico de alterações de hardware e auditoria
   */
  async getDeviceHistory(
    deviceId: number,
    limit: number = 100
  ): Promise<DeviceHistoryItem[]> {
    return apiRequest<DeviceHistoryItem[]>(
      `/devices/${deviceId}/history?limit=${limit}`
    );
  },

  /**
   * 4. POST /devices/{device_id}/clear-alert - Limpa alerta de hardware (Admin)
   */
  async clearDeviceAlert(deviceId: number): Promise<DeviceActionResponse> {
    return apiRequest<DeviceActionResponse>(`/devices/${deviceId}/clear-alert`, {
      method: 'POST',
    });
  },

  /**
   * 5. DELETE /devices/{device_id} - Exclusão definitiva de um dispositivo (Admin)
   */
  async deleteDevice(deviceId: number): Promise<DeviceActionResponse> {
    return apiRequest<DeviceActionResponse>(`/devices/${deviceId}`, {
      method: 'DELETE',
    });
  },

  /**
   * 6. PATCH /devices/{device_id}/patrimonio - Edição manual de patrimônio
   */
  async updateDevicePatrimonio(
    deviceId: number,
    data: DevicePatrimonioIn
  ): Promise<{ status: string; patrimonio: string; message: string }> {
    return apiRequest<{ status: string; patrimonio: string; message: string }>(
      `/devices/${deviceId}/patrimonio`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * 7. POST /devices/{device_id}/firewall-solicitar - Marca para liberação no firewall
   */
  async solicitarFirewall(
    deviceId: number,
    data?: DeviceFirewallSolicitarIn
  ): Promise<{
    status: string;
    firewall_status: string;
    firewall_solicitado_por: string;
    firewall_solicitado_em: string;
    patrimonio: string;
    message: string;
  }> {
    return apiRequest(`/devices/${deviceId}/firewall-solicitar`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  },

  /**
   * 8. POST /devices/{device_id}/firewall-confirmar - Homologação de firewall (Admin)
   */
  async confirmarFirewall(
    deviceId: number
  ): Promise<{
    status: string;
    firewall_status: string;
    firewall_confirmado_por: string;
    firewall_confirmado_em: string;
    message: string;
  }> {
    return apiRequest(`/devices/${deviceId}/firewall-confirmar`, {
      method: 'POST',
    });
  },

  /**
   * 9. POST /devices/{device_id}/solicitar-recadastro - Submissão de recadastro com validação de SO
   */
  async solicitarRecadastro(
    deviceId: number,
    data: DeviceSolicitarRecadastroIn
  ): Promise<{
    status: string;
    device_id: number;
    firewall_status: string;
    firewall_solicitado_por: string;
    firewall_solicitado_em: string;
    patrimonio: string;
    licenca_windows_solicitada: boolean;
    message: string;
  }> {
    return apiRequest(`/devices/${deviceId}/solicitar-recadastro`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 10. GET /devices/{device_id}/approval-context - Contexto completo para o modal de homologação
   */
  async getApprovalContext(deviceId: number): Promise<DeviceApprovalContextResponse> {
    return apiRequest<DeviceApprovalContextResponse>(
      `/devices/${deviceId}/approval-context`
    );
  },

  /**
   * 11. POST /devices/{device_id}/aprovar-cadastro - Aprovação definitiva com IP e vinculação (Admin)
   */
  async aprovarCadastro(
    deviceId: number,
    data: DeviceAprovarCadastroIn
  ): Promise<{
    status: string;
    device_id: number;
    hostname: string;
    ip: string;
    ip_definitivo: string;
    mac: string;
    patrimonio: string;
    site_id: number;
    site_name: string;
    firewall_status: string;
    firewall_confirmado_por: string;
    firewall_confirmado_em: string;
    message: string;
  }> {
    return apiRequest(`/devices/${deviceId}/aprovar-cadastro`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 12. POST /devices/{device_id}/rejeitar-cadastro - Rejeição administrativa da solicitação
   */
  async rejeitarCadastro(
    deviceId: number,
    data: DeviceRejeitarCadastroIn
  ): Promise<DeviceActionResponse> {
    return apiRequest<DeviceActionResponse>(`/devices/${deviceId}/rejeitar-cadastro`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
