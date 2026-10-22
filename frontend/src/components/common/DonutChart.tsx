import React from 'react';
import { DonutChartData } from '@/types/device';

interface DonutChartProps {
  data: DonutChartData;
  activeItem?: string;
  onItemClick?: (label: string) => void;
  className?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  activeItem,
  onItemClick,
  className = '',
}) => {
  const { title, subtitle, total, slices } = data;

  // Ordenação decrescente por quantidade conforme solicitado
  const sortedSlices = [...slices].sort((a, b) => b.count - a.count);

  return (
    <div
      className={`h-[250px] rounded-xl border border-[#1E2636] bg-[#121721] p-4 shadow-sm flex flex-col justify-between transition-all hover:border-[#263044] select-none ${className}`}
    >
      {/* Cabeçalho do Card */}
      <div className="shrink-0 mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100 truncate">
            {title}
          </h4>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
        <span className="px-2 py-0.5 rounded-full bg-[#181F2E] border border-[#1E2636] text-[11px] font-mono text-slate-300 font-medium shrink-0 tabular-nums">
          {total}
        </span>
      </div>

      {total === 0 || sortedSlices.length === 0 ? (
        <div className="text-center text-xs text-slate-500 italic flex-1 flex items-center justify-center">
          Sem dados disponíveis para os filtros ativos.
        </div>
      ) : (
        /* Lista de Barras Horizontais ordenadas decrescentemente sem linhas de eixo no fundo */
        <div className="flex-1 space-y-2.5 min-h-0 flex flex-col justify-center">
          {sortedSlices.map((slice, idx) => {
            const isSelected = activeItem === slice.label;
            const hasActiveSelection = Boolean(activeItem);
            const percentage = total > 0 ? (slice.count / total) * 100 : 0;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onItemClick && onItemClick(slice.label)}
                className={`group/item w-full text-left p-2 rounded-xl transition-all duration-200 cursor-pointer border flex items-center gap-3 ${
                  isSelected
                    ? 'bg-orange-500/15 ring-1 ring-orange-500/40 border-orange-500/50 shadow-[0_0_12px_rgba(249,115,22,0.15)]'
                    : 'border-transparent hover:bg-[#181F2E]/80 hover:border-[#263044]'
                }`}
                style={{
                  opacity: hasActiveSelection ? (isSelected ? 1 : 0.35) : 1,
                }}
              >
                {/* 1. Lado esquerdo: Nome da Categoria com marcador colorido */}
                <div className="w-[110px] sm:w-[130px] shrink-0 flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span
                    className={`truncate text-xs font-semibold ${
                      isSelected ? 'text-white' : 'text-slate-200'
                    }`}
                    title={slice.label}
                  >
                    {slice.label}
                  </span>
                </div>

                {/* 2. Centro: Barra Horizontal Alargada sem linhas de eixo de fundo */}
                <div className="flex-1 h-5 bg-[#181F2E] border border-[#232D42]/80 rounded-md overflow-hidden p-0.5 min-w-[50px]">
                  <div
                    className="h-full rounded-sm transition-all duration-300"
                    style={{
                      width: `${Math.max(percentage, slice.count > 0 ? 3 : 0)}%`,
                      backgroundColor: slice.color,
                      boxShadow: isSelected ? `0 0 10px ${slice.color}99` : 'none',
                    }}
                  />
                </div>

                {/* 3. Lado direito das pontas: Valores Numéricos com largura fixa uniforme */}
                <div className="w-[88px] sm:w-[80px] shrink-0 text-right font-mono tabular-nums flex items-baseline justify-end gap-0.5">
                  <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-100'}`}>
                    {slice.count}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">
                    ({slice.percent}%)
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};