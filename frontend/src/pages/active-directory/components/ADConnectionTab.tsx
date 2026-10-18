import { useState } from 'react'
import type { ADConfig, TestConnectionResult } from '../../../types/ad'

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
    <div className="space-y-6">
      {/* Status da Conexão e Toggle de Ativação */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Autenticação Corporativa Active Directory / LDAP
          </h3>
          <p className="text-xs text-slate-500">
            Habilite o logon único (SSO) com as credenciais do domínio da sua organização
          </p>
        </div>

        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
            className="peer sr-only"
          />
          <div className="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-blue-600 peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white" />
        </label>
      </div>

      {/* Formulário de Configuração do Servidor */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">
          Servidor Domain Controller
        </h4>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Host / IP do Servidor AD *
            </label>
            <input
              type="text"
              placeholder="Ex: 192.168.1.10 ou dc01.empresa.local"
              value={config.server_host}
              onChange={(e) => onChange({ ...config, server_host: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Porta LDAP *
            </label>
            <input
              type="number"
              value={config.server_port}
              onChange={(e) => onChange({ ...config, server_port: Number(e.target.value) })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400">Padrão: 389 (LDAP) ou 636 (LDAPS)</span>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Domínio (NetBIOS / DNS) *
            </label>
            <input
              type="text"
              placeholder="Ex: giassi.local ou GIASSI"
              value={config.domain}
              onChange={(e) => onChange({ ...config, domain: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Base DN de Pesquisa *
            </label>
            <input
              type="text"
              placeholder="Ex: DC=giassi,DC=local"
              value={config.base_dn}
              onChange={(e) => onChange({ ...config, base_dn: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-6 sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={config.use_ssl}
                onChange={(e) => onChange({ ...config, use_ssl: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-slate-700">
                Utilizar SSL (LDAPS)
              </span>
            </label>

            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={config.use_tls}
                onChange={(e) => onChange({ ...config, use_tls: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-slate-700">
                Utilizar StartTLS
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Conta de Serviço / Bind DN */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">
          Conta de Serviço (Bind User)
        </h4>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Usuário de Serviço (Bind DN)
            </label>
            <input
              type="text"
              placeholder="Ex: svc-inventario@giassi.local ou CN=svc,OU=TI,DC=..."
              value={config.bind_user || ''}
              onChange={(e) => onChange({ ...config, bind_user: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400">
              Necessário para consulta de grupos e mapeamento automático
            </span>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Senha da Conta de Serviço
            </label>
            <input
              type="password"
              placeholder={config.has_bind_password ? '•••••••• (Preenchida no banco)' : 'Informe a senha'}
              value={config.bind_password || ''}
              onChange={(e) => onChange({ ...config, bind_password: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            {config.has_bind_password && (
              <span className="text-[10px] font-semibold text-emerald-600">
                ✓ Senha já armazenada de forma segura
              </span>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Filtro LDAP de Usuário *
            </label>
            <input
              type="text"
              value={config.user_search_filter}
              onChange={(e) => onChange({ ...config, user_search_filter: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400">
              Deve conter a marcação <code className="font-bold">{`{username}`}</code>
            </span>
          </div>

          <div className="sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={config.auto_sync_on_login}
                onChange={(e) => onChange({ ...config, auto_sync_on_login: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-slate-700">
                Sincronizar grupos e atualizar permissões a cada login do usuário
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Painel de Diagnóstico do Teste de Conexão */}
      {testResult && (
        <div
          className={`rounded-xl border p-4 text-xs animate-in fade-in duration-200 ${
            testResult.success
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2 font-bold">
            <span>{testResult.success ? '✓' : '⚠'}</span>
            <span>{testResult.message}</span>
            {testResult.latency_ms !== undefined && (
              <span className="rounded-md border border-slate-200 bg-white/90 px-2 py-0.5 font-mono text-[11px] text-slate-700 shadow-xs">
                Latência: {testResult.latency_ms.toFixed(1)} ms
              </span>
            )}
          </div>
          {testResult.diagnostic && (
            <p className="mt-1.5 font-mono text-[11px] opacity-90">{testResult.diagnostic}</p>
          )}
          {testResult.suggestion && (
            <p className="mt-1 font-semibold text-blue-700">
              💡 {testResult.suggestion}
            </p>
          )}
        </div>
      )}

      {/* Botões de Ação */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={handleTest}
          disabled={testing || !config.server_host}
          className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {testing ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
          ) : (
            <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )}
          {testing ? 'Testando Conexão...' : 'Testar Conectividade'}
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  )
}
