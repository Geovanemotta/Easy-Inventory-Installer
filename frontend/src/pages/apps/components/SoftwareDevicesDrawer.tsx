import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Search,
  Monitor,
  Download,
  Copy,
  Check,
  Package,
  Terminal,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  SoftwareCatalogItem,
  SoftwareDevicesResponse,
} from '@/types/software';
import { softwareService } from '@/services/softwareService';
import { SshTerminalModal } from '@/pages/devices/components/SshTerminalModal';
import { DeviceListItem } from '@/types/device';
import { copyToClipboard as robustCopy } from '@/utils/clipboard';
import { SelectDropdown, SelectOption } from '@/components/common/SelectDropdown';

interface SoftwareDevicesDrawerProps {
  software: SoftwareCatalogItem | null;
  isOpen: boolean;
  onClose: () => void;
  siteIdFilter?: string;
}

const PER_PAGE_OPTIONS: SelectOption[] = [
  { value: '25', label: '25' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
];

export const SoftwareDevicesDrawer: React.FC<SoftwareDevicesDrawerProps> = ({
  software,
  isOpen,
  onClose,
  siteIdFilter,
}) => {
  const navigate = useNavigate();
  const [data, setData] = useState<SoftwareDevicesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [deviceSearch, setDeviceSearch] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<string>('todas');
  const [selectedConformidade, setSelectedConformidade] = useState<'todos' | 'latest' | 'outdated'>('todos');
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Paginação
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  // Modal SSH
  const [sshTarget, setSshTarget] = useState<DeviceListItem | null>(null);

  useEffect(() => {
    if (!isOpen || !software) {
      setData(null);
      setDeviceSearch('');
      setSelectedVersion('todas');
      setSelectedConformidade('todos');
      setPage(1);
      return;
    }

    setLoading(true);
    const siteIdNum =
      siteIdFilter && siteIdFilter !== 'todos' ? Number(siteIdFilter) : undefined;

    softwareService
      .getSoftwareDevices(software.id, { site_id: siteIdNum })
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error('Erro ao buscar máquinas do software:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, software, siteIdFilter]);

  const handleCopy = (text: string, label = 'IP', e?: React.MouseEvent) => {
    robustCopy(text, label, e);
    setCopiedIp(text);
    setTimeout(() => setCopiedIp(null), 1500);
  };

  const handleGoToDevice = (hostname: string) => {
    navigate(`/devices?search=${encodeURIComponent(hostname)}`);
  };

  const handleOpenSsh = (dev: {
    device_id: number;
    hostname: string;
    ip?: string | null;
    mac?: string | null;
    sistema?: string | null;
    versao_so?: string | null;
    plataforma: string;
  }) => {
    const devItem: DeviceListItem = {
      id: dev.device_id,
      company_id: 1,
      hostname: dev.hostname,
      ip: dev.ip || '',
      mac: dev.mac || '',
      sistema: dev.sistema || '',
      versao: dev.versao_so || '',
      so_formatado: dev.sistema || '',
      familia_so: dev.plataforma,
      active: true,
    };
    setSshTarget(devItem);
  };

  const isAppOrAgent =
    (software?.tipo || '').toLowerCase() === 'aplicativo' ||
    (software?.tipo || '').toLowerCase() === 'agente';

  const filteredDevices = useMemo(() => {
    if (!data?.devices) return [];
    return data.devices.filter((dev) => {
      // Filtro por versão
      if (selectedVersion !== 'todas' && dev.versao_software !== selectedVersion) {
        return false;
      }
      // Filtro por conformidade (apenas para aplicativo e agente)
      if (isAppOrAgent) {
        if (selectedConformidade === 'latest' && !dev.is_latest) {
          return false;
        }
        if (selectedConformidade === 'outdated' && dev.status_conformidade !== 'outdated') {
          return false;
        }
      }
      // Filtro por busca
      if (!deviceSearch.trim()) return true;
      const s = deviceSearch.toLowerCase();
      return (
        dev.hostname.toLowerCase().includes(s) ||
        (dev.ip && dev.ip.toLowerCase().includes(s)) ||
        (dev.site_nome && dev.site_nome.toLowerCase().includes(s)) ||
        (dev.site_codigo && dev.site_codigo.toLowerCase().includes(s)) ||
        (dev.sistema && dev.sistema.toLowerCase().includes(s))
      );
    });
  }, [data?.devices, selectedVersion, selectedConformidade, deviceSearch, isAppOrAgent]);

  // Paginação
  const totalFiltered = filteredDevices.length;
  const totalPages = Math.ceil(totalFiltered / perPage);
  const safePage = Math.min(Math.max(1, page), totalPages || 1);
  const startIndex = (safePage - 1) * perPage;
  const paginatedDevices = filteredDevices.slice(startIndex, startIndex + perPage);

  const handleExportCsv = () => {
    if (!software || filteredDevices.length === 0) return;
    const headers = [
      'Hostname',
      'Plataforma',
      'Sistema Operacional',
      'IP',
      'MAC',
      'Loja / Filial',
      'Código Loja',
      'Versão do Software',
      'Conformidade',
      'Pacotes',
    ];
    const rows = filteredDevices.map((d) => [
      d.hostname,
      d.plataforma,
      d.sistema || '',
      d.ip || '',
      d.mac || '',
      d.site_nome || '',
      d.site_codigo || '',
      d.versao_software,
      d.is_latest ? 'Atualizada (Mais recente)' : 'Desatualizada',
      d.pacotes.map((p) => `${p.pacote} (${p.versao || 's/v'})`).join('; '),
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')),
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `maquinas_${software.identifier}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen || !software) return null;

  const maisRecenteStr = data?.mais_recente || software.versao_mais_recente || software.ultima_versao;
  const versoesList = data?.software?.versoes || software.versoes || [];

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
              <div className="p-2.5 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-sm">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-fg">{software.nome}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-elevated text-gray-700 dark:text-slate-300 border border-border-medium">
                    {software.tipo}
                  </span>
                  {isAppOrAgent && maisRecenteStr && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <CheckCircle2 className="h-3 w-3" />
                      Mais recente: v{maisRecenteStr}
                    </span>
                  )}
                  {!isAppOrAgent && maisRecenteStr && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-700 dark:text-slate-300 bg-elevated px-2 py-0.5 rounded-full border border-border-medium">
                      v{maisRecenteStr}
                    </span>
                  )}
                </div>
                <p className="text-xs text-fg-secondary font-mono mt-0.5">{software.identifier}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={filteredDevices.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:text-fg bg-elevated hover:bg-border-subtle border border-border-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-fg-secondary" />
                <span>Exportar</span>
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

          {/* Resumo de Versões e Filtros */}
          <div className="p-4 border-b border-border-subtle bg-surface space-y-3 shrink-0">
            {/* Chips de Versões com Destaque para a Mais Recente */}
            {versoesList.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-fg-secondary">
                  <span>Distribuição de Versões ({versoesList.length})</span>
                  {isAppOrAgent && (
                    <div className="flex items-center gap-1.5 normal-case font-normal">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedConformidade(selectedConformidade === 'latest' ? 'todos' : 'latest');
                          setSelectedVersion('todas');
                          setPage(1);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                          selectedConformidade === 'latest'
                            ? 'bg-emerald-500 text-white font-bold'
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                        }`}
                      >
                        Apenas atualizadas ({data?.total_atualizadas ?? 0})
                      </button>
                      {(data?.total_desatualizadas ?? 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedConformidade(selectedConformidade === 'outdated' ? 'todos' : 'outdated');
                            setSelectedVersion('todas');
                            setPage(1);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                            selectedConformidade === 'outdated'
                              ? 'bg-amber-500 text-white font-bold'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
                          }`}
                        >
                          Apenas desatualizadas ({data?.total_desatualizadas ?? 0})
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVersion('todas');
                      setSelectedConformidade('todos');
                      setPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedVersion === 'todas' && selectedConformidade === 'todos'
                        ? 'bg-orange-500 text-white font-bold shadow-sm'
                        : 'bg-elevated text-gray-700 dark:text-slate-300 hover:text-fg hover:bg-border-subtle border border-border-medium'
                    }`}
                  >
                    Todas ({data?.total ?? software.total_instalacoes})
                  </button>
                  {versoesList.map((v) => (
                    <button
                      key={v.versao}
                      type="button"
                      onClick={() => {
                        setSelectedVersion(v.versao);
                        setSelectedConformidade('todos');
                        setPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                        selectedVersion === v.versao
                          ? 'bg-orange-500 text-white font-bold shadow-sm'
                          : isAppOrAgent && v.is_latest
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                          : 'bg-elevated text-gray-700 dark:text-slate-300 hover:text-fg hover:bg-border-subtle border border-border-medium'
                      }`}
                    >
                      <span>{v.versao}</span>
                      <span className="opacity-75 text-[10px]">({v.count})</span>
                      {v.is_latest && (
                        <span className="px-1 rounded bg-emerald-500 text-white text-[9px] uppercase font-sans font-bold">
                          Mais recente
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Campo de Busca Rápida na Lista */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
              <input
                type="text"
                placeholder="Buscar nesta lista por hostname, IP, loja..."
                value={deviceSearch}
                onChange={(e) => {
                  setDeviceSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-border-medium bg-elevated text-fg placeholder:text-fg-muted focus:outline-none focus:border-orange-500 transition-colors"
              />
              {deviceSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setDeviceSearch('');
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-fg-secondary hover:text-fg cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
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

          {/* Lista de Máquinas Paginadas */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-app">
            {loading ? (
              <div className="text-center py-16 space-y-2">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent" />
                <p className="text-xs font-medium text-fg-secondary">
                  Carregando máquinas vinculadas...
                </p>
              </div>
            ) : filteredDevices.length === 0 ? (
              <div className="text-center py-16 bg-surface rounded-xl border border-border-subtle p-8 space-y-2">
                <Monitor className="h-8 w-8 text-fg-muted mx-auto" />
                <h4 className="text-xs font-bold text-fg">Nenhuma máquina encontrada</h4>
                <p className="text-[11px] text-fg-secondary">
                  {deviceSearch
                    ? 'Nenhum resultado corresponde ao termo pesquisado.'
                    : 'Nenhuma máquina possui este software com os filtros atuais.'}
                </p>
              </div>
            ) : (
              paginatedDevices.map((dev) => {
                const isLinux = dev.plataforma === 'Linux';
                const canSsh = isLinux && Boolean(dev.ip);
                const soName = dev.sistema || dev.plataforma;

                return (
                  <div
                    key={dev.device_id}
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
                          onClick={() => handleOpenSsh(dev)}
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

          {/* Rodapé com Paginação Padrão */}
          <div className="px-6 py-3 border-t border-border-subtle bg-app flex flex-col sm:flex-row items-center justify-between text-xs text-fg-secondary gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <span>
                Exibindo <strong className="text-fg font-semibold">{totalFiltered === 0 ? 0 : startIndex + 1}</strong> a{' '}
                <strong className="text-fg font-semibold">{Math.min(startIndex + perPage, totalFiltered)}</strong> de{' '}
                <strong className="text-fg font-semibold">{totalFiltered}</strong> máquinas
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

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="flex items-center gap-1 rounded-lg border border-border-medium bg-elevated px-2 py-1 text-gray-700 dark:text-slate-300 hover:text-fg hover:bg-border-subtle disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-default"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Anterior
              </button>
              <span>
                Pág <strong className="text-fg font-semibold">{safePage}</strong> de {totalPages || 1}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="flex items-center gap-1 rounded-lg border border-border-medium bg-elevated px-2 py-1 text-gray-700 dark:text-slate-300 hover:text-fg hover:bg-border-subtle disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-default"
              >
                Próxima <ChevronRight className="h-3.5 w-3.5" />
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

      {/* Modal SSH Standalone */}
      {sshTarget && (
        <SshTerminalModal
          device={sshTarget}
          onClose={() => setSshTarget(null)}
        />
      )}
    </>
  );
};
