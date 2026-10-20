import { useAuth } from '@/context/AuthContext'
import { ExternalLink, LogOut, Plus, Radio } from 'lucide-react'

interface RemoteAccessBannerProps {
  meshUrl: string
  canAccessServerConsole: boolean
  onMeshLogout: () => void
  onOpenAgentHelp: () => void
}

export default function RemoteAccessBanner({
  meshUrl,
  canAccessServerConsole,
  onMeshLogout,
  onOpenAgentHelp,
}: RemoteAccessBannerProps) {
  const { isAdmin } = useAuth()
  return (
    <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#1E2636] bg-[#121721] p-5 text-white shadow-xl sm:flex-row sm:items-center">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            MeshCentral Online
          </span>
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 text-orange-400" />
            Controle Remoto Cooperativo Multiplataforma
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Acesso desktop sem limites simultâneos, transferência segura de arquivos, shell terminal nativo e bypass de NAT/Firewall.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {canAccessServerConsole && (
          <a
            href={meshUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-xl border border-[#263044] bg-[#181F2E] px-3.5 py-2 text-xs font-semibold text-slate-200 shadow-sm transition-all hover:bg-[#20293A] hover:text-white"
            title="Abrir o painel administrativo do servidor MeshCentral"
          >
            <ExternalLink className="h-3.5 w-3.5 text-orange-400" />
            <span>Console do Servidor</span>
          </a>
        )}

        <button
          type="button"
          onClick={onMeshLogout}
          className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/15 px-3.5 py-2 text-xs font-semibold text-rose-400 transition-all hover:bg-rose-500/25 hover:text-rose-300"
          title="Encerrar a sessão do MeshCentral no navegador para trocar de operador"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sair do Mesh</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={onOpenAgentHelp}
            className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600"
            title="Ver comandos de instalação do MeshAgent em novas máquinas"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Instalar Agente</span>
          </button>
        )}
      </div>
    </div>
  )
}
