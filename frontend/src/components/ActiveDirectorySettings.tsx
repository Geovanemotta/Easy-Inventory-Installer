import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  getADConfig,
  saveADConfig,
  testADConnection,
  testADUser,
  getADGroups,
  getSites,
  type ADConfigData,
  type ADGroup,
  type Site,
} from '../services/api'

type Props = {
  token: string
  showToast: (msg: string) => void
}

type Role = 'operator' | 'admin'
type SiteKind = 'loja' | 'combo' | 'outros'
type TabId = 'conexao' | 'permissoes' | 'simulador'
type SiteTab = 'all' | SiteKind

const ROLE_LABEL: Record<Role, string> = { operator: 'Operador', admin: 'Administrador da loja' }
const KIND_LABEL: Record<SiteKind, string> = { loja: 'Lojas', combo: 'Combos', outros: 'Matriz / Outros' }
const MAP_CHIPS_COLLAPSED = 8

/* Classificação das filiais pelo código (mesma regra usada antes: C* = combo, MATRIZ/OUTROS = demais) */
function siteKind(code: string): SiteKind {
  const c = code.toUpperCase()
  if (c === 'MATRIZ' || c === 'OUTROS') return 'outros'
  if (c.startsWith('C')) return 'combo'
  return 'loja'
}

const ICONS = {
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  store: 'M3 9l1-5h16l1 5 M3 9v11h18V9 M3 9h18 M9 20v-6h6v6',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3',
  refresh: 'M21 12a9 9 0 0 1-15.5 6.2L3 16 M3 12a9 9 0 0 1 15.5-6.2L21 8 M21 3v5h-5 M3 21v-5h5',
  plus: 'M12 5v14 M5 12h14',
  edit: 'M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  trash: 'M3 6h18 M8 6V4h8v2 M19 6l-1 14H6L5 6 M10 11v6 M14 11v6',
  check: 'M20 6L9 17l-5-5',
  alert: 'M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z M12 9v4 M12 17h.01',
  bolt: 'M13 2L3 14h9l-1 8 10-12h-9z',
  x: 'M18 6L6 18 M6 6l12 12',
  server: 'M2 4h20v6H2z M2 14h20v6H2z M6 7h.01 M6 17h.01',
  key: 'M21 2l-9.6 9.6 M15.5 7.5l3 3L22 7l-3-3 M7.5 14.5a5.5 5.5 0 1 1 0 .01z',
  chevron: 'M6 9l6 6 6-6',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16v-4 M12 8h.01',
  save: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z M17 21v-8H7v8 M7 3v5h8',
} as const

function Icon({ name, size = 16 }: { name: keyof typeof ICONS; size?: number }) {
  return (
    <svg
      className="ad-ico"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  )
}

const serialize = (c: ADConfigData) => JSON.stringify({ ...c, bind_password: c.bind_password || '' })

