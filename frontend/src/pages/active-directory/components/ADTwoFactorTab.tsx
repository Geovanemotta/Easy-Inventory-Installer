import React, { useEffect, useMemo, useState } from 'react';
import {
  Shield,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Search,
  Key,
  X,
  Lock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { listManagedUsers, resetUser2FA } from '../../../services/adService';
import type { ManagedUser } from '../../../types/ad';

interface ADTwoFactorTabProps {
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
}

export const ADTwoFactorTab: React.FC<ADTwoFactorTabProps> = ({ onShowToast }) => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'ad' | 'local'>('all');

  // Modal de confirmação de reset
  const [userToReset, setUserToReset] = useState<ManagedUser | null>(null);
  const [resetting, setResetting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await listManagedUsers();
      setUsers(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar lista de usuários.';
      if (onShowToast) onShowToast(msg, 'error');
      else setFeedbackMsg({ text: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleConfirmReset = async () => {
    if (!userToReset) return;
    setResetting(true);
    try {
      const res = await resetUser2FA(userToReset.id);
      const successText = res.message || `2FA de ${userToReset.full_name} resetado com sucesso!`;
      if (onShowToast) {
        onShowToast(successText, 'success');
      } else {
        setFeedbackMsg({ text: successText, type: 'success' });
        setTimeout(() => setFeedbackMsg(null), 5000);
      }
      // Atualização imediata da lista local
      setUsers((prev) =>
        prev.map((u) => (u.id === userToReset.id ? { ...u, two_factor_enabled: false } : u))
      );
      setUserToReset(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao resetar 2FA do usuário.';
      if (onShowToast) onShowToast(msg, 'error');
      else setFeedbackMsg({ text: msg, type: 'error' });
    } finally {
      setResetting(false);
    }
  };

  // Filtragem dos usuários
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Filtro de status 2FA
      if (statusFilter === 'active' && !u.two_factor_enabled) return false;
      if (statusFilter === 'pending' && u.two_factor_enabled) return false;

      // Filtro de origem
      if (sourceFilter === 'ad' && u.auth_source !== 'ad') return false;
      if (sourceFilter === 'local' && u.auth_source === 'ad') return false;

      // Filtro de texto
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchName = u.full_name?.toLowerCase().includes(q);
        const matchUser = u.username?.toLowerCase().includes(q);
        const matchEmail = u.email?.toLowerCase().includes(q);
        if (!matchName && !matchUser && !matchEmail) return false;
      }

      return true;
    });
  }, [users, searchTerm, statusFilter, sourceFilter]);

  // Contadores
  const totalCount = users.length;
  const active2FACount = users.filter((u) => u.two_factor_enabled).length;
  const pending2FACount = totalCount - active2FACount;

  return (
    <div className="space-y-6 text-xs">
      {/* Feedback Inline (caso não haja toast global) */}
      {feedbackMsg && (
        <div
          className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-xs font-medium animate-in fade-in duration-150 ${
            feedbackMsg.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Card de Política de Segurança 2FA */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-blue-100 p-2 text-blue-700 shrink-0">
            <Lock className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-blue-900">
              Política de Autenticação em 2 Etapas (2FA / TOTP)
            </h3>
            <p className="text-[11px] leading-relaxed text-blue-700">
              O segundo fator de autenticação é obrigatório para todas as contas de operadores e administradores (tanto contas integradas do Active Directory quanto contas locais). O sistema utiliza chaves TOTP padrão da indústria compatíveis com Google Authenticator, Microsoft Authenticator e FreeOTP, mantendo sincronização com o MeshCentral.
            </p>
          </div>
        </div>
      </div>

      {/* Card Principal de Gestão com Cabeçalho e Tabela */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Cabeçalho do Card */}
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-purple-100 p-2 text-purple-600">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Gestão de Usuários e Autenticação em 2 Etapas (2FA)
              </h2>
              <p className="text-[11px] text-slate-500">
                Monitore o status do 2FA dos operadores e redefina o segredo caso o colaborador tenha trocado ou perdido o celular.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Carregando...' : 'Atualizar Lista'}</span>
          </button>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/20 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Campo de Busca */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrar por nome, usuário ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Abas Rápidas de Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  statusFilter === 'active'
                    ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2FA Ativo ({active2FACount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  statusFilter === 'pending'
                    ? 'bg-amber-500 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pendente ({pending2FACount})
              </button>
            </div>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as 'all' | 'ad' | 'local')}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">Todas as Origens</option>
              <option value="ad">Active Directory</option>
              <option value="local">Conta Local</option>
            </select>
          </div>
        </div>

        {/* Tabela de Usuários */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-500 mb-2" />
              <p className="text-xs">Consultando contas de usuários...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Shield className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-medium">Nenhum usuário localizado para os filtros selecionados.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Operador</th>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3">Perfis / Acessos</th>
                  <th className="px-4 py-3">Status do 2FA</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredUsers.map((u) => {
                  const isAd = u.auth_source === 'ad';
                  const initial = (u.full_name?.charAt(0) || u.username.charAt(0) || 'U').toUpperCase();

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Operador */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                              isAd
                                ? 'bg-sky-100 text-sky-700 border border-sky-200'
                                : 'bg-purple-100 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {initial}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{u.full_name || u.username}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              @{u.username}
                              {u.email && <span className="font-sans text-slate-400 ml-1.5">• {u.email}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Origem */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            isAd
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {isAd ? 'Active Directory' : 'Conta Local'}
                        </span>
                      </td>

                      {/* Perfis */}
                      <td className="px-4 py-3.5">
                        {u.is_superadmin ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                            Super Administrador
                          </span>
                        ) : u.roles && u.roles.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((r, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 border border-slate-200"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Sem perfis</span>
                        )}
                      </td>

                      {/* Status do 2FA */}
                      <td className="px-4 py-3.5">
                        {u.two_factor_enabled ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                            2FA Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 border border-amber-200">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                            Pendente (Próximo Login)
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setUserToReset(u)}
                          disabled={!u.two_factor_enabled || (resetting && userToReset?.id === u.id)}
                          title={
                            u.two_factor_enabled
                              ? 'Excluir chave atual e exigir novo QR Code no próximo login'
                              : 'O usuário ainda não cadastrou o 2FA'
                          }
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors shadow-2xs ${
                            u.two_factor_enabled
                              ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:text-rose-800'
                              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                          }`}
                        >
                          <Key className="h-3.5 w-3.5" />
                          <span>Resetar 2FA</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de Confirmação de Reset de 2FA */}
      {userToReset && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-rose-100 p-2.5 text-rose-600 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Resetar Autenticação em 2 Etapas?
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Usuário: <strong className="text-slate-800">{userToReset.full_name}</strong> (@{userToReset.username})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUserToReset(null)}
                disabled={resetting}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2 text-slate-600 leading-relaxed text-[11px]">
              <p>
                Ao confirmar o reset, a chave de 2FA atual do operador será <strong>removida imediatamente</strong> do Inventário e da central remota MeshCentral.
              </p>
              <p className="text-slate-500">
                No próximo login, o usuário deverá escanear um <strong>novo QR Code</strong> no aplicativo autenticador do celular para concluir o acesso.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToReset(null)}
                disabled={resetting}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={resetting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-700 transition-colors shadow-xs disabled:opacity-50"
              >
                {resetting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>{resetting ? 'Resetando...' : 'Confirmar e Resetar 2FA'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ADTwoFactorTab;
