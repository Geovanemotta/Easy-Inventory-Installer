import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getADConfig, saveADConfig, testADConnection } from '../../services/adService'
import { siteService } from '../../services/siteService'
import type { ADConfig, TestConnectionResult } from '../../types/ad'
import type { Site } from '../../types/site'
import ADConnectionTab from './components/ADConnectionTab'
import ADMappingsTab from './components/ADMappingsTab'
import ADSimulatorTab from './components/ADSimulatorTab'
import ADTwoFactorTab from './components/ADTwoFactorTab'

type ADTab = 'connection' | 'mappings' | 'simulator' | 'twoFactor'

export default function ActiveDirectoryPage() {
  const { user } = useAuth()
  const isSuperAdmin = Boolean(user?.is_superadmin)

  const [activeTab, setActiveTab] = useState<ADTab>('connection')
  const [config, setConfig] = useState<ADConfig>({
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
    superadmin_groups: ['Domain Admins'],
    group_mappings: {},
    auto_sync_on_login: true,
  })
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Carrega configuração e lista de lojas
  useEffect(() => {
    if (!isSuperAdmin) {
      setLoading(false)
      return
    }

    Promise.all([
      getADConfig().catch((err: unknown) => {
        console.warn('Falha ao obter configurações do AD:', err)
        return null
      }),
      siteService.listSites().catch((err: unknown) => {
        console.warn('Falha ao carregar filiais:', err)
        return []
      }),
    ])
      .then(([cfgRes, sitesRes]) => {
        if (cfgRes) setConfig(cfgRes)
        if (sitesRes) setSites(sitesRes)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [isSuperAdmin])

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type })
    setTimeout(() => setToastMsg(null), 4000)
  }

  // Salvar configuração no backend
  const handleSaveConfig = async () => {
    setSaving(true)
    try {
      const res = await saveADConfig(config)
      showToast(res.message || 'Configurações do Active Directory salvas com sucesso!')
      // Recarrega configuração para atualizar has_bind_password
      const updated = await getADConfig()
      setConfig(updated)
    } catch (err: any) {
      showToast(
        err?.response?.data?.detail || err?.message || 'Erro ao salvar configurações do AD.',
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async (): Promise<TestConnectionResult> => {
    return await testADConnection(config)
  }

  // Trava para usuários que não são Superadministradores
  if (!loading && !isSuperAdmin) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-base font-bold text-slate-900">
          Acesso Restrito a Administradores do Sistema
        </h2>
        <p className="mt-1.5 max-w-md text-xs text-slate-500">
          O módulo de integração e mapeamento de grupos do Active Directory / LDAP exige privilégios de superadministrador. Entre em contato com a equipe de infraestrutura para solicitar permissão.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast Notificação */}
      {toastMsg && (
        <div
          className={`fixed bottom-4 right-4 z-50 rounded-xl px-4 py-3 text-xs font-semibold text-white shadow-xl animate-in fade-in ${
            toastMsg.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {toastMsg.text}
        </div>
      )}

      {/* Cabeçalho da Página com Abas */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Active Directory &amp; LDAP
          </h1>
          <p className="text-xs text-slate-500">
            Gerenciamento de autenticação corporativa, sincronização de grupos e controle de acesso baseado em roles (RBAC)
          </p>
        </div>

        {/* Seletor de Abas */}
        <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('connection')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'connection'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            Conexão LDAP
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mappings')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'mappings'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Permissões &amp; Grupos
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'simulator'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Simulador de Usuário
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('twoFactor')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'twoFactor'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Autenticação 2FA
          </button>
        </div>
      </div>

      {/* Conteúdo da Aba */}
      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" />
      ) : activeTab === 'connection' ? (
        <ADConnectionTab
          config={config}
          onChange={setConfig}
          onSave={handleSaveConfig}
          onTest={handleTestConnection}
          saving={saving}
        />
      ) : activeTab === 'mappings' ? (
        <ADMappingsTab
          config={config}
          sites={sites}
          onChange={setConfig}
          onSave={handleSaveConfig}
          saving={saving}
        />
      ) : activeTab === 'simulator' ? (
        <ADSimulatorTab />
      ) : (
        <ADTwoFactorTab onShowToast={showToast} />
      )}
    </div>
  )
}
