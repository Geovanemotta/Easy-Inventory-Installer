import { useEffect, useState } from 'react'
import { siteService } from '../../services/siteService'
import { getDashboardCharts, getDashboardReports } from '../../services/dashboardService'
import type { DashboardChartsResponse, ReportSummaryResponse } from '../../types/dashboard'
import type { Site } from '../../types/site'
import DistributionCharts from './components/DistributionCharts'
import ReportGroupList from './components/ReportGroupList'
import ReportMachinesTable from './components/ReportMachinesTable'

type ActiveTab = 'analytics' | 'charts'

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('analytics')

  // Filtros de Relatório
  const [campo, setCampo] = useState<string>('processador')
  const [plataforma, setPlataforma] = useState<string>('')
  const [siteId, setSiteId] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [grupoSelecionado, setGrupoSelecionado] = useState<string | null>(null)

  // Dados
  const [sites, setSites] = useState<Site[]>([])
  const [reportData, setReportData] = useState<ReportSummaryResponse | null>(null)
  const [chartsData, setChartsData] = useState<DashboardChartsResponse | null>(null)

  const [loadingReports, setLoadingReports] = useState(false)
  const [loadingCharts, setLoadingCharts] = useState(false)

  // Carrega filiais
  useEffect(() => {
    siteService
      .listSites()
      .then((data: Site[]) => setSites(data))
      .catch((err: unknown) => console.error('Erro ao carregar filiais:', err))
  }, [])

  // Carrega dados de relatórios quando os filtros mudam
  useEffect(() => {
    setLoadingReports(true)
    const numSiteId = siteId ? Number(siteId) : undefined

    getDashboardReports({
      campo,
      plataforma: plataforma || undefined,
      site_id: numSiteId,
      search: search || undefined,
      grupo_selecionado: grupoSelecionado || undefined,
    })
      .then((data) => {
        setReportData(data)
      })
      .catch((err) => {
        console.error('Erro ao carregar relatório analítico:', err)
      })
      .finally(() => {
        setLoadingReports(false)
      })
  }, [campo, plataforma, siteId, search, grupoSelecionado])

  // Carrega dados dos gráficos de distribuição
  useEffect(() => {
    if (activeTab === 'charts') {
      setLoadingCharts(true)
      const numSiteId = siteId ? Number(siteId) : undefined
      getDashboardCharts(numSiteId)
        .then((data) => {
          setChartsData(data)
        })
        .catch((err) => {
          console.error('Erro ao carregar gráficos de distribuição:', err)
        })
        .finally(() => {
          setLoadingCharts(false)
        })
    }
  }, [activeTab, siteId])

  // Exportação CSV do relatório filtrado
  const handleExportCsv = () => {
    if (!reportData || reportData.maquinas.length === 0) return

    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const headers = ['Filial', 'Hostname', 'IP', 'Plataforma', 'Sistema Operacional', reportData.nome_campo]

    const rows = reportData.maquinas.map((m) =>
      [
        m.filial,
        m.hostname,
        m.ip || '',
        m.so,
        m.versao_so || m.so,
        m.valor_campo,
      ]
        .map(escapeCsv)
        .join(';')
    )

    const csvContent = '\ufeff' + [headers.map(escapeCsv).join(';'), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `relatorio-${campo}-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  // Filtragem rápida acionada por clique nos gráficos de distribuição
  const handleFilterByChart = (cat: string, label: string) => {
    setCampo(cat)
    setGrupoSelecionado(label)
    setActiveTab('analytics')
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página com Abas */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Relatórios e Indicadores Analíticos
          </h1>
          <p className="text-xs text-slate-500">
            Consolidação em tempo real de hardware, software, licenças e conformidade
          </p>
        </div>

        {/* Seletor de Abas */}
        <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'analytics'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Explorador Analítico
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('charts')}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'charts'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
            Painel de Distribuição
          </button>
        </div>
      </div>

      {/* Barra de Filtros Unificada */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {activeTab === 'analytics' && (
          <div className="flex flex-col gap-1">
            <label htmlFor="rep-campo" className="text-[11px] font-semibold text-slate-500">
              Agrupar por
            </label>
            <select
              id="rep-campo"
              value={campo}
              onChange={(e) => {
                setCampo(e.target.value)
                setGrupoSelecionado(null)
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="processador">Processador</option>
              <option value="modelo">Placa-mãe / Modelo</option>
              <option value="ram">Memória RAM</option>
              <option value="ram_tipo">Tipo de RAM (DDR3, DDR4, DDR5...)</option>
              <option value="disco">Tamanho do Disco</option>
              <option value="sistema">Sistema Operacional</option>
              <option value="windows_release">Versão Release Windows</option>
              <option value="fabricante">Fabricante</option>
              <option value="dominio">Domínio de Rede</option>
              <option value="filial">Loja / Filial</option>
              <option value="status">Status Operacional</option>
            </select>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="flex flex-col gap-1">
            <label htmlFor="rep-plat" className="text-[11px] font-semibold text-slate-500">
              Plataforma
            </label>
            <select
              id="rep-plat"
              value={plataforma}
              onChange={(e) => {
                setPlataforma(e.target.value)
                setGrupoSelecionado(null)
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Linux e Windows</option>
              <option value="Windows">Apenas Windows</option>
              <option value="Linux">Apenas Linux</option>
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="rep-site" className="text-[11px] font-semibold text-slate-500">
            Filial / Loja
          </label>
          <select
            id="rep-site"
            value={siteId}
            onChange={(e) => {
              setSiteId(e.target.value)
              setGrupoSelecionado(null)
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Todas as Filiais</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        {activeTab === 'analytics' && (
          <div className="flex flex-1 flex-col gap-1 min-w-[200px]">
            <label htmlFor="rep-search" className="text-[11px] font-semibold text-slate-500">
              Buscar valor ou hostname
            </label>
            <div className="relative">
              <input
                id="rep-search"
                type="text"
                placeholder="Ex.: Core i5, 16 GB, DESKTOP-J2VG15L, mc-server..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setGrupoSelecionado(null)
                }}
                className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
              <svg
                className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Conteúdo da Aba */}
      {activeTab === 'analytics' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 min-h-[500px]">
          {/* Coluna Esquerda: Grupos e Categorias (4 colunas) */}
          <div className="lg:col-span-4 xl:col-span-4 h-full">
            <ReportGroupList
              nomeCampo={reportData?.nome_campo || 'Campo'}
              grupos={reportData?.grupos || []}
              totalMaquinas={reportData?.total_maquinas || 0}
              selectedKey={grupoSelecionado}
              onSelectKey={(key) => setGrupoSelecionado(key)}
              loading={loadingReports}
            />
          </div>

          {/* Coluna Direita: Tabela de Máquinas do Grupo Selecionado (8 colunas) */}
          <div className="lg:col-span-8 xl:col-span-8 h-full">
            <ReportMachinesTable
              nomeCampo={reportData?.nome_campo || 'Campo'}
              selectedKey={grupoSelecionado}
              maquinas={reportData?.maquinas || []}
              loading={loadingReports}
              onExportCsv={handleExportCsv}
            />
          </div>
        </div>
      ) : (
        <DistributionCharts
          data={chartsData}
          loading={loadingCharts}
          onFilterByLabel={handleFilterByChart}
        />
      )}
    </div>
  )
}
