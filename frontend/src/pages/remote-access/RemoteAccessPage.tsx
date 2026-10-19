import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { deviceService } from '../../services/deviceService'
import { siteService } from '../../services/siteService'
import { getRemoteAccessConfig } from '../../services/remoteAccessService'
import type { DeviceListItem } from '../../types/device'
import type { Site } from '../../types/site'
import type { ActiveRemoteSession, RemoteAccessConfig, SessionTabMode } from '../../types/remoteAccess'
import AgentInstallModal from './components/AgentInstallModal'
import EmbeddedSessionModal from './components/EmbeddedSessionModal'
import RemoteAccessBanner from './components/RemoteAccessBanner'
import RemoteDeviceCard from './components/RemoteDeviceCard'
import { SshTerminalModal } from '../devices/components/SshTerminalModal'

export default function RemoteAccessPage() {
  const { user } = useAuth()

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
  const [toastMsg, setToastMsg] = useState<string | null>(null)

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

  // Carrega dispositivos paginados diretamente do servidor (fim do per_page: 1500)
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

  const handleMeshLogout = () => {
    const logoutUrl = `${meshUrlBase}/logout`
    const win = window.open(logoutUrl, 'MeshLogoutWindow', 'width=450,height=350')
    if (win) {
      setTimeout(() => {
        try {
          win.close()
        } catch (_) {}
      }, 1500)
    }
    setActiveSession(null)
    setToastMsg('Sessão do MeshCentral encerrada com sucesso.')
    setTimeout(() => setToastMsg(null), 4000)
  }

  return (
    <div className="space-y-6">
      {/* Toast Notificação */}
      {toastMsg && (
        <div className="fixed bottom-4 right-4 z-50 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl ring-1 ring-slate-800 animate-in fade-in">
          {toastMsg}
        </div>
      )}

      {/* Banner Principal */}
      <RemoteAccessBanner
        meshUrl={meshUrlBase}
        canAccessServerConsole={canAccessServerConsole}
        onMeshLogout={handleMeshLogout}
        onOpenAgentHelp={() => setShowAgentModal(true)}
      />

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-1 flex-wrap items-center gap-3 min-w-[280px]">
          {/* Campo de Busca */}
          <div className="relative min-w-[240px] flex-1">
            <input
              type="text"
              placeholder="Buscar por hostname, IP, usuário ou loja..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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

          {/* Filtro de Filial */}
          <select
            value={filtroFilial}
            onChange={(e) => setFiltroFilial(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="todos">Todas as Filiais</option>
            {sites.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>

          {/* Filtro de SO */}
          <select
            value={filtroOs}
            onChange={(e) => setFiltroOs(e.target.value as any)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="todos">Todos os Sistemas</option>
            <option value="windows">Apenas Windows</option>
            <option value="linux">Apenas Linux</option>
          </select>

          {/* Filtro de Status */}
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as any)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="todos">Todos os Status</option>
            <option value="online">Apenas Online</option>
            <option value="offline">Apenas Offline</option>
          </select>
        </div>

        {/* Contador */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Estações encontradas:</span>
          <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 font-bold text-blue-700">
            {totalItems}
          </span>
        </div>
      </div>

      {/* Grid de Dispositivos */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-xl border border-slate-200 bg-white p-4"
            />
          ))}
        </div>
      ) : devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <svg className="mb-3 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 className="text-sm font-semibold text-slate-800">
            Nenhuma máquina encontrada
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Tente ajustar os filtros de busca ou filial para encontrar os dispositivos desejados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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

      {/* Controles de Paginação */}
      {totalItems > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>
              Exibindo <strong>{startIndex + 1}-{endIndex}</strong> de <strong>{totalItems}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <label htmlFor="rem-ps" className="text-slate-500">Por página:</label>
            <select
              id="rem-ps"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-700"
            >
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
            </select>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>

              <span className="px-2 text-xs font-medium text-slate-600">
                Página {currentPage} de {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Próxima
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
