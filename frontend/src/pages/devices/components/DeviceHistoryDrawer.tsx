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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md h-full bg-[#0B0E14] shadow-2xl flex flex-col border-l border-[#1E2636] animate-in slide-in-from-right duration-200">
        {/* Header do Drawer */}
        <div className="flex items-center justify-between border-b border-[#1E2636] p-4 bg-[#121721]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-400">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Histórico de Alterações</h3>
              <p className="text-xs text-slate-400 font-mono">{device.hostname}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-[#181F2E] hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Lista da Linha do Tempo */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
              <span className="text-xs font-medium">Carregando linha do tempo...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500 italic">
              Nenhuma alteração registrada para este equipamento até o momento.
            </div>
          ) : (
            <div className="relative border-l-2 border-[#1E2636] ml-3 space-y-4 py-2">
              {history.map((item) => (
                <div key={item.id} className="relative pl-6">
                  {/* Ponto indicador em Âmbar */}
                  <div className="absolute -left-1.5 top-2 h-3 w-3 rounded-full border-2 border-[#0B0E14] bg-[#F97316] shadow-xs" />

                  <div className="rounded-xl border border-[#1E2636] bg-[#121721] p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between gap-2 border-b border-[#1E2636]/80 pb-1.5">
                      <span className="font-bold uppercase tracking-wider text-orange-400 text-[11px]">
                        {item.campo}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                        <Clock className="h-3 w-3 text-slate-500" />
                        {item.data_alteracao}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-0.5">
                      {item.valor_anterior && (
                        <div className="text-slate-400 flex items-start gap-1.5">
                          <span className="font-semibold text-slate-500 shrink-0 text-[11px]">De:</span>
                          <span className="line-through bg-rose-500/10 text-rose-300 border border-rose-500/20 px-1.5 py-0.5 rounded font-mono text-[11px]">
                            {item.valor_anterior}
                          </span>
                        </div>
                      )}

                      <div className="text-slate-200 font-medium flex items-start gap-1.5">
                        <span className="font-semibold text-emerald-400 shrink-0 flex items-center text-[11px]">
                          <ArrowRight className="h-3 w-3 inline mr-0.5" /> Para:
                        </span>
                        <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold">
                          {item.valor_novo || '(vazio)'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé do Drawer */}
        <div className="border-t border-[#1E2636] p-3.5 bg-[#121721] text-right">
          <button
            onClick={onClose}
            className="rounded-lg border border-[#263044] bg-[#181F2E] px-4 py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#263044] hover:text-white transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
