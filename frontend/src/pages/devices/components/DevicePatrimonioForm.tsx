import React, { useEffect, useState } from 'react';
import { DeviceListItem, DeviceLookupResponse } from '@/types/device';
import { deviceService } from '@/services/deviceService';
import { X, AlertCircle, CheckCircle, Info, Loader2 } from 'lucide-react';

interface DevicePatrimonioFormProps {
  device: DeviceListItem;
  isAdmin: boolean;
  isMatrizOperator?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DevicePatrimonioForm: React.FC<DevicePatrimonioFormProps> = ({
  device,
  isAdmin,
  isMatrizOperator: _isMatrizOperator,
  onClose,
  onSuccess,
}) => {
  const [patrimonio, setPatrimonio] = useState(device.patrimonio || '');
  const [motivo, setMotivo] = useState('');
  const [confirmacaoMudancaSo, setConfirmacaoMudancaSo] = useState(false);
  const [licencaWindows, setLicencaWindows] = useState(false);

  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<DeviceLookupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isBench = Boolean(device.ip && device.ip.startsWith('192.168.88.'));
  const isConfirmed = device.firewall_status === 'confirmado';
  const bloqueioBancadaAtivo = !isAdmin && (!isBench || isConfirmed);

  // Consulta de patrimônio em tempo real com debounce
  useEffect(() => {
    const nums = patrimonio.replace(/\D/g, '');
    if (!nums || nums.length < 2) {
      setLookupResult(null);
      return;
    }

    const handler = setTimeout(async () => {
      try {
        setLookupLoading(true);
        const res = await deviceService.lookupPatrimonio(nums, device.id);
        setLookupResult(res);
      } catch {
        setLookupResult(null);
      } finally {
        setLookupLoading(false);
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [patrimonio, device.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nums = patrimonio.replace(/\D/g, '');
    if (!nums) {
      setError('Informe um número de patrimônio válido.');
      return;
    }

    if (lookupResult?.comparativo?.so_divergente && !confirmacaoMudancaSo) {
      setError('Por favor, confirme a alteração de Sistema Operacional para prosseguir.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await deviceService.solicitarRecadastro(device.id, {
        patrimonio: `pat.${nums}`,
        confirmacao_mudanca_so: confirmacaoMudancaSo,
        licenca_windows_solicitada: licencaWindows,
        motivo: motivo.trim() || undefined,
      });

      onSuccess();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Falha ao registrar patrimônio.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border-subtle bg-surface p-6 shadow-2xl space-y-5 text-fg">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <div>
            <h3 className="text-base font-bold text-fg">
              Patrimônio & Solicitação de Recadastro
            </h3>
            <p className="text-xs text-fg-secondary font-mono mt-0.5">
              Máquina: <span className="font-semibold text-fg">{device.hostname}</span> &bull; IP: {device.ip || '---'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-fg-secondary hover:bg-elevated hover:text-fg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {bloqueioBancadaAtivo && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-amber-800 dark:text-amber-200">Atenção (Acesso Restrito):</strong>{' '}
              {!isBench
                ? 'Operadores da matriz só possuem permissão para cadastrar ou alterar patrimônio em máquinas na bancada (192.168.88.x). Fora da bancada, a edição é exclusiva para Administradores.'
                : 'O patrimônio deste equipamento já foi homologado no Firewall pelo administrador e está bloqueado para alteração por operadores.'}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1 font-mono">
              Número de Patrimônio
            </label>
            <div className="relative">
              <input
                type="text"
                value={patrimonio}
                onChange={(e) => setPatrimonio(e.target.value)}
                placeholder="Ex: pat.35192 ou 35192"
                disabled={loading || bloqueioBancadaAtivo}
                className="w-full rounded-xl border border-border-medium bg-elevated py-2 px-3 text-sm text-fg placeholder-fg-muted focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50 transition-colors font-mono"
              />
              {lookupLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
                </div>
              )}
            </div>
          </div>

          {/* Resultado do Lookup em Tempo Real */}
          {lookupResult && lookupResult.exists && (
            <div className="rounded-xl border border-border-subtle bg-app p-3.5 text-xs text-gray-700 dark:text-slate-300 space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-orange-400">
                <CheckCircle className="h-4 w-4 text-orange-400" />
                Ativo existente localizado: <span className="font-mono text-fg">{lookupResult.patrimonio_formatado}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-fg-secondary">
                <div>
                  <span className="text-fg-muted">Hostname anterior:</span> <span className="text-fg font-mono">{lookupResult.existing_device?.hostname || '---'}</span>
                </div>
                <div>
                  <span className="text-fg-muted">Loja anterior:</span> <span className="text-fg">{lookupResult.existing_device?.loja || '---'}</span>
                </div>
                <div>
                  <span className="text-fg-muted">SO anterior:</span> <span className="text-fg">{lookupResult.existing_device?.sistema || '---'}</span>
                </div>
                <div>
                  <span className="text-fg-muted">IP anterior:</span> <span className="text-fg font-mono">{lookupResult.existing_device?.ip || '---'}</span>
                </div>
              </div>

              {/* Alerta de Divergência de SO */}
              {lookupResult.comparativo?.so_divergente && (
                <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/15 p-2.5 text-amber-800 dark:text-amber-200">
                  <div className="font-bold flex items-center gap-1 text-amber-700 dark:text-amber-300">
                    <AlertCircle className="h-3.5 w-3.5" /> Divergência de Sistema Operacional Detectada!
                  </div>
                  <p className="mt-1 text-[11px] text-amber-800/90 dark:text-amber-200/90 leading-relaxed">
                    O patrimônio pertencia a uma máquina com{' '}
                    <strong className="text-fg">{lookupResult.comparativo.so_anterior}</strong> e a máquina atual reporta{' '}
                    <strong className="text-fg">{device.sistema}</strong>.
                  </p>
                  <label className="mt-2 flex items-center gap-2 cursor-pointer text-xs font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200">
                    <input
                      type="checkbox"
                      checked={confirmacaoMudancaSo}
                      onChange={(e) => setConfirmacaoMudancaSo(e.target.checked)}
                      className="rounded border-border-medium bg-elevated text-orange-500 focus:ring-orange-500"
                    />
                    <span>Confirmo expressamente a alteração de Sistema Operacional</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Licença Windows */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="licencaWindows"
              checked={licencaWindows}
              onChange={(e) => setLicencaWindows(e.target.checked)}
              disabled={loading || bloqueioBancadaAtivo}
              className="rounded border-border-medium bg-elevated text-orange-500 focus:ring-orange-500"
            />
            <label htmlFor="licencaWindows" className="text-xs text-gray-700 dark:text-slate-300 font-medium cursor-pointer select-none">
              Solicitar nova licença do Windows (será analisada pelo Administrador)
            </label>
          </div>

          {/* Motivo ou Observação */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1 font-mono">
              Motivo / Justificativa
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Formatação, troca de filial, máquina reinstalada na bancada..."
              rows={2}
              disabled={loading || bloqueioBancadaAtivo}
              className="w-full rounded-xl border border-border-medium bg-elevated py-2 px-3 text-sm text-fg placeholder-fg-muted focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50 transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-border-medium bg-elevated px-4 py-2 text-xs font-medium text-gray-700 dark:text-slate-300 hover:bg-border-subtle hover:text-fg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || bloqueioBancadaAtivo}
              className="flex items-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-orange-500/20 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Enviar Solicitação</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
