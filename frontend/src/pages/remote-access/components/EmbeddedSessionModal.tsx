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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 backdrop-blur-xs sm:p-4 animate-in fade-in duration-200">
      <div
        className={`flex flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-2xl transition-all ${
          isFullscreen
            ? 'fixed inset-0 h-full w-full rounded-none border-0'
            : 'h-[calc(100vh-2rem)] max-h-[92vh] w-[95vw] max-w-7xl overflow-hidden'
        }`}
      >
        {/* Cabeçalho da Janela de Sessão */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle bg-app px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-lg bg-orange-500/15 border border-orange-500/30 px-2.5 py-1 text-xs font-bold text-orange-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {session.hostname} {session.ip ? `(${session.ip})` : ''}
            </span>

            {/* Abas Internas de Modo */}
            <div className="flex rounded-lg bg-elevated p-0.5 border border-border-medium shadow-2xs">
              <button
                type="button"
                onClick={() => onChangeMode('desktop')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  session.tab === 'desktop'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-fg-secondary hover:text-fg hover:bg-border-subtle'
                }`}
                title="Área de Trabalho Remota (Desktop)"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <rect x="2" y="3" width="20" height="14" rx="2" strokeWidth={2} />
                  <line x1="8" y1="21" x2="16" y2="21" strokeWidth={2} />
                  <line x1="12" y1="17" x2="12" y2="21" strokeWidth={2} />
                </svg>
                <span>Desktop</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeMode('files')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  session.tab === 'files'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-fg-secondary hover:text-fg hover:bg-border-subtle'
                }`}
                title="Transferência de Arquivos & Pastas"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span>Arquivos</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeMode('terminal')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  session.tab === 'terminal'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-fg-secondary hover:text-fg hover:bg-border-subtle'
                }`}
                title="Prompt Shell / CMD / PowerShell"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <polyline points="4 17 10 11 4 5" strokeWidth={2} />
                  <line x1="12" y1="19" x2="20" y2="19" strokeWidth={2} />
                </svg>
                <span>Terminal</span>
              </button>
            </div>
          </div>

          {/* Controles da Janela */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenExternal}
              className="flex items-center gap-1 rounded-lg border border-border-medium bg-elevated px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-slate-300 hover:bg-border-subtle hover:text-fg shadow-2xs transition-colors cursor-pointer"
              title="Abrir sessão em nova aba do navegador"
            >
              <svg className="h-3.5 w-3.5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span>Nova Aba</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="rounded-lg p-1.5 text-fg-secondary hover:bg-elevated hover:text-fg transition-colors cursor-pointer"
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
              className="rounded-lg p-1.5 text-fg-secondary hover:bg-rose-500/20 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
              title="Fechar janela de controle remoto"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Corpo do Modal com Iframe (Área de tela mantida em preto para legibilidade) */}
        <div className="relative flex-1 min-h-0 bg-black overflow-hidden">
          <iframe
            src={session.url}
            title={`Sessão Remota (${session.tab}) - ${session.hostname}`}
            className="h-full w-full border-0"
            allow="clipboard-read; clipboard-write; fullscreen"
          />
        </div>

        {/* Rodapé com Dica de SSL Autoassinado */}
        <div className="flex items-center justify-between border-t border-border-subtle bg-app px-4 py-2 text-[11px] text-fg-secondary shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <span>💡 Bloqueio de conexão interna?</span>
            <a
              href={session.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-orange-400 underline hover:text-orange-600 dark:hover:text-orange-300"
            >
              Clique aqui para aceitar o certificado SSL do MeshCentral
            </a>
            <span>ou utilize o botão Nova Aba.</span>
          </div>
          <span className="shrink-0 font-mono text-[10px] text-fg-muted">Porta 4443</span>
        </div>
      </div>
    </div>
  )
}
