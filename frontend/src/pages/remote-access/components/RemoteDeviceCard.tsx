import { useState } from 'react'
import { Monitor, Folder, Terminal, Check, Copy, AppWindow } from 'lucide-react'
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

  const secondaryBtn =
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#263044] bg-[#181F2E] hover:bg-[#222B3D] text-slate-300 hover:text-white transition-colors cursor-pointer'

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-[#1E2636] bg-[#121721] shadow-xs transition-all hover:border-[#2E3B52]">
      {/* Faixa superior indicando status */}
      <div className={`h-0.5 w-full ${isOnline ? 'bg-emerald-500/60' : 'bg-[#263044]'}`} />

      {/* Topo do Card: SO, Hostname, IP e Status */}
      <div className="flex items-center gap-3 px-4 pt-3.5 pb-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold font-mono ${
            isWin
              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
              : 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
          }`}
        >
          {isWin ? 'W' : 'L'}
        </div>

        <div className="min-w-0 flex-1">
          <h3
            className="truncate text-sm font-bold text-white group-hover:text-orange-400 transition-colors"
            title={device.hostname}
          >
            {device.hostname}
          </h3>
          <p className="truncate font-mono text-[11px] text-slate-400 tabular-nums">
            {device.ip || 'Sem IP'}
          </p>
        </div>

        <span
          className={`flex shrink-0 items-center gap-1.5 self-start rounded-full px-2 py-0.5 text-[10px] font-bold ${
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
      <div className="mx-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#263044] bg-[#263044] text-[11px]">
        <div className="min-w-0 bg-[#181F2E] px-2.5 py-1.5">
          <span className="block text-[10px] uppercase tracking-wide text-slate-500">Filial</span>
          <p className="truncate font-medium text-slate-300" title={device.loja || '-'}>
            {device.loja || '-'}
          </p>
        </div>
        <div className="min-w-0 bg-[#181F2E] px-2.5 py-1.5">
          <span className="block text-[10px] uppercase tracking-wide text-slate-500">Patrimônio</span>
          <p className="truncate font-mono text-slate-300 tabular-nums" title={device.patrimonio || '-'}>
            {device.patrimonio || '-'}
          </p>
        </div>

        {device.rustdesk_id && (
          <div className="col-span-2 flex items-center justify-between gap-2 bg-[#181F2E] px-2.5 py-1.5">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">RustDesk</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="truncate font-mono text-[11px] font-bold text-slate-200 tabular-nums">
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

      {/* Ações do Card */}
      <div className="mt-auto flex items-center gap-1.5 px-4 pt-3 pb-4">
        {/* Botão principal de Acesso Web/Mesh em Laranja Âmbar */}
        <button
          type="button"
          onClick={() => onConnectNewTab(device)}
          className="flex h-8 flex-1 min-w-0 items-center justify-center gap-2 rounded-lg bg-orange-500 hover:bg-orange-600 px-3 text-xs font-semibold text-white shadow-md shadow-orange-500/20 transition-all cursor-pointer"
          title="Assumir controle da tela em nova aba dedicada"
        >
          <Monitor className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Conectar</span>
        </button>

        {/* Botão Embutido */}
        <button
          type="button"
          onClick={() => onConnectEmbedded(device)}
          className={secondaryBtn}
          title="Embutido: visualizar tela embutida no modal"
        >
          <AppWindow className="h-3.5 w-3.5" />
        </button>

        {/* Botão Arquivos */}
        <button
          type="button"
          onClick={() => onOpenFiles(device)}
          className={secondaryBtn}
          title="Arquivos: gerenciador de arquivos e pastas"
        >
          <Folder className="h-3.5 w-3.5" />
        </button>

        {/* Botão Shell (Windows) ou SSH (Linux) */}
        <button
          type="button"
          onClick={() => onOpenTerminal(device)}
          className={
            isWin
              ? secondaryBtn
              : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-orange-500/30 bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 transition-colors cursor-pointer'
          }
          title={isWin ? 'Shell: terminal CMD / PowerShell do MeshCentral' : 'SSH: terminal SSH nativo'}
        >
          <Terminal className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
