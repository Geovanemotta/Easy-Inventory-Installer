import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Search,
  Download,
  Copy,
  Check,
  Terminal,
  Zap,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { DeviceListItem, DevicePagination } from '@/types/device';
import { deviceService } from '@/services/deviceService';
import { useAuth } from '@/context/AuthContext';
import { SshTerminalModal } from '@/pages/devices/components/SshTerminalModal';
import { AgentInstallModal } from '@/pages/devices/components/AgentInstallModal';
import { copyToClipboard as robustCopy } from '@/utils/clipboard';
import { SelectDropdown, SelectOption } from '@/components/common/SelectDropdown';

interface DevicesWithoutAppsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'sem_apps' | 'com_apps';
  siteIdFilter?: string;
}

const PER_PAGE_OPTIONS: SelectOption[] = [
  { value: '25', label: '25' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
];

export const DevicesWithoutAppsDrawer: React.FC<DevicesWithoutAppsDrawerProps> = ({
  isOpen,
  onClose,
  mode,
  siteIdFilter,
}) => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [devices, setDevices] = useState<DeviceListItem[]>([]);
  const [pagination, setPagination] = useState<DevicePagination>({
    page: 1,
    per_page: 25,
    total: 0,
    total_pages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Modais de Ação
  const [sshTarget, setSshTarget] = useState<DeviceListItem | null>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Carrega lista de dispositivos conforme modo e filtros
  useEffect(() => {
    if (!isOpen) {
      setDevices([]);
      setSearchTerm('');
      setPage(1);
      return;
    }

    setLoading(true);
    const siteIdNum = siteIdFilter && siteIdFilter !== 'todos' ? Number(siteIdFilter) : undefined;

    deviceService
      .listDevices({
        sem_apps: mode === 'sem_apps',
        com_apps: mode === 'com_apps',
        site_id: siteIdNum,
        search: searchTerm.trim() || undefined,
        page,
        per_page: perPage,
        ordenar_por: 'loja',
        ordem_dir: 'asc',
      })
      .then((res) => {
        setDevices(res.items || []);
        setPagination(res.pagination);
      })
      .catch((err) => {
        console.error('Erro ao buscar máquinas sem/com apps:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, mode, siteIdFilter, searchTerm, page, perPage]);

  const handleCopy = (text: string, label = 'IP', e?: React.MouseEvent) => {
    robustCopy(text, label, e);
    setCopiedIp(text);
    setTimeout(() => setCopiedIp(null), 1500);
  };

  const handleGoToDevice = (hostname: string) => {
    navigate(`/devices?search=${encodeURIComponent(hostname)}`);
  };

  const handleGoToFullDevicesList = () => {
    const params = new URLSearchParams();
    if (mode === 'sem_apps') params.set('sem_apps', 'true');
    if (mode === 'com_apps') params.set('com_apps', 'true');
    if (siteIdFilter && siteIdFilter !== 'todos') params.set('site_id', siteIdFilter);
    navigate(`/devices?${params.toString()}`);
  };

  const handleExportCsv = () => {
    if (devices.length === 0) return;
    const headers = [
      'Hostname',
      'Plataforma',
      'Sistema Operacional',
      'IP',
      'MAC',
      'Loja / Filial',
      'Código Loja',
      'Status Operacional',
      'Última Coleta',
    ];

    const rows = devices.map((dev) => [
      dev.hostname,
      dev.familia_so || dev.sistema || '',
      dev.versao || dev.so_formatado || '',
      dev.ip || '',
      dev.mac || '',
      dev.loja || '',
      dev.site_id ? String(dev.site_id) : '',
      dev.status || '',
      dev.data_coleta ? new Date(dev.data_coleta).toLocaleString('pt-BR') : 'Nunca coletou',
    ]);

    const csvContent =
      headers.join(';') + '\n' + rows.map((r) => r.map((c) => `"${c}"`).join(';')).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `maquinas_${mode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  const isSemApps = mode === 'sem_apps';
  const totalCount = pagination.total;

  return (
    <>
      <div
        className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-xs flex justify-end transition-opacity cursor-pointer"
        onClick={onClose}
      >
        <div
          className="w-full max-w-3xl bg-surface h-full shadow-2xl flex flex-col border-l border-border-subtle animate-in slide-in-from-right duration-200 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabeçalho do Drawer */}
          <div className="px-6 py-4 border-b border-border-subtle bg-app flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl shadow-sm border ${
                  isSemApps
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                }`}
              >
                {isSemApps ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-fg">
                    {isSemApps
                      ? 'Máquinas sem Inventário de Aplicativos'
                      : 'Máquinas com Inventário de Aplicativos'}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      isSemApps
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {isSemApps ? 'Pendente' : 'Ativas'}
                  </span>
                </div>
                <p className="text-xs text-fg-secondary mt-0.5">
                  {isSemApps
                    ? 'Estações de trabalho ativas que ainda não possuem nenhum software registrado.'
                    : 'Estações de trabalho com catálogo de softwares e pacotes sincronizado.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={devices.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:text-fg bg-elevated hover:bg-border-subtle border border-border-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                title="Exportar máquinas para planilha CSV"
              >
                <Download className="h-3.5 w-3.5 text-fg-secondary" />
                <span>Exportar</span>
              </button>

              <button
                type="button"
                onClick={handleGoToFullDevicesList}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-400 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 rounded-lg shadow-sm transition-colors cursor-pointer"
                title="Abrir e filtrar na tela completa de Estações"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Ver nas Estações</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-fg-secondary hover:text-fg hover:bg-elevated rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Barra de Busca e Ação de Instalação */}
          <div className="p-4 border-b border-border-subtle bg-surface flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-fg-muted" />
              <input
                type="text"
                placeholder="Buscar por hostname, IP, filial ou sistema..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-border-medium bg-elevated text-fg placeholder:text-fg-muted focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            {isSemApps && isAdmin && (
              <button
                type="button"
                onClick={() => setIsInstallModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-md shadow-orange-500/20 transition-colors shrink-0 cursor-pointer"
                title="Exibir instruções e comandos de instalação do agente"
              >
                <Zap className="h-4 w-4" />
                <span>Instalar Agente</span>
              </button>
            )}
          </div>

          {/* Cabeçalho Discreto das Colunas */}
          <div className="px-4 pt-3 pb-1 bg-app border-b border-border-subtle/50 shrink-0">
            <div className="grid grid-cols-[1.4fr_1fr_1fr_90px] items-center gap-4 px-4 py-1.5 border border-transparent text-[10px] font-bold text-fg-secondary uppercase tracking-wider select-none">
              <span>Máquina</span>
              <span>Endereço IP</span>
              <span>Sistema Operacional</span>
              <span className="text-right">Ação</span>
            </div>
          </div>

          {/* Lista de Máquinas */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-app">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-fg-secondary gap-2">
                <div className="animate-spin h-7 w-7 border-2 border-orange-500 border-t-transparent rounded-full" />
                <span className="text-xs font-medium">Carregando lista de máquinas...</span>
              </div>
            ) : devices.length === 0 ? (
              <div className="py-12 text-center text-fg-secondary text-xs">
                {searchTerm
                  ? 'Nenhuma máquina corresponde aos critérios de busca.'
                  : isSemApps
                  ? 'Excelente! Nenhuma estação está sem inventário de aplicativos.'
                  : 'Nenhuma máquina com inventário encontrada.'}
              </div>
            ) : (
              devices.map((dev) => {
                const isLinux = (dev.familia_so || dev.sistema || '').toLowerCase().includes('linux');
                const canSsh = isLinux && Boolean(dev.ip);
                const soName = dev.so_formatado || dev.sistema || dev.familia_so || (isLinux ? 'Linux' : 'Windows');

                return (
                  <div
                    key={dev.id}
                    className="grid grid-cols-[1.4fr_1fr_1fr_90px] items-center gap-4 px-4 py-2.5 bg-surface rounded-lg border border-border-subtle hover:border-orange-500/40 hover:bg-elevated transition-all text-xs group"
                  >
                    {/* Coluna 1: Nome da Máquina (hostname) */}
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => handleGoToDevice(dev.hostname)}
                        title="Clique para abrir e filtrar esta máquina na tela de Estações"
                        className="font-semibold text-fg hover:text-orange-500 hover:underline cursor-pointer truncate block w-full text-left transition-colors"
                      >
                        {dev.hostname}
                      </button>
                    </div>

                    {/* Coluna 2: IP (ip) em fonte mono com botão copiar no hover */}
                    <div className="min-w-0 flex items-center">
                      {dev.ip ? (
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-fg">
                          <span>{dev.ip}</span>
                          <button
                            type="button"
                            onClick={(e) => handleCopy(dev.ip!, 'IP', e)}
                            title="Copiar IP"
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-fg-secondary hover:text-fg cursor-pointer rounded"
                          >
                            {copiedIp === dev.ip ? (
                              <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </span>
                      ) : (
                        <span className="text-fg-muted font-mono text-[11px]">Sem IP</span>
                      )}
                    </div>

                    {/* Coluna 3: Sistema Operacional (so) */}
                    <div className="min-w-0">
                      <span
                        className="text-fg-secondary text-xs truncate block font-medium"
                        title={soName}
                      >
                        {soName}
                      </span>
                    </div>

                    {/* Coluna 4: Botão >_ SSH (Linux) ou espaço reservado alinhado */}
                    <div className="justify-self-end flex items-center justify-end">
                      {canSsh ? (
                        <button
                          type="button"
                          onClick={() => setSshTarget(dev)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500/15 text-orange-500 dark:text-orange-400 border border-orange-500/30 hover:bg-orange-500/25 px-2.5 py-1 text-[11px] font-semibold transition-colors shadow-xs cursor-pointer"
                          title={`Acesso Rápido via Terminal SSH em ${dev.hostname}`}
                        >
                          <Terminal className="h-3 w-3 text-orange-500 dark:text-orange-400" />
                          <span>&gt;_ SSH</span>
                        </button>
                      ) : (
                        <span className="inline-block w-8 text-center text-fg-muted text-xs select-none">&mdash;</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Rodapé com Paginação */}
          <div className="px-6 py-3 border-t border-border-subtle bg-app flex flex-col sm:flex-row items-center justify-between text-xs text-fg-secondary gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <span>
                Exibindo{' '}
                <strong className="text-fg font-semibold">
                  {totalCount === 0 ? 0 : (pagination.page - 1) * pagination.per_page + 1}
                </strong>{' '}
                a{' '}
                <strong className="text-fg font-semibold">
                  {Math.min(pagination.page * pagination.per_page, totalCount)}
                </strong>{' '}
                de <strong className="text-fg font-semibold">{totalCount}</strong> máquinas
              </span>

              <div className="flex items-center gap-1.5">
                <span className="text-fg-secondary text-[11px]">Por pág:</span>
                <div className="w-20">
                  <SelectDropdown
                    value={String(perPage)}
                    onChange={(val) => {
                      setPerPage(Number(val));
                      setPage(1);
                    }}
                    options={PER_PAGE_OPTIONS}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="p-1 rounded-lg border border-border-medium bg-elevated text-gray-700 dark:text-slate-300 hover:text-fg hover:bg-border-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-2 text-xs font-bold text-fg">
                {pagination.page} / {pagination.total_pages || 1}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pagination.total_pages || 1, p + 1))}
                disabled={pagination.page >= (pagination.total_pages || 1)}
                className="p-1 rounded-lg border border-border-medium bg-elevated text-gray-700 dark:text-slate-300 hover:text-fg hover:bg-border-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Próxima página"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="ml-2 px-3 py-1 rounded-lg border border-border-medium bg-elevated text-gray-700 dark:text-slate-300 hover:text-fg hover:bg-border-subtle font-semibold transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Terminal SSH */}
      {sshTarget && (
        <SshTerminalModal
          device={sshTarget}
          onClose={() => setSshTarget(null)}
        />
      )}

      {/* Modal de Instalação do Agente */}
      {isInstallModalOpen && (
        <AgentInstallModal
          isOpen={isInstallModalOpen}
          onClose={() => setIsInstallModalOpen(false)}
        />
      )}
    </>
  );
};
