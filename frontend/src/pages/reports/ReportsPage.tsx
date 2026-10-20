import { useEffect, useState, useMemo } from 'react'
import {
  BarChart3,
  PieChart,
  Search,
  X,
  RotateCcw,
} from 'lucide-react'
import { siteService } from '../../services/siteService'
import { getDashboardCharts, getDashboardReports } from '../../services/dashboardService'
import type { DashboardChartsResponse, ReportSummaryResponse } from '../../types/dashboard'
import type { Site } from '../../types/site'
import { SelectDropdown, SelectOption } from '../../components/common/SelectDropdown'
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

  // Paginação Server-Side da Tabela de Máquinas
  const [page, setPage] = useState<number>(1)
  const [perPage, setPerPage] = useState<number>(50)

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

  // Carrega dados de relatórios quando os filtros ou página mudam
  useEffect(() => {
    setLoadingReports(true)
    const numSiteId = siteId ? Number(siteId) : undefined

    getDashboardReports({
      campo,
      plataforma: plataforma || undefined,
      site_id: numSiteId,
      search: search || undefined,
      grupo_selecionado: grupoSelecionado || undefined,
      page,
      per_page: perPage,
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
  }, [campo, plataforma, siteId, search, grupoSelecionado, page, perPage])

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

  // Exportação CSV do relatório filtrado completo via export_all: true
  const handleExportCsv = async () => {
    try {
      const numSiteId = siteId ? Number(siteId) : undefined
      const fullData = await getDashboardReports({
        campo,
        plataforma: plataforma || undefined,
        site_id: numSiteId,
        search: search || undefined,
        grupo_selecionado: grupoSelecionado || undefined,
        export_all: true,
      })

      if (!fullData || fullData.maquinas.length === 0) return

      const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`
      const headers = ['Filial', 'Hostname', 'IP', 'Plataforma', 'Sistema Operacional', fullData.nome_campo]

      const rows = fullData.maquinas.map((m) =>
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
    } catch (err) {
      console.error('Erro ao exportar relatório:', err)
    }
  }

  // Filtragem rápida acionada por clique nos gráficos de distribuição
  const handleFilterByChart = (cat: string, label: string) => {
    setCampo(cat)
    setGrupoSelecionado(label)
    setPage(1)
    setActiveTab('analytics')

    setLoadingReports(true)
    const numSiteId = siteId ? Number(siteId) : undefined
    getDashboardReports({
      campo: cat,
      plataforma: plataforma || undefined,
      site_id: numSiteId,
      search: search || undefined,
      grupo_selecionado: label,
      page: 1,
      per_page: perPage,
    })
      .then((data) => {
        setReportData(data)
      })
      .catch((err) => {
        console.error('Erro ao filtrar relatório analítico a partir do gráfico:', err)
      })
      .finally(() => {
        setLoadingReports(false)
      })
  }

  // Opções para SelectDropdown
  const campoOptions: SelectOption[] = [
    { value: 'processador', label: 'Processador' },
    { value: 'modelo', label: 'Placa-mãe / Modelo' },
    { value: 'ram', label: 'Memória RAM' },
    { value: 'ram_tipo', label: 'Tipo de RAM' },
    { value: 'disco', label: 'Tamanho do Disco' },
    { value: 'disco_tipo', label: 'Tipo de Armazenamento' },
    { value: 'sistema', label: 'Sistema Operacional' },
    { value: 'windows_release', label: 'Release Windows' },
    { value: 'fabricante', label: 'Fabricante' },
    { value: 'dominio', label: 'Domínio de Rede' },
    { value: 'filial', label: 'Loja / Filial' },
    { value: 'status', label: 'Status Operacional' },
  ]

  const plataformaOptions: SelectOption[] = [
    { value: '', label: 'Linux e Windows' },
    { value: 'Windows', label: 'Apenas Windows' },
    { value: 'Linux', label: 'Apenas Linux' },
  ]

  const siteOptions: SelectOption[] = useMemo(() => [
    { value: '', label: 'Todas as Filiais' },
    ...sites.map((s) => ({ value: String(s.id), label: `${s.name} (${s.code})` })),
  ], [sites])

  const handleResetFilters = () => {
    setCampo('processador')
    setPlataforma('')
    setSiteId('')
    setSearch('')
    setGrupoSelecionado(null)
    setPage(1)
  }

  const hasActiveFilters = Boolean(
    campo !== 'processador' ||
    plataforma !== '' ||
    siteId !== '' ||
    search !== '' ||
    grupoSelecionado !== null
  )

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página com Abas Padronizadas */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <BarChart3 className="h-6 w-6 text-orange-400" />
            Relatórios &amp; Indicadores Analíticos
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Consolidação em tempo real de hardware, software, licenças e conformidade
          </p>
        </div>

        {/* Seletor de Abas em Obsidian & Amber */}
        <div className="flex rounded-lg border border-[#1E2636] bg-[#121721] p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('charts')}
            className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'charts'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-[#181F2E]'
            }`}
          >
            <PieChart className="h-4 w-4" />
            <span>Visão Gráfica</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-[#181F2E]'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Explorador Analítico</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros Superior */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-[#1E2636] bg-[#121721] p-3 shadow-xs">
        {activeTab === 'analytics' && (
          <div className="w-52 shrink-0">
            <SelectDropdown
              value={campo}
              onChange={(val) => {
                setCampo(val)
                setGrupoSelecionado(null)
                setPage(1)
              }}
              options={campoOptions}
              placeholder="Agrupar por..."
              triggerClassName="py-1.5 text-xs"
            />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="w-40 shrink-0">
            <SelectDropdown
              value={plataforma}
              onChange={(val) => {
                setPlataforma(val)
                setGrupoSelecionado(null)
                setPage(1)
              }}
              options={plataformaOptions}
              placeholder="Plataforma..."
              triggerClassName="py-1.5 text-xs"
            />
          </div>
        )}

        <div className="w-48 shrink-0">
          <SelectDropdown
            value={siteId}
            onChange={(val) => {
              setSiteId(val)
              setGrupoSelecionado(null)
              setPage(1)
            }}
            options={siteOptions}
            placeholder="Filial..."
            triggerClassName="py-1.5 text-xs"
          />
        </div>

        {activeTab === 'analytics' && (
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar valor ou hostname (ex.: Core i5, 16 GB, DESKTOP-J2VG15L)..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setGrupoSelecionado(null)
                setPage(1)
              }}
              className="w-full rounded-lg border border-[#263044] bg-[#181F2E] py-1.5 pl-8 pr-7 text-xs text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setGrupoSelecionado(null)
                  setPage(1)
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                title="Limpar busca"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Botão Limpar Padronizado */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            title="Limpar todos os filtros"
            className="flex items-center gap-1.5 bg-[#181F2E] hover:bg-[#222B3D] text-slate-300 border border-[#263044] px-3 py-2 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ml-auto"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Limpar</span>
          </button>
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
              onSelectKey={(key) => {
                setGrupoSelecionado(key)
                setPage(1)
              }}
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
              page={page}
              perPage={perPage}
              totalItems={reportData?.maquinas_total ?? reportData?.total_maquinas ?? 0}
              totalPages={reportData?.total_pages ?? 1}
              onPageChange={setPage}
              onPerPageChange={(newPerPage) => {
                setPerPage(newPerPage)
                setPage(1)
              }}
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
