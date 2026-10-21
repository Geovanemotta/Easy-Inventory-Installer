import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DeviceChartsSummary,
  DeviceFilterOptions,
  DeviceKPIs,
  DeviceListItem,
  DevicePagination,
  DeviceQueryParams,
} from '@/types/device';
import { deviceService } from '@/services/deviceService';
import { useAuth } from '@/context/AuthContext';
import { DeviceKpiStrip } from './components/DeviceKpiStrip';
import { DeviceFilters } from './components/DeviceFilters';
import { DeviceTable } from './components/DeviceTable';
import { DevicePatrimonioForm } from './components/DevicePatrimonioForm';
import { DeviceApprovalModal } from './components/DeviceApprovalModal';
import { DeviceHistoryDrawer } from './components/DeviceHistoryDrawer';
import { DeviceDetailsDrawer } from './components/DeviceDetailsDrawer';
import { DeleteDeviceModal } from './components/DeleteDeviceModal';
import { SshTerminalModal } from './components/SshTerminalModal';
import { DonutChart } from '@/components/common/DonutChart';
import { SelectDropdown } from '@/components/ui/SelectDropdown';
import {
  Monitor,
  AlertCircle,
  Zap,
  X,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const DevicesPage: React.FC = () => {
  const { isAdmin, isMatrizOperator, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || searchParams.get('q') || undefined;

  const [devices, setDevices] = useState<DeviceListItem[]>([]);
  const [kpis, setKpis] = useState<DeviceKPIs | undefined>(undefined);
  const [filterOptions, setFilterOptions] = useState<DeviceFilterOptions | undefined>(undefined);
  const [chartsSummary, setChartsSummary] = useState<DeviceChartsSummary | null>(null);
  const [showCharts, setShowCharts] = useState<boolean>(true);
  const [pagination, setPagination] = useState<DevicePagination>({
    page: 1,
    per_page: 50,
    total: 0,
    total_pages: 1,
  });
  const [filters, setFilters] = useState<DeviceQueryParams>({
    page: 1,
    per_page: 50,
    ordenar_por: 'loja',
    ordem_dir: 'asc',
    search: initialSearch,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Estados dos Modais e Drawers
  const [detailsDeviceId, setDetailsDeviceId] = useState<number | null>(null);
  const [historyDevice, setHistoryDevice] = useState<DeviceListItem | null>(null);
  const [patrimonioDevice, setPatrimonioDevice] = useState<DeviceListItem | null>(null);
  const [approvalDevice, setApprovalDevice] = useState<DeviceListItem | null>(null);
  const [deviceToDelete, setDeviceToDelete] = useState<DeviceListItem | null>(null);
  const [sshTargetDevice, setSshTargetDevice] = useState<DeviceListItem | null>(null);

  // Evita qualquer requisição à API antes de sabermos os papéis do usuário (authLoading)
  // e de aplicar o filtro inicial obrigatório de bancada (.88) para operador_matriz.
  const [readyToFetch, setReadyToFetch] = useState(false);
  const initialBancadaAppliedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!initialBancadaAppliedRef.current) {
      initialBancadaAppliedRef.current = true;
      if (isMatrizOperator && !isAdmin) {
        setFilters((prev) => ({
          ...prev,
          bancada: true,
        }));
      }
      setReadyToFetch(true);
    }
  }, [authLoading, isMatrizOperator, isAdmin]);

  // Carrega opções de filtros (sites e versões)
  useEffect(() => {
    deviceService
      .getFilterOptions()
      .then((opts) => setFilterOptions(opts))
      .catch((err) => console.error('Falha ao carregar opções de filtro:', err));
  }, []);

  // Sincroniza busca e filtros vindos de query params na URL (ex: ao clicar no hostname ou em 'Alerta: Sem Apps')
  useEffect(() => {
    const qSearch = searchParams.get('search') || searchParams.get('q');
    const qSemApps = searchParams.get('sem_apps');
    const qComApps = searchParams.get('com_apps');
    const qSiteId = searchParams.get('site_id');
    const qDiscoTipo = searchParams.get('disco_tipo');

    setFilters((prev) => {
      let changed = false;
      const next = { ...prev };

      if (qSearch !== null && qSearch !== undefined) {
        const val = qSearch.trim() || undefined;
        if (next.search !== val) {
          next.search = val;
          changed = true;
        }
      }

      if (qDiscoTipo !== null && qDiscoTipo !== undefined) {
        const val = qDiscoTipo.trim() || undefined;
        if (next.disco_tipo !== val) {
          next.disco_tipo = val;
          changed = true;
        }
      }

      if (qSemApps !== null) {
        const val = qSemApps === 'true';
        if (next.sem_apps !== val) {
          next.sem_apps = val;
          changed = true;
        }
      }

      if (qComApps !== null) {
        const val = qComApps === 'true';
        if (next.com_apps !== val) {
          next.com_apps = val;
          changed = true;
        }
      }

      if (qSiteId !== null) {
        const sNum = Number(qSiteId);
        if (!isNaN(sNum) && next.site_id !== sNum) {
          next.site_id = sNum;
          changed = true;
        }
      }

      if (changed) {
        next.page = 1;
        return next;
      }
      return prev;
    });
  }, [searchParams]);

  const currentRequestIdRef = useRef(0);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const loadDevices = useCallback(async (currentFilters: DeviceQueryParams, silent = false) => {
    const requestId = ++currentRequestIdRef.current;
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      const res = await deviceService.listDevices(currentFilters);
      if (requestId !== currentRequestIdRef.current) return;
      setDevices(res.items);
      setPagination(res.pagination);
      if (res.kpis) {
        setKpis(res.kpis);
      }
      if (res.filter_options) {
        setFilterOptions(res.filter_options);
      }
      if (res.charts_summary) {
        setChartsSummary(res.charts_summary);
      }
    } catch (err: unknown) {
      if (requestId !== currentRequestIdRef.current) return;
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro ao carregar lista de dispositivos.');
      }
    } finally {
      if (requestId === currentRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Escuta eventos globais disparados pelo Header (atualização automática silenciosa / manual e abertura de modal)
  useEffect(() => {
    const handleRefreshEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ silent?: boolean }>;
      loadDevices(filtersRef.current, customEvent.detail?.silent ?? false);
    };

    window.addEventListener('app:refresh-data', handleRefreshEvent);

    return () => {
      window.removeEventListener('app:refresh-data', handleRefreshEvent);
    };
  }, [loadDevices]);

  useEffect(() => {
    if (!readyToFetch) return;
    loadDevices(filters);
  }, [readyToFetch, filters, loadDevices]);

  const handleFilterChange = (newFilters: DeviceQueryParams) => {
    setFilters(newFilters);
  };

  const handleKpiFilterChange = (updates: Partial<DeviceQueryParams>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const handleSortChange = (campo: string) => {
    setFilters((prev) => {
      const isCurrent =
        prev.ordenar_por === campo ||
        (campo === 'loja' && (prev.ordenar_por === 'loja' || prev.ordenar_por === 'filial'));
      const nextDir = isCurrent && prev.ordem_dir === 'asc' ? 'desc' : 'asc';
      return {
        ...prev,
        ordenar_por: campo,
        ordem_dir: nextDir,
        page: 1,
      };
    });
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handlePerPageChange = (newPerPage: number) => {
    setFilters((prev) => ({ ...prev, per_page: newPerPage, page: 1 }));
  };

  const handleClearAlert = async (device: DeviceListItem) => {
    if (!window.confirm(`Deseja resolver e legitimar o hardware atual da máquina '${device.hostname}'?`)) {
      return;
    }
    try {
      await deviceService.clearDeviceAlert(device.id);
      loadDevices(filters);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao resolver alerta.');
    }
  };

  const handleExportCsv = async () => {
    try {
      // Exporta até 2000 registros com os mesmos filtros ativos
      const exportParams = { ...filters, page: 1, per_page: 2000 };
      const res = await deviceService.listDevices(exportParams);
      const items = res.items;

      const cols = [
        'Filial',
        'Hostname',
        'IP',
        'MAC',
        'Disco %',
        'Disco total',
        'Disco usado',
        'Disco livre',
        'Sistema',
        'Versão',
        'Status',
        'Processador',
        'RAM',
        'Patrimônio',
        'Firewall Status',
        'RustDesk',
        'Última coleta',
      ];

      const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

      const rows = items.map((i) =>
        [
          i.loja || '',
          i.hostname,
          i.ip || '',
          i.mac || '',
          i.disco_percentual !== null && i.disco_percentual !== undefined ? `${i.disco_percentual}%` : '',
          i.disco_total_formatado || i.disco_total || '',
          i.disco_usado_formatado || i.disco_usado || '',
          i.disco_livre_formatado || i.disco_livre || '',
          i.sistema || '',
          i.versao || '',
          i.status === 'OK'
            ? 'Atualizada'
            : i.status === 'UPGRADE_REQUIRED'
            ? 'Atualização Necessária'
            : 'Não Identificada',
          i.processador_formatado || i.processador || '',
          i.ram_total_formatada || i.ram_total || '',
          i.patrimonio || '',
          i.firewall_status || '',
          i.rustdesk_id || '',
          i.data_coleta || '',
        ]
          .map(q)
          .join(';')
      );

      const csvContent = '\ufeff' + [cols.map(q).join(';'), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventario-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar CSV:', err);
      alert('Falha ao gerar arquivo CSV.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Monitor className="h-6 w-6 text-orange-500" />
            <span>Estações de Trabalho &amp; Inventário</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Gerenciamento de hardware, discos, periféricos, histórico de drift e homologação no firewall
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Faixa Interativa de KPIs */}
      <DeviceKpiStrip
        kpis={kpis}
        filters={filters}
        onFilterChange={handleKpiFilterChange}
      />

      {/* Botão Recolhível de Gráficos de Distribuição */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowCharts((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-xl border border-[#1E2636] bg-[#121721] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-[#181F2E] hover:border-[#263044] hover:text-white shadow-2xs transition-all cursor-pointer"
        >
          <PieChart className="h-4 w-4 text-orange-400" />
          <span>Gráficos de Distribuição</span>
          <span className="rounded-full bg-[#181F2E] border border-[#1E2636] px-2 py-0.5 text-[10px] text-slate-400 font-mono">
            3 gráficos
          </span>
          {showCharts ? (
            <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          )}
        </button>
      </div>

      {/* Seção dos 3 Gráficos Donut alimentados pelo Back-end */}
      {showCharts && chartsSummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          <DonutChart
            data={chartsSummary.plataforma}
            activeItem={filters.plataforma}
            onItemClick={(label: string) => {
              handleFilterChange({
                ...filters,
                plataforma: label === filters.plataforma ? undefined : label,
                page: 1,
              });
            }}
          />
          {(chartsSummary.conectividade || chartsSummary.versoes) && (
            <DonutChart
              data={(chartsSummary.conectividade || chartsSummary.versoes)!}
              activeItem={
                filters.status_conexao === 'online'
                  ? 'Ativas'
                  : filters.status_conexao === 'alerta'
                  ? 'Semi-inativas'
                  : filters.status_conexao === 'offline' || filters.inativas === true
                  ? 'Inativas'
                  : undefined
              }
              onItemClick={(label: string) => {
                const cxMap: Record<string, string> = {
                  'Ativas': 'online',
                  'Semi-inativas': 'alerta',
                  'Inativas': 'offline',
                };
                const val = cxMap[label];
                const isCurrentActive =
                  (label === 'Inativas' && (filters.status_conexao === 'offline' || filters.inativas === true)) ||
                  (label === 'Ativas' && filters.status_conexao === 'online') ||
                  (label === 'Semi-inativas' && filters.status_conexao === 'alerta');

                handleFilterChange({
                  ...filters,
                  status_conexao: isCurrentActive ? undefined : val,
                  inativas: undefined,
                  page: 1,
                });
              }}
            />
          )}
          <DonutChart
            data={chartsSummary.status}
            activeItem={
              filters.status === 'OK'
                ? 'Atualizada'
                : filters.status === 'UPGRADE_REQUIRED'
                ? 'Atualização Necessária'
                : filters.status === 'OUTRO'
                ? 'Desatualizada'
                : undefined
            }
            onItemClick={(label: string) => {
              const stMap: Record<string, string> = {
                'Atualizada': 'OK',
                'Atualização Necessária': 'UPGRADE_REQUIRED',
                'Desatualizada': 'OUTRO',
              };
              const val = stMap[label];
              const isCurrentActive =
                (label === 'Atualizada' && filters.status === 'OK') ||
                (label === 'Atualização Necessária' && filters.status === 'UPGRADE_REQUIRED') ||
                (label === 'Desatualizada' && filters.status === 'OUTRO');

              handleFilterChange({
                ...filters,
                status: isCurrentActive ? undefined : val,
                page: 1,
              });
            }}
          />
        </div>
      )}

      {/* Subcomponente de Filtros e Busca */}
      <DeviceFilters
        filters={filters}
        options={filterOptions}
        onFilterChange={handleFilterChange}
        loading={loading}
        onExportCsv={handleExportCsv}
      />

      {/* Banner / Chip de Filtro Ativo: Sem Apps */}
      {filters.sem_apps && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
            </div>
            <div>
              <div className="font-bold flex items-center gap-2">
                <span>Filtrando: Máquinas sem inventário de aplicativos ({pagination.total})</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Pendente
                </span>
              </div>
              <p className="text-[11px] text-amber-300/80">
                Estações de trabalho ativas que ainda não reportaram ou sincronizaram coleta de softwares instalados.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            {isAdmin && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('app:open-install-agent'))}
                className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-orange-500/20 transition-colors cursor-pointer"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Instalar Agente</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setFilters((prev) => {
                  const next = { ...prev };
                  delete next.sem_apps;
                  return { ...next, page: 1 };
                });
                setSearchParams((prevParams) => {
                  const nextParams = new URLSearchParams(prevParams);
                  nextParams.delete('sem_apps');
                  return nextParams;
                });
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-[#181F2E] hover:bg-[#263044] px-2.5 py-1.5 text-xs font-semibold text-slate-300 border border-[#263044] transition-colors shadow-2xs cursor-pointer"
            >
              <X className="h-3.5 w-3.5 text-slate-400" />
              <span>Limpar filtro</span>
            </button>
          </div>
        </div>
      )}

      {/* Banner / Chip de Filtro Ativo: Com Apps */}
      {filters.com_apps && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-200 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            </div>
            <div>
              <div className="font-bold flex items-center gap-2">
                <span className="text-white">Filtrando: Máquinas com inventário de aplicativos ({pagination.total})</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Inventariadas
                </span>
              </div>
              <p className="text-[11px] text-emerald-300/80">
                Estações que reportaram catálogo de pacotes de softwares com sucesso.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setFilters((prev) => {
                const next = { ...prev };
                delete next.com_apps;
                return { ...next, page: 1 };
              });
              setSearchParams((prevParams) => {
                const nextParams = new URLSearchParams(prevParams);
                nextParams.delete('com_apps');
                return nextParams;
              });
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-[#181F2E] hover:bg-[#263044] px-2.5 py-1.5 text-xs font-semibold text-slate-300 border border-[#263044] transition-colors shadow-2xs cursor-pointer"
          >
            <X className="h-3.5 w-3.5 text-slate-400" />
            <span>Limpar filtro</span>
          </button>
        </div>
      )}

      {/* Barra de Contagem e Controle 'Por Página' */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-400">
        <div className="font-medium">
          <span className="font-semibold text-white font-mono tabular-nums">{devices.length}</span> de{' '}
          <span className="font-semibold text-white font-mono tabular-nums">{pagination.total}</span> máquinas
          {pagination.total !== (kpis ? (kpis.total_linux + kpis.total_windows) : pagination.total) && (
            <span className="text-slate-500 ml-1">
              (filtradas de {kpis ? (kpis.total_linux + kpis.total_windows) : pagination.total})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Por página:</span>
          <div className="w-20">
            <SelectDropdown
              value={String(filters.per_page || 50)}
              options={[
                { value: '25', label: '25' },
                { value: '50', label: '50' },
                { value: '100', label: '100' },
              ]}
              onChange={(val) => handlePerPageChange(Number(val))}
              className="w-full font-mono font-semibold"
              triggerClassName="py-1 px-2.5"
            />
          </div>
        </div>
      </div>

      {/* Subcomponente de Tabela e Ações */}
      <DeviceTable
        devices={devices}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSelectDevice={(dev) => setDetailsDeviceId(dev.id)}
        onOpenHistory={(dev) => setHistoryDevice(dev)}
        onOpenPatrimonio={(dev) => setPatrimonioDevice(dev)}
        onOpenApproval={(dev) => setApprovalDevice(dev)}
        onOpenSsh={(dev) => setSshTargetDevice(dev)}
        onClearAlert={handleClearAlert}
        onDeleteDevice={(dev) => setDeviceToDelete(dev)}
        isAdmin={isAdmin}
        isMatrizOperator={isMatrizOperator}
        ordenarPor={filters.ordenar_por}
        ordemDir={filters.ordem_dir}
        onSortChange={handleSortChange}
      />

      {/* Drawer de Detalhes Completos (Hardware, Discos, Softwares, Periféricos) */}
      <DeviceDetailsDrawer
        deviceId={detailsDeviceId}
        onClose={() => setDetailsDeviceId(null)}
        onOpenPatrimonio={(dev) => setPatrimonioDevice(dev)}
        onOpenApproval={(dev) => setApprovalDevice(dev)}
        onOpenSsh={(dev) => setSshTargetDevice(dev)}
        onClearAlert={handleClearAlert}
        onDeleteDevice={(dev) => setDeviceToDelete(dev)}
        isAdmin={isAdmin}
        isMatrizOperator={isMatrizOperator}
      />

      {/* Modal de Patrimônio / Recadastro */}
      {patrimonioDevice && (
        <DevicePatrimonioForm
          device={patrimonioDevice}
          isAdmin={isAdmin}
          isMatrizOperator={isMatrizOperator}
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

      {/* Modal de Exclusão de Dispositivo com Alerta de MAC */}
      {deviceToDelete && (
        <DeleteDeviceModal
          device={deviceToDelete}
          onClose={() => setDeviceToDelete(null)}
          onSuccess={() => {
            setDeviceToDelete(null);
            if (detailsDeviceId === deviceToDelete.id) {
              setDetailsDeviceId(null);
            }
            loadDevices(filters);
          }}
        />
      )}

      {/* Modal de Terminal SSH */}
      {sshTargetDevice && (
        <SshTerminalModal
          device={sshTargetDevice}
          onClose={() => setSshTargetDevice(null)}
        />
      )}
    </div>
  );
};
