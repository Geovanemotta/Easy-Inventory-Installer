import { Link } from 'react-router-dom'
import type { ReportMachineItem } from '../../../types/dashboard'

interface ReportMachinesTableProps {
  nomeCampo: string
  selectedKey: string | null
  maquinas: ReportMachineItem[]
  loading?: boolean
  page: number
  perPage: number
  totalItems: number
  totalPages: number
  onPageChange: (newPage: number) => void
  onPerPageChange: (newPerPage: number) => void
  onExportCsv: () => void
}

export default function ReportMachinesTable({
  nomeCampo,
  selectedKey,
  maquinas,
  loading,
  page,
  perPage,
  totalItems,
  totalPages,
  onPageChange,
  onPerPageChange,
  onExportCsv,
}: ReportMachinesTableProps) {
  const safePage = Math.min(Math.max(1, page), totalPages || 1)
  const startIndex = (safePage - 1) * perPage
  const endIndex = Math.min(startIndex + maquinas.length, totalItems)

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">
            {selectedKey ? (
              <span>
                Filtro: <span className="text-blue-600">{selectedKey}</span>
              </span>
            ) : (
              'Todas as máquinas da consulta'
            )}
          </h2>
          <p className="text-xs text-slate-500">
            {totalItems} máquinas encontradas
          </p>
        </div>

        <button
          type="button"
          onClick={onExportCsv}
          disabled={totalItems === 0}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          title="Exportar dados filtrados para planilha CSV"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exportar CSV
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : maquinas.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-12 text-xs text-slate-400">
          Nenhuma máquina encontrada para os critérios especificados.
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-auto pr-1">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-3 py-2.5">Filial</th>
                <th className="px-3 py-2.5">Estação / Hostname</th>
                <th className="px-3 py-2.5">IP</th>
                <th className="px-3 py-2.5">{nomeCampo}</th>
                <th className="px-3 py-2.5">Sistema Operacional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {maquinas.map((m) => {
                const isWin = m.so === 'Windows'
                return (
                  <tr
                    key={m.id}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-700">
                      {m.filial}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                            isWin
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {isWin ? 'W' : 'L'}
                        </span>
                        <Link
                          to={`/devices?search=${encodeURIComponent(m.hostname)}`}
                          className="text-blue-600 hover:underline"
                          title="Abrir no inventário de estações"
                        >
                          {m.hostname}
                        </Link>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-500">
                      {m.ip || '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-800">
                      {m.valor_campo}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                      {m.versao_so || m.so}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Rodapé de Paginação Server-Side */}
      {totalItems > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Linhas por página:</span>
            <select
              value={perPage}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>
              Mostrando {startIndex + 1}–{endIndex} de {totalItems}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
            >
              Anterior
            </button>
            <span className="px-2 font-medium text-slate-700">
              {page} de {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
