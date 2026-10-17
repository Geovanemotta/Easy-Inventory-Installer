import React, { useCallback, useEffect, useState } from 'react';
import { DeviceListItem, DevicePagination, DeviceQueryParams } from '@/types/device';
import { deviceService } from '@/services/deviceService';
import { useAuth } from '@/context/AuthContext';
import { DeviceFilters } from './components/DeviceFilters';
import { DeviceTable } from './components/DeviceTable';
import { DevicePatrimonioForm } from './components/DevicePatrimonioForm';
import { DeviceApprovalModal } from './components/DeviceApprovalModal';
import { DeviceHistoryDrawer } from './components/DeviceHistoryDrawer';
import { Monitor, AlertCircle, RefreshCw } from 'lucide-react';

export const DevicesPage: React.FC = () => {
  const { isAdmin, isMatrizOperator } = useAuth();

  const [devices, setDevices] = useState<DeviceListItem[]>([]);
  const [pagination, setPagination] = useState<DevicePagination>({
    page: 1,
    per_page: 50,
    total: 0,
    total_pages: 1,
  });
  const [filters, setFilters] = useState<DeviceQueryParams>({
    page: 1,
    per_page: 50,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Estados dos Modais
  const [historyDevice, setHistoryDevice] = useState<DeviceListItem | null>(null);
  const [patrimonioDevice, setPatrimonioDevice] = useState<DeviceListItem | null>(null);
  const [approvalDevice, setApprovalDevice] = useState<DeviceListItem | null>(null);

  const loadDevices = useCallback(async (currentFilters: DeviceQueryParams) => {
    try {
      setLoading(true);
      setError(null);
      const res = await deviceService.listDevices(currentFilters);
      setDevices(res.items);
      setPagination(res.pagination);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro ao carregar lista de dispositivos.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevices(filters);
  }, [filters, loadDevices]);

  const handleFilterChange = (newFilters: DeviceQueryParams) => {
    setFilters(newFilters);
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleClearAlert = async (device: DeviceListItem) => {
    if (!window.confirm(`Deseja resolver e limpar o alerta de hardware da máquina '${device.hostname}'?`)) {
      return;
    }
    try {
      await deviceService.clearDeviceAlert(device.id);
      loadDevices(filters);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao resolver alerta.');
    }
  };

  const handleDeleteDevice = async (device: DeviceListItem) => {
    if (
      !window.confirm(
        `ATENÇÃO: Deseja realmente excluir permanentemente a máquina '${device.hostname}' e todo seu histórico do inventário?`
      )
    ) {
      return;
    }
    try {
      await deviceService.deleteDevice(device.id);
      loadDevices(filters);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao excluir máquina.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Monitor className="h-6 w-6 text-blue-600" />
            Inventário de Dispositivos
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerenciamento de estações de trabalho, hardware, patrimônio e homologação de firewall
          </p>
        </div>

        <button
          onClick={() => loadDevices(filters)}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Subcomponente de Filtros */}
      <DeviceFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        loading={loading}
      />

      {/* Subcomponente de Tabela e Ações */}
      <DeviceTable
        devices={devices}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onOpenHistory={(dev) => setHistoryDevice(dev)}
        onOpenPatrimonio={(dev) => setPatrimonioDevice(dev)}
        onOpenApproval={(dev) => setApprovalDevice(dev)}
        onClearAlert={handleClearAlert}
        onDeleteDevice={handleDeleteDevice}
        isAdmin={isAdmin}
        isMatrizOperator={isMatrizOperator}
      />

      {/* Modal de Patrimônio / Recadastro */}
      {patrimonioDevice && (
        <DevicePatrimonioForm
          device={patrimonioDevice}
          isAdmin={isAdmin}
          onClose={() => setPatrimonioDevice(null)}
          onSuccess={() => {
            setPatrimonioDevice(null);
            loadDevices(filters);
          }}
        />
      )}

      {/* Modal de Homologação (Admin) */}
      {approvalDevice && (
        <DeviceApprovalModal
          device={approvalDevice}
          onClose={() => setApprovalDevice(null)}
          onSuccess={() => {
            setApprovalDevice(null);
            loadDevices(filters);
          }}
        />
      )}

      {/* Drawer de Linha do Tempo e Histórico */}
      {historyDevice && (
        <DeviceHistoryDrawer
          device={historyDevice}
          onClose={() => setHistoryDevice(null)}
        />
      )}
    </div>
  );
};
