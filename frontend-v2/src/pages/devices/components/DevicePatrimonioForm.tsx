import React, { useEffect, useState } from 'react';
import { DeviceListItem, DeviceLookupResponse } from '@/types/device';
import { deviceService } from '@/services/deviceService';
import { X, AlertCircle, CheckCircle, Info, Loader2 } from 'lucide-react';

interface DevicePatrimonioFormProps {
  device: DeviceListItem;
  isAdmin: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DevicePatrimonioForm: React.FC<DevicePatrimonioFormProps> = ({
  device,
  isAdmin,
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
  const hasPatrimonioJaCadastrado = Boolean(device.patrimonio && device.patrimonio.trim());
  const bloqueioBancadaAtivo = !isAdmin && !isBench && hasPatrimonioJaCadastrado;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Patrimônio & Solicitação de Recadastro
            </h3>
            <p className="text-xs text-slate-500">
              Máquina: <span className="font-semibold">{device.hostname}</span> &bull; IP: {device.ip || '---'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {bloqueioBancadaAtivo && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Atenção (Regra de Bancada):</strong> Este equipamento possui patrimônio fixado e está fora da faixa de preparação (192.168.88.0/24). Apenas administradores podem reatribuir o patrimônio nesta filial.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Número de Patrimônio
            </label>
            <div className="relative">
              <input
                type="text"
                value={patrimonio}
                onChange={(e) => setPatrimonio(e.target.value)}
                placeholder="Ex: pat.35192 ou 35192"
                disabled={loading || bloqueioBancadaAtivo}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
              />
              {lookupLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                </div>
              )}
            </div>
          </div>

          {/* Resultado do Lookup em Tempo Real */}
          {lookupResult && lookupResult.exists && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs text-slate-700 space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-blue-800">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                Ativo existente localizado: {lookupResult.patrimonio_formatado}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                <div>
                  <strong>Hostname anterior:</strong> {lookupResult.existing_device?.hostname || '---'}
                </div>
                <div>
                  <strong>Loja anterior:</strong> {lookupResult.existing_device?.loja || '---'}
                </div>
                <div>
                  <strong>SO anterior:</strong> {lookupResult.existing_device?.sistema || '---'}
                </div>
                <div>
                  <strong>IP anterior:</strong> {lookupResult.existing_device?.ip || '---'}
                </div>
              </div>

              {/* Alerta de Divergência de SO */}
              {lookupResult.comparativo?.so_divergente && (
                <div className="mt-2 rounded border border-orange-300 bg-orange-100 p-2.5 text-orange-900">
                  <div className="font-bold flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> Divergência de Sistema Operacional Detectada!
                  </div>
                  <p className="mt-1 text-[11px]">
                    O patrimônio pertencia a uma máquina com{' '}
                    <strong>{lookupResult.comparativo.so_anterior}</strong> e a máquina atual reporta{' '}
                    <strong>{device.sistema}</strong>.
                  </p>
                  <label className="mt-2 flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={confirmacaoMudancaSo}
                      onChange={(e) => setConfirmacaoMudancaSo(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600"
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
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="licencaWindows" className="text-xs text-slate-700 font-medium cursor-pointer">
              Solicitar nova licença do Windows (será analisada pelo Administrador)
            </label>
          </div>

          {/* Motivo ou Observação */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Motivo / Justificativa
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Formatação, troca de filial, máquina reinstalada na bancada..."
              rows={2}
              disabled={loading || bloqueioBancadaAtivo}
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || bloqueioBancadaAtivo}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
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
