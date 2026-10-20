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

  const activeSlice = activeItem ? slices.find((s) => s.label === activeItem) : null;

  return (
    <div className={`h-[230px] rounded-xl border border-[#1E2636] bg-[#121721] p-4 shadow-sm flex flex-col justify-between transition-all hover:border-[#263044] select-none ${className}`}>
      {/* Cabeçalho do Card de Gráfico */}
      <div className="shrink-0 mb-1">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100">{title}</h4>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{subtitle}</p>}
      </div>

      {total === 0 || slices.length === 0 ? (
        <div className="text-center text-xs text-slate-500 italic flex-1 flex items-center justify-center">
          Sem dados disponíveis para os filtros ativos.
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 flex-1 my-auto">
          {/* SVG Donut Centralizado com pontas arredondadas e trilha #1A2234 */}
          <div className="relative shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 130 130" width="124" height="124" className="transform -rotate-90">
              {/* Anel de fundo sutil */}
              <circle
                cx="65"
                cy="65"
                r={R}
                fill="none"
                stroke="#1A2234"
                strokeWidth={15}
              />

              {/* Fatias com strokeLinecap="round" e espaçamento visual */}
              {slices.map((slice, idx) => {
                const rawSliceLength = total > 0 ? (slice.count / total) * C : 0;
                const isSelected = activeItem === slice.label;
                const hasActiveSelection = Boolean(activeItem);

                // Espaçamento entre fatias se houver mais de 1 fatia
                const gap = slices.length > 1 && total > 0 ? 8 : 0;
                const sliceLength = Math.max(0, rawSliceLength - gap);
                const strokeDashoffset = -(offset + (gap > 0 ? gap / 2 : 0));
                offset += rawSliceLength;

                return (
                  <circle
                    key={idx}
                    cx="65"
                    cy="65"
                    r={R}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={isSelected ? 17 : 15}
                    strokeLinecap="round"
                    strokeDasharray={`${sliceLength} ${C - sliceLength}`}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-200 cursor-pointer"
                    style={{
                      opacity: hasActiveSelection ? (isSelected ? 1 : 0.35) : 1,
                      filter: isSelected ? `drop-shadow(0 0 6px ${slice.color}99)` : undefined,
                    }}
                    onClick={() => onItemClick && onItemClick(slice.label)}
                  >
                    <title>{`${slice.label}: ${slice.count} (${slice.percent}%)`}</title>
                  </circle>
                );
              })}
            </svg>

            {/* Texto central: Número grande com tabular-nums e legenda em laranja */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center">
              <span className="text-2xl font-extrabold font-mono tabular-nums tracking-tight text-white leading-none transition-all">
                {activeSlice ? activeSlice.count : total}
              </span>
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mt-1.5 transition-all">
                {activeSlice ? `${activeSlice.percent}%` : 'máquinas'}
              </span>
            </div>
          </div>

          {/* Legenda Interativa Verticalmente Alinhada */}
          <div className="flex-1 w-full space-y-1.5 min-w-0">
            {slices.map((slice, idx) => {
              const isSelected = activeItem === slice.label;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onItemClick && onItemClick(slice.label)}
                  title={`Filtrar por ${slice.label}`}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-orange-500/15 text-orange-300 font-semibold ring-1 ring-orange-500/30 border border-orange-500/40'
                      : 'hover:bg-[#181F2E] text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="truncate text-left text-slate-200">{slice.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px] tabular-nums">
                    <span className="font-bold text-white">{slice.count}</span>
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
