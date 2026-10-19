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
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null)
  const [mode, setMode] = useState<'pct' | 'qtd'>('pct')

  const hoveredSlice = hoveredLabel ? items.find((s) => s.label === hoveredLabel) : null
  const R = 50
  const C = 2 * Math.PI * R
  let currentOffset = 0

  return (
    <div className="flex flex-col justify-between h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <div className="mb-4 flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          {subtitle && (
            <p className="text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setMode((m) => (m === 'pct' ? 'qtd' : 'pct'))}
          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 cursor-pointer"
          title="Alternar entre percentual e quantidade"
        >
          {mode === 'pct' ? '%' : 'Qtd'}
        </button>
      </div>

      <div className="flex flex-col items-center justify-center gap-6 sm:flex-row flex-1">
        {/* SVG Donut Centralizado */}
        <div className="relative shrink-0 flex items-center justify-center mx-auto sm:mx-0">
          <svg
            viewBox="0 0 140 140"
            className="h-32 w-32 transform drop-shadow-sm transition-transform duration-300 hover:scale-105"
            role="img"
          >
            {total === 0 ? (
              <circle
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="20"
              />
            ) : (
              items.map((slice, idx) => {
                const sliceLength = (slice.total / total) * C
                const isSelected = activeLabel === slice.label
                const isHovered = hoveredLabel === slice.label
                const isMuted = (activeLabel && !isSelected) || (hoveredLabel && !isHovered)

                const element = (
                  <circle
                    key={idx}
                    cx="70"
                    cy="70"
                    r={R}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={isSelected || isHovered ? 24 : 20}
                    strokeDasharray={`${sliceLength} ${C - sliceLength}`}
                    strokeDashoffset={-currentOffset}
                    transform="rotate(-90 70 70)"
                    className="transition-all duration-200 cursor-pointer"
                    style={{
                      opacity: isMuted ? 0.35 : 1,
                    }}
                    onMouseEnter={() => setHoveredLabel(slice.label)}
                    onMouseLeave={() => setHoveredLabel(null)}
                    onClick={() => onItemClick && onItemClick(slice.label)}
                  >
                    <title>{`${slice.label}: ${slice.total} (${slice.percentual}%)`}</title>
                  </circle>
                )
                currentOffset += sliceLength
                return element
              })
            )}

            {/* Texto central dinâmico com Total ou Fatia em Hover */}
            <text
              x="70"
              y="66"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-slate-900 text-xl font-extrabold font-mono pointer-events-none select-none transition-all"
            >
              {hoveredSlice ? hoveredSlice.total : total}
            </text>
            <text
              x="70"
              y="84"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-slate-500 text-[10px] font-bold uppercase tracking-wider pointer-events-none select-none transition-all"
            >
              {hoveredSlice ? `${hoveredSlice.percentual}%` : 'máquinas'}
            </text>
          </svg>
        </div>

        {/* Legenda de fatias */}
        <div className="flex max-h-48 w-full flex-col gap-1.5 overflow-y-auto pr-1">
          {items.map((slice, idx) => {
            const isSelected = activeLabel === slice.label
            const isHovered = hoveredLabel === slice.label
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onItemClick && onItemClick(slice.label)}
                onMouseEnter={() => setHoveredLabel(slice.label)}
                onMouseLeave={() => setHoveredLabel(null)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1 text-left text-xs transition-colors ${
                  isSelected
                    ? 'bg-blue-50 font-bold text-blue-900 ring-1 ring-blue-300'
                    : isHovered
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="truncate" title={slice.label}>
                    {slice.label}
                  </span>
                </div>
                <span className="ml-2 shrink-0 font-medium text-slate-700">
                  {mode === 'pct' ? `${slice.percentual}%` : `${slice.total} (${slice.percentual}%)`}
                </span>
              </button>
            )
          })}
          {items.length === 0 && (
            <p className="text-center text-xs text-slate-400">Sem dados</p>
          )}
        </div>
      </div>
    </div>
  )
}
