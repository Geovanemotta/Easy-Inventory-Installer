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
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          onClick={() => !scanning && onClose()}
        />

        {/* Modal Window */}
        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-slate-200">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Testar Conectividade em Lote
                </h3>
                <p className="text-xs text-slate-500">
                  Disparo de teste ICMP (Ping) em tempo real
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Será disparado um teste de conectividade ICMP para{' '}
              <strong className="text-slate-900 font-bold">{targetCount} equipamentos</strong> com
              endereço IP válido.
            </p>

            {/* Context Details */}
            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-2 mb-4 text-xs">
              <div className="flex items-center gap-2 font-semibold text-slate-700">
                <Info className="h-4 w-4 text-blue-500 shrink-0" />
                <span>Alvo da Varredura:</span>
              </div>
              <ul className="space-y-1 text-slate-600 pl-6 list-disc">
                <li>
                  Equipamentos com IP: <strong>{targetCount}</strong>
                </li>
                {siteName && (
                  <li>
                    Filial: <strong>{siteName}</strong>
                  </li>
                )}
                {tipo && tipo !== 'todos' && (
                  <li>
                    Tipo de Ativo: <strong>{tipo}</strong>
                  </li>
                )}
                {search && (
                  <li>
                    Filtro de Busca: <strong>&ldquo;{search}&rdquo;</strong>
                  </li>
                )}
              </ul>
            </div>

            {targetCount > 50 && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2 text-xs text-amber-800 mb-4">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Para evitar tráfego de rede concorrente excessivo, recomenda-se filtrar por filial
                  ou tipo antes de executar testes com mais de 50 equipamentos.
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={scanning}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={scanning || targetCount === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50"
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