export default function ActiveDirectorySettings({ token, showToast }: Props) {
  const [config, setConfig] = useState<ADConfigData>({
    enabled: false,
    server_host: '',
    server_port: 389,
    use_ssl: false,
    use_tls: false,
    domain: '',
    base_dn: '',
    bind_user: '',
    bind_password: '',
    has_bind_password: false,
    user_search_filter: '(&(objectClass=user)(sAMAccountName={username}))',
    superadmin_groups: ['Domain Admins', 'GG_TI_ADMINS'],
    group_mappings: {},
    auto_sync_on_login: true,
  })
  const [savedConfig, setSavedConfig] = useState<ADConfigData | null>(null)

  const [tab, setTab] = useState<TabId>('conexao')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingConn, setTestingConn] = useState(false)
  const [testConnResult, setTestConnResult] = useState<{
    success: boolean
    message: string
    latency_ms?: number
    diagnostic?: string
    suggestion?: string
    server_info?: any
  } | null>(null)

  // Lojas cadastradas no sistema
  const [sites, setSites] = useState<Site[]>([])

  // Grupos consultados do Active Directory
  const [adGroups, setAdGroups] = useState<ADGroup[]>([])
  const [loadingADGroups, setLoadingADGroups] = useState(false)
  const [adGroupsQueried, setAdGroupsQueried] = useState(false)

  // Editor de vínculo (grupo -> lojas)
  const [editorOpen, setEditorOpen] = useState(false)
  const [mappingGroup, setMappingGroup] = useState('')
  const [mappingRole, setMappingRole] = useState<Role>('operator')
  const [mappingSites, setMappingSites] = useState<string[]>([])
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [siteSearchTerm, setSiteSearchTerm] = useState('')
  const [siteTab, setSiteTab] = useState<SiteTab>('all')
  const editorRef = useRef<HTMLDivElement | null>(null)

  // Lista de vínculos
  const [mappingFilter, setMappingFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const deleteTimer = useRef<number | undefined>(undefined)

  // Teste de usuário individual
  const [testUsername, setTestUsername] = useState('')
  const [testPassword, setTestPassword] = useState('')
  const [testingUser, setTestingUser] = useState(false)
  const [testUserResult, setTestUserResult] = useState<{
    authenticated: boolean
    message: string
    display_name?: string
    email?: string
    groups?: string[]
    would_be_superadmin?: boolean
    mapped_sites?: string[]
  } | null>(null)

  // Input de novos grupos superadmin
  const [newGroupInput, setNewGroupInput] = useState('')

  useEffect(() => {
    carregarDadosIniciais()
  }, [])

  const dirty = savedConfig !== null && serialize(config) !== serialize(savedConfig)

  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  async function carregarDadosIniciais() {
    try {
      setLoading(true)
      const [cfgData, sitesData] = await Promise.all([
        getADConfig(token),
        getSites(token).catch(() => [] as Site[]),
      ])
      setConfig(cfgData)
      setSavedConfig(cfgData)
      setSites(sitesData)
    } catch (err: any) {
      console.error('Erro ao carregar configurações do AD:', err)
      showToast(err.message || 'Erro ao carregar configurações.')
    } finally {
      setLoading(false)
    }
  }

  async function carregarGruposDoAD(searchTerm?: string) {
    try {
      setLoadingADGroups(true)
      const res = await getADGroups(token, searchTerm)
      setAdGroups(res.groups || [])
      setAdGroupsQueried(true)
      showToast(`${res.groups.length} grupos carregados do Active Directory!`)
    } catch (err: any) {
      showToast(err.message || 'Erro ao consultar grupos do AD.')
    } finally {
      setLoadingADGroups(false)
    }
  }

  async function handleSalvar() {
    if (config.enabled && (!config.server_host.trim() || !config.domain.trim() || !config.base_dn.trim())) {
      setTab('conexao')
      showToast('Preencha servidor, domínio e Base DN para habilitar o Active Directory.')
      return
    }
    try {
      setSaving(true)
      const res = await saveADConfig(token, config)
      showToast(res.message || 'Configurações salvas com sucesso!')
      const refreshed = await getADConfig(token)
      setConfig(refreshed)
      setSavedConfig(refreshed)
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar configurações.')
    } finally {
      setSaving(false)
    }
  }

  function handleDescartar() {
    if (!savedConfig) return
    setConfig(savedConfig)
    fecharEditor()
    showToast('Alterações descartadas.')
  }

  async function handleTestarConexao() {
    try {
      setTestingConn(true)
      setTestConnResult(null)
      const res = await testADConnection(token, config)
      setTestConnResult(res)
      if (res.success) {
        showToast('Conexão com AD bem-sucedida!')
      }
    } catch (err: any) {
      setTestConnResult({
        success: false,
        message: err.message || 'Erro ao testar conexão.',
      })
    } finally {
      setTestingConn(false)
    }
  }

  async function handleTestarUsuario(e: React.FormEvent) {
    e.preventDefault()
    if (!testUsername || !testPassword) {
      showToast('Informe usuário e senha para teste.')
      return
    }

    try {
      setTestingUser(true)
      setTestUserResult(null)
      const res = await testADUser(token, testUsername, testPassword)
      setTestUserResult(res)
    } catch (err: any) {
      setTestUserResult({
        authenticated: false,
        message: err.message || 'Falha ao autenticar usuário.',
      })
    } finally {
      setTestingUser(false)
    }
  }

  /* ---------- Superadmin ---------- */
  function adicionarGrupoSuperadmin() {
    const g = newGroupInput.trim()
    if (!g) return
    if (!config.superadmin_groups.includes(g)) {
      setConfig((prev) => ({ ...prev, superadmin_groups: [...prev.superadmin_groups, g] }))
    }
    setNewGroupInput('')
  }

  function removerGrupoSuperadmin(grp: string) {
    setConfig((prev) => ({
      ...prev,
      superadmin_groups: prev.superadmin_groups.filter((g) => g !== grp),
    }))
  }

  /* ---------- Vínculos grupo -> lojas ---------- */
  function abrirEditorNovo() {
    setMappingGroup('')
    setMappingRole('operator')
    setMappingSites([])
    setEditingGroup(null)
    setSiteSearchTerm('')
    setSiteTab('all')
    setEditorOpen(true)
    setTimeout(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
  }

  function fecharEditor() {
    setEditorOpen(false)
    setMappingGroup('')
    setMappingSites([])
    setEditingGroup(null)
    setPickerOpen(false)
  }

  function handleSalvarMapeamento(e: React.FormEvent) {
    e.preventDefault()
    const groupName = mappingGroup.trim()
    if (!groupName) {
      showToast('Informe ou selecione o nome do grupo do Active Directory.')
      return
    }
    if (mappingSites.length === 0) {
      showToast('Selecione pelo menos uma loja para vincular a este grupo.')
      return
    }

    setConfig((prev) => {
      const nextMappings = { ...prev.group_mappings }
      if (editingGroup && editingGroup !== groupName) {
        delete nextMappings[editingGroup]
      }
      nextMappings[groupName] = { role: mappingRole, sites: mappingSites }
      return { ...prev, group_mappings: nextMappings }
    })

    showToast(`Vínculo do grupo "${groupName}" ${editingGroup ? 'atualizado' : 'adicionado'}. Clique em "Salvar" para gravar.`)
    fecharEditor()
  }

  function handleEditarMapeamento(groupName: string) {
    const mapping = config.group_mappings[groupName]
    if (!mapping) return
    setMappingGroup(groupName)
    setMappingRole((mapping.role as Role) || 'operator')
    setMappingSites(mapping.sites || [])
    setEditingGroup(groupName)
    setSiteSearchTerm('')
    setSiteTab('all')
    setEditorOpen(true)
    setTimeout(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
  }

  function handleRemoverMapeamento(groupName: string) {
    setConfig((prev) => {
      const next = { ...prev.group_mappings }
      delete next[groupName]
      return { ...prev, group_mappings: next }
    })
    setPendingDelete(null)
    showToast(`Vínculo do grupo "${groupName}" removido. Lembre-se de salvar.`)
    if (editingGroup === groupName) fecharEditor()
  }

  function pedirExclusao(groupName: string) {
    if (pendingDelete === groupName) {
      window.clearTimeout(deleteTimer.current)
      handleRemoverMapeamento(groupName)
      return
    }
    setPendingDelete(groupName)
    window.clearTimeout(deleteTimer.current)
    deleteTimer.current = window.setTimeout(() => setPendingDelete(null), 3000)
  }

  function toggleSite(code: string) {
    setMappingSites((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))
  }

  function marcarPorTipo(kind: SiteKind | 'all') {
    setMappingSites(sites.filter((s) => kind === 'all' || siteKind(s.code) === kind).map((s) => s.code))
  }

  /* ---------- Derivados ---------- */
  const siteByCode = useMemo(() => new Map(sites.map((s) => [s.code.toUpperCase(), s])), [sites])

  function siteName(code: string): string {
    if (code === '*') return 'Todas as lojas'
    const s = siteByCode.get(code.toUpperCase())
    return s ? s.name : `Loja ${code}`
  }

  const kindCounts = useMemo(() => {
    const c = { all: sites.length, loja: 0, combo: 0, outros: 0 }
    sites.forEach((s) => { c[siteKind(s.code)]++ })
    return c
  }, [sites])

  const filteredSites = useMemo(() => {
    const t = siteSearchTerm.trim().toLowerCase()
    return sites.filter((s) => {
      if (siteTab !== 'all' && siteKind(s.code) !== siteTab) return false
      return !t || s.name.toLowerCase().includes(t) || s.code.toLowerCase().includes(t)
    })
  }, [sites, siteSearchTerm, siteTab])

  const mappingEntries = useMemo(
    () => Object.entries(config.group_mappings || {}).sort(([a], [b]) => a.localeCompare(b, 'pt-BR')),
    [config.group_mappings],
  )

  const visibleMappings = mappingEntries.filter(([grp, data]) => {
    const role = ((data as any)?.role || 'operator') as Role
    if (roleFilter !== 'all' && role !== roleFilter) return false
    const t = mappingFilter.trim().toLowerCase()
    if (!t) return true
    const list: string[] = (data as any)?.sites || []
    return grp.toLowerCase().includes(t) || list.some((c) => c.toLowerCase().includes(t) || siteName(c).toLowerCase().includes(t))
  })

  // Cobertura: quais lojas já têm pelo menos um grupo vinculado
  const coverage = useMemo(() => {
    const covered = new Set<string>()
    let all = false
    mappingEntries.forEach(([, d]) => {
      const list: string[] = (d as any)?.sites || []
      list.forEach((c) => (c === '*' ? (all = true) : covered.add(c.toUpperCase())))
    })
    const uncovered = all ? [] : sites.filter((s) => !covered.has(s.code.toUpperCase()))
    return { uncovered, count: sites.length - uncovered.length }
  }, [mappingEntries, sites])

  const groupSuggestions = useMemo(() => {
    const t = mappingGroup.trim().toLowerCase()
    return adGroups
      .filter((g) => !t || g.name.toLowerCase().includes(t) || (g.description || '').toLowerCase().includes(t))
      .slice(0, 40)
  }, [adGroups, mappingGroup])

  const groupAlreadyMapped =
    mappingGroup.trim() !== '' && !!config.group_mappings[mappingGroup.trim()] && editingGroup !== mappingGroup.trim()

  const totalSitesLabel = sites.length > 0 ? `todas as ${sites.length} lojas` : 'todas as lojas'

  if (loading) {
    return (
      <div className="ad-page">
        <div className="ad-loading">
          <span className="ad-spinner" />
          Carregando configurações do Active Directory e lista de lojas...
        </div>
      </div>
    )
  }

  const selectedKinds = { loja: 0, combo: 0, outros: 0 }
  mappingSites.forEach((c) => { selectedKinds[siteKind(c)]++ })

  return (
    <div className="ad-page">
      {/* Cabeçalho */}
      <header className="ad-head">
        <div className="ad-head-text">
          <div className="ad-title">
            <span className="ad-title-ico"><Icon name="server" size={20} /></span>
            <h2>Active Directory</h2>
            <span className={`ad-pill ${config.enabled ? 'on' : 'off'}`}>
              <i /> {config.enabled ? 'Ativo' : 'Desativado'}
            </span>
          </div>
          <p>
            Autenticação centralizada dos colaboradores pelo AD corporativo, com visualização restrita por filial e loja.
          </p>
        </div>

        <div className="ad-head-actions">
          <label className="ad-switch">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
            />
            <span className="track" />
            <span className="lbl">Habilitar AD</span>
          </label>
          <button type="button" className="btn primary" onClick={handleSalvar} disabled={saving}>
            <Icon name="save" /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </header>

      {/* Resumo */}
      <div className="ad-stats">
        <div className="ad-stat">
          <span className="k">Servidor</span>
          <b>{config.server_host ? `${config.server_host}:${config.server_port}` : 'Não configurado'}</b>
          <small>{config.use_ssl ? 'LDAPS' : config.use_tls ? 'StartTLS' : 'LDAP sem criptografia'}</small>
        </div>
        <div className="ad-stat">
          <span className="k">Superadministradores</span>
          <b>{config.superadmin_groups.length}</b>
          <small>grupo{config.superadmin_groups.length === 1 ? '' : 's'} com acesso global</small>
        </div>
        <div className="ad-stat">
          <span className="k">Vínculos por loja</span>
          <b>{mappingEntries.length}</b>
          <small>grupo{mappingEntries.length === 1 ? '' : 's'} vinculado{mappingEntries.length === 1 ? '' : 's'}</small>
        </div>
        <div className={`ad-stat ${sites.length > 0 && coverage.uncovered.length > 0 ? 'warn' : ''}`}>
          <span className="k">Cobertura de lojas</span>
          <b>{sites.length > 0 ? `${coverage.count} de ${sites.length}` : '-'}</b>
          <small>
            {sites.length === 0
              ? 'lojas não carregadas'
              : coverage.uncovered.length === 0
              ? 'todas com algum grupo'
              : `${coverage.uncovered.length} sem grupo vinculado`}
          </small>
        </div>
      </div>

      {/* Abas */}
      <div className="tabs ad-tabs" role="tablist">
        {([
          ['conexao', 'Conexão'],
          ['permissoes', 'Permissões e grupos'],
          ['simulador', 'Simulador de login'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`tab ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
            {id === 'permissoes' && <span>{mappingEntries.length}</span>}
          </button>
        ))}
      </div>

      {/* ================= ABA: CONEXÃO ================= */}
      {tab === 'conexao' && (
        <>
          <section className="ad-card">
            <div className="ad-card-head">
              <span className="ad-step">1</span>
              <div>
                <h3>Servidor e protocolo</h3>
                <p>Endereço do controlador de domínio e como a conexão será protegida.</p>
              </div>
            </div>

            <div className="ad-grid ad-g-21">
              <div className="field">
                <label>Servidor (IP ou hostname do Domain Controller) *</label>
                <input
                  type="text"
                  placeholder="Ex: 192.168.0.228 ou dc01.empresa.corp"
                  value={config.server_host}
                  onChange={(e) => setConfig({ ...config, server_host: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Porta</label>
                <input
                  type="number"
                  value={config.server_port}
                  onChange={(e) => setConfig({ ...config, server_port: +e.target.value })}
                />
              </div>
            </div>

            <div className="ad-grid ad-g-2">
              <div className="field">
                <label>Domínio (FQDN ou NetBIOS) *</label>
                <input
                  type="text"
                  placeholder="Ex: empresa.corp ou DOMINIO"
                  value={config.domain}
                  onChange={(e) => setConfig({ ...config, domain: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Base DN de pesquisa *</label>
                <input
                  type="text"
                  placeholder="Ex: OU=Departamentos,DC=empresa,DC=corp"
                  value={config.base_dn}
                  onChange={(e) => setConfig({ ...config, base_dn: e.target.value })}
                />
              </div>
            </div>

            <div className="ad-checks">
              <label className="ad-check">
                <input
                  type="checkbox"
                  checked={config.use_ssl}
                  onChange={(e) => {
                    const val = e.target.checked
                    setConfig({ ...config, use_ssl: val, server_port: val ? 636 : 389 })
                  }}
                />
                <span>
                  <b>Usar LDAPS</b>
                  <small>Conexão segura por SSL (porta 636)</small>
                </span>
              </label>
              <label className="ad-check">
                <input
                  type="checkbox"
                  checked={config.use_tls}
                  onChange={(e) => setConfig({ ...config, use_tls: e.target.checked })}
                />
                <span>
                  <b>Habilitar StartTLS</b>
                  <small>Eleva a conexão LDAP para TLS</small>
                </span>
              </label>
            </div>
          </section>

          <section className="ad-card">
            <div className="ad-card-head">
              <span className="ad-step">2</span>
              <div>
                <h3>Conta de serviço</h3>
                <p>Usada para buscar atributos dos usuários e consultar os grupos de segurança do AD.</p>
              </div>
            </div>

            <div className="ad-grid ad-g-2">
              <div className="field">
                <label>Usuário de serviço (DN ou sAMAccountName)</label>
                <input
                  type="text"
                  placeholder="Ex: CN=Jump Server,OU=Jump-Server,OU=Usuarios..."
                  value={config.bind_user || ''}
                  onChange={(e) => setConfig({ ...config, bind_user: e.target.value })}
                />
              </div>
              <div className="field">
                <label>
                  Senha do usuário de serviço
                  {config.has_bind_password && (
                    <span className="ad-badge ok" style={{ marginLeft: 8 }}>
                      <Icon name="check" size={11} /> senha gravada
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  placeholder={config.has_bind_password ? '•••••••••••• (deixe em branco para manter)' : 'Digite a senha'}
                  value={config.bind_password || ''}
                  onChange={(e) => setConfig({ ...config, bind_password: e.target.value })}
                />
              </div>
            </div>

            <div className="field">
              <label>Filtro LDAP de usuário</label>
              <input
                type="text"
                className="ad-mono"
                value={config.user_search_filter}
                onChange={(e) => setConfig({ ...config, user_search_filter: e.target.value })}
              />
              <small className="ad-hint">
                Padrão: <code>(&amp;(objectClass=user)(sAMAccountName={'{username}'}))</code>
              </small>
            </div>
          </section>

          <section className="ad-card">
            <div className="ad-card-head ad-between">
              <div className="ad-card-head-in">
                <span className="ad-step"><Icon name="bolt" size={14} /></span>
                <div>
                  <h3>Testar conectividade</h3>
                  <p>Verifica servidor, porta, criptografia e a conta de serviço com os dados acima, sem precisar salvar.</p>
                </div>
              </div>
              <button type="button" className="btn" onClick={handleTestarConexao} disabled={testingConn}>
                <Icon name="bolt" /> {testingConn ? 'Testando conexão...' : 'Testar conexão com o AD'}
              </button>
            </div>

            {testConnResult && (
              <div className={`ad-alert ${testConnResult.success ? 'ok' : 'bad'}`}>
                <div className="ad-alert-title">
                  <Icon name={testConnResult.success ? 'check' : 'alert'} />
                  {testConnResult.success ? 'Conexão estabelecida' : 'Falha na conexão'}
                </div>
                <p>{testConnResult.message}</p>
                {testConnResult.latency_ms !== undefined && (
                  <p className="ad-alert-meta">
                    Latência de resposta: <b>{testConnResult.latency_ms} ms</b>
                  </p>
                )}
                {testConnResult.diagnostic && (
                  <p className="ad-alert-meta">
                    <b>Detalhes do erro:</b> {testConnResult.diagnostic}
                  </p>
                )}
                {testConnResult.suggestion && (
                  <div className="ad-tip">
                    <Icon name="info" size={14} />
                    <span>
                      <b>Sugestão:</b> {testConnResult.suggestion}
                    </span>
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}

      {/* ================= ABA: PERMISSÕES ================= */}
      {tab === 'permissoes' && (
        <>
          <datalist id="ad-groups-datalist">
            {adGroups.map((g) => (
              <option key={g.name} value={g.name}>
                {g.description ? `${g.name} - ${g.description}` : g.name}
              </option>
            ))}
          </datalist>

          <section className="ad-card">
            <div className="ad-card-head">
              <span className="ad-step"><Icon name="shield" size={14} /></span>
              <div>
                <h3>Superadministradores</h3>
                <p>
                  Usuários destes grupos do AD têm acesso irrestrito a {totalSitesLabel}, aos inventários e às configurações
                  administrativas.
                </p>
              </div>
            </div>

            <div className="ad-inline">
              <input
                type="text"
                list="ad-groups-datalist"
                placeholder="Nome do grupo no AD (ex: Domain Admins ou GG_TI_ADMINS)"
                value={newGroupInput}
                onChange={(e) => setNewGroupInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    adicionarGrupoSuperadmin()
                  }
                }}
              />
              <button type="button" className="btn" onClick={adicionarGrupoSuperadmin}>
                <Icon name="plus" /> Adicionar grupo
              </button>
            </div>

            <div className="ad-chips">
              {config.superadmin_groups.length === 0 && (
                <span className="ad-muted">Nenhum grupo superadministrador definido.</span>
              )}
              {config.superadmin_groups.map((grp) => (
                <span key={grp} className="ad-chip strong">
                  <Icon name="shield" size={13} />
                  {grp}
                  <button type="button" onClick={() => removerGrupoSuperadmin(grp)} title="Remover grupo" aria-label={`Remover ${grp}`}>
                    <Icon name="x" size={12} />
                  </button>
                </span>
              ))}
            </div>

            <label className="ad-check ad-check-top">
              <input
                type="checkbox"
                checked={config.auto_sync_on_login}
                onChange={(e) => setConfig({ ...config, auto_sync_on_login: e.target.checked })}
              />
              <span>
                <b>Sincronizar dados no login</b>
                <small>Atualiza nome, e-mail e grupos do colaborador a cada acesso.</small>
              </span>
            </label>
          </section>

          <section className="ad-card" id="form-mapeamento-grupos">
            <div className="ad-card-head ad-between">
              <div className="ad-card-head-in">
                <span className="ad-step"><Icon name="users" size={14} /></span>
                <div>
                  <h3>Grupos por loja</h3>
                  <p>
                    Defina quais lojas cada grupo do AD pode visualizar. Quem estiver em <code>loja-01-inventario</code> ou{' '}
                    <code>G_TI_LJ11</code>, por exemplo, verá só os computadores da respectiva filial.
                  </p>
                </div>
              </div>
              <div className="ad-row-actions">
                <button type="button" className="btn" onClick={() => carregarGruposDoAD()} disabled={loadingADGroups}>
                  <Icon name="refresh" /> {loadingADGroups ? 'Consultando...' : adGroupsQueried ? `Atualizar grupos (${adGroups.length})` : 'Consultar grupos no AD'}
                </button>
                <button type="button" className="btn primary" onClick={abrirEditorNovo}>
                  <Icon name="plus" /> Novo vínculo
                </button>
              </div>
            </div>

            {/* Cobertura */}
            {sites.length > 0 && mappingEntries.length > 0 && (
              <div className={`ad-cover ${coverage.uncovered.length === 0 ? 'full' : ''}`}>
                <div className="ad-cover-top">
                  <span>
                    <b>{coverage.count}</b> de {sites.length} lojas com ao menos um grupo vinculado
                  </span>
                  <span className="ad-muted">{Math.round((coverage.count / sites.length) * 100)}%</span>
                </div>
                <div className="ad-cover-bar"><i style={{ width: `${(coverage.count / sites.length) * 100}%` }} /></div>
                {coverage.uncovered.length > 0 && (
                  <div className="ad-cover-miss">
                    <span>Sem grupo:</span>
                    {coverage.uncovered.slice(0, 12).map((s) => (
                      <span key={s.code} className="ad-chip mini" title={s.name}>{s.code}</span>
                    ))}
                    {coverage.uncovered.length > 12 && <span className="ad-muted">+{coverage.uncovered.length - 12}</span>}
                  </div>
                )}
              </div>
            )}

            {/* Editor */}
            {editorOpen && (
              <form className="ad-editor" onSubmit={handleSalvarMapeamento} ref={editorRef as any}>
                <div className="ad-editor-head">
                  <b>
                    <Icon name={editingGroup ? 'edit' : 'plus'} />
                    {editingGroup ? `Editando vínculo de "${editingGroup}"` : 'Novo vínculo de grupo'}
                  </b>
                  <button type="button" className="ad-link" onClick={fecharEditor}>
                    <Icon name="x" size={13} /> Fechar
                  </button>
                </div>

                <div className="ad-grid ad-g-21">
                  <div className="field ad-combo">
                    <label>Grupo no Active Directory *</label>
                    <input
                      type="text"
                      autoComplete="off"
                      placeholder="Digite ou escolha um grupo (ex: loja-01-inventario)"
                      value={mappingGroup}
                      onChange={(e) => { setMappingGroup(e.target.value); setPickerOpen(true) }}
                      onFocus={() => setPickerOpen(true)}
                      onBlur={() => setTimeout(() => setPickerOpen(false), 120)}
                      onKeyDown={(e) => { if (e.key === 'Escape') setPickerOpen(false) }}
                    />
                    {pickerOpen && groupSuggestions.length > 0 && (
                      <ul className="ad-combo-list" role="listbox">
                        {groupSuggestions.map((g) => {
                          const used = !!config.group_mappings[g.name]
                          return (
                            <li
                              key={g.name}
                              role="option"
                              aria-selected={g.name === mappingGroup}
                              onMouseDown={(e) => {
                                e.preventDefault()
                                setMappingGroup(g.name)
                                setPickerOpen(false)
                              }}
                            >
                              <span>
                                <b>{g.name}</b>
                                {g.description && <small>{g.description}</small>}
                              </span>
                              {used && <span className="ad-badge info">já vinculado</span>}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                    <small className="ad-hint">
                      {adGroupsQueried
                        ? `${adGroups.length} grupos carregados do AD. Digite para filtrar.`
                        : 'Digite qualquer nome de grupo ou clique em "Consultar grupos no AD" para ver sugestões.'}
                    </small>
                    {groupAlreadyMapped && (
                      <small className="ad-hint warn">
                        <Icon name="alert" size={12} /> Este grupo já possui vínculo. Ao confirmar, ele será substituído.
                      </small>
                    )}
                  </div>

                  <div className="field">
                    <label>Perfil de acesso</label>
                    <select value={mappingRole} onChange={(e) => setMappingRole(e.target.value as Role)}>
                      <option value="operator">Operador (visualização da loja)</option>
                      <option value="admin">Administrador da loja</option>
                    </select>
                  </div>
                </div>

                {/* Seletor de lojas */}
                <div className="ad-sites">
                  <div className="ad-sites-top">
                    <label>
                      Lojas permitidas *{' '}
                      <span className="ad-count">
                        {mappingSites.length} de {sites.length} selecionada{mappingSites.length === 1 ? '' : 's'}
                      </span>
                    </label>
                    <div className="ad-quick">
                      <button type="button" onClick={() => setMappingSites((p) => Array.from(new Set([...p, ...filteredSites.map((s) => s.code)])))}>
                        Marcar visíveis
                      </button>
                      <button type="button" onClick={() => marcarPorTipo('all')}>Todas</button>
                      <button type="button" onClick={() => marcarPorTipo('loja')}>Só lojas</button>
                      <button type="button" onClick={() => marcarPorTipo('combo')}>Só combos</button>
                      <button type="button" className="danger" onClick={() => setMappingSites([])}>Limpar</button>
                    </div>
                  </div>

                  <div className="ad-sites-filter">
                    <div className="ad-search">
                      <Icon name="search" size={14} />
                      <input
                        type="text"
                        placeholder="Filtrar loja por nome ou número..."
                        value={siteSearchTerm}
                        onChange={(e) => setSiteSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="tabs sm ad-site-tabs">
                      {([
                        ['all', 'Todas', kindCounts.all],
                        ['loja', 'Lojas', kindCounts.loja],
                        ['combo', 'Combos', kindCounts.combo],
                        ['outros', 'Matriz', kindCounts.outros],
                      ] as const).map(([id, label, n]) => (
                        <button
                          key={id}
                          type="button"
                          className={`tab ${siteTab === id ? 'active' : ''}`}
                          onClick={() => setSiteTab(id)}
                        >
                          {label} <span>{n}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="ad-site-grid">
                    {sites.length === 0 && (
                      <div className="ad-muted ad-pad">Nenhuma loja cadastrada ou não foi possível carregar a lista.</div>
                    )}
                    {sites.length > 0 && filteredSites.length === 0 && (
                      <div className="ad-muted ad-pad">Nenhuma loja encontrada para este filtro.</div>
                    )}
                    {filteredSites.map((site) => {
                      const checked = mappingSites.includes(site.code)
                      return (
                        <label key={site.id} className={`ad-site ${checked ? 'on' : ''} k-${siteKind(site.code)}`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleSite(site.code)} />
                          <span className="code">{site.code}</span>
                          <span className="nm">{site.name}</span>
                        </label>
                      )
                    })}
                  </div>

                  {mappingSites.length > 0 && (
                    <div className="ad-sel-sum">
                      Selecionadas:{' '}
                      {(['loja', 'combo', 'outros'] as const)
                        .filter((k) => selectedKinds[k] > 0)
                        .map((k) => `${selectedKinds[k]} ${KIND_LABEL[k].toLowerCase()}`)
                        .join(' · ')}
                    </div>
                  )}
                </div>

                <div className="ad-editor-foot">
                  <button type="button" className="btn" onClick={fecharEditor}>Cancelar</button>
                  <button type="submit" className="btn primary">
                    <Icon name="check" /> {editingGroup ? 'Atualizar vínculo' : 'Adicionar vínculo'}
                  </button>
                </div>
              </form>
            )}

            {/* Lista de vínculos */}
            <div className="ad-list-head">
              <h4>
                Vínculos configurados <span className="ad-count">{visibleMappings.length}{visibleMappings.length !== mappingEntries.length ? ` de ${mappingEntries.length}` : ''}</span>
              </h4>
              {mappingEntries.length > 0 && (
                <div className="ad-list-filters">
                  <div className="ad-search">
                    <Icon name="search" size={14} />
                    <input
                      type="text"
                      placeholder="Buscar grupo ou loja..."
                      value={mappingFilter}
                      onChange={(e) => setMappingFilter(e.target.value)}
                    />
                  </div>
                  <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as 'all' | Role)}>
                    <option value="all">Todos os perfis</option>
                    <option value="operator">Operador</option>
                    <option value="admin">Administrador da loja</option>
                  </select>
                </div>
              )}
            </div>

            {mappingEntries.length === 0 ? (
              <div className="ad-empty">
                <span className="ad-empty-ico"><Icon name="users" size={22} /></span>
                <b>Nenhum grupo vinculado a lojas ainda</b>
                <p>
                  Clique em <b>Novo vínculo</b> para criar o primeiro (ex: <code>loja-01-inventario</code> → Loja 01).
                </p>
                <button type="button" className="btn primary" onClick={abrirEditorNovo}>
                  <Icon name="plus" /> Novo vínculo
                </button>
              </div>
            ) : visibleMappings.length === 0 ? (
              <div className="ad-empty slim">Nenhum vínculo encontrado para este filtro.</div>
            ) : (
              <div className="ad-maps">
                {visibleMappings.map(([grp, data]) => {
                  const list: string[] = (data as any)?.sites || []
                  const role = ((data as any)?.role || 'operator') as Role
                  const isAll = list.includes('*')
                  const open = !!expanded[grp]
                  const shown = open ? list : list.slice(0, MAP_CHIPS_COLLAPSED)
                  const kinds = { loja: 0, combo: 0, outros: 0 }
                  list.forEach((c) => { if (c !== '*') kinds[siteKind(c)]++ })
                  return (
                    <article key={grp} className={`ad-map ${editingGroup === grp ? 'is-editing' : ''}`}>
                      <div className="ad-map-head">
                        <div className="ad-map-title">
                          <span className="ad-avatar"><Icon name="users" size={16} /></span>
                          <div>
                            <b>{grp}</b>
                            <div className="ad-map-meta">
                              <span className={`ad-badge ${role === 'admin' ? 'warn' : 'info'}`}>{ROLE_LABEL[role]}</span>
                              {isAll && <span className="ad-badge ok">Acesso total</span>}
                              {(['loja', 'combo', 'outros'] as const).filter((k) => kinds[k] > 0).map((k) => (
                                <span key={k} className={`ad-kind k-${k}`}><i />{kinds[k]} {KIND_LABEL[k].toLowerCase()}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="ad-map-actions">
                          <button type="button" className="btn sm" onClick={() => handleEditarMapeamento(grp)}>
                            <Icon name="edit" size={13} /> Editar
                          </button>
                          <button
                            type="button"
                            className={`btn sm danger ${pendingDelete === grp ? 'confirm' : ''}`}
                            onClick={() => pedirExclusao(grp)}
                          >
                            <Icon name="trash" size={13} /> {pendingDelete === grp ? 'Confirmar exclusão' : 'Excluir'}
                          </button>
                        </div>
                      </div>

                      {!isAll && (
                        <div className="ad-chips">
                          {shown.map((c) => (
                            <span key={c} className={`ad-chip k-${siteKind(c)}`} title={`${c} - ${siteName(c)}`}>
                              <span className="code">{c}</span> {siteName(c)}
                            </span>
                          ))}
                          {list.length > MAP_CHIPS_COLLAPSED && (
                            <button
                              type="button"
                              className="ad-link"
                              onClick={() => setExpanded((p) => ({ ...p, [grp]: !open }))}
                            >
                              {open ? 'Mostrar menos' : `Ver todas (+${list.length - MAP_CHIPS_COLLAPSED})`}
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}

      {/* ================= ABA: SIMULADOR ================= */}
      {tab === 'simulador' && (
        <section className="ad-card">
          <div className="ad-card-head">
            <span className="ad-step"><Icon name="user" size={14} /></span>
            <div>
              <h3>Simulador de autenticação</h3>
              <p>
                Teste um usuário real do AD para conferir se as credenciais funcionam e quais lojas e privilégios ele receberá.
                A senha é usada apenas para este teste.
              </p>
            </div>
          </div>

          <form onSubmit={handleTestarUsuario} className="ad-grid ad-g-sim">
            <div className="field">
              <label>Usuário (sAMAccountName)</label>
              <input
                type="text"
                placeholder="Ex: joao.silva"
                autoComplete="off"
                value={testUsername}
                onChange={(e) => setTestUsername(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Senha</label>
              <input
                type="password"
                placeholder="Senha do usuário no domínio"
                autoComplete="new-password"
                value={testPassword}
                onChange={(e) => setTestPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn dark" disabled={testingUser}>
              <Icon name="search" /> {testingUser ? 'Validando...' : 'Validar usuário'}
            </button>
          </form>

          {testUserResult && (
            <div className={`ad-alert ${testUserResult.authenticated ? 'ok' : 'bad'}`}>
              <div className="ad-alert-title">
                <Icon name={testUserResult.authenticated ? 'check' : 'alert'} />
                {testUserResult.authenticated ? 'Usuário autenticado com sucesso' : 'Autenticação recusada'}
              </div>
              <p>{testUserResult.message}</p>

              {testUserResult.authenticated && (
                <div className="ad-result">
                  <div className="ad-kv">
                    <div><span>Nome completo</span><b>{testUserResult.display_name || '-'}</b></div>
                    <div><span>E-mail</span><b>{testUserResult.email || '(não informado no AD)'}</b></div>
                    <div>
                      <span>Perfil resultante</span>
                      {testUserResult.would_be_superadmin ? (
                        <b className="ad-text-ok"><Icon name="shield" size={13} /> Superadministrador</b>
                      ) : (
                        <b className="ad-text-brand">Acesso específico por loja</b>
                      )}
                    </div>
                  </div>

                  <div className="ad-result-block">
                    <span className="ad-result-label">Lojas que o usuário verá no dashboard</span>
                    {testUserResult.would_be_superadmin ? (
                      <div className="ad-text-ok"><Icon name="check" size={13} /> {totalSitesLabel[0].toUpperCase() + totalSitesLabel.slice(1)} (acesso global irrestrito)</div>
                    ) : testUserResult.mapped_sites && testUserResult.mapped_sites.length > 0 ? (
                      <div className="ad-chips">
                        {testUserResult.mapped_sites.map((st) => (
                          <span key={st} className="ad-chip k-loja"><Icon name="store" size={12} /> {st}</span>
                        ))}
                      </div>
                    ) : (
                      <div className="ad-tip bad">
                        <Icon name="alert" size={14} />
                        <span>
                          Este usuário não está em nenhum grupo vinculado a lojas nem no grupo superadmin. Se entrar agora, o
                          dashboard ficará sem máquinas até que um dos seus grupos seja vinculado.
                        </span>
                      </div>
                    )}
                  </div>

                  {testUserResult.groups && testUserResult.groups.length > 0 && (
                    <div className="ad-result-block">
                      <span className="ad-result-label">Grupos do AD identificados ({testUserResult.groups.length})</span>
                      <div className="ad-chips">
                        {testUserResult.groups.map((g) => {
                          const sup = config.superadmin_groups.includes(g)
                          const map = !!config.group_mappings[g]
                          return (
                            <span key={g} className={`ad-chip ${sup ? 'strong' : map ? 'k-loja' : 'mini'}`} title={sup ? 'Grupo superadmin' : map ? 'Grupo vinculado a lojas' : ''}>
                              {sup && <Icon name="shield" size={12} />}
                              {map && !sup && <Icon name="store" size={12} />}
                              {g}
                            </span>
                          )
                        })}
                      </div>
                      <small className="ad-hint">Grupos destacados são os que concedem acesso (superadmin ou vínculo por loja).</small>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Barra de alterações pendentes */}
      {dirty && (
        <div className="ad-savebar" role="status">
          <span>
            <Icon name="alert" size={15} /> Você tem alterações não salvas.
          </span>
          <div>
            <button type="button" className="btn" onClick={handleDescartar} disabled={saving}>Descartar</button>
            <button type="button" className="btn primary" onClick={handleSalvar} disabled={saving}>
              <Icon name="save" /> {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}