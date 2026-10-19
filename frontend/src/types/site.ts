export interface Site {
  id: number;
  company_id: number;
  name: string;
  code: string;
  active: boolean;
  identifiers: string[];
  devices_count?: number;
  network_assets_count?: number;
  ip_ranges_count?: number;
}

export interface SiteKPIs {
  total_sites: number;
  active_sites: number;
  inactive_sites: number;
  total_devices: number;
  total_network_assets: number;
  total_ip_ranges: number;
}

export interface SiteCreateInput {
  name: string;
  code: string;
  active?: boolean;
  identifiers?: string[];
}

export interface SiteUpdateInput {
  name?: string;
  code?: string;
  active?: boolean;
  identifiers?: string[];
}

export interface SiteSimulationRequest {
  hostname: string;
  loja?: string;
}

export interface SiteSimulationResponse {
  matched: boolean;
  site_id?: number | null;
  site_name?: string | null;
  site_code?: string | null;
  matched_by?: string | null;
  details: string;
}

export interface SiteReclassifyRequest {
  only_unassigned: boolean;
  site_id?: number | null;
}

export interface ReclassifiedDeviceItem {
  device_id: number;
  hostname: string;
  old_site?: string | null;
  new_site: string;
}

export interface SiteReclassifyResponse {
  total_scanned: number;
  total_reclassified: number;
  changes: ReclassifiedDeviceItem[];
}

export interface SiteIpRange {
  id: number;
  company_id: number;
  site_id: number;
  site_nome?: string | null;
  site_codigo?: string | null;
  nome: string;
  ip_inicio: string;
  ip_fim: string;
  gateway?: string | null;
  mascara?: string | null;
  observacoes?: string | null;
  total_ips?: number;
  ips_ocupados?: number;
  ips_livres?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SiteIpRangeInput {
  site_id: number;
  nome: string;
  ip_inicio: string;
  ip_fim?: string | null;
  gateway?: string | null;
  mascara?: string | null;
  observacoes?: string | null;
}
