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
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Patrimônio Físico Ajustado (se necessário)
            </label>
            <span className="text-[11px] text-slate-500">
              Confirme ou corrija a etiqueta física colada na máquina
            </span>
          </div>
          <input
            type="text"
            value={patrimonioAjustado}
            onChange={(e) => setPatrimonioAjustado(e.target.value)}
            placeholder="Ex: pat.35192"
            className="w-full sm:w-64 rounded-lg border border-slate-300 py-1.5 px-3 text-xs font-mono focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* SEÇÃO D: DECISÃO ADMINISTRATIVA                      */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase">
            Seção D
          </span>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Decisão Administrativa e Conclusão
          </h4>
        </div>

        {!isRejecting ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observação Administrativa (Opcional)
              </label>
              <input
                type="text"
                value={observacaoAdmin}
                onChange={(e) => setObservacaoAdmin(e.target.value)}
                placeholder="Ex: Homologado para bancada do setor comercial / Formatação validada"
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRejecting(true)}
                disabled={submitting}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition-colors"
              >
                ✕ Rejeitar Solicitação...
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onAprovar}
                  disabled={submitting || !canApprove}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Gravando e Concluindo...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>✓ Aprovar e Concluir Cadastro</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Painel de Rejeição */
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
              <ShieldAlert className="h-4 w-4 text-rose-600" />
              Rejeitar Solicitação de Cadastro
            </div>
            <p className="text-[11px] text-rose-700">
              Informe a justificativa obrigatória para a rejeição. O equipamento permanecerá com status
              rejeitado e o motivo ficará registrado no histórico para visualização pelo operador.
            </p>
            <div>
              <label className="block text-[11px] font-bold text-rose-800 mb-1">
                Motivo da rejeição <span className="text-rose-600">*</span>
              </label>
              <textarea
                value={motivoRejeicao}
                onChange={(e) => setMotivoRejeicao(e.target.value)}
                placeholder="Descreva o motivo (ex: patrimônio informado divergente da etiqueta física, faixa incorreta, etc.)..."
                rows={3}
                className="w-full rounded-lg border border-rose-300 py-2 px-3 text-xs focus:border-rose-500 focus:outline-none bg-white"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsRejecting(false)}
                disabled={submitting}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Voltar à Aprovação
              </button>
              <button
                type="button"
                onClick={onRejeitar}
                disabled={submitting || !motivoRejeicao.trim()}
                className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
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
