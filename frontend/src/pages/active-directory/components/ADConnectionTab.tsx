import { useState } from 'react'
import type { ADConfig, TestConnectionResult } from '../../../types/ad'
import { Server, ShieldCheck, Activity, Save, CheckCircle2, AlertCircle, Info } from 'lucide-react'

interface ADConnectionTabProps {
  config: ADConfig
  onChange: (updated: ADConfig) => void
  onSave: () => void
  onTest: () => Promise<TestConnectionResult>
  saving: boolean
}

export default function ADConnectionTab({
  config,
  onChange,
  onSave,
  onTest,
  saving,
}: ADConnectionTabProps) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null)

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await onTest()
      setTestResult(res)
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.response?.data?.detail || err?.message || 'Falha ao executar o teste.',
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6 text-xs">
      {/* Status da Conexão e Toggle de Ativação */}
      <div className="flex items-center justify-between rounded-2xl border border-border-subtle bg-surface p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10 text-orange-400">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-fg">
              Autenticação Corporativa Active Directory / LDAP
            </h3>
            <p className="text-xs text-fg-secondary">
              Habilite o logon único (SSO) com as credenciais corporativas do domínio Giassi
            </p>
          </div>
        </div>

        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
            className="peer sr-only"
          />
          <div className="h-6 w-11 rounded-full bg-elevated border border-border-medium peer-checked:bg-orange-500 peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full shadow-inner" />
        </label>
      </div>

      {/* Formulário de Configuração do Servidor */}
      <div className="rounded-2xl border border-border-subtle bg-surface p-5 shadow-sm space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
          <Server className="h-3.5 w-3.5" /> Servidor Domain Controller
        </h4>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-slate-300">
              Host / IP do Servidor AD *
            </label>
            <input
              type="text"
              placeholder="Ex: 192.168.1.10 ou dc01.empresa.local"
              value={config.server_host}
              onChange={(e) => onChange({ ...config, server_host: e.target.value })}
              className="w-full rounded-lg border border-border-medium bg-elevated px-3 py-2 text-xs font-mono font-medium text-fg placeholder-fg-muted focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-slate-300">
              Porta LDAP *
            </label>
            <input
              type="number"
              value={config.server_port}
              onChange={(e) => onChange({ ...config, server_port: Number(e.target.value) })}
              className="w-full rounded-lg border border-border-medium bg-elevated px-3 py-2 text-xs font-mono font-medium text-fg placeholder-fg-muted focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-colors"
            />
            <span className="text-[10px] text-fg-muted">Padrão: 389 (LDAP) ou 636 (LDAPS)</span>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-slate-300">
              Domínio (NetBIOS / DNS) *
            </label>
            <input
              type="text"
              placeholder="Ex: giassi.local ou GIASSI"
              value={config.domain}
              onChange={(e) => onChange({ ...config, domain: e.target.value })}
              className="w-full rounded-lg border border-border-medium bg-elevated px-3 py-2 text-xs font-medium text-fg placeholder-fg-muted focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-slate-300">
              Base DN de Pesquisa *
            </label>
            <input
              type="text"
              placeholder="Ex: DC=giassi,DC=local"
              value={config.base_dn}
              onChange={(e) => onChange({ ...config, base_dn: e.target.value })}
              className="w-full rounded-lg border border-border-medium bg-elevated px-3 py-2 font-mono text-xs font-medium text-fg placeholder-fg-muted focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-6 sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={config.use_ssl}
                onChange={(e) => onChange({ ...config, use_ssl: e.target.checked })}
                className="h-4 w-4 rounded border-border-medium bg-elevated text-orange-500 focus:ring-orange-500"
              />
              <span className="text-xs font-medium text-gray-700 dark:text-slate-300">
                Utilizar SSL (LDAPS)
              </span>
            </label>

            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={config.use_tls}
                onChange={(e) => onChange({ ...config, use_tls: e.target.checked })}
                className="h-4 w-4 rounded border-border-medium bg-elevated text-orange-500 focus:ring-orange-500"
              />
              <span className="text-xs font-medium text-gray-700 dark:text-slate-300">
                Utilizar StartTLS
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Conta de Serviço / Bind DN */}
      <div className="rounded-2xl border border-border-subtle bg-surface p-5 shadow-sm space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" /> Conta de Serviço (Bind User)
        </h4>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-slate-300">
              Usuário de Serviço (Bind DN)
            </label>
            <input
              type="text"
              placeholder="Ex: svc-inventario@giassi.local ou CN=svc,OU=TI,DC=..."
              value={config.bind_user || ''}
              onChange={(e) => onChange({ ...config, bind_user: e.target.value })}
              className="w-full rounded-lg border border-border-medium bg-elevated px-3 py-2 text-xs font-medium text-fg placeholder-fg-muted focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-colors"
            />
            <span className="text-[10px] text-fg-muted">
              Necessário para consulta de grupos e mapeamento automático
            </span>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-slate-300">
              Senha da Conta de Serviço
            </label>
            <input
              type="password"
              placeholder={config.has_bind_password ? '•••••••• (Preenchida no banco)' : 'Informe a senha'}
              value={config.bind_password || ''}
              onChange={(e) => onChange({ ...config, bind_password: e.target.value })}
              className="w-full rounded-lg border border-border-medium bg-elevated px-3 py-2 text-xs font-medium text-fg placeholder-fg-muted focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-colors"
            />
            {config.has_bind_password && (
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                ✓ Senha armazenada de forma segura
              </span>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-slate-300">
              Filtro LDAP de Usuário *
            </label>
            <input
              type="text"
              value={config.user_search_filter}
              onChange={(e) => onChange({ ...config, user_search_filter: e.target.value })}
              className="w-full rounded-lg border border-border-medium bg-elevated px-3 py-2 font-mono text-xs text-fg placeholder-fg-muted focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-colors"
            />
            <span className="text-[10px] text-fg-muted">
              Deve conter a marcação <code className="font-mono text-orange-400">{`{username}`}</code>
            </span>
          </div>

          <div className="sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={config.auto_sync_on_login}
                onChange={(e) => onChange({ ...config, auto_sync_on_login: e.target.checked })}
                className="h-4 w-4 rounded border-border-medium bg-elevated text-orange-500 focus:ring-orange-500"
              />
              <span className="text-xs font-medium text-gray-700 dark:text-slate-300">
                Sincronizar grupos e atualizar permissões a cada login do usuário
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Painel de Diagnóstico do Teste de Conexão */}
      {testResult && (
        <div
          className={`rounded-2xl border p-4 text-xs animate-in fade-in duration-200 ${
            testResult.success
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2 font-bold">
            {testResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{testResult.message}</span>
            {testResult.latency_ms !== undefined && (
              <span className="rounded-md border border-border-medium bg-elevated px-2 py-0.5 font-mono text-[11px] text-gray-700 dark:text-slate-300 shadow-xs">
                Latência: {testResult.latency_ms.toFixed(1)} ms
              </span>
            )}
          </div>
          {testResult.diagnostic && (
            <p className="mt-2 font-mono text-[11px] opacity-90">{testResult.diagnostic}</p>
          )}
          {testResult.suggestion && (
            <p className="mt-1.5 font-semibold text-orange-400 flex items-center gap-1">
              <Info className="h-3.5 w-3.5 shrink-0" /> {testResult.suggestion}
            </p>
          )}
        </div>
      )}

      {/* Botões de Ação */}
      <div className="flex items-center justify-between border-t border-border-subtle pt-4">
        <button
          type="button"
          onClick={handleTest}
          disabled={testing || !config.server_host}
          className="flex items-center gap-2 rounded-xl border border-border-medium bg-elevated px-4 py-2.5 text-xs font-semibold text-fg shadow-sm transition-all hover:bg-border-subtle hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
        >
          {testing ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
          ) : (
            <Activity className="h-4 w-4 text-orange-400" />
          )}
          <span>{testing ? 'Testando Conexão...' : 'Testar Conectividade'}</span>
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>{saving ? 'Salvando...' : 'Salvar Configurações'}</span>
        </button>
      </div>
    </div>
  )
}
