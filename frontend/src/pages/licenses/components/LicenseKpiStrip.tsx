import React from 'react';
import {
  KeyRound,
  CheckCircle2,
  Sparkles,
  AlertOctagon,
  AlertTriangle,
} from 'lucide-react';
import { LicenseStats } from '@/types/license';

interface LicenseKpiStripProps {
  stats: LicenseStats | null;
  statusAtivo: string;
  onSelectStatus: (status: string) => void;
  loading?: boolean;
}

export const LicenseKpiStrip: React.FC<LicenseKpiStripProps> = ({
  stats,
  statusAtivo,
  onSelectStatus,
  loading = false,
}) => {
  const cards = [
    {
      id: 'todas',
      label: 'Total de Licenças',
      valor: stats?.total_licencas ?? 0,
      sub: 'Lotes gerenciados',
      icon: KeyRound,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      activeColor: 'ring-2 ring-indigo-500 bg-indigo-50/50',
    },
    {
      id: 'em_uso',
      label: 'Licenças em Uso',
      valor: stats?.total_em_uso ?? 0,
      sub: 'Ativações vinculadas',
      icon: CheckCircle2,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      activeColor: '',
      isFilter: false,
    },
    {
      id: 'disponiveis',
      label: 'Disponíveis',
      valor: stats?.total_disponiveis ?? 0,
      sub: 'Ativações livres no estoque',
      icon: Sparkles,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      activeColor: 'ring-2 ring-emerald-500 bg-emerald-50/50',
      isFilter: true,
    },
    {
      id: 'esgotadas',
      label: 'Esgotadas',
      valor: stats?.total_esgotadas ?? 0,
      sub: 'Sem ativações livres',
      icon: AlertOctagon,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      activeColor: 'ring-2 ring-rose-500 bg-rose-50/50',
      isFilter: true,
    },
    {
      id: 'pendentes',
      label: 'Solicitações Bancada',
      valor: stats?.solicitacoes_pendentes ?? 0,
      sub: 'Aguardando chave Windows',
      icon: AlertTriangle,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      activeColor: 'ring-2 ring-amber-500 bg-amber-50/50',
      isFilter: false,
      hasWarningBadge: (stats?.solicitacoes_pendentes ?? 0) > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected =
          card.isFilter !== false &&
          ((card.id === 'todas' && (statusAtivo === '' || statusAtivo === 'todas')) ||
            statusAtivo === card.id);

        return (
          <button
            key={card.id}
            type="button"
            disabled={card.isFilter === false}
            onClick={() => {
              if (card.isFilter !== false) {
                onSelectStatus(card.id === 'todas' ? 'todas' : card.id);
              }
            }}
            className={`text-left p-3.5 rounded-xl border bg-white shadow-xs transition-all duration-150 ${
              card.isFilter !== false ? 'hover:shadow-md cursor-pointer' : 'cursor-default'
            } ${isSelected ? card.activeColor : 'border-slate-200 hover:border-slate-300'}`}
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
                  Pendente
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
