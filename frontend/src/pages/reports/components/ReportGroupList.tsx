import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReportGroupItem } from '../../../types/dashboard'

interface ReportGroupListProps {
  nomeCampo: string
  grupos: ReportGroupItem[]
  totalMaquinas: number
  selectedKey: string | null
  onSelectKey: (key: string | null) => void
  loading?: boolean
}

const PAGE_SIZE = 36

export default function ReportGroupList({
  nomeCampo,
  grupos,
  totalMaquinas,
  selectedKey,
  onSelectKey,
  loading,
}: ReportGroupListProps) {
  const [page, setPage] = useState(1)
  const maxTotal = grupos.length > 0 ? grupos[0].total : 1

  // Reseta para a primeira página sempre que a dimensão/campo for alterada
  useEffect(() => {
    setPage(1)
  }, [nomeCampo])

  // Quando um grupo é selecionado, navega automaticamente para a página onde ele está
  useEffect(() => {
    if (selectedKey && grupos.length > 0) {
      const idx = grupos.findIndex(
        (g) =>
          g.chave.trim().toLowerCase() === selectedKey.trim().toLowerCase() ||
          g.chave.toLowerCase().includes(selectedKey.toLowerCase()) ||
          selectedKey.toLowerCase().includes(g.chave.toLowerCase())
      )
      if (idx >= 0) {
        const targetPage = Math.floor(idx / PAGE_SIZE) + 1
        setPage(targetPage)
      }
    }
  }, [selectedKey, grupos])

  const totalPages = Math.max(1, Math.ceil(grupos.length / PAGE_SIZE))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const paginatedGrupos = grupos.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-border-subtle bg-surface p-5 shadow-sm">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="mb-4 flex items-center justify-between border-b border-border-subtle pb-3 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-fg">
              Valores de {nomeCampo}
            </h2>
            <p className="text-xs text-fg-secondary">
              {grupos.length} valores distintos em {totalMaquinas} máquinas
            </p>
          </div>
          {selectedKey && (
            <button
              type="button"
              onClick={() => onSelectKey(null)}
              className="rounded-md border border-border-medium bg-elevated hover:bg-border-subtle text-gray-700 dark:text-slate-300 hover:text-fg px-2 py-1 text-xs font-medium cursor-pointer transition-colors"
            >
              Limpar filtro
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-elevated" />
            ))}
          </div>
        ) : grupos.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-12 text-xs text-fg-muted">
            Nenhum dado encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {paginatedGrupos.map((grp) => {
              const isSelected = selectedKey
                ? selectedKey.trim().toLowerCase() === grp.chave.trim().toLowerCase()
                : false
              const barWidth = Math.max(3, (grp.total / maxTotal) * 100)

              return (
                <button
                  key={grp.chave}
                  type="button"
                  onClick={() => onSelectKey(isSelected ? null : grp.chave)}
                  className={`group relative flex w-full flex-col overflow-hidden rounded-lg border p-2.5 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-orange-500/15 border-orange-500/40 text-orange-400 ring-1 ring-orange-500/30'
                      : 'border-border-subtle bg-app hover:border-border-medium hover:bg-elevated'
                  }`}
                >
                  {/* Barra de fundo visual */}
                  <div
                    className={`absolute bottom-0 left-0 top-0 transition-all ${
                      isSelected
                        ? 'bg-orange-500/20'
                        : 'bg-elevated/70 group-hover:bg-border-subtle/80'
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />

                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {isSelected && (
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                          ✓
                        </span>
                      )}
                      <span
                        className={`truncate text-xs ${
                          isSelected
                            ? 'font-bold text-orange-400'
                            : 'font-medium text-fg'
                        }`}
                        title={grp.chave}
                      >
                        {grp.chave}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 text-xs font-mono tabular-nums">
                      <span
                        className={`font-semibold ${
                          isSelected
                            ? 'text-orange-600 dark:text-orange-300'
                            : 'text-gray-700 dark:text-slate-300'
                        }`}
                      >
                        {grp.total}
                      </span>
                      <span className="text-[11px] text-fg-muted">
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

      {/* Paginação Compacta da Coluna Esquerda (limitada a 36 itens por página) */}
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-3 text-xs text-fg-secondary shrink-0">
          <span className="text-[11px] text-fg-secondary font-mono tabular-nums">
            Exibindo <strong>{(safePage - 1) * PAGE_SIZE + 1}</strong>&ndash;
            <strong>{Math.min(safePage * PAGE_SIZE, grupos.length)}</strong> de{' '}
            <strong>{grupos.length}</strong>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border-medium bg-elevated text-gray-700 dark:text-slate-300 hover:bg-border-subtle hover:text-fg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
              title="Página anterior de grupos"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="font-semibold text-[11px] text-fg px-1 font-mono tabular-nums">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border-medium bg-elevated text-gray-700 dark:text-slate-300 hover:bg-border-subtle hover:text-fg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
              title="Próxima página de grupos"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
