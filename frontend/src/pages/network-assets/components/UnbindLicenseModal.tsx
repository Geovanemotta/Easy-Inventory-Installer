import React from 'react';
import { createPortal } from 'react-dom';
import { X, Key, AlertTriangle, Loader2, Trash2 } from 'lucide-react';

export interface UnbindLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetName: string;
  targetIp?: string | null;
  slot: 'windows' | 'office';
  currentKey: string;
  onConfirm: () => Promise<void>;
  loading?: boolean;
}

export const UnbindLicenseModal: React.FC<UnbindLicenseModalProps> = ({
  isOpen,
  onClose,
  targetName,
  targetIp,
  slot,
  currentKey,
  onConfirm,
  loading = false,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const slotLabel = slot === 'windows' ? 'Windows' : 'Office / Microsoft 365';

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
          onClick={(e) => {
            e.stopPropagation();
            if (!loading) onClose();
          }}
        />

        {/* Modal Window Obsidian & Rose */}
        <div
          className="relative transform overflow-hidden rounded-2xl bg-[#121721] text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-[#1E2636] animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#1E2636] bg-[#0E131B] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                <Key className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Desvincular Licença de {slotLabel}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Confirmação de liberação de serial
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#181F2E] transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-4">
            {/* Target & Key Details Box */}
            <div className="rounded-xl border border-[#1E2636] bg-[#0B0E14] p-3.5 space-y-2">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Equipamento alvo:</span>
                <span className="text-[11px] font-mono text-slate-400">{targetIp || 'Sem IP'}</span>
              </div>
              <div className="text-sm font-bold text-white font-mono">
                {targetName}
              </div>

              <div className="pt-2 border-t border-[#1E2636] space-y-1">
                <span className="text-[11px] text-slate-400 block">
                  Chave a ser desvinculada ({slotLabel}):
                </span>
                <div className="font-mono text-xs font-bold text-orange-400 bg-[#181F2E] px-2.5 py-1.5 rounded-lg border border-[#263044] tracking-wider select-all break-all">
                  {currentKey}
                </div>
              </div>
            </div>

            {/* Warning Box */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                <span>Liberação de Licença</span>
              </div>
              <p className="text-amber-300/90 leading-relaxed text-[11px]">
                Ao desvincular, a chave retornará ao estoque de licenças disponíveis do sistema e a máquina ficará sem serial de {slotLabel} associado.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-[#1E2636] bg-[#0E131B]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#181F2E] border border-[#263044] hover:bg-[#263044] hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 shadow-xs transition-colors cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              <span>{loading ? 'Desvinculando...' : 'Sim, Desvincular'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
