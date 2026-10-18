import type { ReportGroupItem } from '../../../types/dashboard'

interface ReportGroupListProps {
  nomeCampo: string
  grupos: ReportGroupItem[]
  totalMaquinas: number
  selectedKey: string | null
  onSelectKey: (key: string | null) => void
  loading?: boolean
}

export default function ReportGroupList({
  nomeCampo,
  grupos,
  totalMaquinas,
  selectedKey,
  onSelectKey,
  loading,
}: ReportGroupListProps) {
  const maxTotal = grupos.length > 0 ? grupos[0].total : 1

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">
            Valores de {nomeCampo}
          </h2>
          <p className="text-xs text-slate-500">
            {grupos.length} valores distintos em {totalMaquinas} máquinas
          </p>
        </div>
        {selectedKey && (
          <button
            type="button"
            onClick={() => onSelectKey(null)}
            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            Limpar filtro
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : grupos.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-12 text-xs text-slate-400">
          Nenhum dado encontrado para os filtros selecionados.
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {grupos.map((grp) => {
            const isSelected = selectedKey === grp.chave
            const barWidth = Math.max(3, (grp.total / maxTotal) * 100)

            return (
              <button
                key={grp.chave}
                type="button"
                onClick={() => onSelectKey(isSelected ? null : grp.chave)}
                className={`group relative flex w-full flex-col overflow-hidden rounded-lg border p-2.5 text-left transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-400'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                }`}
              >
                {/* Barra de fundo visual */}
                <div
                  className={`absolute bottom-0 left-0 top-0 transition-all ${
                    isSelected
                      ? 'bg-blue-200/50'
                      : 'bg-slate-100/70 group-hover:bg-slate-200/60'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />

                <div className="relative z-10 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {isSelected && (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                        ✓
                      </span>
                    )}
                    <span
                      className={`truncate text-xs ${
                        isSelected
                          ? 'font-bold text-blue-900'
                          : 'font-medium text-slate-800'
                      }`}
                      title={grp.chave}
                    >
                      {grp.chave}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 text-xs">
                    <span
                      className={`font-semibold ${
                        isSelected
                          ? 'text-blue-800'
                          : 'text-slate-700'
                      }`}
                    >
                      {grp.total}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ({grp.percentual}%)
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
