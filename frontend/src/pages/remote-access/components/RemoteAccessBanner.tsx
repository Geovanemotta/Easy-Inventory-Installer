import { useAuth } from '@/context/AuthContext'

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
    <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 text-slate-800 shadow-sm sm:flex-row sm:items-center">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            MeshCentral Online
          </span>
          <span className="text-xs font-bold text-slate-800">
            Controle Remoto Cooperativo Multiplataforma
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Acesso desktop sem limites simultâneos, transferência segura de arquivos, shell terminal nativo e bypass de NAT/Firewall.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {canAccessServerConsole && (
          <a
            href={meshUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900"
            title="Abrir o painel administrativo do servidor MeshCentral"
          >
            <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            Console do Servidor
          </a>
        )}

        <button
          type="button"
          onClick={onMeshLogout}
          className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition-all hover:bg-red-100"
          title="Encerrar a sessão do MeshCentral no navegador para trocar de operador"
        >
          <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sair do Mesh
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={onOpenAgentHelp}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-500"
            title="Ver comandos de instalação do MeshAgent em novas máquinas"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Instalar Agente
          </button>
        )}
      </div>
    </div>
  )
}
