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
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <div>
          <h4 className="text-sm font-bold text-fg flex items-center gap-2">
            <History className="h-4 w-4 text-orange-400" />
            Linha do Tempo de Alterações
          </h4>
          <p className="text-xs text-fg-secondary mt-0.5">
            Histórico de modificações em hardware, rede, SO e patrimônio (hardware drift).
          </p>
        </div>
        {history.length > 0 && (
          <span className="rounded-full bg-orange-500/15 border border-orange-500/30 px-2.5 py-0.5 text-xs font-bold text-orange-400 font-mono">
            {history.length} evento{history.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {historyError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{historyError}</span>
        </div>
      )}

      {loadingHistory ? (
        <div className="py-16 flex flex-col items-center justify-center gap-2 text-fg-secondary">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          <span className="text-xs font-medium">Carregando linha do tempo...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="py-16 text-center text-xs text-fg-muted italic">
          Nenhuma alteração registrada para este equipamento até o momento.
        </div>
      ) : (
        <div className="relative border-l-2 border-border-subtle ml-3 space-y-4 py-2">
          {history.map((item) => (
            <div key={item.id} className="relative pl-6">
              {/* Marcador em Laranja Âmbar (#F97316) */}
              <div className="absolute -left-1.5 top-2 h-3 w-3 rounded-full border-2 border-app bg-[#F97316] shadow-sm shadow-orange-500/30" />

              <div className="rounded-xl border border-border-subtle bg-surface p-3.5 text-xs shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between gap-2 border-b border-border-subtle/80 pb-2">
                  <span className="font-bold uppercase tracking-wider text-orange-400 text-[11px]">
                    {item.campo}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-fg-secondary font-mono">
                    <Clock className="h-3 w-3 text-fg-muted" />
                    {item.data_alteracao && item.data_alteracao.includes('/')
                      ? item.data_alteracao
                      : item.data_alteracao
                      ? new Date(item.data_alteracao).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                      : '—'}
                  </span>
                </div>

                <div className="space-y-2 pt-0.5">
                  {item.valor_anterior && (
                    <div className="text-fg-secondary flex items-start gap-2">
                      <span className="font-semibold text-fg-muted shrink-0 text-[11px]">De:</span>
                      <span className="line-through bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 px-2 py-0.5 rounded font-mono text-[11px]">
                        {item.valor_anterior}
                      </span>
                    </div>
                  )}

                  <div className="text-fg font-medium flex items-start gap-2">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center text-[11px]">
                      <ArrowRight className="h-3 w-3 inline mr-0.5" /> Para:
                    </span>
                    <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded font-mono text-[11px] font-semibold">
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
