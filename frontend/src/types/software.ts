export interface SoftwarePackageItem {
  id: number;
  pacote: string;
  versao?: string | null;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
}

export interface SoftwareVersionCount {
  versao: string;
  count: number;
  is_latest?: boolean;
  is_outdated?: boolean;
}

export interface BrowserComplianceSummary {
  software_id: number;
  identifier: string;
  software_nome: string;
  total_instalacoes: number;
  mais_recente: string;
  total_atualizadas: number;
  total_desatualizadas: number;
  taxa_conformidade: number;
}

export interface SoftwareCatalogItem {
  id: number;
  identifier: string;
  nome: string;
  tipo: 'aplicativo' | 'agente' | 'runtime' | 'ferramenta' | string;
  origem?: string | null;
  total_instalacoes: number;
  percentual_parque: number;
  ultima_versao?: string | null;
  versao_mais_recente?: string | null;
  total_versoes: number;
  total_atualizadas?: number;
  total_desatualizadas?: number;
  taxa_conformidade?: number;
  versoes: SoftwareVersionCount[];
}

export interface SoftwareCatalogKPIs {
  total_softwares: number;
  total_instalacoes: number;
  total_maquinas_inventariadas: number;
  maquinas_com_apps: number;
  maquinas_sem_apps: number;
  aplicativos: number;
  agentes: number;
  runtimes: number;
  ferramentas: number;
  outros: number;
}

export interface SoftwareCatalogResponse {
  items: SoftwareCatalogItem[];
  kpis: SoftwareCatalogKPIs;
  navegadores_conformidade?: BrowserComplianceSummary[];
  total: number;
  page?: number;
  per_page?: number;
  total_pages?: number;
}

export interface SoftwareDeviceDetail {
  device_id: number;
  hostname: string;
  ip?: string | null;
  mac?: string | null;
  sistema?: string | null;
  versao_so?: string | null;
  plataforma: 'Linux' | 'Windows';
  site_id?: number | null;
  site_nome?: string | null;
  site_codigo?: string | null;
  versao_software: string;
  is_latest?: boolean;
  status_conformidade?: 'latest' | 'outdated' | 'unknown' | string;
  pacotes: SoftwarePackageItem[];
  first_seen_at?: string | null;
  last_seen_at?: string | null;
}

export interface SoftwareDevicesResponse {
  software: SoftwareCatalogItem;
  devices: SoftwareDeviceDetail[];
  mais_recente?: string | null;
  total_atualizadas?: number;
  total_desatualizadas?: number;
  taxa_conformidade?: number;
  total: number;
}

export interface SoftwareFilterParams {
  site_id?: number | null;
  plataforma?: 'linux' | 'windows' | string;
  categoria?: 'aplicativo' | 'agente' | 'runtime' | 'ferramenta' | string;
  search?: string;
  page?: number;
  per_page?: number;
  export_all?: boolean;
}
