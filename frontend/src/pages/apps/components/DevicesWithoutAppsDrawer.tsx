import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Search,
  Download,
  Copy,
  Check,
  Building2,
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
          className="w-full max-w-3xl bg-[#121721] h-full shadow-2xl flex flex-col border-l border-[#1E2636] animate-in slide-in-from-right duration-200 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabeçalho do Drawer */}
          <div className="px-6 py-4 border-b border-[#1E2636] bg-[#0E131B] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl shadow-sm border ${
                  isSemApps
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
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
                  <h3 className="text-base font-bold text-white">
                    {isSemApps
                      ? 'Máquinas sem Inventário de Aplicativos'
                      : 'Máquinas com Inventário de Aplicativos'}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      isSemApps
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {isSemApps ? 'Pendente' : 'Ativas'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-[#181F2E] hover:bg-[#222B3D] border border-[#263044] rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                title="Exportar máquinas para planilha CSV"
              >
                <Download className="h-3.5 w-3.5 text-slate-400" />
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
                className="p-2 text-slate-400 hover:text-white hover:bg-[#181F2E] rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Barra de Busca e Ação de Instalação */}
          <div className="p-4 border-b border-[#1E2636] bg-[#121721] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por hostname, IP, filial ou sistema..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-[#263044] bg-[#181F2E] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
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

          {/* Lista de Máquinas */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-[#0B0E14]">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <div className="animate-spin h-7 w-7 border-2 border-orange-500 border-t-transparent rounded-full" />
                <span className="text-xs font-medium">Carregando lista de máquinas...</span>
              </div>
            ) : devices.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
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
                const filialBadge = dev.loja
                  ? dev.loja.replace(/^\[([^\]]+)\]\s*\1$/i, '$1').replace(/^\[([^\]]+)\]\s*/, '').trim().toUpperCase()
                  : null;
                const soName = dev.so_formatado || dev.sistema || dev.familia_so || (isLinux ? 'Linux' : 'Windows');

                return (
                  <div
                    key={dev.id}
                    className="px-3.5 py-2.5 bg-[#121721] rounded-lg border border-[#1E2636] hover:border-orange-500/40 hover:bg-[#181F2E]/80 transition-all flex items-center justify-between gap-3 text-xs group"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0 flex-wrap sm:flex-nowrap">
                      {/* Hostname com link direto */}
                      <button
                        type="button"
                        onClick={() => handleGoToDevice(dev.hostname)}
                        title="Clique para abrir e filtrar esta máquina na tela de Estações"
                        className="font-bold text-white hover:text-orange-400 hover:underline cursor-pointer truncate max-w-[140px] shrink-0 text-left transition-colors"
                      >
                        {dev.hostname}
                      </button>

                      {/* Filial Badge Curto */}
                      {filialBadge && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#181F2E] text-slate-300 border border-[#263044] shrink-0"
                          title={dev.loja || filialBadge}
                        >
                          <Building2 className="h-2.5 w-2.5 text-slate-400" />
                          {filialBadge}
                        </span>
                      )}

                      {/* IP em destaque claro com JetBrains Mono e botão copiar no hover */}
                      {dev.ip ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold bg-[#181F2E] text-slate-300 border border-[#263044] shrink-0">
                          <span>{dev.ip}</span>
                          <button
                            type="button"
                            onClick={(e) => handleCopy(dev.ip!, 'IP', e)}
                            title="Copiar IP"
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-white cursor-pointer"
                          >
                            {copiedIp === dev.ip ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px] shrink-0">Sem IP</span>
                      )}

                      {/* SO Normalizado */}
                      <span
                        className="text-slate-400 text-[11px] truncate max-w-[160px] shrink-0 font-medium"
                        title={soName}
                      >
                        {soName}
                      </span>

                      {/* Status / Alerta de Sem Aplicativos */}
                      {isSemApps ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                          <AlertTriangle className="h-3 w-3" />
                          0 softwares
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                          <CheckCircle2 className="h-3 w-3" />
                          {dev.status || 'Ativa'}
                        </span>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {canSsh && (
                        <button
                          type="button"
                          onClick={() => setSshTarget(dev)}
                          className="inline-flex items-center gap-1 rounded-md bg-orange-500/15 text-orange-400 border border-orange-500/30 hover:bg-orange-500/25 px-2 py-1 text-[11px] font-semibold transition-colors shadow-sm cursor-pointer"
                          title={`Acesso Rápido via Terminal SSH em ${dev.hostname}`}
                        >
                          <Terminal className="h-3 w-3 text-orange-400" />
                          <span>&gt;_ SSH</span>
                        </button>
                      )}

                      {isSemApps && isAdmin && (
                        <button
                          type="button"
                          onClick={() => setIsInstallModalOpen(true)}
                          className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer"
                          title="Instalar agente nesta máquina"
                        >
                          <Zap className="h-3 w-3 text-amber-400" />
                          <span>Instalar</span>
                        </button>
                      )}

                      {!canSsh && !(isSemApps && isAdmin) && (
                        <span className="w-14 text-center text-slate-600 text-xs select-none">&mdash;</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Rodapé com Paginação */}
          <div className="px-6 py-3 border-t border-[#1E2636] bg-[#0E131B] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <span>
                Exibindo{' '}
                <strong className="text-white font-semibold">
                  {totalCount === 0 ? 0 : (pagination.page - 1) * pagination.per_page + 1}
                </strong>{' '}
                a{' '}
                <strong className="text-white font-semibold">
                  {Math.min(pagination.page * pagination.per_page, totalCount)}
                </strong>{' '}
                de <strong className="text-white font-semibold">{totalCount}</strong> máquinas
              </span>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[11px]">Por pág:</span>
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
                className="p-1 rounded-lg border border-[#263044] bg-[#181F2E] text-slate-300 hover:text-white hover:bg-[#222B3D] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-2 text-xs font-bold text-white">
                {pagination.page} / {pagination.total_pages || 1}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pagination.total_pages || 1, p + 1))}
                disabled={pagination.page >= (pagination.total_pages || 1)}
                className="p-1 rounded-lg border border-[#263044] bg-[#181F2E] text-slate-300 hover:text-white hover:bg-[#222B3D] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Próxima página"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="ml-2 px-3 py-1 rounded-lg border border-[#263044] bg-[#181F2E] text-slate-300 hover:text-white hover:bg-[#222B3D] font-semibold transition-colors cursor-pointer"
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
