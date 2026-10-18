import React, { useEffect, useState } from 'react';
import { X, Search, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react';
import { siteService } from '@/services/siteService';
import { SiteSimulationResponse } from '@/types/site';

interface SiteSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialHostname?: string;
}

export const SiteSimulatorModal: React.FC<SiteSimulatorModalProps> = ({
  isOpen,
  onClose,
  initialHostname = '',
}) => {
  const [hostname, setHostname] = useState(initialHostname);
  const [loja, setLoja] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SiteSimulationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setHostname(initialHostname || '');
      setLoja('');
      setResult(null);
      setError(null);
      setLoading(false);
    }
  }, [isOpen, initialHostname]);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostname.trim()) {
      setError('Informe um hostname para simular.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await siteService.simulateMatch({
        hostname: hostname.trim(),
        loja: loja.trim() || undefined,
      });
      setResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Erro na simulação.');
    } finally {
      setLoading(false);
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
            <div className="rounded-xl bg-purple-100 p-2 text-purple-600">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Simulador de Regras de Nomenclatura
              </h3>
              <p className="text-[11px] text-slate-500">
                Teste como um hostname é classificado e atribuído às filiais
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

        <form onSubmit={handleSimulate} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Hostname de Teste <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex: LJ01-PDV01, CB04-GERENCIA, AC-FINANC01"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-slate-800 font-bold focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Dica: pode testar nomes reais ou variações com prefixos como LJ, CB, AC, etc.
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Campo Loja / Unidade Reportada (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: 01, LJ01, Giassi Criciúma"
              value={loja}
              onChange={(e) => setLoja(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700 transition-colors shadow-xs disabled:opacity-50"
          >
            <Search className="h-3.5 w-3.5" />
            <span>{loading ? 'Simulando...' : 'Testar Reconhecimento'}</span>
          </button>

          {/* Resultado da Simulação */}
          {result && (
            <div
              className={`rounded-xl border p-4 space-y-2 mt-4 animate-in fade-in duration-150 ${
                result.matched
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/70 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {result.matched ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span>Filial Identificada com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                    <span>Nenhuma Filial Reconhecida</span>
                  </>
                )}
              </div>

              {result.matched && (
                <div className="bg-white/80 p-3 rounded-lg border border-emerald-100 space-y-1 font-mono text-xs">
                  <div>
                    <span className="text-slate-400 font-sans">Filial Atribuída: </span>
                    <strong className="text-emerald-800">{result.site_code} - {result.site_name}</strong>
                  </div>
                  {result.matched_by && (
                    <div>
                      <span className="text-slate-400 font-sans">Critério de Match: </span>
                      <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                        {result.matched_by}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="text-[11px] opacity-90 pt-1">
                <span className="font-semibold">Diagnóstico: </span>
                <span>{result.details}</span>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-200/50">
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setError(null);
                    setHostname('');
                    setLoja('');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
                >
                  <RotateCcw className="h-3 w-3 text-slate-500" />
                  Nova Simulação
                </button>
              </div>
            </div>
          )}
        </form>

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
