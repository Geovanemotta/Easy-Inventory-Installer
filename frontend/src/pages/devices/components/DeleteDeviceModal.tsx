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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-base font-bold text-red-600">
            <Trash2 className="h-5 w-5" />
            <span>Confirmar Exclusão de Máquina</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="py-4 text-sm text-slate-600 space-y-3">
          <p>
            Tem certeza que deseja excluir permanentemente a estação{' '}
            <strong className="text-slate-900 font-mono">{device.hostname}</strong> (
            {device.ip || 'Sem IP'} / {device.mac || 'Sem MAC'})?
          </p>

          {device.alerta_hardware ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Alerta de Conflito de Hardware Pendente
              </div>
              <p>
                Excluir este registro é a ação recomendada caso o SSD tenha sido movido
                legitimamente para uma nova estação definitiva.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50/70 p-3 text-xs text-red-800">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Ação Irreversível
              </div>
              <p>
                Esta ação removerá a máquina, todo o histórico de alterações (drift) e os softwares
                registrados. O endereço MAC e o patrimônio ficarão livres para novos registros.
              </p>
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:bg-red-400"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {loading ? 'Excluindo...' : 'Sim, Excluir Definitivamente'}
          </button>
        </div>
      </div>
    </div>
  );
};
