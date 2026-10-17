import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Monitor, KeyRound, Network, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const Sidebar: React.FC = () => {
  const { isAdmin } = useAuth();

  const navItems = [
    {
      to: '/devices',
      label: 'Dispositivos',
      icon: Monitor,
    },
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      to: '/licenses',
      label: 'Licenças & Seriais',
      icon: KeyRound,
    },
    {
      to: '/network-assets',
      label: 'Ativos de Rede',
      icon: Network,
    },
    ...(isAdmin
      ? [
          {
            to: '/users',
            label: 'Usuários & Acesso',
            icon: Users,
          },
        ]
      : []),
  ];

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between shrink-0">
      <div className="p-4 space-y-6">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Módulos do Sistema
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-100 text-xs text-slate-400 text-center">
        Giassi Inventory &bull; v2.0 Modular
      </div>
    </aside>
  );
};
