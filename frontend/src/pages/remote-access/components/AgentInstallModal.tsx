import { useState } from 'react'
import { copyToClipboard as robustCopy } from '@/utils/clipboard'

interface AgentInstallModalProps {
  serverHost: string
  meshPort: number
  onClose: () => void
}

export default function AgentInstallModal({
  serverHost,
  meshPort,
  onClose,
}: AgentInstallModalProps) {
  const [activeTab, setActiveTab] = useState<'windows' | 'linux'>('windows')
  const [copied, setCopied] = useState<string | null>(null)

  const host = serverHost || window.location.hostname || 'localhost'

  const winCmd = `powershell -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://${host}:${meshPort}/meshagents?id=3' -OutFile 'meshagent.exe'; .\\meshagent.exe -connect"`
  const winPs1 = `powershell -ExecutionPolicy Bypass -File .\\scripts_agents\\install-meshagent.ps1`

  const linuxCmd = `curl -k "https://${host}:${meshPort}/meshagents?id=6" -o /tmp/meshagent && chmod +x /tmp/meshagent && sudo /tmp/meshagent -connect`
  const linuxSh = `sudo bash ./scripts_agents/install-meshagent.sh`

  const copyToClipboard = (text: string, id: string, label?: string, e?: React.MouseEvent) => {
    robustCopy(text, label || 'Comando', e)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-[#1E2636] bg-[#121721] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1E2636] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/15 text-orange-400 border border-orange-500/30">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Como Instalar o Agente MeshCentral
              </h2>
              <p className="text-xs text-slate-400">
                Servidor: <span className="font-mono font-semibold text-orange-400">{host}:{meshPort}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-[#181F2E] hover:text-white transition-colors cursor-pointer"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Abas SO */}
        <div className="my-4 flex gap-2 border-b border-[#1E2636] pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('windows')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'windows'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-[#181F2E]'
            }`}
          >
            <span className="font-bold">W</span>
            <span>Windows (x64)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('linux')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'linux'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-[#181F2E]'
            }`}
          >
            <span className="font-bold">L</span>
            <span>Linux (Debian / Ubuntu / Zorin)</span>
          </button>
        </div>

        {/* Conteúdo */}
        {activeTab === 'windows' ? (
          <div className="space-y-4 text-xs">
            <div>
              <p className="mb-1.5 font-semibold text-slate-200">
                Opção 1: Executar Script Automatizado Pronto (.ps1)
              </p>
              <div className="flex items-center justify-between rounded-lg bg-[#0B0E14] border border-[#1E2636] p-2.5 font-mono text-amber-300">
                <span className="truncate">{winPs1}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(winPs1, 'win1')}
                  className="ml-2 shrink-0 rounded-lg bg-[#181F2E] border border-[#263044] px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-[#222B3D] hover:text-white shadow-2xs transition-colors cursor-pointer"
                >
                  {copied === 'win1' ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            <div>
              <p className="mb-1.5 font-semibold text-slate-200">
                Opção 2: Download e Instalação Direta via PowerShell Elevado
              </p>
              <div className="flex items-center justify-between rounded-lg bg-[#0B0E14] border border-[#1E2636] p-2.5 font-mono text-amber-300">
                <span className="truncate">{winCmd}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(winCmd, 'win2')}
                  className="ml-2 shrink-0 rounded-lg bg-[#181F2E] border border-[#263044] px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-[#222B3D] hover:text-white shadow-2xs transition-colors cursor-pointer"
                >
                  {copied === 'win2' ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div>
              <p className="mb-1.5 font-semibold text-slate-200">
                Opção 1: Executar Script Automatizado Pronto (.sh)
              </p>
              <div className="flex items-center justify-between rounded-lg bg-[#0B0E14] border border-[#1E2636] p-2.5 font-mono text-amber-300">
                <span className="truncate">{linuxSh}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(linuxSh, 'lnx1')}
                  className="ml-2 shrink-0 rounded-lg bg-[#181F2E] border border-[#263044] px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-[#222B3D] hover:text-white shadow-2xs transition-colors cursor-pointer"
                >
                  {copied === 'lnx1' ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            <div>
              <p className="mb-1.5 font-semibold text-slate-200">
                Opção 2: Download e Execução Manual via Terminal
              </p>
              <div className="flex items-center justify-between rounded-lg bg-[#0B0E14] border border-[#1E2636] p-2.5 font-mono text-amber-300">
                <span className="truncate">{linuxCmd}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(linuxCmd, 'lnx2')}
                  className="ml-2 shrink-0 rounded-lg bg-[#181F2E] border border-[#263044] px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-[#222B3D] hover:text-white shadow-2xs transition-colors cursor-pointer"
                >
                  {copied === 'lnx2' ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end border-t border-[#1E2636] pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#181F2E] border border-[#263044] px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-[#222B3D] hover:text-white transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
