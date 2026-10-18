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
  const R = 46;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between ${className}`}>
      {/* Cabeçalho do Card de Gráfico */}
      <div className="mb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">{title}</h4>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      {total === 0 || slices.length === 0 ? (
        <div className="py-10 text-center text-xs text-slate-400 italic">
          Sem dados disponíveis para os filtros ativos.
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* SVG Donut */}
          <div className="relative shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 130 130" width="120" height="120" className="transform -rotate-90">
              {/* Círculo de fundo cinza */}
              <circle
                cx="65"
                cy="65"
                r={R}
                fill="none"
                stroke="#f1f5f9"
                strokeWidth={16}
              />

              {/* Fatias */}
              {slices.map((slice, idx) => {
                const sliceLength = total > 0 ? (slice.count / total) * C : 0;
                const isSelected = activeItem === slice.label;
                const strokeDashoffset = -offset;
                offset += sliceLength;

                return (
                  <circle
                    key={idx}
                    cx="65"
                    cy="65"
                    r={R}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={isSelected ? 20 : 16}
                    strokeDasharray={`${sliceLength} ${C - sliceLength}`}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300"
                    style={{
                      cursor: onItemClick ? 'pointer' : 'default',
                      opacity: activeItem ? (isSelected ? 1 : 0.4) : 1,
                    }}
                    onClick={() => onItemClick && onItemClick(slice.label)}
                  >
                    <title>{`${slice.label}: ${slice.count} (${slice.percent}%)`}</title>
                  </circle>
                );
              })}
            </svg>

            {/* Texto central com Total */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
              <span className="text-lg font-extrabold text-slate-800 font-mono leading-none">
                {total}
              </span>
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                máquinas
              </span>
            </div>
          </div>

          {/* Legenda Interativa */}
          <div className="flex-1 w-full space-y-1.5 min-w-0">
            {slices.map((slice, idx) => {
              const isSelected = activeItem === slice.label;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onItemClick && onItemClick(slice.label)}
                  title={`Filtrar por ${slice.label}`}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg text-xs transition-colors ${
                    isSelected
                      ? 'bg-blue-50 text-blue-900 font-bold ring-1 ring-blue-300'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="truncate text-left">{slice.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                    <span className="font-bold text-slate-800">{slice.count}</span>
                    <span className="text-slate-400 text-[10px]">({slice.percent}%)</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
