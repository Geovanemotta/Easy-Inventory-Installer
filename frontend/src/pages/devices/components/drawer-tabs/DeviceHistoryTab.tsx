import React from 'react';
import { History, Clock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { DeviceHistoryItem } from '@/types/device';

interface DeviceHistoryTabProps {
  history: DeviceHistoryItem[];
  loadingHistory: boolean;
  historyError: string | null;
}

export const DeviceHistoryTab: React.FC<DeviceHistoryTabProps> = ({
  history,
  loadingHistory,
  historyError,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <History className="h-4 w-4 text-blue-600" />
            Linha do Tempo de Alterações
          </h4>
          <p className="text-xs text-slate-500">
            Histórico de mudanças em hardware, rede, sistema operacional e patrimônio (hardware drift).
          </p>
        </div>
        {history.length > 0 && (
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
            {history.length} evento{history.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {historyError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{historyError}</span>
        </div>
      )}

      {loadingHistory ? (
        <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-xs font-medium">Carregando linha do tempo...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="py-16 text-center text-xs text-slate-400 italic">
          Nenhuma alteração registrada para este equipamento até o momento.
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-200 ml-3 space-y-4 py-2">
          {history.map((item) => (
            <div key={item.id} className="relative pl-6">
              {/* Ponto indicador */}
              <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-white bg-blue-600" />

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs shadow-2xs space-y-2">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <span className="font-bold uppercase tracking-wider text-blue-700 text-[11px]">
                    {item.campo}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock className="h-3 w-3" />
                    {item.data_alteracao && item.data_alteracao.includes('/')
                      ? item.data_alteracao
                      : item.data_alteracao
                      ? new Date(item.data_alteracao).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                      : '—'}
                  </span>
                </div>

                <div className="space-y-1.5 pt-0.5">
                  {item.valor_anterior && (
                    <div className="text-slate-500 flex items-start gap-1.5">
                      <span className="font-semibold text-slate-400 shrink-0">De:</span>
                      <span className="line-through bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-mono text-[11px]">
                        {item.valor_anterior}
                      </span>
                    </div>
                  )}

                  <div className="text-slate-800 font-medium flex items-start gap-1.5">
                    <span className="font-semibold text-emerald-600 shrink-0 flex items-center">
                      <ArrowRight className="h-3 w-3 inline mr-0.5" /> Para:
                    </span>
                    <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold">
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
  );
};
