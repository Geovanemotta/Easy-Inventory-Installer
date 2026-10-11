import { Fragment, useEffect, useMemo, useState } from 'react'
import '../styles/pages/remote-access.css'
import {
  getRemoteAccessConfig,
  type RemoteAccessConfig,
  type UserResponse,
} from '../services/api'
import {
  obterStatusConexao,
  versaoCompleta,
  type EnrichedMachine,
} from '../services/inventoryHelpers'

type RemoteAccessPageProps = {
  inventario: EnrichedMachine[]
  currentUser?: UserResponse | null
  onOpenSsh: (device: EnrichedMachine) => void
  copiarTexto: (texto: string) => void
  showToast?: (msg: string) => void
}

type SessionTabMode = 'desktop' | 'files' | 'terminal'

export default function RemoteAccessPage({
  inventario,
  currentUser,
  onOpenSsh,
  copiarTexto: _copiarTexto,
  showToast,
}: RemoteAccessPageProps) {
  const [config, setConfig] = useState<RemoteAccessConfig | null>(null)
  const [search, setSearch] = useState('')
  const [filtroOs, setFiltroOs] = useState<'todos' | 'windows' | 'linux'>('todos')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'online' | 'offline'>('todos')
  const [filtroFilial, setFiltroFilial] = useState<string>('todos')

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)

  // Sessão remota ativa no modal/iframe
  const [activeSession, setActiveSession] = useState<{
    device: EnrichedMachine
    url: string
    tab: SessionTabMode
  } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Controle de permissões do operador matriz
  const isOperadorMatriz = Boolean(currentUser?.roles?.includes('operador_matriz'))
  const canAccessServerConsole = !isOperadorMatriz && Boolean(
    currentUser?.is_superadmin || currentUser?.roles?.includes('admin')
  )

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    getRemoteAccessConfig(token)
      .then((cfg) => {
        setConfig(cfg)
      })
      .catch((err) => {
        console.warn('Configuração de acesso remoto indisponível:', err)
      })
  }, [])

  // Lista única de filiais para o filtro
  const filiaisDisponiveis = useMemo(() => {
    const s = new Set<string>()
    inventario.forEach((m) => {
      if (m._f.filial) s.add(m._f.filial)
    })
    return Array.from(s).sort()
  }, [inventario])

  // Filtragem das máquinas
  const maquinasFiltradas = useMemo(() => {
    const q = search.trim().toLowerCase()
    return inventario.filter((m) => {
      const matchSearch =
        !q ||
        m.hostname?.toLowerCase().includes(q) ||
        m.ip?.toLowerCase().includes(q) ||
        m.usuario?.toLowerCase().includes(q) ||
        m._f.filial?.toLowerCase().includes(q)

      const isWin = m._so === 'Windows'
      const matchOs =
        filtroOs === 'todos' ||
        (filtroOs === 'windows' && isWin) ||
        (filtroOs === 'linux' && !isWin)

      const statusConexao = obterStatusConexao(m.data_coleta)
      const isOnline = statusConexao.status === 'online'
      const matchStatus =
        filtroStatus === 'todos' ||
        (filtroStatus === 'online' && isOnline) ||
        (filtroStatus === 'offline' && !isOnline)

      const matchFilial =
        filtroFilial === 'todos' || m._f.filial === filtroFilial

      return matchSearch && matchOs && matchStatus && matchFilial
    })
  }, [inventario, search, filtroOs, filtroStatus, filtroFilial])

  // Reseta para a primeira página sempre que os filtros ou tamanho de página mudarem
  useEffect(() => {
    setCurrentPage(1)
  }, [search, filtroOs, filtroStatus, filtroFilial, pageSize])

  // Cálculos de paginação
  const totalItems = maquinasFiltradas.length
  const totalPaginas = Math.max(1, Math.ceil(totalItems / pageSize))
  const inicio = (currentPage - 1) * pageSize
  const fim = Math.min(inicio + pageSize, totalItems)
  const maquinasPaginadas = useMemo(() => {
    return maquinasFiltradas.slice(inicio, fim)
  }, [maquinasFiltradas, inicio, fim])

  // Resolve a URL do MeshCentral usando estritamente o host pelo qual o navegador está acessando
  const meshUrlBase = useMemo(() => {
    if (typeof window !== 'undefined') {
      const currentHost = window.location.hostname || 'localhost'
      const port = config?.mesh_port || 4443
      return `https://${currentHost}:${port}`
    }
    return config?.mesh_url || 'https://localhost:4443'
  }, [config])

  const gerarUrlModo = (device: EnrichedMachine, modo: SessionTabMode, embedded: boolean = false) => {
    // 11 = Desktop (Tela) / 13 = Files (Gerenciador de Arquivos) / 12 = Terminal (Shell)
    const viewmodeMap: Record<SessionTabMode, number> = {
      desktop: 11,
      files: 13,
      terminal: 12,
    }
    const vm = viewmodeMap[modo]
    // Em nova aba (embedded=false), NÃO ocultamos o topo (hide=0) para permitir ver a conta logada e o botão de LOGOUT / SAIR no MeshCentral
    // Embutido no modal (embedded=true), oculta apenas menus laterais (hide=2)
    const hideParam = embedded ? 'hide=2' : 'hide=0'
    return `${meshUrlBase}/?viewmode=${vm}&gotodevicename=${encodeURIComponent(device.hostname)}&${hideParam}`
  }

  const handleOpenDesktop = (device: EnrichedMachine) => {
    const targetUrl = gerarUrlModo(device, 'desktop', true)
    setActiveSession({
      device,
      url: targetUrl,
      tab: 'desktop',
    })
  }

  const handleOpenFiles = (device: EnrichedMachine) => {
    const targetUrl = gerarUrlModo(device, 'files', true)
    setActiveSession({
      device,
      url: targetUrl,
      tab: 'files',
    })
  }

  const handleOpenTerminal = (device: EnrichedMachine) => {
    const targetUrl = gerarUrlModo(device, 'terminal', true)
    setActiveSession({
      device,
      url: targetUrl,
      tab: 'terminal',
    })
  }

  const handleTrocarAbaSessao = (novoModo: SessionTabMode) => {
    if (!activeSession) return
    const targetUrl = gerarUrlModo(activeSession.device, novoModo, true)
    setActiveSession({
      ...activeSession,
      tab: novoModo,
      url: targetUrl,
    })
  }

  const handleOpenNewTab = (device: EnrichedMachine) => {
    const targetUrl = gerarUrlModo(device, 'desktop', false)
    window.open(targetUrl, '_blank', 'noopener,noreferrer')
  }

  const handleOpenExternal = () => {
    if (!activeSession) return
    const targetUrl = gerarUrlModo(activeSession.device, activeSession.tab, false)
    window.open(targetUrl, '_blank', 'noopener,noreferrer')
  }

  const handleMeshLogout = () => {
    const logoutUrl = `${meshUrlBase}/logout`

    // Abre um popup temporário para garantir requisição direta de topo que invalida o cookie HttpOnly xid
    const win = window.open(logoutUrl, 'MeshLogoutWindow', 'width=450,height=350')
    if (win) {
      setTimeout(() => {
        try { win.close() } catch (_) {}
      }, 1500)
    }

    // Também dispara via iframe de apoio
    try {
      const ifr = document.createElement('iframe')
      ifr.style.display = 'none'
      ifr.src = logoutUrl
      document.body.appendChild(ifr)
      setTimeout(() => {
        try { ifr.remove() } catch (_) {}
      }, 2000)
    } catch (_) {}

    setActiveSession(null)
    if (showToast) {
      showToast('Sessão do MeshCentral encerrada. Ao reconectar, informe o novo usuário.')
    }
  }

  return (
    <div className="remote-page-container">
      {/* Banner Principal com Status */}
      <div className="remote-banner">
        <div className="remote-banner-left">
          <div className="remote-banner-icon">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
              <circle cx="12" cy="10" r="2" />
            </svg>
          </div>
          <div className="remote-banner-text">
            <h2>
              Acesso Remoto Integrado
              <span className="remote-tag-live">MeshCentral Ativo</span>
            </h2>
            <p>
              Controle remoto cooperativo (Desktop, transferência direta de arquivos e terminal nativo sem limite de conexões).
            </p>
          </div>
        </div>

        {canAccessServerConsole && (
          <div className="remote-banner-actions">
            <a
              href={meshUrlBase}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-mesh-console"
              title="Abrir o painel administrativo do MeshCentral em nova aba"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              <span>Console do Servidor</span>
            </a>

            <button
              type="button"
              className="btn-mesh-logout"
              onClick={handleMeshLogout}
              title="Encerrar a sessão ativa do MeshCentral para permitir a troca de usuário"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Trocar Usuário (Sair do Mesh)</span>
            </button>
          </div>
        )}
      </div>

      {/* Barra de Ferramentas / Filtros */}
      <div className="remote-toolbar">
        <div className="remote-search-box">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="remote-search-input"
            placeholder="Buscar por hostname, IP, usuário ou filial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="remote-filters">
          <select
            className="remote-select"
            value={filtroFilial}
            onChange={(e) => setFiltroFilial(e.target.value)}
          >
            <option value="todos">Todas as Filiais</option>
            {filiaisDisponiveis.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <select
            className="remote-select"
            value={filtroOs}
            onChange={(e) => setFiltroOs(e.target.value as any)}
          >
            <option value="todos">Todos os Sistemas</option>
            <option value="windows">Apenas Windows</option>
            <option value="linux">Apenas Linux</option>
          </select>

          <select
            className="remote-select"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as any)}
          >
            <option value="todos">Todos os Status</option>
            <option value="online">Apenas Online</option>
            <option value="offline">Apenas Offline</option>
          </select>
        </div>

        <div className="remote-counters">
          <span>Estações listadas:</span>
          <span className="counter-badge">{maquinasFiltradas.length}</span>
        </div>
      </div>

      {/* Grid de Dispositivos Paginados */}
      <div className="remote-grid">
        {maquinasPaginadas.map((m) => {
          const isWin = m._so === 'Windows'
          const st = obterStatusConexao(m.data_coleta)
          const isOnline = st.status === 'online'
          return (
            <div key={m.id || m.hostname} className="remote-card">
              <div className="remote-card-top">
                <div className="remote-card-host">
                  <div className={`remote-os-icon ${isWin ? 'remote-os-win' : 'remote-os-linux'}`}>
                    {isWin ? 'W' : 'L'}
                  </div>
                  <div className="remote-host-info">
                    <strong>{m.hostname}</strong>
                    <span>{m.ip || 'Sem IP'}</span>
                  </div>
                </div>

                <div className={isOnline ? 'remote-badge-online' : 'remote-badge-offline'}>
                  <span className="remote-dot" />
                  <span>{isOnline ? 'Online' : 'Offline'}</span>
                </div>
              </div>

              <div className="remote-card-meta">
                <div className="meta-field">
                  <span>Filial / Loja:</span>
                  <b>{m._f.filial || '-'}</b>
                </div>
                <div className="meta-field">
                  <span>Usuário:</span>
                  <b>{m.usuario || '-'}</b>
                </div>
                <div className="meta-field" style={{ gridColumn: 'span 2' }}>
                  <span>Sistema Operacional:</span>
                  <b>{versaoCompleta(m) || 'Desconhecido'}</b>
                </div>
              </div>

              <div className="remote-card-actions">
                <button
                  type="button"
                  className="btn-remote-connect-primary"
                  onClick={() => handleOpenNewTab(m)}
                  title="Conectar e assumir controle da tela remota em nova guia dedicada (Recomendado)"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  <span>Conectar Desktop</span>
                </button>

                <div className="remote-card-subactions">
                  <button
                    type="button"
                    className="btn-remote-sub btn-sub-embedded"
                    onClick={() => handleOpenDesktop(m)}
                    title="Visualizar em janela embutida na página"
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18" />
                    </svg>
                    <span>Embutido</span>
                  </button>

                  <button
                    type="button"
                    className="btn-remote-sub btn-sub-files"
                    onClick={() => handleOpenFiles(m)}
                    title="Gerenciador de arquivos e pastas"
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>Arquivos</span>
                  </button>

                  <button
                    type="button"
                    className="btn-remote-sub btn-sub-terminal"
                    onClick={() => {
                      if (isWin) {
                        handleOpenTerminal(m)
                      } else {
                        onOpenSsh(m)
                      }
                    }}
                    title={
                      isWin
                        ? 'Abrir terminal nativo (CMD / PowerShell) integrado do MeshCentral'
                        : 'Abrir terminal SSH'
                    }
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="4 17 10 11 4 5" />
                      <line x1="12" y1="19" x2="20" y2="19" />
                    </svg>
                    <span>Terminal</span>
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {maquinasFiltradas.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
            <p style={{ fontSize: '15px', margin: 0 }}>Nenhuma máquina encontrada com os filtros informados.</p>
          </div>
        )}
      </div>

      {/* Barra de Paginação */}
      {totalItems > 0 && (
        <div className="remote-pagination-container">
          <div className="remote-pagination-info">
            <span>
              Exibindo <strong>{inicio + 1}-{fim}</strong> de <strong>{totalItems}</strong> estações
            </span>
            <div className="remote-page-size-selector">
              <label htmlFor="remote-page-size">Por página:</label>
              <select
                id="remote-page-size"
                className="remote-select-page-size"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                }}
              >
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
                <option value={96}>96</option>
              </select>
            </div>
          </div>

          {totalPaginas > 1 && (
            <div className="remote-pagination-controls">
              <button
                type="button"
                className="page-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>

              {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                .filter((p) => {
                  if (p === 1 || p === totalPaginas) return true
                  if (p >= currentPage - 1 && p <= currentPage + 1) return true
                  return false
                })
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1]
                  const hasEllipsis = prev && p - prev > 1
                  return (
                    <Fragment key={p}>
                      {hasEllipsis && <span className="pagination-ellipsis">...</span>}
                      <button
                        type="button"
                        className={`page-btn ${currentPage === p ? 'active' : ''}`}
                        onClick={() => setCurrentPage(p)}
                      >
                        {p}
                      </button>
                    </Fragment>
                  )
                })}

              <button
                type="button"
                className="page-btn"
                disabled={currentPage >= totalPaginas}
                onClick={() => setCurrentPage((p) => Math.min(totalPaginas, p + 1))}
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      )}

      {/* Janela Embutida de Sessão de Controle Remoto */}
      {activeSession && (
        <div className="remote-session-overlay">
          <div className={`remote-session-window ${isFullscreen ? 'fullscreen' : ''}`}>
            <div className="remote-session-header">
              <div className="remote-session-title">
                <span className="remote-session-host-tag">
                  {activeSession.device.hostname} ({activeSession.device.ip})
                </span>

                {/* Seletor de Modo: Desktop / Arquivos / Terminal */}
                <div className="remote-session-tabs">
                  <button
                    type="button"
                    className={`session-tab-btn ${activeSession.tab === 'desktop' ? 'active' : ''}`}
                    onClick={() => handleTrocarAbaSessao('desktop')}
                    title="Ver a tela do usuário em tempo real"
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                    <span>Desktop (Tela)</span>
                  </button>

                  <button
                    type="button"
                    className={`session-tab-btn ${activeSession.tab === 'files' ? 'active' : ''}`}
                    onClick={() => handleTrocarAbaSessao('files')}
                    title="Explorador de arquivos: Upload, Download e navegação de pastas"
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>Arquivos &amp; Pastas</span>
                  </button>

                  <button
                    type="button"
                    className={`session-tab-btn ${activeSession.tab === 'terminal' ? 'active' : ''}`}
                    onClick={() => handleTrocarAbaSessao('terminal')}
                    title="Console de comando / Shell"
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="4 17 10 11 4 5" />
                      <line x1="12" y1="19" x2="20" y2="19" />
                    </svg>
                    <span>Terminal</span>
                  </button>
                </div>
              </div>

              <div className="remote-session-ctrls">
                <button
                  type="button"
                  className="btn-session-ext-tab"
                  onClick={handleOpenExternal}
                  title="Abrir em uma nova aba dedicada do navegador"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  <span>Nova Aba</span>
                </button>

                <button
                  type="button"
                  className="btn-ctrl-icon"
                  onClick={() => setIsFullscreen((prev) => !prev)}
                  title={isFullscreen ? 'Restaurar tamanho' : 'Maximizar tela'}
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                    {isFullscreen ? (
                      <>
                        <polyline points="4 14 10 14 10 20" />
                        <polyline points="20 10 14 10 14 4" />
                        <line x1="14" y1="10" x2="21" y2="3" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                      </>
                    ) : (
                      <>
                        <polyline points="15 3 21 3 21 9" />
                        <polyline points="9 21 3 21 3 15" />
                        <line x1="21" y1="3" x2="14" y2="10" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                      </>
                    )}
                  </svg>
                </button>

                <button
                  type="button"
                  className="btn-ctrl-icon btn-ctrl-close"
                  onClick={() => setActiveSession(null)}
                  title="Encerrar sessão remota"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="remote-session-body">
              <iframe
                src={activeSession.url}
                title={`Sessão Remota (${activeSession.tab}) - ${activeSession.device.hostname}`}
                allow="clipboard-read; clipboard-write; fullscreen"
              />
              <div className="remote-session-footer-hint">
                <span>
                  💡 Se o navegador bloquear o carregamento interno (certificado autoassinado),{' '}
                  <a href={activeSession.url} target="_blank" rel="noopener noreferrer">
                    clique aqui para aceitar o certificado SSL
                  </a>{' '}
                  ou use o botão <strong>Nova Aba</strong> no cabeçalho.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
