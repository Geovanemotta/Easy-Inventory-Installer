import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { LogOut, UserCircle } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout, isAdmin, isMatrizOperator } = useAuth();

  const getRoleLabel = () => {
    if (user?.is_superadmin) return 'Superadmin';
    if (isAdmin) return 'Administrador';
    if (isMatrizOperator) return 'Operador Matriz';
    return 'Operador';
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight text-slate-800">
          Giassi Inventory <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">V2</span>
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <UserCircle className="h-6 w-6 text-slate-400" />
          <div className="flex flex-col text-right">
            <span className="text-sm font-medium text-slate-700">
              {user?.full_name || user?.username || 'Usuário'}
            </span>
            <span className="text-xs text-slate-500">{getRoleLabel()}</span>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <button
          onClick={logout}
          title="Encerrar Sessão"
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </button>
      </div>
    </header>
  );
};
