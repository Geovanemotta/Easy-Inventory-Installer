import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getADConfig, saveADConfig, testADConnection } from '../../services/adService'
import { siteService } from '../../services/siteService'
import type { ADConfig, TestConnectionResult } from '../../types/ad'
import type { Site } from '../../types/site'
import { Network, Users, UserCheck, KeyRound, AlertTriangle, Mail, Sliders } from 'lucide-react'
import ADConnectionTab from './components/ADConnectionTab'
import ADMappingsTab from './components/ADMappingsTab'
import ADSimulatorTab from './components/ADSimulatorTab'
import ADTwoFactorTab from './components/ADTwoFactorTab'
import SMTPConfigTab from './components/SMTPConfigTab'

type ADTab = 'connection' | 'mappings' | 'simulator' | 'twoFactor' | 'smtp'

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
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-border-subtle bg-surface p-8 text-center shadow-xl">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-inner">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="text-base font-bold text-fg">
          Acesso Restrito a Administradores do Sistema
        </h2>
        <p className="mt-2 max-w-md text-xs leading-relaxed text-fg-secondary">
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
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold shadow-2xl border transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            toastMsg.type === 'success'
              ? 'bg-surface border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
              : 'bg-surface border-rose-500/40 text-rose-600 dark:text-rose-400'
          }`}
        >
          <span className="h-2 w-2 rounded-full shrink-0 bg-current" />
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Cabeçalho da Página com Abas */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10 text-orange-400 shadow-inner">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-fg">
              Configurações do Sistema
            </h1>
            <p className="text-xs text-fg-secondary">
              Gestão integrada de infraestrutura: Active Directory / LDAP, Autenticação 2FA/MFA e Servidor SMTP
            </p>
          </div>
        </div>

        {/* Seletor de Abas */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border-subtle bg-surface p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('connection')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'connection'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-fg-secondary hover:text-fg hover:bg-elevated'
            }`}
          >
            <Network className="h-3.5 w-3.5" />
            <span>Configuração LDAP</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mappings')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'mappings'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-fg-secondary hover:text-fg hover:bg-elevated'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Mapeamento de Grupos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'simulator'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-fg-secondary hover:text-fg hover:bg-elevated'
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Busca / Simulador</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('twoFactor')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'twoFactor'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-fg-secondary hover:text-fg hover:bg-elevated'
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>Autenticação 2FA</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('smtp')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'smtp'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-fg-secondary hover:text-fg hover:bg-elevated'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Servidor SMTP &amp; Operadora</span>
          </button>
        </div>
      </div>

      {/* Conteúdo da Aba */}
      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl border border-border-subtle bg-surface p-6 shadow-sm" />
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
      ) : activeTab === 'twoFactor' ? (
        <ADTwoFactorTab onShowToast={showToast} />
      ) : (
        <SMTPConfigTab onShowToast={showToast} currentUserEmail={user?.email} />
      )}
    </div>
  )
}
