import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Search,
  Monitor,
  Download,
  Copy,
  Check,
  Building2,
  Package,
  Terminal,
  CheckCircle2,
  AlertTriangle,
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
          className="w-full max-w-3xl bg-[#121721] h-full shadow-2xl flex flex-col border-l border-[#1E2636] animate-in slide-in-from-right duration-200 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabeçalho do Drawer */}
          <div className="px-6 py-4 border-b border-[#1E2636] bg-[#0E131B] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-sm">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{software.nome}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#181F2E] text-slate-300 border border-[#263044]">
                    {software.tipo}
                  </span>
                  {isAppOrAgent && maisRecenteStr && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <CheckCircle2 className="h-3 w-3" />
                      Mais recente: v{maisRecenteStr}
                    </span>
                  )}
                  {!isAppOrAgent && maisRecenteStr && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-300 bg-[#181F2E] px-2 py-0.5 rounded-full border border-[#263044]">
                      v{maisRecenteStr}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{software.identifier}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={filteredDevices.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-[#181F2E] hover:bg-[#222B3D] border border-[#263044] rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-slate-400" />
                <span>Exportar</span>
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

          {/* Resumo de Versões e Filtros */}
          <div className="p-4 border-b border-[#1E2636] bg-[#121721] space-y-3 shrink-0">
            {/* Chips de Versões com Destaque para a Mais Recente */}
            {versoesList.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
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
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
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
                        : 'bg-[#181F2E] text-slate-300 hover:text-white hover:bg-[#222B3D] border border-[#263044]'
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
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                          : 'bg-[#181F2E] text-slate-300 hover:text-white hover:bg-[#222B3D] border border-[#263044]'
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar nesta lista por hostname, IP, loja..."
                value={deviceSearch}
                onChange={(e) => {
                  setDeviceSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-[#263044] bg-[#181F2E] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
              {deviceSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setDeviceSearch('');
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Lista de Máquinas Paginadas */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-[#0B0E14]">
            {loading ? (
              <div className="text-center py-16 space-y-2">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent" />
                <p className="text-xs font-medium text-slate-400">
                  Carregando máquinas vinculadas...
                </p>
              </div>
            ) : filteredDevices.length === 0 ? (
              <div className="text-center py-16 bg-[#121721] rounded-xl border border-[#1E2636] p-8 space-y-2">
                <Monitor className="h-8 w-8 text-slate-600 mx-auto" />
                <h4 className="text-xs font-bold text-white">Nenhuma máquina encontrada</h4>
                <p className="text-[11px] text-slate-400">
                  {deviceSearch
                    ? 'Nenhum resultado corresponde ao termo pesquisado.'
                    : 'Nenhuma máquina possui este software com os filtros atuais.'}
                </p>
              </div>
            ) : (
              paginatedDevices.map((dev) => {
                const isLinux = dev.plataforma === 'Linux';
                const canSsh = isLinux && Boolean(dev.ip);
                const filialBadge = dev.site_codigo?.trim()
                  ? dev.site_codigo.trim().toUpperCase()
                  : dev.site_nome
                  ? dev.site_nome.replace(/^\[([^\]]+)\]\s*\1$/i, '$1').replace(/^\[([^\]]+)\]\s*/, '').trim().toUpperCase()
                  : null;
                const soName = dev.sistema || dev.plataforma;

                return (
                  <div
                    key={dev.device_id}
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
                          title={dev.site_nome || filialBadge}
                        >
                          <Building2 className="h-2.5 w-2.5 text-slate-400" />
                          {filialBadge}
                        </span>
                      )}

                      {/* IP em destaque com JetBrains Mono e botão copiar no hover */}
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

                      {/* Versão Atual instalada */}
                      {dev.versao_software ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-orange-500/15 text-orange-400 border border-orange-500/30 font-bold shrink-0">
                          v{dev.versao_software}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic shrink-0">s/ versão</span>
                      )}

                      {/* Badge de Conformidade Individual */}
                      {isAppOrAgent && (
                        dev.is_latest ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                            <CheckCircle2 className="h-3 w-3" />
                            Atualizada
                          </span>
                        ) : dev.status_conformidade === 'outdated' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                            <AlertTriangle className="h-3 w-3" />
                            Desatualizada
                          </span>
                        ) : null
                      )}
                    </div>

                    {/* Ações: Apenas SSH para Linux */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {canSsh ? (
                        <button
                          type="button"
                          onClick={() => handleOpenSsh(dev)}
                          className="inline-flex items-center gap-1 rounded-md bg-orange-500/15 text-orange-400 border border-orange-500/30 hover:bg-orange-500/25 px-2 py-1 text-[11px] font-semibold transition-colors shadow-sm cursor-pointer"
                          title={`Acesso Rápido via Terminal SSH em ${dev.hostname}`}
                        >
                          <Terminal className="h-3 w-3 text-orange-400" />
                          <span>&gt;_ SSH</span>
                        </button>
                      ) : (
                        <span className="w-14 text-center text-slate-600 text-xs select-none">&mdash;</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Rodapé com Paginação Padrão */}
          <div className="px-6 py-3 border-t border-[#1E2636] bg-[#0E131B] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <span>
                Exibindo <strong className="text-white font-semibold">{totalFiltered === 0 ? 0 : startIndex + 1}</strong> a{' '}
                <strong className="text-white font-semibold">{Math.min(startIndex + perPage, totalFiltered)}</strong> de{' '}
                <strong className="text-white font-semibold">{totalFiltered}</strong> máquinas
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

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="flex items-center gap-1 rounded-lg border border-[#263044] bg-[#181F2E] px-2 py-1 text-slate-300 hover:text-white hover:bg-[#222B3D] disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-default"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Anterior
              </button>
              <span>
                Pág <strong className="text-white font-semibold">{safePage}</strong> de {totalPages || 1}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="flex items-center gap-1 rounded-lg border border-[#263044] bg-[#181F2E] px-2 py-1 text-slate-300 hover:text-white hover:bg-[#222B3D] disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-default"
              >
                Próxima <ChevronRight className="h-3.5 w-3.5" />
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
