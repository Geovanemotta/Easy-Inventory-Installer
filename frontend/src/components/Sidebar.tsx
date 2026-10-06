
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
    ? '🛡️ Super Admin'
    : currentUser?.roles?.includes('admin')
    ? '👔 Administrador'
    : currentUser?.roles?.includes('operador_matriz')
    ? '🏢 Operador Matriz'
    : '🏬 Operador Loja'

  const roleColor = currentUser?.is_superadmin
    ? '#3b82f6'
    : currentUser?.roles?.includes('admin')
    ? '#6366f1'
    : currentUser?.roles?.includes('operador_matriz')
    ? '#f59e0b'
    : '#10b981'

  return (
    <aside className="side">
      <div className="brand">
        <i>INV</i>
        <div>
          <b>INVENTÁRIO</b>
          <span>Gestão de Ativos</span>
        </div>
      </div>

      <div className="side-sec">Módulos</div>

      <button
        className={`nav ${view === 'inv' ? 'on' : ''}`}
        onClick={() => irPara('inv')}
      >
        <svg viewBox="0 0 24 24">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
        <span>Inventário</span>
        <em>{inventarioCount}</em>
      </button>

      <button
        className={`nav ${view === 'net' ? 'on' : ''}`}
        onClick={() => irPara('net')}
        title="Ativos de rede, impressoras e switches"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <line x1="3.6" y1="9" x2="20.4" y2="9" />
          <line x1="3.6" y1="15" x2="20.4" y2="15" />
          <path d="M11.5 3a17 17 0 0 0 0 18" />
          <path d="M12.5 3a17 17 0 0 1 0 18" />
        </svg>
        <span>Ativos de Rede</span>
      </button>

      <button
        className={`nav ${view === 'rel' ? 'on' : ''}`}
        onClick={() => irPara('rel')}
      >
        <svg viewBox="0 0 24 24">
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
        <span>Relatórios</span>
      </button>

      {isAdmin && (
        <button
          className={`nav ${view === 'apps' ? 'on' : ''}`}
          onClick={() => irPara('apps')}
        >
          <svg viewBox="0 0 24 24">
            <path d="M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8" />
          </svg>
          <span>Aplicativos</span>
        </button>
      )}

      {isAdmin && (
        <button
          className={`nav ${view === 'ad' ? 'on' : ''}`}
          onClick={() => irPara('ad')}
          title="Configurações e testes do Active Directory"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <span>Active Directory</span>
        </button>
      )}

      <div className="side-foot">
        {currentUser && (
          <div className="user-box">
            <div className="user-avatar">
              {currentUser.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="user-meta">
              <strong>{currentUser.full_name}</strong>
              <span>{currentUser.username}</span>
              <span
                style={{
                  fontSize: '10px',
                  color: roleColor,
                  fontWeight: 600,
                }}
              >
                {roleLabel}
              </span>
            </div>
          </div>
        )}

        <button
          className="btn-logout"
          onClick={onLogout}
          title="Encerrar sessão"
        >
          <span>Sair</span>
        </button>

        <div className="side-caption">
          Inventário de estações
          <br />
          Linux e Windows
        </div>
      </div>
    </aside>
  )
}
