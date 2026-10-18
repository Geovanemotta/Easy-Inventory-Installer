import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Monitor,
  Network,
  Radio,
  FileBarChart,
  Package,
  Building2,
  KeyRound,
  FolderTree,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { deviceService } from '@/services/deviceService';

export const Sidebar: React.FC = () => {
  const { user, isAdmin, isMatrizOperator, logout } = useAuth();
  const [deviceCount, setDeviceCount] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    deviceService
      .listDevices({ per_page: 1 })
      .then((res) => {
        if (isMounted) {
          setDeviceCount(res.pagination.total);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const canRemoteAccess = isAdmin || isMatrizOperator;
  const canLicenses = isAdmin;
  const canApplications = isAdmin;

  // Os 8 exatos módulos da aplicação original
  const navItems = [
    {
      to: '/devices',
      label: 'Estações',
      icon: Monitor,
      badge: deviceCount !== null && deviceCount > 0 ? deviceCount : undefined,
      visible: true,
    },
    {
      to: '/network-assets',
      label: 'Ativos de Rede',
      icon: Network,
      visible: true,
    },
    {
      to: '/remote-access',
      label: 'Acesso Remoto',
      icon: Radio,
      visible: canRemoteAccess,
    },
    {
      to: '/reports',
      label: 'Relatórios',
      icon: FileBarChart,
      visible: true,
    },
    {
      to: '/applications',
      label: 'Aplicativos',
      icon: Package,
      visible: canApplications,
    },
    {
      to: '/sites',
      label: 'Lojas & Filiais',
      icon: Building2,
      visible: isAdmin,
    },
    {
      to: '/licenses',
      label: 'Licenças',
      icon: KeyRound,
      visible: canLicenses,
    },
    {
      to: '/ad',
      label: 'Active Directory',
      icon: FolderTree,
      visible: isAdmin,
    },
  ];

  const roleLabel = user?.is_superadmin
    ? 'Super Admin'
    : isAdmin
    ? 'Administrador'
    : isMatrizOperator
    ? 'Operador Matriz'
    : 'Operador Loja';

  return (
    <aside className="fixed inset-y-0 left-0 z-30 w-64 border-r border-slate-200 bg-white flex flex-col justify-between shrink-0 select-none h-screen overflow-y-auto">
      <div className="p-4 space-y-5">
        {/* Marca / Identidade */}
        <div className="flex items-center gap-2.5 px-2 py-1">
          <div className="rounded-xl bg-blue-600 p-2 text-white shadow-xs">
            <Monitor className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800 leading-tight">
              Grupo Giassi
            </div>
            <div className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
              Inventário &bull; TI
            </div>
          </div>
        </div>

        <div className="px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Módulos de Gestão
        </div>

        {/* 8 Módulos de Navegação */}
        <nav className="space-y-1">
          {navItems
            .filter((item) => item.visible)
            .map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 font-mono">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
        </nav>
      </div>

      {/* Footer com Usuário e Logout */}
      <div className="p-4 border-t border-slate-100 space-y-3 bg-slate-50/50">
        {user && (
          <div className="flex items-center gap-2.5 px-1">
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-2xs shrink-0">
              {user.username.charAt(0)}
            </div>
            <div className="min-w-0 flex-1 text-xs">
              <div className="font-semibold text-slate-800 truncate" title={user.username}>
                {user.username}
              </div>
              <div className="text-[10px] font-bold text-blue-600 truncate">
                {roleLabel}
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={logout}
          title="Encerrar sessão"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors shadow-2xs"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sair da Conta</span>
        </button>

        <div className="text-[10px] text-slate-400 text-center font-medium">
          Giassi Inventory &bull; v2.0 Modular
        </div>
      </div>
    </aside>
  );
};
