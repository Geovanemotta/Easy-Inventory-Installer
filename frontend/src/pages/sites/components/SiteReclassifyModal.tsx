import React, { useEffect, useState } from 'react';
import { X, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react';
import { siteService } from '@/services/siteService';
import { SiteReclassifyResponse } from '@/types/site';

interface SiteReclassifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SiteReclassifyModal: React.FC<SiteReclassifyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [onlyUnassigned, setOnlyUnassigned] = useState(true);
  const [reclassifying, setReclassifying] = useState(false);
  const [result, setResult] = useState<SiteReclassifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setError(null);
      setReclassifying(false);
    }
  }, [isOpen]);

  const handleExecute = async () => {
    setReclassifying(true);
    setError(null);
    try {
      const res = await siteService.reclassifySites({
        only_unassigned: onlyUnassigned,
      });
      setResult(res);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Erro na reclassificação.');
    } finally {
      setReclassifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-2xl bg-surface shadow-2xl border border-border-subtle overflow-hidden text-xs animate-in zoom-in-95 duration-150"
        role="dialog"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-app">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-orange-500/15 border border-orange-500/30 p-2 text-orange-400">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-fg">
                Reclassificação em Lote de Estações
              </h3>
              <p className="text-[11px] text-fg-secondary">
                Aplica as regras e identificadores de hostname para reatribuir máquinas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-fg-secondary hover:bg-elevated hover:text-fg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-500/15 border border-rose-500/30 p-3 text-rose-700 dark:text-rose-300 font-medium">
              {error}
            </div>
          )}

          <div className="rounded-xl bg-app p-4 border border-border-subtle space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="reclass-scope"
                checked={onlyUnassigned}
                onChange={() => setOnlyUnassigned(true)}
                className="mt-0.5 h-4 w-4 text-orange-500 focus:ring-orange-500 border-border-medium bg-elevated"
              />
              <div>
                <span className="font-bold text-fg block">
                  Apenas máquinas sem loja atribuída ou &ldquo;OUTROS&rdquo; (Recomendado)
                </span>
                <span className="text-[11px] text-fg-secondary">
                  Processa e tenta vincular apenas computadores que ainda não foram homologados ou caíram no genérico.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer border-t border-border-subtle pt-2.5">
              <input
                type="radio"
                name="reclass-scope"
                checked={!onlyUnassigned}
                onChange={() => setOnlyUnassigned(false)}
                className="mt-0.5 h-4 w-4 text-orange-500 focus:ring-orange-500 border-border-medium bg-elevated"
              />
              <div>
                <span className="font-bold text-fg block">
                  Todas as máquinas ativas do parque inteiro
                </span>
                <span className="text-[11px] text-fg-secondary">
                  Varre todos os equipamentos ativos e move para novas filiais caso o hostname coincida com regras mais recentes.
                </span>
              </div>
            </label>
          </div>

          {!result ? (
            <button
              type="button"
              onClick={handleExecute}
              disabled={reclassifying}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${reclassifying ? 'animate-spin' : ''}`} />
              <span>{reclassifying ? 'Processando reclassificação...' : 'Iniciar Reclassificação'}</span>
            </button>
          ) : (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Reclassificação Concluída!</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-app p-2.5 rounded-lg border border-border-subtle">
                  <span className="text-[10px] uppercase text-fg-secondary block font-sans">Máquinas Analisadas</span>
                  <strong className="text-fg font-mono text-sm tabular-nums">{result.total_scanned}</strong>
                </div>
                <div className="bg-app p-2.5 rounded-lg border border-border-subtle">
                  <span className="text-[10px] uppercase text-emerald-600 dark:text-emerald-400 block font-sans">Reatribuídas</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm tabular-nums">{result.total_reclassified}</strong>
                </div>
              </div>

              {result.changes.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border-t border-border-subtle pt-2">
                  {result.changes.map((ch, idx) => (
                    <div
                      key={idx}
                      className="bg-app p-2 rounded-md border border-border-subtle flex items-center justify-between text-[11px]"
                    >
                      <span className="font-mono font-bold text-fg">{ch.hostname}</span>
                      <div className="flex items-center gap-1.5 text-fg-secondary">
                        <span className="line-through">{ch.old_site || 'Sem Loja'}</span>
                        <ArrowRight className="h-3 w-3 text-fg-muted" />
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{ch.new_site}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={handleExecute}
                  disabled={reclassifying}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 px-3 py-2 text-xs font-semibold text-white transition-colors shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${reclassifying ? 'animate-spin' : ''}`} />
                  <span>{reclassifying ? 'Processando...' : 'Executar Novamente'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setError(null);
                  }}
                  disabled={reclassifying}
                  className="rounded-lg border border-border-medium bg-elevated px-3 py-2 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:text-fg hover:bg-border-subtle transition-colors cursor-pointer"
                >
                  Nova Reclassificação
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-border-subtle bg-app flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border-medium bg-elevated px-4 py-1.5 font-semibold text-gray-700 dark:text-slate-300 hover:text-fg hover:bg-border-subtle transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
