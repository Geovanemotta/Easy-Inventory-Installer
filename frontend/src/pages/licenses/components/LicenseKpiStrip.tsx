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
      color: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
      accentLine: 'bg-gradient-to-r from-orange-500 to-amber-500',
      isFilter: true,
    },
    {
      id: 'em_uso',
      label: 'Licenças em Uso',
      valor: stats?.total_em_uso ?? 0,
      sub: 'Ativações vinculadas',
      icon: CheckCircle2,
      color: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
      accentLine: 'bg-gradient-to-r from-blue-500 to-indigo-500',
      isFilter: false,
    },
    {
      id: 'disponiveis',
      label: 'Disponíveis',
      valor: stats?.total_disponiveis ?? 0,
      sub: 'Ativações livres no estoque',
      icon: Sparkles,
      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
      accentLine: 'bg-gradient-to-r from-emerald-500 to-teal-500',
      isFilter: true,
    },
    {
      id: 'esgotadas',
      label: 'Esgotadas',
      valor: stats?.total_esgotadas ?? 0,
      sub: 'Sem ativações livres',
      icon: AlertOctagon,
      color: 'text-rose-400 bg-rose-500/15 border-rose-500/30',
      accentLine: 'bg-gradient-to-r from-rose-500 to-red-500',
      isFilter: true,
    },
    {
      id: 'pendentes',
      label: 'Solicitações Bancada',
      valor: stats?.solicitacoes_pendentes ?? 0,
      sub: 'Aguardando chave Windows',
      icon: AlertTriangle,
      color: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
      accentLine: 'bg-gradient-to-r from-amber-500 to-yellow-500',
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
            className={`relative overflow-hidden text-left p-3.5 rounded-xl border bg-[#121721] shadow-sm transition-all duration-200 group ${
              card.isFilter !== false ? 'hover:border-[#263044] cursor-pointer' : 'cursor-default'
            } ${
              isSelected
                ? 'border-orange-500/80 shadow-md shadow-orange-500/10 ring-1 ring-orange-500/30'
                : 'border-[#1E2636]'
            }`}
          >
            {/* Linha superior de acento */}
            <div className={`absolute top-0 left-0 right-0 h-[2px] ${card.accentLine}`} />

            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-400 truncate">
                {card.label}
              </span>
              <div className={`p-1.5 rounded-lg border ${card.color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold font-mono text-white tabular-nums">
                {loading ? (
                  <span className="inline-block w-12 h-6 bg-[#181F2E] rounded animate-pulse" />
                ) : (
                  card.valor.toLocaleString('pt-BR')
                )}
              </span>
              {card.hasWarningBadge && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
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
