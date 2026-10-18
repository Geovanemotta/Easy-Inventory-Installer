export interface LicenseAssignInput {
  device_id?: number | null;
  network_asset_id?: number | null;
  slot: 'windows' | 'office';
  chave?: string | null;
}

export interface LicenseAssignResult {
  success: boolean;
  slot: 'windows' | 'office';
  chave: string | null;
  software_nome?: string | null;
  message: string;
}

export interface LicenseAvailable {
  id: number;
  chave: string;
  software_nome: string;
  categoria: string;
  tipo_licenca?: string | null;
  nota_fiscal?: string | null;
  site_id?: number | null;
  site_nome?: string | null;
  quantidade_total: number;
  quantidade_em_uso: number;
  quantidade_disponivel: number;
  esgotada: boolean;
}

export interface License {
  id: number;
  company_id: number;
  site_id?: number | null;
  site_nome?: string | null;
  site_codigo?: string | null;
  categoria: 'windows' | 'office' | 'outro' | string;
  software_nome: string;
  chave: string;
  tipo_licenca?: string | null;
  nota_fiscal?: string | null;
  quantidade_total: number;
  quantidade_em_uso: number;
  quantidade_disponivel: number;
  esgotada: boolean;
  observacoes?: string | null;
  data_aquisicao?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LicenseInput {
  site_id?: number | null;
  categoria: string;
  software_nome: string;
  chave: string;
  tipo_licenca?: string | null;
  nota_fiscal?: string | null;
  quantidade_total: number;
  observacoes?: string | null;
  data_aquisicao?: string | null;
}

export interface LicenseDeviceItem {
  id: number;
  hostname: string;
  tipo: string;
  ip?: string | null;
  site_nome?: string | null;
  site_codigo?: string | null;
  patrimonio?: string | null;
  slot: 'windows' | 'office';
  origem: 'estacao' | 'ativo';
  data_coleta?: string | null;
}

export interface LicenseStats {
  total_licencas: number;
  total_em_uso: number;
  total_disponiveis: number;
  total_esgotadas: number;
  solicitacoes_pendentes: number;
  por_categoria: Record<
    string,
    { total: number; em_uso: number; disponivel: number; esgotadas: number }
  >;
  por_filial: Array<{
    filial: string;
    total: number;
    em_uso: number;
    disponivel: number;
  }>;
}

export interface LicenseFilterParams {
  site_id?: number | null;
  categoria?: 'windows' | 'office' | 'outro' | 'todos' | string;
  status?: 'todas' | 'disponiveis' | 'esgotadas' | string;
  search?: string;
  software_nome?: string;
}

export const SOFTWARES_PREDEFINIDOS = {
  windows: [
    'Windows 11 Pro',
    'Windows 10 Pro',
    'Windows Server 2022 Standard',
    'Windows Server 2019 Standard',
    'Windows Server 2022 Datacenter',
    'Windows Server 2016 Standard',
  ],
  office: [
    'Office Home & Business 2021',
    'Office Home & Business 2019',
    'Office Professional Plus 2021',
    'Microsoft 365 Business Standard',
    'Microsoft 365 Apps for Business',
    'Office 365 E3',
  ],
  outro: [
    'VMware vSphere',
    'Red Hat Enterprise Linux',
    'SQL Server Standard',
  ],
} as const;

export const TIPOS_LICENCA = [
  'OEM',
  'Retail / FPP',
  'Volume (MAK)',
  'Volume (KMS)',
  'CSP / Assinatura',
  'Doação / Parceria',
] as const;
