import { apiRequest } from './apiClient'
import type {
  DashboardChartsResponse,
  DashboardSummaryResponse,
  ReportFilterParams,
  ReportSummaryResponse,
} from '../types/dashboard'

export async function getDashboardSummary(): Promise<DashboardSummaryResponse> {
  return apiRequest<DashboardSummaryResponse>('/dashboard/summary')
}

export async function getDashboardReports(
  params: ReportFilterParams = {}
): Promise<ReportSummaryResponse> {
  const query = new URLSearchParams()
  if (params.campo) query.set('campo', params.campo)
  if (params.plataforma) query.set('plataforma', params.plataforma)
  if (params.site_id) query.set('site_id', String(params.site_id))
  if (params.search) query.set('search', params.search)
  if (params.grupo_selecionado) query.set('grupo_selecionado', params.grupo_selecionado)

  const q = query.toString()
  return apiRequest<ReportSummaryResponse>(`/dashboard/reports${q ? `?${q}` : ''}`)
}

export async function getDashboardCharts(
  siteId?: number
): Promise<DashboardChartsResponse> {
  const q = siteId ? `?site_id=${siteId}` : ''
  return apiRequest<DashboardChartsResponse>(`/dashboard/charts${q}`)
}
