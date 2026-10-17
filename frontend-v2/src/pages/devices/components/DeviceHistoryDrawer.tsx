import React, { useEffect, useState } from 'react';
import { DeviceHistoryItem, DeviceListItem } from '@/types/device';
import { deviceService } from '@/services/deviceService';
import { X, History, Clock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

interface DeviceHistoryDrawerProps {
  device: DeviceListItem;
  onClose: () => void;
}

export const DeviceHistoryDrawer: React.FC<DeviceHistoryDrawerProps> = ({
  device,
  onClose,
}) => {
  const [history, setHistory] = useState<DeviceHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await deviceService.getDeviceHistory(device.id);
        setHistory(data);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Falha ao obter histórico do dispositivo.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [device.id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-xs">
      <div className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Header do Drawer */}
        <div className="flex items-center justify-between border-b border-slate-200 p-4 bg-slate-50">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">Histórico de Alterações</h3>
              <p className="text-xs text-slate-500">{device.hostname}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Lista da Linha do Tempo */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-xs font-medium">Carregando linha do tempo...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 italic">
              Nenhuma alteração registrada para este equipamento até o momento.
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
              {history.map((item) => (
                <div key={item.id} className="relative pl-6">
                  {/* Ponto indicador */}
                  <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full border-2 border-white bg-blue-600" />

                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                      <span className="font-bold uppercase tracking-wider text-blue-800 text-[11px]">
                        {item.campo}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="h-3 w-3" />
                        {item.data_alteracao}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {item.valor_anterior && (
                        <div className="text-slate-500 flex items-start gap-1">
                          <span className="font-semibold text-slate-400 shrink-0">De:</span>
                          <span className="line-through">{item.valor_anterior}</span>
                        </div>
                      )}

                      <div className="text-slate-800 font-medium flex items-start gap-1">
                        <span className="font-semibold text-emerald-600 shrink-0 flex items-center">
                          <ArrowRight className="h-3 w-3 inline mr-0.5" /> Para:
                        </span>
                        <span>{item.valor_novo || '(vazio)'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé do Drawer */}
        <div className="border-t border-slate-200 p-3 bg-slate-50 text-right">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
