export interface DashboardDevicesMetrics {
  total: number
  active: number
}

export interface DashboardSitesMetrics {
  total: number
}

export interface DashboardSoftwareMetrics {
  total: number
}

export interface DashboardDevicesBySite {
  site_id?: number | null
  site?: string | null
  code?: string | null
  total: number
}

export interface DashboardDevicesByVersion {
  versao: string
  total: number
}

export interface DashboardDevicesByStatus {
  status: string
  total: number
}

export interface DashboardSummaryResponse {
  devices: DashboardDevicesMetrics
  sites: DashboardSitesMetrics
  software: DashboardSoftwareMetrics
  devices_by_site: DashboardDevicesBySite[]
  devices_by_version: DashboardDevicesByVersion[]
  devices_by_status: DashboardDevicesByStatus[]
}

// =====================================================================
// Relatórios Analíticos (/dashboard/reports)
// =====================================================================

export interface ReportGroupItem {
  chave: string
  total: number
  percentual: number
}

export interface ReportMachineItem {
  id: number
  hostname: string
  ip?: string | null
  so: 'Windows' | 'Linux'
  versao_so?: string | null
  site_id?: number | null
  filial: string
  valor_campo: string
  rustdesk_id?: string | null
  status?: string | null
  data_coleta?: string | null
}

export interface ReportSummaryResponse {
  campo: string
  nome_campo: string
  total_maquinas: number
  total_grupos: number
  grupos: ReportGroupItem[]
  maquinas: ReportMachineItem[]
}

export interface ReportFilterParams {
  campo?: string
  plataforma?: string
  site_id?: number
  search?: string
  grupo_selecionado?: string
}

// =====================================================================
// Gráficos de Distribuição (/dashboard/charts)
// =====================================================================

export interface ChartSliceItem {
  label: string
  total: number
  percentual: number
  color: string
}

export interface DashboardChartsResponse {
  total_maquinas: number
  sistema_operacional: ChartSliceItem[]
  memoria_ram: ChartSliceItem[]
  tipo_ram: ChartSliceItem[]
  tipo_disco: ChartSliceItem[]
  status_coleta: ChartSliceItem[]
  filiais: ChartSliceItem[]
}
