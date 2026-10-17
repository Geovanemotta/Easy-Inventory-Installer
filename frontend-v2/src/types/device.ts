// =====================================================================
// Contratos TypeScript espelhando backend/app/schemas/device.py
// =====================================================================

// --- Request Payloads ---

export interface DevicePatrimonioIn {
  patrimonio: string;
}

export interface DeviceFirewallSolicitarIn {
  patrimonio?: string | null;
}

export interface DeviceSolicitarRecadastroIn {
  patrimonio: string;
  confirmacao_mudanca_so?: boolean;
  licenca_windows_solicitada?: boolean;
  motivo?: string | null;
}

export interface DeviceAprovarCadastroIn {
  site_id: number;
  ip_definitivo: string;
  vincular_ativo_existente_id?: number | null;
  vincular_network_asset_id?: number | null;
  patrimonio?: string | null;
  observacao_admin?: string | null;
  confirmar_sobrescrita_ip?: boolean;
}

export interface DeviceRejeitarCadastroIn {
  motivo: string;
}

// --- Parâmetros de Consulta ---

export interface DeviceQueryParams {
  search?: string;
  site_id?: number | null;
  status?: string;
  sistema?: string;
  versao?: string;
  page?: number;
  per_page?: number;
}

// --- Estruturas de Entidades e Resposta ---

export interface DeviceConflictItem {
  id: number;
  tipo_registro: 'estacao' | 'ativo_rede' | string;
  hostname?: string | null;
  ip?: string | null;
  mac?: string | null;
  loja?: string | null;
  site_id?: number | null;
}

export interface DeviceExistingAsset {
  id?: number | null;
  tipo_origem: 'device' | 'network_asset' | 'ambos' | string;
  linked_device_id?: number | null;
  linked_network_asset_id?: number | null;
  hostname?: string;
  loja?: string;
  site_id?: number | null;
  ip?: string;
  mac?: string;
  sistema?: string;
  versao?: string;
  patrimonio?: string;
  familia_so?: string;
  origem?: string;
}

export interface DeviceComparativo {
  so_divergente: boolean;
  so_anterior: string;
  so_atual: string;
  familia_anterior: string;
  familia_atual: string;
  mac_divergente: boolean;
  mac_anterior: string;
  mac_atual: string;
  host_divergente: boolean;
  host_anterior: string;
  host_atual: string;
  ip_anterior: string;
  parece_mesmo_equipamento: boolean;
}

export interface DeviceLookupResponse {
  exists: boolean;
  patrimonio_formatado: string;
  message?: string | null;
  tipo_origem?: string | null;
  linked_device_id?: number | null;
  linked_network_asset_id?: number | null;
  tem_conflito: boolean;
  conflitos: DeviceConflictItem[];
  existing_device?: DeviceExistingAsset | null;
  comparativo?: DeviceComparativo | null;
}

export interface SiteOption {
  id: number;
  name: string;
  code: string;
}

export interface SiteIpRangeOption {
  id: number;
  nome: string;
  ip_inicio: string;
  ip_fim: string;
  gateway: string;
  mascara: string;
}

export interface DeviceNetworkContext {
  resolved_site_id?: number | null;
  sites: SiteOption[];
  faixas: SiteIpRangeOption[];
  ips_ocupados: string[];
  ip_anterior_sugerido: string;
  ip_confiavel: boolean;
}

export interface DeviceDetailContext {
  id: number;
  hostname: string;
  ip: string;
  ip_definitivo: string;
  mac: string;
  sistema: string;
  versao: string;
  loja: string;
  site_id?: number | null;
  patrimonio: string;
  firewall_status: 'pendente' | 'confirmado' | 'rejeitado' | string;
  firewall_solicitado_por: string;
  firewall_solicitado_em: string;
  licenca_windows_solicitada: boolean;
  motivo_alteracao: string;
  so_anterior: string;
  is_rede_formatacao: boolean;
}

export interface DivergenciaItem {
  campo: string;
  anterior: string;
  atual: string;
}

export interface DeviceApprovalContextResponse {
  device: DeviceDetailContext;
  existing_asset?: Record<string, unknown> | null;
  tem_conflito: boolean;
  conflitos: DeviceConflictItem[];
  divergencias: DivergenciaItem[];
  so_divergente: boolean;
  network_context: DeviceNetworkContext;
}

export interface DeviceHistoryItem {
  id: number;
  campo: string;
  valor_anterior?: string | null;
  valor_novo?: string | null;
  data_alteracao: string;
}

export interface DeviceListItem {
  id: number;
  company_id: number;
  site_id?: number | null;
  hostname: string;
  loja?: string | null;
  ip?: string | null;
  mac?: string | null;
  sistema?: string | null;
  versao?: string | null;
  status?: string | null;
  alerta_hardware?: string | null;
  processador?: string | null;
  ram_total?: string | null;
  disco_total?: string | null;
  disco_usado?: string | null;
  disco_livre?: string | null;
  disco_percentual?: number | null;
  rustdesk_id?: string | null;
  data_coleta?: string | null;
  patrimonio?: string | null;
  firewall_status?: string | null;
  firewall_solicitado_por?: string | null;
  firewall_solicitado_em?: string | null;
  firewall_confirmado_por?: string | null;
  firewall_confirmado_em?: string | null;
  active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DevicePagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface DeviceListResponse {
  items: DeviceListItem[];
  pagination: DevicePagination;
}

export interface DeviceActionResponse {
  status: string;
  message: string;
}
