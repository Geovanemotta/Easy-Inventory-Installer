import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Monitor,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  Radio,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { deviceService } from '../../services/deviceService'
import { siteService } from '../../services/siteService'
import { getRemoteAccessConfig } from '../../services/remoteAccessService'
import type { DeviceListItem } from '../../types/device'
import type { Site } from '../../types/site'
import type { ActiveRemoteSession, RemoteAccessConfig, SessionTabMode } from '../../types/remoteAccess'
import { SelectDropdown, SelectOption } from '../../components/common/SelectDropdown'
import AgentInstallModal from './components/AgentInstallModal'
import EmbeddedSessionModal from './components/EmbeddedSessionModal'
import RemoteDeviceCard from './components/RemoteDeviceCard'
import { SshTerminalModal } from '../devices/components/SshTerminalModal'

export default function RemoteAccessPage() {
  const { user, isAdmin } = useAuth()

  const [config, setConfig] = useState<RemoteAccessConfig | null>(null)
  const [devices, setDevices] = useState<DeviceListItem[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [search, setSearch] = useState('')
  const [filtroOs, setFiltroOs] = useState<'todos' | 'windows' | 'linux'>('todos')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'online' | 'offline'>('todos')
  const [filtroFilial, setFiltroFilial] = useState<string>('todos')

  // Paginação Server-Side
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Modais de Sessão e Agente
  const [activeSession, setActiveSession] = useState<ActiveRemoteSession | null>(null)
  const [sshDevice, setSshDevice] = useState<DeviceListItem | null>(null)
  const [showAgentModal, setShowAgentModal] = useState(false)
  const [toastMsg, _setToastMsg] = useState<string | null>(null)

  // Permissões
  const isOperadorMatriz = Boolean(user?.roles?.includes('operador_matriz'))
  const canAccessServerConsole =
    !isOperadorMatriz &&
    Boolean(user?.is_superadmin || user?.roles?.includes('admin'))

  // Carrega configuração do MeshCentral e filiais na montagem
  useEffect(() => {
    Promise.all([
      getRemoteAccessConfig().catch((err: unknown) => {
        console.warn('Falha ao obter configuração do MeshCentral:', err)
        return null
      }),
      siteService.listSites().catch((err: unknown) => {
        console.error('Falha ao obter lista de filiais:', err)
        return []
      }),
    ]).then(([cfgRes, sitesRes]) => {
      if (cfgRes) setConfig(cfgRes)
      if (sitesRes) setSites(sitesRes)
    })
  }, [])

  // Carrega dispositivos paginados diretamente do servidor
  const loadDevices = useCallback(async () => {
    setLoading(true)
    try {
      const siteIdParam = filtroFilial !== 'todos' && !isNaN(Number(filtroFilial)) ? Number(filtroFilial) : undefined
      const lojaParam = filtroFilial !== 'todos' && isNaN(Number(filtroFilial)) ? filtroFilial : undefined
      const platParam = filtroOs !== 'todos' ? filtroOs : undefined
      const statusParam = filtroStatus !== 'todos' ? filtroStatus : undefined

      const devRes = await deviceService.listDevices({
        page: currentPage,
        per_page: pageSize,
        search: search.trim() || undefined,
        site_id: siteIdParam,
        loja: lojaParam,
        plataforma: platParam,
        status_conexao: statusParam,
        inativas: false,
      })

      if (devRes && 'items' in devRes) {
        setDevices(devRes.items)
        setTotalItems(devRes.pagination.total)
        setTotalPages(devRes.pagination.total_pages)
      }
    } catch (err: unknown) {
      console.error('Falha ao obter lista de estações:', err)
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, search, filtroOs, filtroStatus, filtroFilial])

  useEffect(() => {
    loadDevices()
  }, [loadDevices])

  // Resolve a URL base do MeshCentral com base no host atual de acesso
  const meshUrlBase = useMemo(() => {
    if (typeof window !== 'undefined') {
      const currentHost = window.location.hostname || 'localhost'
      const port = config?.mesh_port || 4443
      return `https://${currentHost}:${port}`
    }
    return config?.mesh_url || 'https://localhost:4443'
  }, [config])

  // Helper para gerar URLs dos modos MeshCentral
  const buildMeshUrl = (hostname: string, mode: SessionTabMode, embedded: boolean) => {
    const viewmodeMap: Record<SessionTabMode, number> = {
      desktop: 11,
      files: 13,
      terminal: 12,
    }
    const vm = viewmodeMap[mode]
    const hideParam = embedded ? 'hide=2' : 'hide=0'
    return `${meshUrlBase}/?viewmode=${vm}&gotodevicename=${encodeURIComponent(hostname)}&${hideParam}`
  }

  // Reset de página ao alterar filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [search, filtroOs, filtroStatus, filtroFilial, pageSize])

  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + devices.length, totalItems)

  // Ações de Conexão
  const handleConnectNewTab = (device: DeviceListItem) => {
    const url = buildMeshUrl(device.hostname, 'desktop', false)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleConnectEmbedded = (device: DeviceListItem) => {
    const url = buildMeshUrl(device.hostname, 'desktop', true)
    setActiveSession({
      deviceId: device.id,
      hostname: device.hostname,
      ip: device.ip,
      url,
      tab: 'desktop',
    })
  }

  const handleOpenFiles = (device: DeviceListItem) => {
    const url = buildMeshUrl(device.hostname, 'files', true)
    setActiveSession({
      deviceId: device.id,
      hostname: device.hostname,
      ip: device.ip,
      url,
      tab: 'files',
    })
  }

  const handleOpenTerminal = (device: DeviceListItem) => {
    const isWin =
      device.familia_so === 'Windows' ||
      Boolean(device.so_formatado && device.so_formatado.toLowerCase().includes('windows')) ||
      Boolean(device.sistema && device.sistema.toLowerCase().includes('windows'))

    if (isWin) {
      const url = buildMeshUrl(device.hostname, 'terminal', true)
      setActiveSession({
        deviceId: device.id,
        hostname: device.hostname,
        ip: device.ip,
        url,
        tab: 'terminal',
      })
    } else {
      setSshDevice(device)
    }
  }

  const handleChangeMode = (mode: SessionTabMode) => {
    if (!activeSession) return
    const url = buildMeshUrl(activeSession.hostname, mode, true)
    setActiveSession({
      ...activeSession,
      tab: mode,
      url,
    })
  }

  const handleOpenExternal = () => {
    if (!activeSession) return
    const url = buildMeshUrl(activeSession.hostname, activeSession.tab, false)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // Opções para SelectDropdown
  const siteOptions: SelectOption[] = useMemo(() => [
    { value: 'todos', label: 'Todas as Filiais' },
    ...sites.map((s) => ({ value: s.name, label: s.name })),
  ], [sites])

  const osOptions: SelectOption[] = [
    { value: 'todos', label: 'Todos os Sistemas' },
    { value: 'windows', label: 'Apenas Windows' },
    { value: 'linux', label: 'Apenas Linux' },
  ]

  const statusOptions: SelectOption[] = [
    { value: 'todos', label: 'Todos os Status' },
    { value: 'online', label: 'Apenas Online' },
    { value: 'offline', label: 'Apenas Offline' },
  ]

  const perPageOptions: SelectOption[] = [
    { value: '12', label: '12 por pág.' },
    { value: '24', label: '24 por pág.' },
    { value: '48', label: '48 por pág.' },
  ]

  return (
    <div className="space-y-6">
      {/* Toast Notificação */}
      {toastMsg && (
        <div className="fixed bottom-4 right-4 z-50 rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-xs font-semibold text-white shadow-xl animate-in fade-in">
          {toastMsg}
        </div>
      )}

      {/* Cabeçalho Padronizado no estilo Obsidian & Amber */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Radio className="h-6 w-6 text-orange-400" />
            Acesso Remoto &amp; Suporte
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Controle remoto cooperativo, transferência de arquivos e terminal nativo via MeshCentral e RustDesk
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-xs font-semibold text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            MeshCentral Online
          </span>

          {canAccessServerConsole && (
            <a
              href={meshUrlBase}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-[#263044] bg-[#181F2E] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#222B3D] hover:text-white transition-all shadow-xs"
              title="Abrir o painel administrativo do servidor MeshCentral"
            >
              <ExternalLink className="h-3.5 w-3.5 text-orange-400" />
              <span>Console MeshCentral</span>
            </a>
          )}
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-[#1E2636] bg-[#121721] p-3 shadow-xs">
        {/* Campo de Busca */}
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por hostname, IP, usuário ou loja..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[#263044] bg-[#181F2E] py-1.5 pl-8 pr-7 text-xs text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
              title="Limpar busca"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Filtro de Filial */}
        <div className="w-48 shrink-0">
          <SelectDropdown
            value={filtroFilial}
            onChange={setFiltroFilial}
            options={siteOptions}
            placeholder="Filial..."
            triggerClassName="py-1.5 text-xs"
          />
        </div>

        {/* Filtro de SO */}
        <div className="w-38 shrink-0">
          <SelectDropdown
            value={filtroOs}
            onChange={(val) => setFiltroOs(val as any)}
            options={osOptions}
            placeholder="Sistema..."
            triggerClassName="py-1.5 text-xs"
          />
        </div>

        {/* Filtro de Status */}
        <div className="w-36 shrink-0">
          <SelectDropdown
            value={filtroStatus}
            onChange={(val) => setFiltroStatus(val as any)}
            options={statusOptions}
            placeholder="Status..."
            triggerClassName="py-1.5 text-xs"
          />
        </div>

        {/* Botão de Instalar Agente Mesh integrado na barra de filtros */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowAgentModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-500/15 hover:bg-orange-500/25 px-3 py-1.5 text-xs font-semibold text-orange-400 transition-colors shadow-xs cursor-pointer shrink-0 ml-auto"
            title="Ver comandos de instalação do MeshAgent em novas máquinas"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Instalar Agente</span>
          </button>
        )}
      </div>

      {/* Grid de Dispositivos */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-xl border border-[#1E2636] bg-[#121721] p-4"
            />
          ))}
        </div>
      ) : devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#1E2636] bg-[#121721] py-16 text-center">
          <Monitor className="mb-3 h-10 w-10 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-200">
            Nenhuma máquina encontrada
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Tente ajustar os filtros de busca ou filial para encontrar os dispositivos desejados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {devices.map((d) => {
            const isOnline = d.status_conexao === 'online' || d.status === 'OK'
            return (
              <RemoteDeviceCard
                key={d.id}
                device={d}
                isOnline={isOnline}
                onConnectNewTab={handleConnectNewTab}
                onConnectEmbedded={handleConnectEmbedded}
                onOpenFiles={handleOpenFiles}
                onOpenTerminal={handleOpenTerminal}
              />
            )
          })}
        </div>
      )}

      {/* Controles de Paginação Padronizados */}
      {totalItems > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#1E2636] pt-4 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <div>
              Exibindo{' '}
              <span className="font-semibold text-white font-mono tabular-nums">
                {startIndex + 1}
              </span>{' '}
              a{' '}
              <span className="font-semibold text-white font-mono tabular-nums">
                {endIndex}
              </span>{' '}
              de{' '}
              <span className="font-semibold text-white font-mono tabular-nums">
                {totalItems}
              </span>{' '}
              estações
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Por página:</span>
              <div className="w-28 shrink-0">
                <SelectDropdown
                  value={String(pageSize)}
                  onChange={(val) => setPageSize(Number(val))}
                  options={perPageOptions}
                  triggerClassName="py-1 text-xs"
                />
              </div>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 rounded-lg border border-[#263044] bg-[#181F2E] px-2.5 py-1 text-slate-300 hover:bg-[#263044] hover:text-white disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Anterior
              </button>

              <span className="px-2 font-medium text-slate-300 font-mono tabular-nums">
                Página <strong className="font-semibold text-white">{currentPage}</strong> de {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages || loading}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1 rounded-lg border border-[#263044] bg-[#181F2E] px-2.5 py-1 text-slate-300 hover:bg-[#263044] hover:text-white disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                Próxima <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal de Sessão Embutida */}
      {activeSession && (
        <EmbeddedSessionModal
          session={activeSession}
          onClose={() => setActiveSession(null)}
          onChangeMode={handleChangeMode}
          onOpenExternal={handleOpenExternal}
        />
      )}

      {/* Modal SSH Nativo para Linux */}
      {sshDevice && (
        <SshTerminalModal
          device={sshDevice}
          onClose={() => setSshDevice(null)}
        />
      )}

      {/* Modal de Instalação de Agente */}
      {showAgentModal && (
        <AgentInstallModal
          serverHost={config?.server_host || ''}
          meshPort={config?.mesh_port || 4443}
          onClose={() => setShowAgentModal(false)}
        />
      )}
    </div>
  )
}

