import { useState } from 'react'
import type { ChartSliceItem } from '../../../types/dashboard'

interface DonutChartProps {
  title: string
  subtitle?: string
  items: ChartSliceItem[]
  total: number
  activeLabel?: string | null
  onItemClick?: (label: string) => void
}

export default function DonutChart({
  title,
  subtitle,
  items,
  total,
  activeLabel,
  onItemClick,
}: DonutChartProps) {
  const [mode, setMode] = useState<'pct' | 'qtd'>('pct')

  const R = 50
  const C = 2 * Math.PI * R
  let currentOffset = 0

  const activeSlice = activeLabel ? items.find((s) => s.label === activeLabel) : null

  return (
    <div className="flex flex-col justify-between h-full rounded-xl border border-[#1E2636] bg-[#121721] p-5 shadow-sm transition-all hover:border-[#263044] select-none">
      <div className="mb-4 flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-sm font-bold text-slate-100">{title}</h3>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setMode((m) => (m === 'pct' ? 'qtd' : 'pct'))}
          className="rounded-md border border-[#263044] bg-[#181F2E] px-2 py-0.5 text-[10px] font-semibold text-slate-300 transition-colors hover:bg-[#263044] hover:text-white cursor-pointer"
          title="Alternar entre percentual e quantidade"
        >
          {mode === 'pct' ? '%' : 'Qtd'}
        </button>
      </div>

      <div className="flex flex-col items-center justify-center gap-6 sm:flex-row flex-1">
        {/* SVG Donut Centralizado com pontas arredondadas e trilha escura */}
        <div className="relative shrink-0 flex items-center justify-center mx-auto sm:mx-0">
          <svg
            viewBox="0 0 140 140"
            className="h-32 w-32 transform transition-transform duration-300"
            role="img"
          >
            {total === 0 ? (
              <circle
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke="#1A2234"
                strokeWidth="16"
              />
            ) : (
              items.map((slice, idx) => {
                const rawSliceLength = (slice.total / total) * C
                const isSelected = activeLabel === slice.label
                const hasActiveSelection = Boolean(activeLabel)

                // Espaçamento entre fatias se houver mais de 1
                const gap = items.length > 1 && total > 0 ? 8 : 0
                const sliceLength = Math.max(0, rawSliceLength - gap)
                const strokeDashoffset = -(currentOffset + (gap > 0 ? gap / 2 : 0))

                const element = (
                  <circle
                    key={idx}
                    cx="70"
                    cy="70"
                    r={R}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={isSelected ? 18 : 16}
                    strokeLinecap="round"
                    strokeDasharray={`${sliceLength} ${C - sliceLength}`}
                    strokeDashoffset={strokeDashoffset}
                    transform="rotate(-90 70 70)"
                    className="transition-all duration-200 cursor-pointer"
                    style={{
                      opacity: hasActiveSelection ? (isSelected ? 1 : 0.35) : 1,
                      filter: isSelected ? `drop-shadow(0 0 6px ${slice.color}99)` : undefined,
                    }}
                    onClick={() => onItemClick && onItemClick(slice.label)}
                  >
                    <title>{`${slice.label}: ${slice.total} (${slice.percentual}%)`}</title>
                  </circle>
                )
                currentOffset += rawSliceLength
                return element
              })
            )}

            {/* Texto central: Número grande com tabular-nums e legenda em laranja */}
            <text
              x="70"
              y="66"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-white text-2xl font-extrabold font-mono tabular-nums tracking-tight pointer-events-none select-none transition-all"
            >
              {activeSlice ? activeSlice.total : total}
            </text>
            <text
              x="70"
              y="84"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-orange-400 text-[10px] font-bold uppercase tracking-wider pointer-events-none select-none transition-all"
            >
              {activeSlice ? `${activeSlice.percentual}%` : 'máquinas'}
            </text>
          </svg>
        </div>

        {/* Legenda de fatias */}
        <div className="flex max-h-48 w-full flex-col gap-1.5 overflow-y-auto pr-1">
          {items.map((slice, idx) => {
            const isSelected = activeLabel === slice.label
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onItemClick && onItemClick(slice.label)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1 text-left text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-orange-500/15 font-semibold text-orange-300 ring-1 ring-orange-500/30 border border-orange-500/40'
                    : 'text-slate-300 hover:bg-[#181F2E]'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full shadow-xs"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="truncate text-slate-200" title={slice.label}>
                    {slice.label}
                  </span>
                </div>
                <span className="ml-2 shrink-0 font-medium text-slate-200 font-mono text-[11px] tabular-nums">
                  {mode === 'pct' ? `${slice.percentual}%` : `${slice.total} (${slice.percentual}%)`}
                </span>
              </button>
            )
          })}
          {items.length === 0 && (
            <p className="text-center text-xs text-slate-500">Sem dados</p>
          )}
        </div>
      </div>
    </div>
  )
}
