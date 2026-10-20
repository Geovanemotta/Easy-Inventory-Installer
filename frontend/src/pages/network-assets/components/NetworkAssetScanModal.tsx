import React from 'react';
import { Zap, AlertTriangle, Info } from 'lucide-react';

interface NetworkAssetScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  scanning: boolean;
  targetCount: number;
  siteName?: string;
  tipo?: string;
  search?: string;
}

export const NetworkAssetScanModal: React.FC<NetworkAssetScanModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  scanning,
  targetCount,
  siteName,
  tipo,
  search,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
          onClick={() => !scanning && onClose()}
        />

        {/* Modal Window Obsidian & Amber */}
        <div className="relative transform overflow-hidden rounded-2xl bg-[#121721] text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-[#1E2636]">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Testar Conectividade em Lote
                </h3>
                <p className="text-xs text-slate-400">
                  Disparo de teste ICMP (Ping) em tempo real
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300 mb-4 leading-relaxed">
              Será disparado um teste de conectividade ICMP para{' '}
              <strong className="text-white font-bold font-mono tabular-nums">{targetCount} equipamentos</strong> com
              endereço IP válido.
            </p>

            {/* Context Details */}
            <div className="rounded-xl bg-[#181F2E] border border-[#263044] p-3.5 space-y-2 mb-4 text-xs">
              <div className="flex items-center gap-2 font-semibold text-slate-200">
                <Info className="h-4 w-4 text-orange-400 shrink-0" />
                <span>Alvo da Varredura:</span>
              </div>
              <ul className="space-y-1 text-slate-300 pl-6 list-disc">
                <li>
                  Equipamentos com IP: <strong className="text-white font-mono">{targetCount}</strong>
                </li>
                {siteName && (
                  <li>
                    Filial: <strong className="text-slate-100">{siteName}</strong>
                  </li>
                )}
                {tipo && tipo !== 'todos' && (
                  <li>
                    Tipo de Ativo: <strong className="text-slate-100">{tipo}</strong>
                  </li>
                )}
                {search && (
                  <li>
                    Filtro de Busca: <strong className="text-slate-100">&ldquo;{search}&rdquo;</strong>
                  </li>
                )}
              </ul>
            </div>

            {targetCount > 50 && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 flex items-start gap-2 text-xs text-amber-300 mb-4">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Para evitar tráfego de rede concorrente excessivo, recomenda-se filtrar por filial
                  ou tipo antes de executar testes com mais de 50 equipamentos.
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1E2636]">
              <button
                type="button"
                onClick={onClose}
                disabled={scanning}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#181F2E] border border-[#263044] hover:bg-[#263044] hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={scanning || targetCount === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Zap className={`h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />
                {scanning ? 'Executando Varredura...' : `Iniciar Teste (${targetCount})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
