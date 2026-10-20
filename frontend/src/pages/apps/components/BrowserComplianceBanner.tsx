import React from 'react';
import {
  Globe,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Monitor,
} from 'lucide-react';
import { BrowserComplianceSummary } from '@/types/software';

interface BrowserComplianceBannerProps {
  browsers: BrowserComplianceSummary[];
  onSelectSoftware: (softwareId: number) => void;
  loading?: boolean;
}

export const BrowserComplianceBanner: React.FC<BrowserComplianceBannerProps> = ({
  browsers,
  onSelectSoftware,
  loading = false,
}) => {
  if (loading || !browsers || browsers.length === 0) return null;

  // Prioriza o Google Chrome estável
  const chrome =
    browsers.find(
      (b) =>
        b.identifier.toLowerCase().includes('chrome') &&
        !b.identifier.toLowerCase().includes('beta'),
    ) || browsers[0];

  const outrosBrowsers = browsers.filter((b) => b.software_id !== chrome.software_id);

  return (
    <div className="bg-[#121721] rounded-xl border border-[#1E2636] p-4 shadow-sm border-l-4 border-l-orange-500">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Coluna 1: Título, Versão mais recente e Botão Inspecionar */}
        <div className="lg:col-span-4 space-y-2.5">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400 uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4 text-orange-400" />
              <span>Conformidade de Navegadores</span>
            </div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
              <Globe className="h-4 w-4 text-orange-400 shrink-0" />
              <span>Google Chrome</span>
              <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                v{chrome.mais_recente}
              </span>
            </h3>
          </div>

          <div>
            <button
              type="button"
              onClick={() => onSelectSoftware(chrome.software_id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs transition-colors shadow-md shadow-orange-500/20 cursor-pointer group"
            >
              <Monitor className="h-3.5 w-3.5" />
              <span>Inspecionar Máquinas</span>
              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Coluna 2: Métricas e Barra de Progresso Larga */}
        <div className="lg:col-span-5 space-y-2 lg:px-4 lg:border-x lg:border-[#1E2636]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">
              Total:{' '}
              <strong className="text-white font-bold">
                {chrome.total_instalacoes.toLocaleString('pt-BR')} máquinas
              </strong>
            </span>
            <span className="font-mono font-bold text-slate-200 bg-[#181F2E] px-2 py-0.5 rounded text-[11px] border border-[#263044]">
              {chrome.taxa_conformidade}% conformes
            </span>
          </div>

          <div className="w-full bg-[#181F2E] border border-[#263044] rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                chrome.taxa_conformidade >= 80
                  ? 'bg-emerald-500'
                  : chrome.taxa_conformidade >= 40
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${Math.max(chrome.taxa_conformidade, 3)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
              <CheckCircle2 className="h-3 w-3" />
              Atualizadas: {chrome.total_atualizadas}
            </span>

            {chrome.total_desatualizadas > 0 ? (
              <span className="inline-flex items-center gap-1 font-semibold text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded border border-rose-500/30">
                <AlertTriangle className="h-3 w-3" />
                Desatualizadas: {chrome.total_desatualizadas}
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold text-[11px]">100% atualizadas</span>
            )}
          </div>
        </div>

        {/* Coluna 3: Chips Consolidados dos Outros Navegadores */}
        <div className="lg:col-span-3 space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Outros Navegadores
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto pr-0.5">
            {outrosBrowsers.length > 0 ? (
              outrosBrowsers.map((b) => (
                <button
                  key={b.software_id}
                  type="button"
                  onClick={() => onSelectSoftware(b.software_id)}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#181F2E] hover:bg-[#222B3D] border border-[#263044] hover:border-[#34425A] text-xs font-medium transition-colors w-full group cursor-pointer"
                  title={`Ver ${b.software_nome} (versão mais recente v${b.mais_recente})`}
                >
                  <span className="font-semibold text-slate-200 group-hover:text-orange-400 truncate">
                    {b.software_nome}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="font-mono text-[10px] text-slate-300 bg-[#121721] px-1.5 py-0.5 rounded border border-[#1E2636]">
                      v{b.mais_recente}
                    </span>
                    <span className="font-bold text-[11px] text-orange-400">
                      ({b.total_instalacoes})
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">Nenhum outro navegador detectado</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
