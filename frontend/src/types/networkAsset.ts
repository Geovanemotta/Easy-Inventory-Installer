import { SiteIpRange } from './site';

export type { SiteIpRange };

export interface NetworkAsset {
  id: number | null;
  company_id: number;
  site_id?: number | null;
  site_nome?: string | null;
  site_codigo?: string | null;
  filial_codigo?: string | null;
  nome: string;
  tipo: string;
  ip?: string | null;
  mac?: string | null;
  patrimonio?: string | null;
  fabricante?: string | null;
  modelo?: string | null;
  marca_modelo?: string | null;
  numero_serie?: string | null;
  localizacao?: string | null;
  status_online?: boolean | null;
  ultimo_ping?: string | null;
  tempo_resposta_ms?: number | null;
  observacoes?: string | null;
  origem: 'manual' | 'planilha' | 'estacao' | 'livre' | string;
  device_id?: number | null;
  faixa_nome?: string | null;
  vlan?: string | null;
  sistema_operacional?: string | null;
  serial_windows?: string | null;
  serial_office?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NetworkAssetInput {
  nome: string;
  tipo: string;
  site_id?: number | null;
  ip?: string | null;
  mac?: string | null;
  patrimonio?: string | null;
  fabricante?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
  localizacao?: string | null;
  observacoes?: string | null;
  serial_windows?: string | null;
  serial_office?: string | null;
}

export interface NetworkAssetKPIs {
  total: number;
  online: number;
  offline: number;
  nao_testado: number;
  impressoras: number;
  switches: number;
  aps: number;
  outros: number;
  estacoes?: number;
  livres?: number;
  ativos?: number;
  testados?: number;
  ultimo_ping?: string | null;
}

export interface PingResult {
  asset_id?: number | null;
  ip: string;
  online: boolean;
  status_online?: boolean | null;
  tempo_resposta_ms?: number | null;
  timestamp: string;
  ultimo_ping?: string | null;
}

export interface StationConflict {
  linha: number;
  ip: string;
  estacao_hostname?: string;
  estacao_nome?: string;
  estacao_id?: number;
  motivo?: string;
  patrimonio_atualizado?: boolean;
  patrimonio_novo?: string;
  estacao_patrimonio?: string;
}

export interface ImportResult {
  total_linhas: number;
  criados: number;
  atualizados: number;
  ignorados: number;
  erros: string[];
  conflitos_estacao: StationConflict[];
}

export interface ScanBatchInput {
  asset_ids?: number[];
  site_id?: number;
  ips?: string[];
}

export interface NetworkAssetFilterParams {
  site_id?: number | null;
  tipo?: string | null;
  status_online?: boolean | null;
  search?: string | null;
  filtro_ocupacao?: 'todos' | 'ocupados' | 'livres' | 'estacoes' | 'ativos' | string | null;
  faixa_id?: number | null;
  grupo?: string | null;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  export_all?: boolean;
}

export interface NetworkAssetListResponse {
  items: NetworkAsset[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  kpis: NetworkAssetKPIs;
}

export const TIPOS_PREDEFINIDOS = [
  'IMPRESSORA',
  'ACESS POINT',
  'SWITCH',
  'BALANÇA',
  'TERMINAL CONSULTA',
  'DESKTOP',
  'RELOGIO PONTO',
  'NOTEBOOK',
  'CENTRAL TELEFONICA',
  'LEITOR BIOMETRICO',
  'TOTEM',
  'COLETOR',
  'TABLET',
  'CELULAR',
  'SMARTPHONE',
  'SMART-BOX',
  'TELEFONE MOVEL',
  'ROTEADOR',
  'VOIP',
  'COFRE ELETRONICO',
  'PDV',
  'CANCELA ESTACIONAMENTO',
  'LEITOR FACIAL',
  'CLIMATIZAÇÃO',
  'FIREWALL',
  'DVR/CFTV',
  'TERMINAL',
  'ESTEIRA',
  'OUTRO',
];

export interface SweeperStatus {
  enabled: boolean;
  last_run: string | null;
  last_checked_count: number;
  total_monitored: number;
  priority_site_id: number | null;
}
