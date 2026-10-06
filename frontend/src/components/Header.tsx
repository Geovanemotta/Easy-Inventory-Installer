
type HeaderProps = {
  view: 'inv' | 'rel' | 'apps' | 'ad' | 'net'
  lastUpdate: string
  loading: boolean
  isSuperAdmin: boolean
  onRefresh: () => void
  onOpenAgentModal: () => void
}

export default function Header({
  view,
  lastUpdate,
  loading,
  isSuperAdmin,
  onRefresh,
  onOpenAgentModal,
}: HeaderProps) {
  return (
    <header>
      <div>
        <h1>
          {view === 'inv' && 'Inventário de estações'}
          {view === 'net' && 'Ativos de Rede & Periféricos'}
          {view === 'rel' && 'Relatórios'}
          {view === 'apps' && 'Aplicativos instalados'}
          {view === 'ad' && 'Active Directory & Acessos'}
        </h1>
        <p>
          {view === 'inv' && 'Monitoramento de estações Linux e Windows'}
          {view === 'net' && 'Monitoramento ativo de impressoras, switches, roteadores e access points'}
          {view === 'rel' &&
            'Consulta por processador, placa-mãe, memória e outros dados'}
          {view === 'apps' && 'Versões e máquinas por aplicativo'}
          {view === 'ad' &&
            'Integração LDAP/LDAPS, testes de conexão e mapeamento de grupos corporativos'}
        </p>
      </div>

      <div className="header-right">
        <div className="live">
          Última atualização: <b>{lastUpdate}</b>
          <br />
          Atualiza a cada 5 minutos
        </div>

        {isSuperAdmin && (
          <button
            className="btn-install-agent"
            onClick={onOpenAgentModal}
            title="Comandos de instalação rápida e agendamento dos agentes"
          >
            <span>⚡</span> Instalar Agente
          </button>
        )}

        <button
          className="btn-refresh"
          onClick={onRefresh}
          disabled={loading}
        >
          <span
            style={{
              display: 'inline-block',
              transform: loading ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.4s',
            }}
          >
            ↻
          </span>
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>
    </header>
  )
}
