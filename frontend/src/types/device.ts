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
  loja?: string;
  status?: string;
  sistema?: string;
  versao?: string;
  firewall_status?: string;
  alerta?: boolean;
  inativas?: boolean;
  bancada?: boolean;
  plataforma?: string;
  disco_critico?: boolean;
  sem_apps?: boolean;
  com_apps?: boolean;
  status_conexao?: string;
  disco_tipo?: string;
  ordenar_por?: string;
  ordem_dir?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export interface DeviceFilterOptions {
  sites: { id: number; name: string; code: string }[];
  versoes: string[];
  plataformas?: string[];
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

export interface WorkstationUsedIp {
  ip: string;
  device_id: number;
  hostname: string;
  patrimonio: string;
  sistema: string;
}

export interface SiteVlanIpRange {
  id: number;
  name: string;
  vlan_id?: number | null;
  ip_start: string;
  ip_end: string;
  gateway: string;
  mask: string;
  free_count: number;
  workstations_count: number;
  free_ips: string[];
  workstation_used_ips: WorkstationUsedIp[];
}

export interface SiteVlanIpsResponse {
  site_id: number;
  site_name: string;
  site_code: string;
  ranges: SiteVlanIpRange[];
}

export interface DeviceNetworkContext {
  resolved_site_id?: number | null;
  suggested_site_id?: number | null;
  suggested_site_name?: string;
  suggested_site_code?: string;
  matched_by?: string | null;
  sites: SiteOption[];
  faixas: SiteIpRangeOption[];
  ips_ocupados: string[];
  ip_anterior_sugerido: string;
  ip_confiavel: boolean;
  vlan_ranges?: SiteVlanIpRange[];
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
  ip_secundario?: string | null;
  ips_extras?: string[];
  mac?: string | null;
  sistema?: string | null;
  versao?: string | null;
  so_formatado?: string | null;
  familia_so?: string | null;
  status?: string | null;
  status_operacional_label?: string | null;
  status_operacional_nivel?: 'ok' | 'warning' | 'danger' | string | null;
  status_operacional_codigo?: 'OK' | 'UPGRADE_REQUIRED' | 'OUTRO' | string | null;
  alerta_hardware?: string | null;
  processador?: string | null;
  processador_formatado?: string | null;
  ram_total?: string | null;
  ram_total_formatada?: string | null;
  ram_tipo?: string | null;
  ram_tipo_limpo?: string | null;
  disco_total?: string | null;
  disco_total_formatado?: string | null;
  disco_usado?: string | null;
  disco_usado_formatado?: string | null;
  disco_livre?: string | null;
  disco_livre_formatado?: string | null;
  disco_percentual?: number | null;
  disco_nivel?: 'ok' | 'warn' | 'bad' | string | null;
  disco_tipo?: string | null;
  rustdesk_id?: string | null;
  data_coleta?: string | null;
  data_coleta_formatada?: string | null;
  tempo_relativo_coleta?: string | null;
  status_conexao?: 'online' | 'alerta' | 'offline' | string | null;
  status_conexao_label?: string | null;
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

// --- Detalhes Estendidos (Hardware, Discos, Periféricos, Pastas) ---

export interface PerifericoItem {
  id?: number;
  tipo: 'monitor' | 'smartphone' | 'teclado' | 'mouse' | 'armazenamento_usb' | 'impressora' | 'outro' | string;
  nome: string;
  fabricante?: string | null;
  serial?: string | null;
  conexao?: string | null;
  capacidade?: string | null;
  detalhes?: string | null;
}

export interface UnidadeDisco {
  ponto_montagem?: string;
  montagem?: string;
  letra?: string;
  device?: string;
  tipo_fs?: string;
  rotulo?: string;
  total?: string;
  usado?: string;
  livre?: string;
  percentual?: number | string;
  percentual_usado?: number | string;
}

export interface PastaUsuario {
  nome?: string;
  pasta?: string;
  caminho?: string;
  tamanho?: string;
  tamanho_mb?: number;
}

export interface AnaliseUsuario {
  usuario?: string;
  tamanho?: string;
  tamanho_mb?: number;
  subpastas?: PastaUsuario[];
  pastas?: PastaUsuario[];
}

export interface ItemVarLog {
  nome?: string;
  pasta?: string;
  caminho?: string;
  tamanho?: string;
  tamanho_mb?: number;
}

export interface AnaliseDisco {
  executada?: boolean;
  unidades?: UnidadeDisco[];
  usuarios?: AnaliseUsuario[];
  top_usuarios?: AnaliseUsuario[];
  resumo_usuarios?: {
    total_usuarios?: number;
    soma_tamanho_formatada?: string;
    soma_tamanho_mb?: number;
  };
  var_log?: {
    total_itens?: number;
    tamanho_total?: string;
    top_itens?: ItemVarLog[];
  } | ItemVarLog[];
}

export interface DeviceSoftwarePackage {
  pacote: string;
  versao: string;
}

export interface DeviceSoftwareItem {
  id: string;
  nome: string;
  tipo: string;
  origem: string;
  pacotes: DeviceSoftwarePackage[];
}

export interface DeviceDetailResponse extends DeviceListItem {
  fabricante?: string | null;
  fabricante_limpo?: string | null;
  modelo?: string | null;
  modelo_limpo?: string | null;
  modelo_formatado?: string | null;
  serial?: string | null;
  serial_limpo?: string | null;
  dominio?: string | null;
  usuario?: string | null;
  build?: string | null;
  ram_tipo?: string | null;
  windows_release?: string | null;
  windows_release_formatado?: string | null;
  serial_windows?: string | null;
  serial_office?: string | null;
  analise_disco?: AnaliseDisco | UnidadeDisco[] | any;
  perifericos?: PerifericoItem[] | any;
  perifericos_agrupados?: {
    monitores?: PerifericoItem[];
    armazenamento_usb?: PerifericoItem[];
    smartphones?: PerifericoItem[];
    impressoras?: PerifericoItem[];
    teclados?: PerifericoItem[];
    mouses?: PerifericoItem[];
    outros?: PerifericoItem[];
  } | any;
  extra_data?: Record<string, unknown> | any;
  ip_definitivo?: string | null;
  licenca_windows_solicitada?: boolean;
  motivo_alteracao?: string | null;
  observacao_admin?: string | null;
  motivo_upgrade?: string | null;
  so_anterior?: string | null;
  is_rede_formatacao?: boolean;
  history_count?: number;
}

export interface DeviceKPIs {
  total_linux: number;
  total_windows: number;
  total_alertas: number;
  total_inativas: number;
  total_firewall_pendente: number;
  total_bancada_88: number;
  total_critico_disco: number;
  total_sem_apps?: number;
  total_com_apps?: number;
}

export interface DevicePagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface ChartSlice {
  label: string;
  count: number;
  percent: number;
  color: string;
}

export interface DonutChartData {
  title: string;
  subtitle?: string;
  total: number;
  slices: ChartSlice[];
}

export interface DeviceChartsSummary {
  plataforma: DonutChartData;
  status: DonutChartData;
  conectividade?: DonutChartData;
  versoes?: DonutChartData;
}

export interface DeviceListResponse {
  items: DeviceListItem[];
  pagination: DevicePagination;
  kpis?: DeviceKPIs;
  filter_options?: DeviceFilterOptions;
  charts_summary?: DeviceChartsSummary;
}

export interface DeviceActionResponse {
  status: string;
  message: string;
}
