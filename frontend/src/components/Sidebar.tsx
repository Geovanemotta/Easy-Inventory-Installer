type UserInfo = {
  id: number
  username: string
  email: string
  full_name: string
  company_id: number
  active: boolean
  is_superadmin: boolean
  roles?: string[]
}

type SidebarProps = {
  view: 'inv' | 'rel' | 'apps' | 'ad' | 'net'
  irPara: (v: 'inv' | 'rel' | 'apps' | 'ad' | 'net') => void
  inventarioCount: number
  currentUser: UserInfo | null
  onLogout: () => void
}

export default function Sidebar({
  view,
  irPara,
  inventarioCount,
  currentUser,
  onLogout,
}: SidebarProps) {
  const isAdmin = Boolean(currentUser?.is_superadmin || currentUser?.roles?.includes('admin'))

  const roleLabel = currentUser?.is_superadmin
    ? 'Super Admin'
    : currentUser?.roles?.includes('admin')
      ? 'Administrador'
      : currentUser?.roles?.includes('operador_matriz')
        ? 'Operador Matriz'
        : 'Operador Loja'

  const roleColor = currentUser?.is_superadmin
    ? '#38bdf8'
    : currentUser?.roles?.includes('admin')
      ? '#818cf8'
      : currentUser?.roles?.includes('operador_matriz')
        ? '#fbbf24'
        : '#34d399'

  return (
    <aside className="side">
      {/* Brand & Logo */}
      <div className="brand">
        <div className="brand-logo-icon">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </div>
        <div className="brand-info">
          <div className="brand-title-wrap">
            <b>INVENTÁRIO</b>
            <span className="brand-tag">GIASSI</span>
          </div>
          <span className="brand-sub">Gestão de Ativos &amp; TI</span>
        </div>
      </div>

      <div className="side-sec">Módulos de Gestão</div>

      {/* Navegação Principal */}
      <nav className="side-nav-group">
        <button
          type="button"
          className={`nav ${view === 'inv' ? 'on' : ''}`}
          onClick={() => irPara('inv')}
          title="Inventário de estações Windows e Linux"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <span className="nav-label">Estações</span>
          {inventarioCount > 0 && <em className="nav-counter">{inventarioCount}</em>}
        </button>

        <button
          type="button"
          className={`nav ${view === 'net' ? 'on' : ''}`}
          onClick={() => irPara('net')}
          title="Ativos de rede, impressoras, switches e periféricos"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <line x1="3.6" y1="9" x2="20.4" y2="9" />
            <line x1="3.6" y1="15" x2="20.4" y2="15" />
            <path d="M11.5 3a17 17 0 0 0 0 18" />
            <path d="M12.5 3a17 17 0 0 1 0 18" />
          </svg>
          <span className="nav-label">Ativos de Rede</span>
        </button>

        <button
          type="button"
          className={`nav ${view === 'rel' ? 'on' : ''}`}
          onClick={() => irPara('rel')}
          title="Relatórios consolidados de hardware e exportação CSV"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
          </svg>
          <span className="nav-label">Relatórios</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            className={`nav ${view === 'apps' ? 'on' : ''}`}
            onClick={() => irPara('apps')}
            title="Inventário de aplicativos, softwares e versões"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8" />
            </svg>
            <span className="nav-label">Aplicativos</span>
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            className={`nav ${view === 'ad' ? 'on' : ''}`}
            onClick={() => irPara('ad')}
            title="Configurações e testes do Active Directory"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="nav-label">Active Directory</span>
          </button>
        )}
      </nav>

      {/* Footer do Usuário & Logout */}
      <div className="side-foot">
        {currentUser && (
          <div className="user-box">
            <div className="user-avatar-wrap">
              <div className="user-avatar">
                {currentUser.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="user-status-online" title="Conexão de sessão ativa" />
            </div>
            <div className="user-meta">
              <strong title={currentUser.full_name}>{currentUser.full_name}</strong>
              <span title={currentUser.username}>{currentUser.username}</span>
              <div
                className="user-role-pill"
                style={{
                  color: roleColor,
                  borderColor: `${roleColor}40`,
                  background: `${roleColor}15`,
                }}
              >
                {roleLabel}
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          className="btn-logout"
          onClick={onLogout}
          title="Encerrar sessão de usuário"
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Sair da Conta</span>
        </button>

        <div className="side-caption">
          <b>Enterprise Inventory</b>
          <span>v2.6 · Linux &amp; Windows</span>
        </div>
      </div>
    </aside>
  )
}
