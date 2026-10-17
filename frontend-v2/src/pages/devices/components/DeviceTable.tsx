import React from 'react';
import { DeviceListItem, DevicePagination } from '@/types/device';
import {
  History,
  Tag,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  HardDrive,
  Cpu,
} from 'lucide-react';

interface DeviceTableProps {
  devices: DeviceListItem[];
  loading: boolean;
  pagination: DevicePagination;
  onPageChange: (page: number) => void;
  onOpenHistory: (device: DeviceListItem) => void;
  onOpenPatrimonio: (device: DeviceListItem) => void;
  onOpenApproval: (device: DeviceListItem) => void;
  onClearAlert?: (device: DeviceListItem) => void;
  onDeleteDevice?: (device: DeviceListItem) => void;
  isAdmin: boolean;
  isMatrizOperator: boolean;
}

export const DeviceTable: React.FC<DeviceTableProps> = ({
  devices,
  loading,
  pagination,
  onPageChange,
  onOpenHistory,
  onOpenPatrimonio,
  onOpenApproval,
  onClearAlert,
  onDeleteDevice,
  isAdmin,
  isMatrizOperator,
}) => {
  const isBenchSubnet = (ip?: string | null) => {
    return Boolean(ip && ip.startsWith('192.168.88.'));
  };

  const renderFirewallBadge = (status?: string | null) => {
    switch (status) {
      case 'confirmado':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" /> Confirmado
          </span>
        );
      case 'pendente':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3" /> Pendente
          </span>
        );
      case 'rejeitado':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
            <XCircle className="h-3 w-3" /> Rejeitado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            Não solicitado
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <th className="py-3 px-4">Dispositivo</th>
              <th className="py-3 px-4">Filial / Loja</th>
              <th className="py-3 px-4">Rede (IP / MAC)</th>
              <th className="py-3 px-4">Hardware & SO</th>
              <th className="py-3 px-4">Patrimônio</th>
              <th className="py-3 px-4">Firewall / Status</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  Carregando dispositivos...
                </td>
              </tr>
            ) : devices.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  Nenhum dispositivo encontrado com os filtros selecionados.
                </td>
              </tr>
            ) : (
              devices.map((device) => {
                const bench = isBenchSubnet(device.ip);
                return (
                  <tr key={device.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Hostname e Alertas */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{device.hostname}</div>
                      {device.alerta_hardware && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-red-600 font-medium">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate max-w-xs" title={device.alerta_hardware}>
                            {device.alerta_hardware}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Loja / Filial */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-700">{device.loja || 'Sem Loja'}</div>
                      {device.site_id && (
                        <div className="text-xs text-slate-400">Site ID: {device.site_id}</div>
                      )}
                    </td>

                    {/* Rede (IP + MAC) */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-slate-800">{device.ip || '---'}</span>
                        {bench && (
                          <span className="rounded bg-orange-100 px-1.5 py-0.2 text-[10px] font-bold text-orange-700">
                            Bancada .88
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-xs text-slate-400 mt-0.5">
                        {device.mac || '---'}
                      </div>
                    </td>

                    {/* Hardware & SO */}
                    <td className="py-3 px-4">
                      <div className="text-xs text-slate-700">
                        {device.sistema || 'SO não informado'} {device.versao || ''}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                        {device.ram_total && (
                          <span className="flex items-center gap-1">
                            <Cpu className="h-3 w-3" /> {device.ram_total}
                          </span>
                        )}
                        {device.disco_total && (
                          <span className="flex items-center gap-1">
                            <HardDrive className="h-3 w-3" /> {device.disco_total}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Patrimônio */}
                    <td className="py-3 px-4">
                      {device.patrimonio ? (
                        <span className="font-mono font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {device.patrimonio}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Não patrimoniado</span>
                      )}
                    </td>

                    {/* Firewall Status */}
                    <td className="py-3 px-4">
                      {renderFirewallBadge(device.firewall_status)}
                    </td>

                    {/* Ações */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Botão de Histórico */}
                        <button
                          onClick={() => onOpenHistory(device)}
                          title="Histórico de Alterações"
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        >
                          <History className="h-4 w-4" />
                        </button>

                        {/* Botão de Patrimônio (Disponível para Operador Matriz e Admin) */}
                        {(isAdmin || isMatrizOperator) && (
                          <button
                            onClick={() => onOpenPatrimonio(device)}
                            title="Ajustar Patrimônio / Solicitar Recadastro"
                            className="rounded p-1.5 text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Tag className="h-4 w-4" />
                          </button>
                        )}

                        {/* Botão de Homologação (Exclusivo Admin) */}
                        {isAdmin && (
                          <button
                            onClick={() => onOpenApproval(device)}
                            title="Homologação e Ajuste Cadastral"
                            className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 transition-colors"
                          >
                            <ShieldCheck className="h-4 w-4" />
                          </button>
                        )}

                        {/* Resolver Alerta (Se houver alerta e for Admin) */}
                        {isAdmin && device.alerta_hardware && onClearAlert && (
                          <button
                            onClick={() => onClearAlert(device)}
                            title="Resolver / Limpar Alerta de Hardware"
                            className="rounded p-1.5 text-amber-600 hover:bg-amber-50 transition-colors"
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </button>
                        )}

                        {/* Excluir Máquina (Exclusivo Admin) */}
                        {isAdmin && onDeleteDevice && (
                          <button
                            onClick={() => onDeleteDevice(device)}
                            title="Excluir Dispositivo"
                            className="rounded p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 bg-slate-50 text-xs text-slate-600">
        <div>
          Exibindo{' '}
          <span className="font-semibold text-slate-800">
            {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.per_page + 1}
          </span>{' '}
          a{' '}
          <span className="font-semibold text-slate-800">
            {Math.min(pagination.page * pagination.per_page, pagination.total)}
          </span>{' '}
          de <span className="font-semibold text-slate-800">{pagination.total}</span> registros
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1 || loading}
            className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Anterior
          </button>
          <span>
            Página <strong className="font-semibold text-slate-800">{pagination.page}</strong> de{' '}
            {pagination.total_pages || 1}
          </span>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.total_pages || loading}
            className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            Próxima <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
