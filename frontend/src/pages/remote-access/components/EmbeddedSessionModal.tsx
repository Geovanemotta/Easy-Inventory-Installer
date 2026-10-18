import { useState } from 'react'
import type { ActiveRemoteSession, SessionTabMode } from '../../../types/remoteAccess'

interface EmbeddedSessionModalProps {
  session: ActiveRemoteSession
  onClose: () => void
  onChangeMode: (mode: SessionTabMode) => void
  onOpenExternal: () => void
}

export default function EmbeddedSessionModal({
  session,
  onClose,
  onChangeMode,
  onOpenExternal,
}: EmbeddedSessionModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-2 backdrop-blur-xs sm:p-4 animate-in fade-in duration-200">
      <div
        className={`flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl transition-all ${
          isFullscreen
            ? 'fixed inset-0 h-full w-full rounded-none border-0'
            : 'h-[92vh] w-[95vw] max-w-7xl'
        }`}
      >
        {/* Cabeçalho da Janela de Sessão */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800 ring-1 ring-blue-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {session.hostname} {session.ip ? `(${session.ip})` : ''}
            </span>

            {/* Abas Internas de Modo */}
            <div className="flex rounded-lg bg-white p-0.5 border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => onChangeMode('desktop')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  session.tab === 'desktop'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title="Área de Trabalho Remota (Desktop)"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <rect x="2" y="3" width="20" height="14" rx="2" strokeWidth={2} />
                  <line x1="8" y1="21" x2="16" y2="21" strokeWidth={2} />
                  <line x1="12" y1="17" x2="12" y2="21" strokeWidth={2} />
                </svg>
                Desktop
              </button>

              <button
                type="button"
                onClick={() => onChangeMode('files')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  session.tab === 'files'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title="Transferência de Arquivos & Pastas"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Arquivos
              </button>

              <button
                type="button"
                onClick={() => onChangeMode('terminal')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  session.tab === 'terminal'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title="Prompt Shell / CMD / PowerShell"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <polyline points="4 17 10 11 4 5" strokeWidth={2} />
                  <line x1="12" y1="19" x2="20" y2="19" strokeWidth={2} />
                </svg>
                Terminal
              </button>
            </div>
          </div>

          {/* Controles da Janela */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenExternal}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
              title="Abrir sessão em nova aba do navegador"
            >
              <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Nova Aba
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
              title={isFullscreen ? 'Restaurar janela' : 'Maximizar'}
            >
              {isFullscreen ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6l7 7M14 4h6m0 0v6m0-6l-7 7M4 10h6m0 0V4m0 6L3 3" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              title="Fechar janela de controle remoto"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Corpo do Modal com Iframe (Área de tela do computador remoto mantida em preto para legibilidade) */}
        <div className="relative flex-1 bg-black">
          <iframe
            src={session.url}
            title={`Sessão Remota (${session.tab}) - ${session.hostname}`}
            className="h-full w-full border-0"
            allow="clipboard-read; clipboard-write; fullscreen"
          />
        </div>

        {/* Rodapé com Dica de SSL Autoassinado */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5 truncate">
            <span>💡 Bloqueio de conexão interna?</span>
            <a
              href={session.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-600 underline hover:text-blue-700"
            >
              Clique aqui para aceitar o certificado SSL do MeshCentral
            </a>
            <span>ou utilize o botão Nova Aba.</span>
          </div>
          <span className="shrink-0 font-mono text-[10px] text-slate-500">Porta 4443</span>
        </div>
      </div>
    </div>
  )
}
