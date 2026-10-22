import { useState } from 'react'
import { testADUser } from '../../../services/adService'
import type { TestUserResult } from '../../../types/ad'
import { UserCheck, KeyRound, CheckCircle2, AlertCircle, ShieldCheck, Building2, Users } from 'lucide-react'

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
    <div className="space-y-6 text-xs">
      {/* Formulário de Simulação */}
      <div className="rounded-2xl border border-[#1E2636] bg-[#121721] p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-orange-400" />
            Simulador de Autenticação e Diagnóstico de Privilégios
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Valide as credenciais reais de um usuário diretamente no controlador de domínio e verifique os grupos e lojas que seriam atribuídos
          </p>
        </div>

        <form onSubmit={handleTestUser} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              Nome de Usuário (sAMAccountName ou email) *
            </label>
            <input
              type="text"
              placeholder="Usuario no AD"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-[#263044] bg-[#181F2E] px-3 py-2 text-xs font-mono font-medium text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              Senha do Usuário *
            </label>
            <input
              type="password"
              placeholder="Digite a senha de rede do usuário"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[#263044] bg-[#181F2E] px-3 py-2 text-xs font-medium text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="sm:col-span-2 flex justify-end pt-2">
            <button
              type="submit"
              disabled={testing || !username.trim() || !password}
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {testing ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              <span>{testing ? 'Testando no Active Directory...' : 'Simular Autenticação'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Resultado do Teste */}
      {result && (
        <div
          className={`rounded-2xl border p-5 shadow-xl animate-in fade-in duration-200 ${
            result.authenticated
              ? 'border-emerald-500/30 bg-[#121721]'
              : 'border-rose-500/30 bg-[#121721]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl border text-xs font-bold shrink-0 ${
                result.authenticated
                  ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
                  : 'border-rose-500/30 bg-rose-500/15 text-rose-400'
              }`}
            >
              {result.authenticated ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
            </div>
            <div>
              <h4
                className={`text-sm font-bold ${
                  result.authenticated ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {result.message}
              </h4>
              {result.display_name && (
                <p className="text-xs text-slate-300 mt-0.5">
                  Nome Exibição: <strong className="text-white">{result.display_name}</strong>{' '}
                  {result.email ? <span className="font-mono text-slate-400">({result.email})</span> : ''}
                </p>
              )}
            </div>
          </div>

          {result.authenticated && (
            <div className="mt-4 grid grid-cols-1 gap-4 border-t border-[#1E2636] pt-4 text-xs sm:grid-cols-3">
              {/* Privilégios Calculados */}
              <div className="rounded-xl border border-[#1E2636] bg-[#181F2E]/60 p-3.5 space-y-1.5">
                <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-orange-400" /> Perfil Calculado:
                </span>
                <div className="mt-1">
                  {result.would_be_superadmin ? (
                    <span className="inline-block rounded-md border border-purple-500/30 bg-purple-500/15 px-2.5 py-1 text-xs font-bold text-purple-300">
                      ★ Superadministrador Global
                    </span>
                  ) : result.mapped_roles && result.mapped_roles.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {result.mapped_roles.map((r, i) => (
                        <span
                          key={i}
                          className="rounded-md border border-orange-500/30 bg-orange-500/15 px-2 py-0.5 font-bold text-orange-400"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-500 italic">Nenhum perfil específico (Apenas login padrão)</span>
                  )}
                </div>
              </div>

              {/* Lojas Autorizadas */}
              <div className="sm:col-span-2 rounded-xl border border-[#1E2636] bg-[#181F2E]/60 p-3.5 space-y-1.5">
                <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-orange-400" /> Lojas e Filiais com Acesso Liberado:
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {result.mapped_sites && result.mapped_sites.length > 0 ? (
                    result.mapped_sites.map((st, i) => (
                      <span
                        key={i}
                        className="rounded-lg border border-[#263044] bg-[#121721] px-2 py-1 text-[11px] font-mono font-medium text-slate-300"
                      >
                        {st}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 italic">Nenhuma loja associada aos grupos do usuário</span>
                  )}
                </div>
              </div>

              {/* Grupos do Usuário no AD */}
              <div className="sm:col-span-3 rounded-xl border border-[#1E2636] bg-[#181F2E]/60 p-3.5 space-y-1.5">
                <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-orange-400" /> Grupos do AD Pertencentes ({result.groups?.length || 0}):
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {result.groups && result.groups.length > 0 ? (
                    result.groups.map((g, i) => (
                      <span
                        key={i}
                        className="rounded-md border border-[#263044] bg-[#121721] px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-300 shadow-xs"
                      >
                        {g}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 italic">Nenhum grupo retornado para este usuário</span>
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
