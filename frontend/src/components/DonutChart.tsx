
type DonutChartProps = {
  items: [string, number, string][]
  total: number
  onItemClick?: (val: string) => void
  activeItem?: string
  modoValor?: 'pct' | 'qtd'
}

export default function DonutChart({
  items,
  total,
  onItemClick,
  activeItem,
  modoValor,
}: DonutChartProps) {
  const R = 52
  const C = 2 * Math.PI * R
  let off = 0

  return (
    <div className="donut">
      <svg viewBox="0 0 140 140" width="150" height="150" role="img">
        {items.map(([label, val, color], idx) => {
          const len = total > 0 ? (val / total) * C : 0
          const isSel = activeItem === label
          const circle = (
            <circle
              key={idx}
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke={color}
              strokeWidth={isSel ? 26 : 22}
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-off}
              transform="rotate(-90 70 70)"
              style={{
                cursor: onItemClick ? 'pointer' : 'default',
                opacity: activeItem ? (isSel ? 1 : 0.45) : 1,
                transition: 'all 0.2s',
              }}
              onClick={() => onItemClick && onItemClick(label)}
            >
              <title>{`${label}: ${val} (${total > 0 ? Math.round((val / total) * 100) : 0}%)`}</title>
            </circle>
          )
          off += len
          return circle
        })}
        <text
          x="70"
          y="69"
          textAnchor="middle"
          fontSize="22"
          fontWeight="700"
          fill="#0f172a"
        >
          {total}
        </text>
        <text
          x="70"
          y="85"
          textAnchor="middle"
          fontSize="10"
          fill="#64748b"
        >
          máquinas
        </text>
      </svg>
      <div className="legend">
        {items.map(([label, val, color], idx) => {
          const pct = total > 0 ? Math.round((val / total) * 100) : 0
          const isSel = activeItem === label
          return (
            <button
              key={idx}
              className={`lg ${isSel ? 'on' : ''}`}
              onClick={() => onItemClick && onItemClick(label)}
              title={`Filtrar por ${label}`}
            >
              <i style={{ background: color }} />
              {label}
              <b>{modoValor === 'qtd' ? `${val} (${pct}%)` : `${pct}%`}</b>
            </button>
          )
        })}
      </div>
    </div>
  )
}
