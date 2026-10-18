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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden text-xs animate-in zoom-in-95 duration-150"
        role="dialog"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-600">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Reclassificação em Lote de Estações
              </h3>
              <p className="text-[11px] text-slate-500">
                Aplica as regras e identificadores de hostname para reatribuir máquinas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="reclass-scope"
                checked={onlyUnassigned}
                onChange={() => setOnlyUnassigned(true)}
                className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <div>
                <span className="font-bold text-slate-800 block">
                  Apenas máquinas sem loja atribuída ou &ldquo;OUTROS&rdquo; (Recomendado)
                </span>
                <span className="text-[11px] text-slate-500">
                  Processa e tenta vincular apenas computadores que ainda não foram homologados ou caíram no genérico.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer border-t border-slate-200/70 pt-2.5">
              <input
                type="radio"
                name="reclass-scope"
                checked={!onlyUnassigned}
                onChange={() => setOnlyUnassigned(false)}
                className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <div>
                <span className="font-bold text-slate-800 block">
                  Todas as máquinas ativas do parque inteiro
                </span>
                <span className="text-[11px] text-slate-500">
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
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${reclassifying ? 'animate-spin' : ''}`} />
              <span>{reclassifying ? 'Processando reclassificação...' : 'Iniciar Reclassificação'}</span>
            </button>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>Reclassificação Concluída!</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-white p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] uppercase text-slate-400 block">Máquinas Analisadas</span>
                  <strong className="text-slate-800 font-mono text-sm">{result.total_scanned}</strong>
                </div>
                <div className="bg-white p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] uppercase text-emerald-600 block">Reatribuídas</span>
                  <strong className="text-emerald-700 font-mono text-sm">{result.total_reclassified}</strong>
                </div>
              </div>

              {result.changes.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1 border-t border-emerald-200 pt-2">
                  {result.changes.map((ch, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-2 rounded-md border border-slate-200 flex items-center justify-between text-[11px]"
                    >
                      <span className="font-mono font-bold text-slate-800">{ch.hostname}</span>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <span className="line-through">{ch.old_site || 'Sem Loja'}</span>
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                        <span className="font-semibold text-emerald-700">{ch.new_site}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-emerald-200/60">
                <button
                  type="button"
                  onClick={handleExecute}
                  disabled={reclassifying}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50"
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
                  className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 transition-colors shadow-2xs"
                >
                  Nova Reclassificação
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
