import React, { useState } from 'react';
import { DeviceListItem } from '@/types/device';
import { deviceService } from '@/services/deviceService';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';

interface DeleteDeviceModalProps {
  device: DeviceListItem;
  onClose: () => void;
  onSuccess: (deletedDevice: DeviceListItem) => void;
}

export const DeleteDeviceModal: React.FC<DeleteDeviceModalProps> = ({
  device,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError(null);
      await deviceService.deleteDevice(device.id);
      onSuccess(device);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Falha ao excluir dispositivo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface p-6 text-fg shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3.5 border-b border-border-subtle">
          <div className="flex items-center gap-2.5 text-base font-bold text-rose-600 dark:text-rose-400">
            <div className="p-2 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
              <Trash2 className="h-5 w-5" />
            </div>
            <span>Confirmar Exclusão de Máquina</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-fg-secondary hover:bg-elevated hover:text-fg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="py-4 text-sm text-gray-700 dark:text-slate-300 space-y-3.5">
          {/* Caixa de destaque da máquina a ser excluída */}
          <div className="rounded-xl border border-border-subtle bg-app p-3.5 space-y-1">
            <div className="text-xs text-fg-secondary">Dispositivo selecionado:</div>
            <div className="text-base font-bold text-fg font-mono">{device.hostname}</div>
            <div className="text-xs text-fg-secondary font-mono flex items-center gap-2">
              <span className="text-fg">{device.ip || 'Sem IP'}</span>
              <span className="text-fg-muted">&bull;</span>
              <span>{device.mac || 'Sem MAC'}</span>
              {device.loja && (
                <>
                  <span className="text-fg-muted">&bull;</span>
                  <span className="text-gray-700 dark:text-slate-300 font-sans">{device.loja}</span>
                </>
              )}
            </div>
          </div>

          {device.alerta_hardware ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-700 dark:text-amber-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                Alerta de Conflito de Hardware Pendente
              </div>
              <p className="text-amber-700/90 dark:text-amber-300/90 leading-relaxed">
                Excluir este registro é a ação recomendada caso o SSD tenha sido movido
                legitimamente para uma nova estação definitiva.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                Ação Irreversível
              </div>
              <p className="text-rose-700/90 dark:text-rose-300/90 leading-relaxed">
                Esta ação removerá a máquina, todo o histórico de alterações (drift) e os softwares
                registrados. O endereço MAC e o patrimônio ficarão livres para novos registros.
              </p>
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center justify-end gap-2.5 pt-3.5 border-t border-border-subtle">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-border-medium bg-elevated px-4 py-2 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-border-subtle hover:text-fg disabled:opacity-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-semibold text-white transition-colors disabled:bg-rose-700/50 cursor-pointer shadow-md shadow-rose-900/20"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {loading ? 'Excluindo...' : 'Sim, Excluir Definitivamente'}
          </button>
        </div>
      </div>
    </div>
  );
};
