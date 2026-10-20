import { useState } from 'react'
import { Monitor, Folder, Terminal, Check, Copy } from 'lucide-react'
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
    <div className="group flex flex-col justify-between rounded-xl border border-[#1E2636] bg-[#121721] p-4 shadow-xs transition-all hover:border-[#2E3B52]">
      {/* Topo do Card: SO, Hostname, IP e Status */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold font-mono ${
                isWin
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                  : 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
              }`}
            >
              {isWin ? 'W' : 'L'}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-xs font-bold text-white group-hover:text-orange-400 transition-colors" title={device.hostname}>
                {device.hostname}
              </h3>
              <p className="truncate font-mono text-[11px] text-slate-400 tabular-nums">
                {device.ip || 'Sem IP'}
              </p>
            </div>
          </div>

          <span
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              isOnline
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-[#181F2E] text-slate-400 border border-[#263044]'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
              }`}
            />
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Metadados: Filial, Patrimônio e RustDesk */}
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#1E2636] pt-2.5 text-[11px]">
          <div>
            <span className="text-slate-500">Filial:</span>
            <p className="truncate font-medium text-slate-300" title={device.loja || '-'}>
              {device.loja || '-'}
            </p>
          </div>
          <div>
            <span className="text-slate-500">Patrimônio:</span>
            <p className="truncate font-mono text-slate-300 tabular-nums" title={device.patrimonio || '-'}>
              {device.patrimonio || '-'}
            </p>
          </div>

          {device.rustdesk_id && (
            <div className="col-span-2 flex items-center justify-between rounded-lg bg-[#181F2E] px-2.5 py-1 border border-[#263044]">
              <span className="text-[10px] text-slate-400 font-medium">RustDesk ID:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] font-bold text-slate-200 tabular-nums">
                  {device.rustdesk_id}
                </span>
                <button
                  type="button"
                  onClick={handleCopyRustDesk}
                  className="rounded p-0.5 text-slate-400 hover:text-white transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer"
                  title="Copiar ID do RustDesk"
                >
                  {copiedRustdesk ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ações do Card */}
      <div className="mt-4 space-y-2 border-t border-[#1E2636] pt-3">
        {/* Botão principal de Acesso Web/Mesh em Laranja Âmbar */}
        <button
          type="button"
          onClick={() => onConnectNewTab(device)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 hover:bg-orange-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-orange-500/20 transition-all cursor-pointer"
          title="Assumir controle da tela em nova aba dedicada"
        >
          <Monitor className="h-3.5 w-3.5" />
          <span>Conectar Desktop</span>
        </button>

        <div className="grid grid-cols-3 gap-1.5">
          {/* Botão Embutido em superfície técnica */}
          <button
            type="button"
            onClick={() => onConnectEmbedded(device)}
            className="flex items-center justify-center gap-1 rounded-lg border border-[#263044] bg-[#181F2E] hover:bg-[#222B3D] py-1.5 text-[11px] font-medium text-slate-200 transition-colors cursor-pointer"
            title="Visualizar tela embutida no modal"
          >
            Embutido
          </button>

          {/* Botão Arquivos em superfície técnica */}
          <button
            type="button"
            onClick={() => onOpenFiles(device)}
            className="flex items-center justify-center gap-1 rounded-lg border border-[#263044] bg-[#181F2E] hover:bg-[#222B3D] py-1.5 text-[11px] font-medium text-slate-200 transition-colors cursor-pointer"
            title="Gerenciador de arquivos e pastas"
          >
            <Folder className="h-3 w-3 text-slate-400" />
            <span>Arquivos</span>
          </button>

          {/* Botão Shell (Windows) ou >_ SSH (Linux) em âmbar translúcido */}
          <button
            type="button"
            onClick={() => onOpenTerminal(device)}
            className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] transition-colors cursor-pointer ${
              isWin
                ? 'border border-[#263044] bg-[#181F2E] hover:bg-[#222B3D] font-medium text-slate-200'
                : 'border border-orange-500/30 bg-orange-500/15 hover:bg-orange-500/25 font-semibold text-orange-400'
            }`}
            title={isWin ? 'Terminal CMD / PowerShell do MeshCentral' : 'Terminal SSH Nativo'}
          >
            {isWin ? (
              <span>Shell</span>
            ) : (
              <>
                <Terminal className="h-3 w-3 text-orange-400" />
                <span>&gt;_ SSH</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
