import React from 'react';
import {
  CheckCircle,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

interface ApprovalPatrimonioSectionProps {
  patrimonioAjustado: string;
  setPatrimonioAjustado: (p: string) => void;
  observacaoAdmin: string;
  setObservacaoAdmin: (obs: string) => void;
  isRejecting: boolean;
  setIsRejecting: (r: boolean) => void;
  motivoRejeicao: string;
  setMotivoRejeicao: (m: string) => void;
  submitting: boolean;
  onClose: () => void;
  onAprovar: () => void;
  onRejeitar: () => void;
  canApprove: boolean;
}

export const ApprovalPatrimonioSection: React.FC<ApprovalPatrimonioSectionProps> = ({
  patrimonioAjustado,
  setPatrimonioAjustado,
  observacaoAdmin,
  setObservacaoAdmin,
  isRejecting,
  setIsRejecting,
  motivoRejeicao,
  setMotivoRejeicao,
  submitting,
  onClose,
  onAprovar,
  onRejeitar,
  canApprove,
}) => {
  return (
    <div className="space-y-4">
      {/* Patrimônio Físico Ajustado */}
      <div className="rounded-xl border border-[#1E2636] bg-[#121721] p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-200">
              Patrimônio Físico Ajustado (se necessário)
            </label>
            <span className="text-[11px] text-slate-400">
              Confirme ou corrija a etiqueta física colada na máquina
            </span>
          </div>
          <input
            type="text"
            value={patrimonioAjustado}
            onChange={(e) => setPatrimonioAjustado(e.target.value)}
            placeholder="Ex: pat.35192"
            className="w-full sm:w-64 rounded-lg border border-[#263044] bg-[#181F2E] py-1.5 px-3 text-xs font-mono text-orange-400 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
          />
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* SEÇÃO D: DECISÃO ADMINISTRATIVA                      */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-xl border border-[#1E2636] bg-[#121721] p-4 space-y-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase">
            Seção D
          </span>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Decisão Administrativa e Conclusão
          </h4>
        </div>

        {!isRejecting ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Observação Administrativa (Opcional)
              </label>
              <input
                type="text"
                value={observacaoAdmin}
                onChange={(e) => setObservacaoAdmin(e.target.value)}
                placeholder="Ex: Homologado para bancada do setor comercial / Formatação validada"
                className="w-full rounded-lg border border-[#263044] bg-[#181F2E] py-2 px-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#1E2636]">
              <button
                type="button"
                onClick={() => setIsRejecting(true)}
                disabled={submitting}
                className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                ✕ Rejeitar Solicitação...
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="rounded-lg border border-[#263044] bg-[#181F2E] px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-[#263044] hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onAprovar}
                  disabled={submitting || !canApprove}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-xs font-bold text-white disabled:opacity-50 transition-all shadow-sm cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Gravando e Concluindo...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Aprovar e Concluir Cadastro</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Painel de Rejeição */
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-rose-300 font-bold">
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              Rejeitar Solicitação de Cadastro
            </div>
            <p className="text-[11px] text-rose-300/90 leading-relaxed">
              Informe a justificativa obrigatória para a rejeição. O equipamento permanecerá com status
              rejeitado e o motivo ficará registrado no histórico para visualização pelo operador.
            </p>
            <div>
              <label className="block text-[11px] font-bold text-rose-300 mb-1">
                Motivo da rejeição <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={motivoRejeicao}
                onChange={(e) => setMotivoRejeicao(e.target.value)}
                placeholder="Descreva o motivo (ex: patrimônio informado divergente da etiqueta física, faixa incorreta, etc.)..."
                rows={3}
                className="w-full rounded-lg border border-rose-500/30 bg-[#0B0E14] py-2 px-3 text-xs text-rose-100 placeholder:text-rose-400/50 focus:border-rose-400 focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setIsRejecting(false)}
                disabled={submitting}
                className="rounded-lg border border-[#263044] bg-[#181F2E] px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#263044] hover:text-white cursor-pointer"
              >
                Voltar à Aprovação
              </button>
              <button
                type="button"
                onClick={onRejeitar}
                disabled={submitting || !motivoRejeicao.trim()}
                className="rounded-lg bg-rose-600 hover:bg-rose-500 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50 transition-colors cursor-pointer"
              >
                {submitting ? 'Rejeitando...' : '✕ Confirmar Rejeição'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
