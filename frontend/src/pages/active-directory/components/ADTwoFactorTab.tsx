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
import { SelectDropdown } from '../../../components/ui/SelectDropdown';

interface ADTwoFactorTabProps {
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
}

const SOURCE_OPTIONS = [
  { value: 'all', label: 'Todas as Origens' },
  { value: 'ad', label: 'Active Directory' },
  { value: 'local', label: 'Conta Local' },
];

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
      {/* Feedback Inline */}
      {feedbackMsg && (
        <div
          className={`flex items-center gap-2.5 rounded-2xl border p-4 text-xs font-medium shadow-lg animate-in fade-in duration-150 ${
            feedbackMsg.type === 'success'
              ? 'border-emerald-500/30 bg-[#121721] text-emerald-400'
              : 'border-rose-500/30 bg-[#121721] text-rose-400'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Card de Política de Segurança 2FA */}
      <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-2.5 text-orange-400 shrink-0">
            <Lock className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-white">
              Política de Autenticação em 2 Etapas (2FA / TOTP)
            </h3>
            <p className="text-[11px] leading-relaxed text-slate-300">
              O segundo fator de autenticação é obrigatório para todas as contas de operadores e administradores (tanto contas integradas do Active Directory quanto contas locais). O sistema utiliza chaves TOTP padrão da indústria compatíveis com Google Authenticator, Microsoft Authenticator e FreeOTP, mantendo sincronização de acesso remoto com o MeshCentral.
            </p>
          </div>
        </div>
      </div>

      {/* Card Principal de Gestão com Cabeçalho e Tabela */}
      <div className="rounded-2xl border border-[#1E2636] bg-[#121721] shadow-xl overflow-hidden">
        {/* Cabeçalho do Card */}
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between border-b border-[#1E2636] bg-[#0E131B]">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-2.5 text-orange-400 shadow-inner">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Gestão de Usuários e Autenticação em 2 Etapas (2FA)
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Monitore o status do 2FA dos operadores e redefina o segredo caso o colaborador tenha trocado ou perdido o celular.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-[#263044] bg-[#181F2E] px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-[#20293A] hover:text-white transition-colors shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-orange-400 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Carregando...' : 'Atualizar Lista'}</span>
          </button>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="p-4 border-b border-[#1E2636] bg-[#121721] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Campo de Busca */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrar por nome, usuário ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-[#263044] bg-[#181F2E] pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          {/* Abas Rápidas de Status e Filtro de Origem */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-xl border border-[#263044] bg-[#181F2E] p-1 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`rounded-lg px-3 py-1 transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-orange-500 text-white shadow-xs font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos (<span className="font-mono tabular-nums">{totalCount}</span>)
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`rounded-lg px-3 py-1 transition-colors ${
                  statusFilter === 'active'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                2FA Ativo (<span className="font-mono tabular-nums">{active2FACount}</span>)
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`rounded-lg px-3 py-1 transition-colors ${
                  statusFilter === 'pending'
                    ? 'bg-amber-500 text-white shadow-xs font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Pendente (<span className="font-mono tabular-nums">{pending2FACount}</span>)
              </button>
            </div>

            <SelectDropdown
              value={sourceFilter}
              onChange={(val) => setSourceFilter(val as 'all' | 'ad' | 'local')}
              options={SOURCE_OPTIONS}
              className="w-44"
              triggerClassName="py-1 text-[11px]"
            />
          </div>
        </div>

        {/* Tabela de Usuários */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin text-orange-500 mb-2" />
              <p className="text-xs">Consultando contas de usuários...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Shield className="h-8 w-8 mx-auto text-slate-600 mb-2" />
              <p className="text-xs font-medium">Nenhum usuário localizado para os filtros selecionados.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1E2636] bg-[#0E131B] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3">Operador</th>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3">Perfis / Acessos</th>
                  <th className="px-4 py-3">Status do 2FA</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2636]/60 text-xs">
                {filteredUsers.map((u) => {
                  const isAd = u.auth_source === 'ad';
                  const initial = (u.full_name?.charAt(0) || u.username.charAt(0) || 'U').toUpperCase();

                  return (
                    <tr key={u.id} className="hover:bg-[#181F2E]/60 transition-colors">
                      {/* Operador */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                              isAd
                                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                                : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                            }`}
                          >
                            {initial}
                          </div>
                          <div>
                            <div className="font-bold text-white">{u.full_name || u.username}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              @{u.username}
                              {u.email && <span className="font-sans text-slate-500 ml-1.5">• {u.email}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Origem */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                            isAd
                              ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                              : 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                          }`}
                        >
                          {isAd ? 'Active Directory' : 'Conta Local'}
                        </span>
                      </td>

                      {/* Perfis */}
                      <td className="px-4 py-3.5">
                        {u.is_superadmin ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                            ★ Super Administrador
                          </span>
                        ) : u.roles && u.roles.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((r, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center rounded bg-[#181F2E] px-2 py-0.5 text-[10px] font-medium text-slate-300 border border-[#263044]"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Sem perfis</span>
                        )}
                      </td>

                      {/* Status do 2FA */}
                      <td className="px-4 py-3.5">
                        {u.two_factor_enabled ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                            2FA Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-400 border border-amber-500/30">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
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
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors shadow-xs ${
                            u.two_factor_enabled
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 hover:text-rose-300'
                              : 'bg-[#181F2E] text-slate-600 border border-[#263044] cursor-not-allowed opacity-50'
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#121721] p-6 shadow-2xl border border-[#1E2636] space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 p-2.5 text-rose-400 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-white">
                  Resetar Autenticação em 2 Etapas?
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Usuário: <strong className="text-white">{userToReset.full_name}</strong>{' '}
                  <span className="font-mono text-slate-400">(@{userToReset.username})</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUserToReset(null)}
                disabled={resetting}
                className="rounded-lg p-1 text-slate-400 hover:bg-[#181F2E] hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl bg-[#181F2E] border border-[#263044] p-3.5 space-y-2 text-slate-300 leading-relaxed text-[11px]">
              <p>
                Ao confirmar o reset, a chave de 2FA atual do operador será <strong className="text-white">removida imediatamente</strong> do Inventário e da central remota MeshCentral.
              </p>
              <p className="text-slate-400">
                No próximo login, o usuário deverá escanear um <strong className="text-orange-400">novo QR Code</strong> no aplicativo autenticador do celular para concluir o acesso.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToReset(null)}
                disabled={resetting}
                className="rounded-xl border border-[#263044] bg-[#181F2E] px-4 py-2 font-semibold text-slate-300 hover:bg-[#20293A] hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={resetting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-700 transition-colors shadow-md shadow-rose-600/20 disabled:opacity-50"
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
