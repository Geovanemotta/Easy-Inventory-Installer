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
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { deviceService } from '@/services/deviceService';
import logo from '@/assets/logo-dark.png';
import logoLight from '@/assets/logo-light.png';

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

  // Os 8 módulos da aplicação
  const navItems = [
    {
      to: '/devices',
      label: 'Dispositivos',
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
      label: 'Configurações',
      icon: Settings,
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
    <aside className="fixed inset-y-0 left-0 z-30 w-64 border-r border-border-subtle bg-sidebar flex flex-col justify-between shrink-0 select-none h-screen overflow-y-auto">
      <div className="p-4 space-y-5">
        {/* Marca / Identidade Oficial Empresa */}
        <div className="flex flex-col items-center justify-center gap-2 px-2 py-3">
          <img
            src={logoLight}
            alt="Logo"
            className="h-9 w-auto max-w-[185px] object-contain dark:hidden"
          />
          <img
            src={logo}
            alt="Logo"
            className="h-9 w-auto max-w-[185px] object-contain brightness-105 hidden dark:block"
          />
          <span className="text-[10px] font-bold text-orange-400 uppercase tracking-[0.2em] text-center">
            Inventário
          </span>
        </div>

        <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-fg-muted">
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
                    `flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-md shadow-orange-500/20'
                        : 'text-fg-secondary hover:bg-app hover:text-fg font-medium'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isActive ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-white shrink-0 shadow-xs" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-transparent shrink-0" />
                        )}
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-fg-secondary'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold font-mono ${
                            isActive
                              ? 'bg-black/20 text-white'
                              : 'bg-elevated text-fg-secondary border border-border-subtle'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
        </nav>
      </div>

      {/* Footer com Usuário e Logout */}
      <div className="p-4 border-t border-border-subtle space-y-3 bg-sidebar">
        {user && (
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-app border border-border-subtle">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0">
              {user.username.charAt(0)}
            </div>
            <div className="min-w-0 flex-1 text-xs">
              <div className="font-semibold text-fg truncate" title={user.username}>
                {user.username}
              </div>
              <div className="text-[10px] font-bold text-orange-400 uppercase tracking-wider truncate">
                {roleLabel}
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={logout}
          title="Encerrar sessão"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border-subtle bg-surface py-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-500/30 transition-all cursor-pointer shadow-2xs"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sair da Conta</span>
        </button>

        <div className="text-[10px] text-fg-muted text-center font-medium tracking-wider">
          Easy Inventory &bull; v2.0
        </div>
      </div>
    </aside>
  );
};
