import { useEffect, useMemo, useState } from 'react'
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

export default function RemoteAccessPage({
  inventario,
  onOpenSsh,
  copiarTexto,
}: RemoteAccessPageProps) {
  const [config, setConfig] = useState<RemoteAccessConfig | null>(null)
  const [search, setSearch] = useState('')
  const [filtroOs, setFiltroOs] = useState<'todos' | 'windows' | 'linux'>('todos')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'online' | 'offline'>('todos')
  const [filtroFilial, setFiltroFilial] = useState<string>('todos')
  const [showGuide, setShowGuide] = useState(false)

  // Sessão remota ativa no modal/iframe
  const [activeSession, setActiveSession] = useState<{
    device: EnrichedMachine
    url: string
  } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

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

  const meshUrlBase = useMemo(() => {
    if (config?.mesh_url) return config.mesh_url
    if (typeof window !== 'undefined') {
      const host = window.location.hostname
      return `https://${host}:4443`
    }
    return 'https://localhost:4443'
  }, [config])

  const handleOpenDesktop = (device: EnrichedMachine) => {
    // Carrega o console do MeshCentral direcionado
    const targetUrl = `${meshUrlBase}`
    setActiveSession({
      device,
      url: targetUrl,
    })
  }

  const handleOpenExternal = () => {
    if (!activeSession) return
    window.open(activeSession.url, '_blank', 'noopener,noreferrer')
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
              Controle remoto cooperativo (Helpdesk em tempo real, suporte a UAC sem tela preta e conexões simultâneas ilimitadas).
            </p>
          </div>
        </div>

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
            className="btn-guide-toggle"
            onClick={() => setShowGuide((prev) => !prev)}
            title="Ver instruções para instalação do agente nos computadores"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>{showGuide ? 'Ocultar Guia' : 'Como Instalar Agentes'}</span>
          </button>
        </div>
      </div>

      {/* Guia Expansível de Instalação do Agente */}
      {showGuide && (
        <div className="remote-guide-box">
          <div className="remote-guide-head">
            <h3>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 17l6-6-6-6" />
                <path d="M12 19h8" />
              </svg>
              Instalação Silenciosa do Agente MeshCentral (Windows &amp; Linux)
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Serviço em segundo plano sob <code>NT AUTHORITY\SYSTEM</code> (UAC e login habilitados)
            </span>
          </div>

          <div className="remote-guide-grid">
            <div className="guide-col">
              <h4>Windows (PowerShell Administrador)</h4>
              <p>Execute o script automatizado para registrar o serviço silenciosamente:</p>
              <div className="guide-code-box">
                <code>powershell -ExecutionPolicy Bypass -File .\scripts_agents\install-meshagent.ps1</code>
                <button
                  type="button"
                  className="guide-copy-btn"
                  onClick={() => copiarTexto('powershell -ExecutionPolicy Bypass -File .\\scripts_agents\\install-meshagent.ps1')}
                  title="Copiar comando"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="guide-col">
              <h4>Linux (Root / Sudo)</h4>
              <p>Execute o instalador nativo registrado no systemd:</p>
              <div className="guide-code-box">
                <code>sudo bash ./scripts_agents/install-meshagent.sh</code>
                <button
                  type="button"
                  className="guide-copy-btn"
                  onClick={() => copiarTexto('sudo bash ./scripts_agents/install-meshagent.sh')}
                  title="Copiar comando"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Grid de Dispositivos */}
      <div className="remote-grid">
        {maquinasFiltradas.map((m) => {
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
                  className="btn-remote-connect"
                  onClick={() => handleOpenDesktop(m)}
                  title="Iniciar sessão de desktop remoto pelo navegador"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  <span>Conectar Desktop</span>
                </button>

                <button
                  type="button"
                  className="btn-remote-ssh"
                  onClick={() => onOpenSsh(m)}
                  title="Abrir terminal SSH / PowerShell"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="4 17 10 11 4 5" />
                    <line x1="12" y1="19" x2="20" y2="19" />
                  </svg>
                  <span>Terminal</span>
                </button>
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

      {/* Janela Embutida de Sessão de Controle Remoto */}
      {activeSession && (
        <div className="remote-session-overlay">
          <div className={`remote-session-window ${isFullscreen ? 'fullscreen' : ''}`}>
            <div className="remote-session-header">
              <div className="remote-session-title">
                <h3>Controle Remoto em Tempo Real</h3>
                <span className="remote-session-host-tag">
                  {activeSession.device.hostname} ({activeSession.device.ip})
                </span>
              </div>

              <div className="remote-session-ctrls">
                <button
                  type="button"
                  className="btn-ctrl-icon"
                  onClick={handleOpenExternal}
                  title="Abrir em uma nova janela / aba do navegador"
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
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
                title={`Sessão Remota - ${activeSession.device.hostname}`}
                allow="clipboard-read; clipboard-write; fullscreen"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
