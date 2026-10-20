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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-2xl bg-[#121721] shadow-2xl border border-[#1E2636] overflow-hidden text-xs animate-in zoom-in-95 duration-150"
        role="dialog"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2636] bg-[#0E131B]">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-orange-500/15 border border-orange-500/30 p-2 text-orange-400">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Simulador de Regras de Nomenclatura
              </h3>
              <p className="text-[11px] text-slate-400">
                Teste como um hostname é classificado e atribuído às filiais
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-[#181F2E] hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSimulate} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-500/15 border border-rose-500/30 p-3 text-rose-300 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Hostname de Teste <span className="text-orange-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex: LJ01-PDV01, CB04-GERENCIA, AC-FINANC01"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              className="w-full rounded-lg border border-[#263044] bg-[#181F2E] px-3 py-2 font-mono text-white font-bold placeholder:text-slate-500 focus:border-orange-500 focus:outline-none transition-colors"
              required
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Dica: pode testar nomes reais ou variações com prefixos como LJ, CB, AC, etc.
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Campo Loja / Unidade Reportada (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: 01, LJ01, Giassi Criciúma"
              value={loja}
              onChange={(e) => setLoja(e.target.value)}
              className="w-full rounded-lg border border-[#263044] bg-[#181F2E] px-3 py-2 text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
          >
            <Search className="h-3.5 w-3.5" />
            <span>{loading ? 'Simulando...' : 'Testar Reconhecimento'}</span>
          </button>

          {/* Resultado da Simulação */}
          {result && (
            <div
              className={`rounded-xl border p-4 space-y-2.5 mt-4 animate-in fade-in duration-150 ${
                result.matched
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {result.matched ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    <span className="text-white">Filial Identificada com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                    <span className="text-white">Nenhuma Filial Reconhecida</span>
                  </>
                )}
              </div>

              {result.matched && (
                <div className="bg-[#0E131B] p-3 rounded-lg border border-[#1E2636] space-y-1.5 font-mono text-xs">
                  <div>
                    <span className="text-slate-400 font-sans text-[11px]">Filial Atribuída: </span>
                    <strong className="text-orange-400">[{result.site_code}] {result.site_name}</strong>
                  </div>
                  {result.matched_by && (
                    <div>
                      <span className="text-slate-400 font-sans text-[11px]">Critério de Match: </span>
                      <span className="rounded bg-orange-500/15 border border-orange-500/30 px-1.5 py-0.2 text-[10px] font-bold text-orange-400">
                        {result.matched_by}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="text-[11px] text-slate-300 pt-1">
                <span className="font-semibold text-slate-400">Diagnóstico: </span>
                <span>{result.details}</span>
              </div>

              <div className="flex justify-end pt-2 border-t border-[#1E2636]">
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setError(null);
                    setHostname('');
                    setLoja('');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#263044] bg-[#181F2E] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#222B3D] transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3 text-slate-400" />
                  <span>Nova Simulação</span>
                </button>
              </div>
            </div>
          )}
        </form>

        <div className="px-6 py-3 border-t border-[#1E2636] bg-[#0E131B] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#263044] bg-[#181F2E] px-4 py-1.5 font-semibold text-slate-300 hover:text-white hover:bg-[#222B3D] transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
