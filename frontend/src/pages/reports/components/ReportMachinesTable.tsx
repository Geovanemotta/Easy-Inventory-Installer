import { Link } from 'react-router-dom'
import { Download, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReportMachineItem } from '../../../types/dashboard'
import { SelectDropdown, SelectOption } from '@/components/common/SelectDropdown'

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

const perPageOptions: SelectOption[] = [
  { value: '25', label: '25 por pág.' },
  { value: '50', label: '50 por pág.' },
  { value: '100', label: '100 por pág.' },
]

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
    <div className="flex h-full flex-col rounded-xl border border-[#1E2636] bg-[#121721] p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#1E2636] pb-3">
        <div>
          <h2 className="text-sm font-bold text-white">
            {selectedKey ? (
              <span>
                Filtro: <span className="text-orange-400 font-semibold">{selectedKey}</span>
              </span>
            ) : (
              'Todas as máquinas da consulta'
            )}
          </h2>
          <p className="text-xs text-slate-400 font-mono tabular-nums">
            {totalItems} máquinas encontradas
          </p>
        </div>

        <button
          type="button"
          onClick={onExportCsv}
          disabled={totalItems === 0}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          title="Exportar dados filtrados para planilha CSV"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Exportar CSV</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-[#181F2E]" />
          ))}
        </div>
      ) : maquinas.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-12 text-xs text-slate-500">
          Nenhuma máquina encontrada para os critérios especificados.
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-auto pr-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 border-b border-[#1E2636] bg-[#0E131B] text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-2.5">Filial</th>
                <th className="px-3 py-2.5">Estação / Hostname</th>
                <th className="px-3 py-2.5">IP</th>
                <th className="px-3 py-2.5">{nomeCampo}</th>
                <th className="px-3 py-2.5">Sistema Operacional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2230]">
              {maquinas.map((m) => {
                const isWin = m.so === 'Windows'
                return (
                  <tr
                    key={m.id}
                    className="hover:bg-[#181F2E]/90 transition-colors"
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-300">
                      {m.filial}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold font-mono ${
                            isWin
                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              : 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                          }`}
                        >
                          {isWin ? 'W' : 'L'}
                        </span>
                        <Link
                          to={`/devices?search=${encodeURIComponent(m.hostname)}`}
                          className="text-slate-200 hover:text-orange-400 hover:underline transition-colors"
                          title="Abrir no inventário de estações"
                        >
                          {m.hostname}
                        </Link>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-400 tabular-nums">
                      {m.ip || '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-200">
                      {m.valor_campo}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-400">
                      {m.versao_so || m.so}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Rodapé de Paginação Server-Side idêntico ao DeviceTable */}
      {totalItems > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#1E2636] pt-3 text-xs text-slate-400 bg-[#0E131B] -mx-5 -mb-5 px-5 pb-3 rounded-b-xl">
          <div className="flex items-center gap-3">
            <div>
              Exibindo{' '}
              <span className="font-semibold text-white font-mono tabular-nums">
                {startIndex + 1}
              </span>{' '}
              a{' '}
              <span className="font-semibold text-white font-mono tabular-nums">
                {endIndex}
              </span>{' '}
              de <span className="font-semibold text-white font-mono tabular-nums">{totalItems}</span> registros
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Por página:</span>
              <div className="w-28 shrink-0">
                <SelectDropdown
                  value={String(perPage)}
                  onChange={(val) => onPerPageChange(Number(val))}
                  options={perPageOptions}
                  triggerClassName="py-1 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || loading}
              className="flex items-center gap-1 rounded-lg border border-[#263044] bg-[#181F2E] px-2.5 py-1 text-slate-300 hover:bg-[#263044] hover:text-white disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </button>
            <span className="px-2 font-medium text-slate-300 font-mono tabular-nums">
              Página <strong className="font-semibold text-white">{page}</strong> de{' '}
              {totalPages || 1}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || loading}
              className="flex items-center gap-1 rounded-lg border border-[#263044] bg-[#181F2E] px-2.5 py-1 text-slate-300 hover:bg-[#263044] hover:text-white disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              Próxima <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
