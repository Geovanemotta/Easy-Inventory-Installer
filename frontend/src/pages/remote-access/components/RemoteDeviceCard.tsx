import { useState } from 'react'
import type { DeviceListItem } from '../../../types/device'
import { copyToClipboard as robustCopy } from '@/utils/clipboard'

interface RemoteDeviceCardProps {
  device: DeviceListItem
  isOnline: boolean
  onConnectNewTab: (device: DeviceListItem) => void
  onConnectEmbedded: (device: DeviceListItem) => void
  onOpenFiles: (device: DeviceListItem) => void
  onOpenTerminal: (device: DeviceListItem) => void
}

export default function RemoteDeviceCard({
  device,
  isOnline,
  onConnectNewTab,
  onConnectEmbedded,
  onOpenFiles,
  onOpenTerminal,
}: RemoteDeviceCardProps) {
  const [copiedRustdesk, setCopiedRustdesk] = useState(false)

  const isWin =
    device.familia_so === 'Windows' ||
    Boolean(device.so_formatado && device.so_formatado.toLowerCase().includes('windows')) ||
    Boolean(device.sistema && device.sistema.toLowerCase().includes('windows'))

  const handleCopyRustDesk = (e: React.MouseEvent) => {
    if (device.rustdesk_id) {
      robustCopy(device.rustdesk_id, 'RustDesk ID', e)
      setCopiedRustdesk(true)
      setTimeout(() => setCopiedRustdesk(false), 1500)
    }
  }

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      {/* Topo do Card: SO, Hostname, IP e Status */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                isWin
                  ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                  : 'bg-orange-50 text-orange-700 ring-1 ring-orange-200'
              }`}
            >
              {isWin ? 'W' : 'L'}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-xs font-bold text-slate-900" title={device.hostname}>
                {device.hostname}
              </h3>
              <p className="truncate font-mono text-[11px] text-slate-500">
                {device.ip || 'Sem IP'}
              </p>
            </div>
          </div>

          <span
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Metadados: Filial, Patrimônio e RustDesk */}
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5 text-[11px]">
          <div>
            <span className="text-slate-400">Filial:</span>
            <p className="truncate font-medium text-slate-700" title={device.loja || '-'}>
              {device.loja || '-'}
            </p>
          </div>
          <div>
            <span className="text-slate-400">Patrimônio:</span>
            <p className="truncate font-medium text-slate-700" title={device.patrimonio || '-'}>
              {device.patrimonio || '-'}
            </p>
          </div>

          {device.rustdesk_id && (
            <div className="col-span-2 flex items-center justify-between rounded-md bg-slate-50 px-2 py-1 border border-slate-100">
              <span className="text-[10px] text-slate-500 font-medium">RustDesk ID:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] font-bold text-slate-800">
                  {device.rustdesk_id}
                </span>
                <button
                  type="button"
                  onClick={handleCopyRustDesk}
                  className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                  title="Copiar ID do RustDesk"
                >
                  {copiedRustdesk ? (
                    <span className="text-[10px] font-bold text-emerald-600">✓</span>
                  ) : (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth={2} />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth={2} />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ações do Card */}
      <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => onConnectNewTab(device)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-500"
          title="Assumir controle da tela em nova aba dedicada"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <rect x="2" y="3" width="20" height="14" rx="2" strokeWidth={2} />
            <line x1="8" y1="21" x2="16" y2="21" strokeWidth={2} />
            <line x1="12" y1="17" x2="12" y2="21" strokeWidth={2} />
          </svg>
          Conectar Desktop
        </button>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onConnectEmbedded(device)}
            className="flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-slate-50 py-1.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
            title="Visualizar tela embutida no modal"
          >
            Embutido
          </button>

          <button
            type="button"
            onClick={() => onOpenFiles(device)}
            className="flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-slate-50 py-1.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
            title="Gerenciador de arquivos e pastas"
          >
            Arquivos
          </button>

          <button
            type="button"
            onClick={() => onOpenTerminal(device)}
            className="flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-slate-50 py-1.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
            title={isWin ? 'Terminal CMD / PowerShell do MeshCentral' : 'Terminal SSH Nativo'}
          >
            {isWin ? 'Shell' : '>_ SSH'}
          </button>
        </div>
      </div>
    </div>
  )
}
