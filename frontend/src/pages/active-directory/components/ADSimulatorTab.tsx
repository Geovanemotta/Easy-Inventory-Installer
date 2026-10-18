import { useState } from 'react'
import { testADUser } from '../../../services/adService'
import type { TestUserResult } from '../../../types/ad'

export default function ADSimulatorTab() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<TestUserResult | null>(null)

  const handleTestUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) return

    setTesting(true)
    setResult(null)
    try {
      const res = await testADUser(username.trim(), password)
      setResult(res)
    } catch (err: any) {
      setResult({
        authenticated: false,
        message: err?.response?.data?.detail || err?.message || 'Falha ao testar usuário no AD.',
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulário de Simulação */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-900">
            Simulador de Autenticação e Diagnóstico de Privilégios
          </h3>
          <p className="text-xs text-slate-500">
            Valide as credenciais reais de um usuário diretamente no controlador de domínio e verifique os grupos e lojas que seriam atribuídos
          </p>
        </div>

        <form onSubmit={handleTestUser} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Nome de Usuário (sAMAccountName ou email) *
            </label>
            <input
              type="text"
              placeholder="Ex: geovane.motta ou geovane.motta@giassi.local"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Senha do Usuário *
            </label>
            <input
              type="password"
              placeholder="Digite a senha de rede do usuário"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={testing || !username.trim() || !password}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-500 disabled:opacity-50"
            >
              {testing ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              )}
              {testing ? 'Testando no Active Directory...' : 'Simular Autenticação'}
            </button>
          </div>
        </form>
      </div>

      {/* Resultado do Teste */}
      {result && (
        <div
          className={`rounded-xl border p-5 shadow-sm animate-in fade-in duration-200 ${
            result.authenticated
              ? 'border-emerald-200 bg-emerald-50/50'
              : 'border-red-200 bg-red-50/50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${
                result.authenticated ? 'bg-emerald-600' : 'bg-red-600'
              }`}
            >
              {result.authenticated ? '✓' : '✕'}
            </div>
            <div>
              <h4
                className={`text-sm font-bold ${
                  result.authenticated
                    ? 'text-emerald-950'
                    : 'text-red-950'
                }`}
              >
                {result.message}
              </h4>
              {result.display_name && (
                <p className="text-xs text-slate-600">
                  Nome Exibição: <strong>{result.display_name}</strong> {result.email ? `(${result.email})` : ''}
                </p>
              )}
            </div>
          </div>

          {result.authenticated && (
            <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-200/60 pt-4 text-xs sm:grid-cols-3">
              {/* Privilégios Calculados */}
              <div>
                <span className="font-semibold text-slate-500">
                  Perfil Calculado:
                </span>
                <div className="mt-1">
                  {result.would_be_superadmin ? (
                    <span className="inline-block rounded-md bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-800">
                      ★ Superadministrador Global
                    </span>
                  ) : result.mapped_roles && result.mapped_roles.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {result.mapped_roles.map((r, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-blue-100 px-2 py-0.5 font-bold text-blue-800"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400">Nenhum perfil específico (Apenas login padrão)</span>
                  )}
                </div>
              </div>

              {/* Lojas Autorizadas */}
              <div className="sm:col-span-2">
                <span className="font-semibold text-slate-500">
                  Lojas e Filiais com Acesso Liberado:
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {result.mapped_sites && result.mapped_sites.length > 0 ? (
                    result.mapped_sites.map((st, i) => (
                      <span
                        key={i}
                        className="rounded bg-slate-200/80 px-2 py-0.5 text-[11px] font-medium text-slate-800"
                      >
                        {st}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400">Nenhuma loja associada aos grupos do usuário</span>
                  )}
                </div>
              </div>

              {/* Grupos do Usuário no AD */}
              <div className="sm:col-span-3">
                <span className="font-semibold text-slate-500">
                  Grupos do AD Pertencentes ({result.groups?.length || 0}):
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {result.groups && result.groups.length > 0 ? (
                    result.groups.map((g, i) => (
                      <span
                        key={i}
                        className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 shadow-xs"
                      >
                        {g}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400">Nenhum grupo retornado para este usuário</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
