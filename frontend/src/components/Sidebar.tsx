
type UserInfo = {
  id: number
  username: string
  email: string
  full_name: string
  company_id: number
  active: boolean
  is_superadmin: boolean
}

type SidebarProps = {
  view: 'inv' | 'rel' | 'apps' | 'ad'
  irPara: (v: 'inv' | 'rel' | 'apps' | 'ad') => void
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
        className={`nav ${view === 'rel' ? 'on' : ''}`}
        onClick={() => irPara('rel')}
      >
        <svg viewBox="0 0 24 24">
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
        <span>Relatórios</span>
      </button>

      {currentUser?.is_superadmin && (
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

      {currentUser?.is_superadmin && (
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
                  color: currentUser.is_superadmin ? '#3b82f6' : '#10b981',
                  fontWeight: 600,
                }}
              >
                {currentUser.is_superadmin ? '🛡️ Super Admin' : '🏬 Operador Loja'}
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
