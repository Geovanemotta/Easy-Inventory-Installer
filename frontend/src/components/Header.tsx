type HeaderProps = {
  view: 'inv' | 'rel' | 'apps' | 'ad' | 'net'
  lastUpdate: string
  loading: boolean
  isSuperAdmin: boolean
  theme?: 'dark' | 'light'
  onToggleTheme?: () => void
  onRefresh: () => void
  onOpenAgentModal: () => void
}

export default function Header({

  view,
  lastUpdate,
  loading,
  isSuperAdmin,
  theme = 'dark',
  onToggleTheme,
  onRefresh,
  onOpenAgentModal,
}: HeaderProps) {
  const moduleBadge =
    view === 'inv'
      ? { tag: 'ESTAÇÕES', color: '#38bdf8' }
      : view === 'net'
      ? { tag: 'REDE & IOT', color: '#818cf8' }
      : view === 'rel'
      ? { tag: 'RELATÓRIOS', color: '#34d399' }
      : view === 'apps'
      ? { tag: 'APLICATIVOS', color: '#fbbf24' }
      : { tag: 'ACTIVE DIRECTORY', color: '#f472b6' }

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="header-title-row">
          <span
            className="module-tag"
            style={{
              borderColor: `${moduleBadge.color}40`,
              color: moduleBadge.color,
              background: `${moduleBadge.color}15`,
            }}
          >
            {moduleBadge.tag}
          </span>
          <h1>
            {view === 'inv' && 'Inventário de Estações'}
            {view === 'net' && 'Ativos de Rede & Periféricos'}
            {view === 'rel' && 'Relatórios e Análises'}
            {view === 'apps' && 'Aplicativos e Versões'}
            {view === 'ad' && 'Active Directory & Acessos'}
          </h1>
        </div>
        {/* <p>
          {view === 'net' && 'Monitoramento ativo e testes de conectividade para impressoras, switches e APs'}
          {view === 'rel' && 'Visão consolidada por processador, placa-mãe, memória RAM e capacidade de disco'}
          {view === 'apps' && 'Auditoria de softwares instalados, controle de versões e máquinas por pacote'}
          {view === 'ad' && 'Integração LDAP/LDAPS corporativa, mapeamento de grupos e perfis de filial'}
        </p> */}
      </div>

      <div className="header-right">
        {/* Status ao vivo */}
        <div className="live-status-badge" title="Status de comunicação com os agentes em tempo real">
          <span className="live-pulse-dot" />
          <div className="live-meta">
            <span className="live-label">Monitoramento Ativo</span>
            <span className="live-time">Sincronizado: <b>{lastUpdate}</b></span>
          </div>
        </div>

        {/* Botão de Alternância de Tema */}
        {onToggleTheme && (
          <button
            type="button"
            className="btn-theme-toggle"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
            aria-label="Alternar tema visual"
          >
            {theme === 'dark' ? (
              <>
                <span className="theme-toggle-icon">☀️</span>
                <span className="theme-toggle-text">Claro</span>
              </>
            ) : (
              <>
                <span className="theme-toggle-icon">🌙</span>
                <span className="theme-toggle-text">Escuro</span>
              </>
            )}
          </button>
        )}

        {/* Instalação rápida (SuperAdmin) */}
        {isSuperAdmin && (
          <button
            className="btn-install-agent"
            onClick={onOpenAgentModal}
            title="Comandos de instalação rápida e agendamento dos agentes"
          >
            <span className="btn-icon-flash">⚡</span>
            <span>Instalar Agente</span>
          </button>
        )}

        {/* Atualizar dados */}
        <button
          className="btn-refresh"
          onClick={onRefresh}
          disabled={loading}
          title="Recarregar dados do inventário imediatamente"
        >
          <svg
            className={`refresh-icon ${loading ? 'spinning' : ''}`}
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19" />
          </svg>
          <span>{loading ? 'Atualizando...' : 'Atualizar'}</span>
        </button>
      </div>
    </header>
  )
}
