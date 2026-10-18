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
      label: 'Catálogo de Softwares',
      valor: kpis?.total_softwares ?? 0,
      sub: `${kpis?.total_maquinas_inventariadas ?? 0} máquinas inventariadas`,
      icon: Package,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      activeColor: 'ring-2 ring-indigo-500 bg-indigo-50/50',
      isFilter: true,
    },
    {
      id: 'instalacoes',
      label: 'Total de Instalações',
      valor: kpis?.total_instalacoes ?? 0,
      sub: 'Pacotes em execução no parque',
      icon: Layers,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      activeColor: '',
      isFilter: false,
    },
    {
      id: 'aplicativo',
      label: 'Aplicativos',
      valor: kpis?.aplicativos ?? 0,
      sub: 'Browsers, ERPs e Office',
      icon: AppWindow,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      activeColor: 'ring-2 ring-emerald-500 bg-emerald-50/50',
      isFilter: true,
    },
    {
      id: 'agente',
      label: 'Agentes & Gestão',
      valor: kpis?.agentes ?? 0,
      sub: 'Inventário, AV e Monitoramento',
      icon: ShieldAlert,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      activeColor: 'ring-2 ring-purple-500 bg-purple-50/50',
      isFilter: true,
    },
    {
      id: 'com_apps',
      label: 'Máquinas c/ Inventário',
      valor: kpis?.maquinas_com_apps ?? 0,
      sub: 'Clique p/ inspecionar lista',
      icon: CheckCircle2,
      color: 'text-teal-600 bg-teal-50 border-teal-200',
      activeColor: 'ring-2 ring-teal-500 bg-teal-50/50',
      isFilter: false,
      isAction: true,
    },
    {
      id: 'sem_apps',
      label: 'Alerta: Sem Apps',
      valor: semAppsCount,
      sub: semAppsCount > 0 ? 'Clique p/ ver pendências' : 'Frota 100% inventariada',
      icon: AlertTriangle,
      color: semAppsCount > 0 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-slate-500 bg-slate-50 border-slate-200',
      activeColor: 'ring-2 ring-amber-500 bg-amber-50/50',
      isFilter: false,
      isAction: true,
      hasWarningBadge: semAppsCount > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
            className={`text-left p-3.5 rounded-xl border bg-white shadow-xs transition-all duration-150 ${
              isClickable ? 'hover:shadow-md cursor-pointer hover:border-slate-300' : 'cursor-default'
            } ${isSelected ? card.activeColor : 'border-slate-200'}`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-500 truncate">
                {card.label}
              </span>
              <div className={`p-1.5 rounded-lg border ${card.color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-800">
                {loading ? (
                  <span className="inline-block w-12 h-6 bg-slate-200 rounded animate-pulse" />
                ) : (
                  card.valor.toLocaleString('pt-BR')
                )}
              </span>
              {card.hasWarningBadge && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                  Atenção
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-400 mt-0.5 truncate">{card.sub}</p>
          </button>
        );
      })}
    </div>
  );
};
