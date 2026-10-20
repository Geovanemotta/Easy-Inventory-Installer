import React from 'react';
import {
  Package,
  Layers,
  AppWindow,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { SoftwareCatalogKPIs } from '@/types/software';

interface AppsKpiStripProps {
  kpis: SoftwareCatalogKPIs | null;
  categoriaAtiva: string;
  onSelectCategoria: (categoria: string) => void;
  onOpenSemApps?: () => void;
  onOpenComApps?: () => void;
  onNavigateSemApps?: () => void;
  loading?: boolean;
}

export const AppsKpiStrip: React.FC<AppsKpiStripProps> = ({
  kpis,
  categoriaAtiva,
  onSelectCategoria,
  onOpenSemApps,
  onOpenComApps,
  onNavigateSemApps,
  loading = false,
}) => {
  const semAppsCount = kpis?.maquinas_sem_apps ?? 0;

  const cards = [
    {
      id: 'todas',
      label: 'Catálogo',
      valor: kpis?.total_softwares ?? 0,
      sub: `${kpis?.total_maquinas_inventariadas ?? 0} máquinas`,
      icon: Package,
      accentColor: '#F97316',
      iconColor: 'text-orange-400',
      isFilter: true,
    },
    {
      id: 'instalacoes',
      label: 'Instalações',
      valor: kpis?.total_instalacoes ?? 0,
      sub: 'Pacotes em execução',
      icon: Layers,
      accentColor: '#3B82F6',
      iconColor: 'text-blue-400',
      isFilter: false,
    },
    {
      id: 'aplicativo',
      label: 'Aplicativos',
      valor: kpis?.aplicativos ?? 0,
      sub: 'Browsers, ERP e Office',
      icon: AppWindow,
      accentColor: '#10B981',
      iconColor: 'text-emerald-400',
      isFilter: true,
    },
    {
      id: 'agente',
      label: 'Agentes & Gestão',
      valor: kpis?.agentes ?? 0,
      sub: 'Inventário e AV',
      icon: ShieldAlert,
      accentColor: '#8B5CF6',
      iconColor: 'text-purple-400',
      isFilter: true,
    },
    {
      id: 'com_apps',
      label: 'c/ Inventário',
      valor: kpis?.maquinas_com_apps ?? 0,
      sub: 'Clique p/ ver lista',
      icon: CheckCircle2,
      accentColor: '#06B6D4',
      iconColor: 'text-cyan-400',
      isFilter: false,
      isAction: true,
    },
    {
      id: 'sem_apps',
      label: 'Alerta: Sem Apps',
      valor: semAppsCount,
      sub: semAppsCount > 0 ? 'Clique p/ pendências' : '100% inventariada',
      icon: AlertTriangle,
      accentColor: semAppsCount > 0 ? '#EF4444' : '#64748B',
      iconColor: semAppsCount > 0 ? 'text-rose-400' : 'text-slate-400',
      isFilter: false,
      isAction: true,
      hasWarningBadge: semAppsCount > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected =
          card.isFilter &&
          ((card.id === 'todas' && (categoriaAtiva === '' || categoriaAtiva === 'todas')) ||
            categoriaAtiva === card.id);

        const isClickable = card.isFilter || card.isAction;

        return (
          <button
            key={card.id}
            type="button"
            disabled={!isClickable}
            onClick={() => {
              if (card.id === 'sem_apps') {
                if (onOpenSemApps) onOpenSemApps();
                else if (onNavigateSemApps) onNavigateSemApps();
              } else if (card.id === 'com_apps') {
                if (onOpenComApps) onOpenComApps();
              } else if (card.isFilter) {
                onSelectCategoria(card.id === 'todas' ? 'todas' : card.id);
              }
            }}
            className={`group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all overflow-hidden ${
              isClickable ? 'cursor-pointer' : 'cursor-default'
            } ${
              isSelected
                ? 'border-orange-500 ring-1 ring-orange-500/30 bg-[#181F2E]'
                : 'border-[#1E2636] bg-[#121721] bg-gradient-to-b from-[#181F2E]/40 to-[#121721] hover:border-[#263044] hover:bg-[#181F2E]/70'
            }`}
          >
            {/* Linha de acento no topo do card */}
            <div
              className="absolute top-0 left-0 right-0 h-0.5"
              style={{ backgroundColor: card.accentColor }}
            />

            <div className="flex w-full items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                {card.label}
              </span>
              <div className={`p-1 rounded-md bg-[#181F2E] border border-[#1E2636] ${card.iconColor} group-hover:scale-105 transition-transform`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="my-1.5 flex items-baseline gap-2">
              <span className={`text-2xl font-extrabold font-mono tabular-nums tracking-tight ${card.hasWarningBadge ? 'text-rose-400' : 'text-white'} group-hover:text-orange-400 transition-colors`}>
                {loading ? (
                  <span className="inline-block w-12 h-6 bg-[#181F2E] rounded animate-pulse" />
                ) : (
                  card.valor.toLocaleString('pt-BR')
                )}
              </span>
              {card.hasWarningBadge && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                  Atenção
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: card.accentColor }}
              />
              <span className="truncate">{card.sub}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

