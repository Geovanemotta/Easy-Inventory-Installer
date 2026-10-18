import React, { useEffect, useMemo, useState } from 'react';
import {
  DeviceDetailResponse,
  DeviceHistoryItem,
  DeviceListItem,
  DeviceSoftwareItem,
  PerifericoItem,
  UnidadeDisco,
  AnaliseUsuario,
  ItemVarLog,
} from '@/types/device';
import { deviceService } from '@/services/deviceService';
import {
  X,
  Cpu,
  HardDrive,
  Monitor,
  Network,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Terminal,
  Shield,
  Tag,
  Trash2,
  Package,
  Folder,
  Usb,
  Smartphone,
  Printer,
  Keyboard,
  Mouse,
  Search,
  ChevronDown,
  ChevronUp,
  Database,
  History,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { copyToClipboard as robustCopy } from '@/utils/clipboard';

interface DeviceDetailsDrawerProps {
  deviceId: number | null;
  onClose: () => void;
  onOpenPatrimonio: (device: DeviceListItem) => void;
  onOpenApproval: (device: DeviceListItem) => void;
  onOpenSsh: (device: DeviceListItem) => void;
  onClearAlert: (device: DeviceListItem) => void;
  onDeleteDevice: (device: DeviceListItem) => void;
  isAdmin: boolean;
  isMatrizOperator?: boolean;
}

export const DeviceDetailsDrawer: React.FC<DeviceDetailsDrawerProps> = ({
  deviceId,
  onClose,
  onOpenPatrimonio,
  onOpenApproval,
  onOpenSsh,
  onClearAlert,
  onDeleteDevice,
  isAdmin,
  isMatrizOperator: _isMatrizOperator,
}) => {
  const [device, setDevice] = useState<DeviceDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'geral' | 'discos' | 'perifericos' | 'softwares' | 'historico'>('geral');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Controle de acordeões expansíveis
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    rede: true,
    hardware: true,
    sistema: true,
    patrimonio: true,
    capacidade: true,
    unidades: true,
    usuarios: true,
    logs: true,
  });

  // Expansão individual de usuários na aba de discos
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});

  // Softwares
  const [softwares, setSoftwares] = useState<DeviceSoftwareItem[]>([]);
  const [loadingSoftware, setLoadingSoftware] = useState<boolean>(false);
  const [softwareSearch, setSoftwareSearch] = useState<string>('');
  const [softwareCategoryFilter, setSoftwareCategoryFilter] = useState<string>('todos');

  // Histórico
  const [history, setHistory] = useState<DeviceHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleUser = (userKey: string) => {
    setExpandedUsers((prev) => ({ ...prev, [userKey]: !prev[userKey] }));
  };

  useEffect(() => {
    // Limpa estado da máquina anterior imediatamente
    setDevice(null);
    setError(null);
    setSoftwares([]);
    setHistory([]);
    setExpandedUsers({});

    if (!deviceId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setActiveTab('geral');

    deviceService
      .getDevice(deviceId)
      .then((data) => {
        if (isMounted) {
          setDevice(data);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        console.error('Falha ao obter detalhes do dispositivo:', err);
        if (isMounted) {
          const msg =
            err?.response?.data?.detail ||
            err?.message ||
            'Não foi possível carregar os detalhes do dispositivo.';
          setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
          setLoading(false);
        }
      });

    // Carrega histórico imediatamente para exibir o contador na aba
    setLoadingHistory(true);
    setHistoryError(null);
    deviceService
      .getDeviceHistory(deviceId)
      .then((data) => {
        if (isMounted) {
          setHistory(data || []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Erro ao carregar histórico:', err);
          setHistoryError('Não foi possível carregar o histórico de alterações.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingHistory(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [deviceId]);

  // Carrega softwares sob demanda ao selecionar a aba
  useEffect(() => {
    if (activeTab === 'softwares' && deviceId && softwares.length === 0) {
      setLoadingSoftware(true);
      deviceService
        .getDeviceSoftware(deviceId)
        .then((res) => {
          setSoftwares(res.software || []);
        })
        .catch((err) => console.error('Erro ao carregar softwares:', err))
        .finally(() => setLoadingSoftware(false));
    }
  }, [activeTab, deviceId, softwares.length]);

  const copyToClipboard = (text: string, key: string, label?: string, e?: React.MouseEvent) => {
    robustCopy(text, label, e);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const isLinux =
    Boolean(device?.sistema && !device.sistema.toLowerCase().includes('windows'));

  // Parse de unidades de disco (normalizadas pelo back-end)
  const unidadesDisco: UnidadeDisco[] = (() => {
    if (!device?.analise_disco) return [];
    if (Array.isArray(device.analise_disco)) return device.analise_disco as UnidadeDisco[];
    if (Array.isArray(device.analise_disco.unidades)) return device.analise_disco.unidades;
    if (Array.isArray(device.analise_disco.particoes)) return device.analise_disco.particoes;
    if (Array.isArray(device.analise_disco.drives)) return device.analise_disco.drives;
    return [];
  })();

  // Parse de análise de usuários
  const usuariosPastas: AnaliseUsuario[] = (() => {
    if (!device?.analise_disco || Array.isArray(device.analise_disco)) return [];
    if (Array.isArray(device.analise_disco.usuarios)) return device.analise_disco.usuarios;
    if (Array.isArray(device.analise_disco.top_usuarios)) return device.analise_disco.top_usuarios;
    return [];
  })();

  // Parse de /var/log
  const varLogItens: ItemVarLog[] = (() => {
    if (!device?.analise_disco || Array.isArray(device.analise_disco)) return [];
    const an = device.analise_disco;
    if (Array.isArray(an.var_log)) return an.var_log;
    if (an.var_log && Array.isArray(an.var_log.top_itens)) return an.var_log.top_itens;
    return [];
  })();

  const resumoUsuarios = device?.analise_disco?.resumo_usuarios;
  const resumoVarLog = device?.analise_disco?.var_log;

  // Periféricos normalizados e agrupados
  const perifericos: PerifericoItem[] = Array.isArray(device?.perifericos)
    ? device.perifericos
    : [];

  const perifericosAgrupados = device?.perifericos_agrupados;

  const softwareCounts = useMemo(() => {
    const counts = { todos: softwares.length, aplicativo: 0, agente: 0, runtime: 0, ferramenta: 0 };
    for (const s of softwares) {
      const t = (s.tipo || '').toLowerCase();
      if (t === 'aplicativo' || t === 'aplicativos') counts.aplicativo++;
      else if (t === 'agente' || t === 'agentes') counts.agente++;
      else if (t === 'runtime' || t === 'runtimes') counts.runtime++;
      else if (t === 'ferramenta' || t === 'ferramentas') counts.ferramenta++;
    }
    return counts;
  }, [softwares]);

  const filteredSoftwares = useMemo(() => {
    return softwares.filter((s) => {
      const pkgs = s.pacotes || (s as any).packages || [];
      if (softwareCategoryFilter !== 'todos') {
        const t = (s.tipo || '').toLowerCase();
        if (softwareCategoryFilter === 'aplicativo' && t !== 'aplicativo' && t !== 'aplicativos') return false;
        if (softwareCategoryFilter === 'agente' && t !== 'agente' && t !== 'agentes') return false;
        if (softwareCategoryFilter === 'runtime' && t !== 'runtime' && t !== 'runtimes') return false;
        if (softwareCategoryFilter === 'ferramenta' && t !== 'ferramenta' && t !== 'ferramentas') return false;
      }
      if (!softwareSearch.trim()) return true;
      const q = softwareSearch.toLowerCase();
      return (
        (s.nome || '').toLowerCase().includes(q) ||
        (s.tipo || '').toLowerCase().includes(q) ||
        pkgs.some((p: any) => (p.pacote || '').toLowerCase().includes(q) || (p.versao || '').toLowerCase().includes(q))
      );
    });
  }, [softwares, softwareSearch, softwareCategoryFilter]);

  if (!deviceId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Drawer */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {device?.hostname || 'Carregando...'}
                </h3>
                {device?.alerta_hardware && (
                  <span className="flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                    <AlertTriangle className="h-3 w-3" /> Alerta HW
                  </span>
                )}
                {device?.is_rede_formatacao && (
                  <span className="rounded bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-700">
                    Bancada .88
                  </span>
                )}
                {device?.status_conexao && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold flex items-center gap-1 ${
                      device.status_conexao === 'online'
                        ? 'bg-emerald-100 text-emerald-800'
                        : device.status_conexao === 'alerta'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        device.status_conexao === 'online'
                          ? 'bg-emerald-500'
                          : device.status_conexao === 'alerta'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    {device.tempo_relativo_coleta || device.status_conexao_label}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                <span>{device?.ip || 'Sem IP'}</span>
                {device?.ips_extras && device.ips_extras.length > 0 && (
                  <span className="rounded bg-slate-200 px-1 text-[10px] font-bold text-slate-700">
                    +{device.ips_extras.length}
                  </span>
                )}
                <span>&bull;</span>
                <span>{device?.mac || 'Sem MAC'}</span>
                <span>&bull;</span>
                <span>{device?.loja || 'Sem Loja'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLinux && device?.ip && (
              <button
                type="button"
                onClick={() => onOpenSsh(device as unknown as DeviceListItem)}
                title={`Abrir terminal SSH em ${device.hostname} (${device.ip})`}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-sm ring-1 ring-emerald-500/30"
              >
                <Terminal className="h-3.5 w-3.5" />
                <span>&gt;_ Terminal SSH</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Barra de Abas */}
        <div className="flex border-b border-slate-200 bg-slate-100/60 px-6 pt-2 gap-2 text-xs font-semibold select-none overflow-x-auto">
          <button
            onClick={() => setActiveTab('geral')}
            className={`border-b-2 px-4 py-2.5 transition-colors whitespace-nowrap ${
              activeTab === 'geral'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Visão Geral &amp; Specs
          </button>
          <button
            onClick={() => setActiveTab('discos')}
            className={`border-b-2 px-4 py-2.5 transition-colors whitespace-nowrap ${
              activeTab === 'discos'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Discos &amp; Pastas {unidadesDisco.length > 0 && `(${unidadesDisco.length})`}
          </button>
          <button
            onClick={() => setActiveTab('perifericos')}
            className={`border-b-2 px-4 py-2.5 transition-colors whitespace-nowrap ${
              activeTab === 'perifericos'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Periféricos {perifericos.length > 0 && `(${perifericos.length})`}
          </button>
          <button
            onClick={() => setActiveTab('softwares')}
            className={`border-b-2 px-4 py-2.5 transition-colors whitespace-nowrap ${
              activeTab === 'softwares'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Softwares Instalados
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`border-b-2 px-4 py-2.5 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'historico'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Histórico</span>
            {history.length > 0 && (
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeTab === 'historico' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'
              }`}>
                {history.length}
              </span>
            )}
          </button>
        </div>

        {/* Corpo com Rolagem */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-24 text-center text-slate-400 text-sm flex flex-col items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-3" />
              <div>Carregando detalhes do dispositivo...</div>
            </div>
          ) : error ? (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <div className="rounded-full bg-rose-50 p-3 text-rose-600 mb-3 border border-rose-200">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Falha ao carregar detalhes</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">{error}</p>
              <button
                type="button"
                onClick={() => {
                  if (!deviceId) return;
                  setLoading(true);
                  setError(null);
                  deviceService
                    .getDevice(deviceId)
                    .then((data) => {
                      setDevice(data);
                      setLoading(false);
                    })
                    .catch((err: any) => {
                      const msg =
                        err?.response?.data?.detail ||
                        err?.message ||
                        'Não foi possível carregar os detalhes do dispositivo.';
                      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
                      setLoading(false);
                    });
                }}
                className="mt-4 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          ) : !device ? (
            <div className="py-24 text-center text-slate-400 text-sm">
              Dispositivo não encontrado.
            </div>
          ) : (
            <>
              {/* Alerta de Hardware Destacado */}
              {device.alerta_hardware && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-900 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-bold text-rose-800">Conflito de Hardware / MAC Detectado</div>
                    <p className="mt-0.5 text-rose-700">{device.alerta_hardware}</p>
                    <p className="mt-1 text-[11px] text-rose-600 opacity-90">
                      Geralmente provocado por clonagem de disco/SSD sem troca de UUID ou duplicidade de endereço MAC físico.
                    </p>
                    {isAdmin && (
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => onClearAlert(device)}
                          className="rounded bg-rose-700 px-2.5 py-1 text-white font-medium hover:bg-rose-800 transition-colors shadow-2xs"
                        >
                          ✓ Resolver Alerta
                        </button>
                        <button
                          onClick={() => onDeleteDevice(device)}
                          className="rounded border border-rose-300 bg-white px-2.5 py-1 text-rose-700 font-medium hover:bg-rose-100 transition-colors"
                        >
                          Excluir Registro
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ABA 1: VISÃO GERAL & SPECS */}
              {activeTab === 'geral' && (
                <div className="space-y-4">
                  {/* Bloco 1: Rede & Conectividade (Acordeão) */}
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                    <button
                      type="button"
                      onClick={() => toggleSection('rede')}
                      className="w-full flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100/60 transition-colors text-left"
                    >
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <Network className="h-4 w-4 text-emerald-600" />
                        Rede &amp; Acesso Remoto
                      </span>
                      {openSections.rede ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                    {openSections.rede && (
                      <div className="p-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-slate-400">IP Principal:</span>
                          <div className="font-mono font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                            <span className={device.is_rede_formatacao ? 'text-orange-700 font-bold' : ''}>
                              {device.ip || '---'}
                            </span>
                            {device.ip && (
                              <button
                                onClick={() => copyToClipboard(device.ip!, 'ip')}
                                className="text-slate-400 hover:text-slate-700"
                                title="Copiar IP Principal"
                              >
                                {copiedKey === 'ip' ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                            {device.is_rede_formatacao && (
                              <span className="rounded bg-orange-100 px-1 py-0.2 text-[10px] font-bold text-orange-800">
                                .88
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400">Endereço MAC:</span>
                          <div className="font-mono font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                            <span>{device.mac || '---'}</span>
                            {device.mac && (
                              <button
                                onClick={() => copyToClipboard(device.mac!, 'mac')}
                                className="text-slate-400 hover:text-slate-700"
                                title="Copiar MAC"
                              >
                                {copiedKey === 'mac' ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* IPs Extras / Secundários Tratados */}
                        {device.ips_extras && device.ips_extras.length > 0 && (
                          <div className="sm:col-span-2 rounded-lg bg-blue-50/70 border border-blue-200 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                                <Network className="h-3.5 w-3.5 text-blue-600" />
                                IPs Secundários / Adicionais ({device.ips_extras.length})
                              </span>
                              <span className="text-[10px] text-blue-600 font-medium">Interfaces adicionais válidas</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {device.ips_extras.map((extraIp, idx) => (
                                <div
                                  key={idx}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs font-mono font-semibold text-slate-800 border border-blue-200 shadow-2xs"
                                >
                                  <span>{extraIp}</span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(extraIp, `extra_ip_${idx}`)}
                                    className="text-slate-400 hover:text-slate-700"
                                    title="Copiar IP adicional"
                                  >
                                    {copiedKey === `extra_ip_${idx}` ? (
                                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <span className="text-slate-400">RustDesk ID:</span>
                          <div className="font-mono font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                            <span>{device.rustdesk_id || 'Não informado'}</span>
                            {device.rustdesk_id && (
                              <button
                                onClick={() => copyToClipboard(device.rustdesk_id!, 'rustdesk')}
                                className="text-slate-400 hover:text-slate-700"
                                title="Copiar RustDesk ID"
                              >
                                {copiedKey === 'rustdesk' ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400">Domínio / Usuário:</span>
                          <div className="font-semibold text-slate-800 mt-0.5">
                            {[device.dominio, device.usuario].filter(Boolean).join(' \\ ') || '---'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bloco 2: Hardware & Arquitetura (Acordeão) */}
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                    <button
                      type="button"
                      onClick={() => toggleSection('hardware')}
                      className="w-full flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100/60 transition-colors text-left"
                    >
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-blue-600" />
                        Hardware &amp; Arquitetura
                      </span>
                      {openSections.hardware ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                    {openSections.hardware && (
                      <div className="p-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-slate-400">Processador:</span>
                          <div className="font-semibold text-slate-800 mt-0.5">
                            {device.processador_formatado || device.processador || 'Não informado'}
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400">Memória RAM:</span>
                          <div className="font-semibold text-slate-800 mt-0.5 flex items-center gap-2">
                            <span>{device.ram_total_formatada || device.ram_total || 'Não informado'}</span>
                            {device.ram_tipo && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                                {device.ram_tipo}
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400">Placa-Mãe / Modelo:</span>
                          <div className="font-semibold text-slate-800 mt-0.5">
                            {device.modelo_formatado || [device.fabricante_limpo, device.modelo_limpo].filter(Boolean).join(' ') || 'Não informado'}
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400">Número de Série (Chassi):</span>
                          <div className="font-mono font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                            <span>{device.serial_limpo || device.serial || '---'}</span>
                            {(device.serial_limpo || device.serial) && (
                              <button
                                onClick={() => copyToClipboard(device.serial_limpo || device.serial!, 'serial')}
                                className="text-slate-400 hover:text-slate-700"
                                title="Copiar Serial"
                              >
                                {copiedKey === 'serial' ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {device.fabricante_limpo && (
                          <div>
                            <span className="text-slate-400">Fabricante:</span>
                            <div className="font-semibold text-slate-800 mt-0.5">
                              {device.fabricante_limpo}
                            </div>
                          </div>
                        )}

                        {device.modelo_limpo && (
                          <div>
                            <span className="text-slate-400">Modelo Específico:</span>
                            <div className="font-semibold text-slate-800 mt-0.5">
                              {device.modelo_limpo}
                            </div>
                          </div>
                        )}

                        {isAdmin ? (
                          device.serial_windows && (
                            <div className="sm:col-span-2 rounded-lg bg-slate-50 border border-slate-200 p-2.5 flex items-center justify-between font-mono text-xs">
                              <span className="text-slate-500 font-sans">Chave Windows (OEM/BIOS):</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-800">{device.serial_windows}</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(device.serial_windows!, 'win_key')}
                                  className="text-slate-400 hover:text-slate-700 p-1 rounded"
                                  title="Copiar Chave Windows"
                                >
                                  {copiedKey === 'win_key' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="sm:col-span-2 rounded-lg bg-slate-50 border border-slate-200 p-2.5 flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-medium">Chave Windows:</span>
                            {device.serial_windows ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                Licenciado / Possui chave
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                Sem chave
                              </span>
                            )}
                          </div>
                        )}

                        {isAdmin ? (
                          device.serial_office && (
                            <div className="sm:col-span-2 rounded-lg bg-slate-50 border border-slate-200 p-2.5 flex items-center justify-between font-mono text-xs">
                              <span className="text-slate-500 font-sans">Chave Office:</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-800">{device.serial_office}</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(device.serial_office!, 'off_key')}
                                  className="text-slate-400 hover:text-slate-700 p-1 rounded"
                                  title="Copiar Chave Office"
                                >
                                  {copiedKey === 'off_key' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="sm:col-span-2 rounded-lg bg-slate-50 border border-slate-200 p-2.5 flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-medium">Chave Office:</span>
                            {device.serial_office ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                Licenciado / Possui chave
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                Sem chave
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bloco 3: Sistema Operacional (Acordeão) */}
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                    <button
                      type="button"
                      onClick={() => toggleSection('sistema')}
                      className="w-full flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100/60 transition-colors text-left"
                    >
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-purple-600" />
                        Sistema Operacional &amp; Sincronização
                      </span>
                      {openSections.sistema ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                    {openSections.sistema && (
                      <div className="p-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-slate-400">Sistema:</span>
                          <div className="font-semibold text-slate-800 mt-0.5">
                            {device.so_formatado || device.sistema || 'Não informado'}
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400">Versão / Release / Build:</span>
                          <div className="font-semibold text-slate-800 mt-0.5 flex items-center gap-2">
                            <span>{device.versao || device.build || 'Não informado'}</span>
                            {(device.windows_release_formatado || device.windows_release) && (
                              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                                Windows {device.windows_release_formatado || device.windows_release}
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400">Status Operacional:</span>
                          <div className="mt-0.5">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                device.status === 'OK'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : device.status === 'UPGRADE_REQUIRED'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {device.status === 'OK'
                                ? 'Atualizada'
                                : device.status === 'UPGRADE_REQUIRED'
                                ? 'Atualização Necessária'
                                : 'Não Identificada'}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400">Última Sincronização:</span>
                          <div className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span>{device.data_coleta_formatada || (device.data_coleta ? String(device.data_coleta) : 'Sem data')}</span>
                            {device.tempo_relativo_coleta && (
                              <span className="text-[11px] text-slate-500 font-normal">
                                ({device.tempo_relativo_coleta})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bloco 4: Patrimônio & Homologação Firewall (Acordeão) */}
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                    <div className="flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100/60 transition-colors">
                      <button
                        type="button"
                        onClick={() => toggleSection('patrimonio')}
                        className="flex-1 flex items-center justify-between text-left"
                      >
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                          <Shield className="h-4 w-4 text-amber-600" />
                          Patrimônio &amp; Homologação de Firewall
                        </span>
                        {openSections.patrimonio ? (
                          <ChevronUp className="h-4 w-4 text-slate-400 mr-2" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400 mr-2" />
                        )}
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => onOpenPatrimonio(device)}
                          className="flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          <Tag className="h-3 w-3" /> Ajustar
                        </button>
                      )}
                    </div>
                    {openSections.patrimonio && (
                      <div className="p-4 border-t border-slate-100 text-xs space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <span className="text-slate-400">Número de Patrimônio:</span>
                            <div className="font-mono font-bold text-blue-700 text-sm mt-0.5 flex items-center gap-1.5">
                              <span>{device.patrimonio || 'Não patrimoniado'}</span>
                              {device.patrimonio && (
                                <button
                                  onClick={() => copyToClipboard(device.patrimonio!, 'pat')}
                                  className="text-slate-400 hover:text-slate-700"
                                  title="Copiar Patrimônio"
                                >
                                  {copiedKey === 'pat' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                                </button>
                              )}
                            </div>
                          </div>

                          <div>
                            <span className="text-slate-400">Status Firewall:</span>
                            <div className="mt-0.5">
                              {device.firewall_status === 'confirmado' ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 font-semibold text-emerald-800">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Liberado no Firewall
                                </span>
                              ) : device.firewall_status === 'pendente' ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 font-semibold text-amber-800">
                                  <Clock className="h-3.5 w-3.5" /> Pendente de Homologação
                                </span>
                              ) : device.firewall_status === 'rejeitado' ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 font-semibold text-rose-800">
                                  <XCircle className="h-3.5 w-3.5" /> Rejeitado
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Não solicitado</span>
                              )}
                            </div>
                          </div>

                          {device.firewall_solicitado_por && (
                            <div>
                              <span className="text-slate-400">Solicitado por:</span>
                              <div className="font-semibold text-slate-800 mt-0.5">
                                {device.firewall_solicitado_por}
                              </div>
                            </div>
                          )}

                          {device.firewall_confirmado_por && (
                            <div>
                              <span className="text-slate-400">Confirmado por:</span>
                              <div className="font-semibold text-slate-800 mt-0.5">
                                {device.firewall_confirmado_por}
                              </div>
                            </div>
                          )}

                          {device.licenca_windows_solicitada && (
                            <div className="sm:col-span-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-amber-800 font-semibold">
                              ⭐ Nova licença Windows solicitada pelo operador
                            </div>
                          )}
                        </div>

                        {isAdmin && (
                          <div className="pt-3 border-t border-slate-100 flex justify-end">
                            <button
                              onClick={() => onOpenApproval(device)}
                              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs"
                            >
                              <Shield className="h-3.5 w-3.5" />
                              <span>Homologação e Ajuste Cadastral</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ABA 2: DISCOS & PASTAS */}
              {activeTab === 'discos' && (
                <div className="space-y-4">
                  {/* Resumo Geral de Capacidade */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <HardDrive className="h-4 w-4 text-blue-600" />
                        Capacidade Geral do Disco
                      </h4>
                      <span
                        className={`text-sm font-bold ${
                          (device.disco_percentual || 0) >= 85
                            ? 'text-rose-600'
                            : (device.disco_percentual || 0) >= 70
                            ? 'text-amber-600'
                            : 'text-slate-700'
                        }`}
                      >
                        {device.disco_percentual || 0}% Usado
                      </span>
                    </div>

                    <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          (device.disco_percentual || 0) >= 85
                            ? 'bg-rose-500'
                            : (device.disco_percentual || 0) >= 70
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, device.disco_percentual || 0))}%` }}
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                        <span className="text-slate-400 block text-[10px] uppercase">Usado</span>
                        <strong className="text-slate-800 font-mono">
                          {device.disco_usado_formatado || device.disco_usado || '---'}
                        </strong>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                        <span className="text-slate-400 block text-[10px] uppercase">Livre</span>
                        <strong className="text-slate-800 font-mono">
                          {device.disco_livre_formatado || device.disco_livre || '---'}
                        </strong>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                        <span className="text-slate-400 block text-[10px] uppercase">Total</span>
                        <strong className="text-slate-800 font-mono">
                          {device.disco_total_formatado || device.disco_total || '---'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Partições e Unidades de Disco (Acordeão) */}
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                    <button
                      type="button"
                      onClick={() => toggleSection('unidades')}
                      className="w-full flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100/60 transition-colors text-left"
                    >
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <Database className="h-4 w-4 text-blue-600" />
                        Unidades &amp; Partições ({unidadesDisco.length})
                      </span>
                      {openSections.unidades ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                    {openSections.unidades && (
                      <div className="p-4 border-t border-slate-100 space-y-3">
                        {unidadesDisco.length === 0 ? (
                          <div className="text-center py-6 text-xs text-slate-400">
                            Nenhuma informação detalhada de unidades disponível.
                          </div>
                        ) : (
                          unidadesDisco.map((u, idx) => {
                            const pct =
                              typeof u.percentual === 'number'
                                ? u.percentual
                                : parseFloat(String(u.percentual || u.percentual_usado || '0'));
                            const isHigh = pct >= 85;
                            const isMed = pct >= 70;

                            return (
                              <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs">
                                <div className="flex items-center justify-between font-semibold text-slate-800">
                                  <span>
                                    {u.ponto_montagem || u.montagem || u.letra || u.device || 'Unidade'}{' '}
                                    {u.tipo_fs && <span className="text-slate-500 font-normal">({u.tipo_fs})</span>}
                                    {u.rotulo && <span className="text-slate-400 font-normal"> [{u.rotulo}]</span>}
                                  </span>
                                  <span className={isHigh ? 'text-rose-600 font-bold' : isMed ? 'text-amber-600' : 'text-slate-700'}>
                                    {Math.round(pct)}%
                                  </span>
                                </div>
                                <div className="mt-1.5 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                                  />
                                </div>
                                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                                  <span>Usado: <strong>{u.usado || '---'}</strong></span>
                                  <span>Livre: <strong>{u.livre || '---'}</strong></span>
                                  <span>Total: <strong>{u.total || '---'}</strong></span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Perfis de Usuários e Pastas (Acordeão Expansível) */}
                  {usuariosPastas.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                      <button
                        type="button"
                        onClick={() => toggleSection('usuarios')}
                        className="w-full flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100/60 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <Folder className="h-4 w-4 text-amber-600" />
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Perfis de Usuários ({usuariosPastas.length})
                          </span>
                          {resumoUsuarios?.soma_tamanho_formatada && (
                            <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                              Total: {resumoUsuarios.soma_tamanho_formatada}
                            </span>
                          )}
                        </div>
                        {openSections.usuarios ? (
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                      </button>
                      {openSections.usuarios && (
                        <div className="p-4 border-t border-slate-100 space-y-2.5">
                          {usuariosPastas.map((usr, uIdx) => {
                            const sub = usr.pastas || usr.subpastas || [];
                            const isExpanded = Boolean(expandedUsers[`usr_${uIdx}`]);
                            return (
                              <div
                                key={uIdx}
                                className="rounded-lg border border-slate-200 bg-slate-50/70 overflow-hidden text-xs"
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleUser(`usr_${uIdx}`)}
                                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-100/80 transition-colors text-left"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-800">{usr.usuario}</span>
                                    {sub.length > 0 && (
                                      <span className="text-[10px] text-slate-400">
                                        ({sub.length} pasta{sub.length > 1 ? 's' : ''})
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-slate-700">{usr.tamanho}</span>
                                    {sub.length > 0 && (
                                      isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                                    )}
                                  </div>
                                </button>

                                {isExpanded && sub.length > 0 && (
                                  <div className="px-3 pb-3 pt-1 border-t border-slate-200/60 bg-white space-y-1.5">
                                    {sub.map((p, pIdx) => (
                                      <div
                                        key={pIdx}
                                        className="flex items-center justify-between text-[11px] text-slate-600 py-0.5 border-b border-slate-100 last:border-none"
                                        title={p.caminho || ''}
                                      >
                                        <span className="truncate max-w-xs">{p.pasta || p.nome}</span>
                                        <span className="font-mono font-medium text-slate-800">{p.tamanho}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Logs do Sistema (/var/log no Linux) */}
                  {varLogItens.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                      <button
                        type="button"
                        onClick={() => toggleSection('logs')}
                        className="w-full flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100/60 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <Folder className="h-4 w-4 text-indigo-600" />
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Logs do Sistema (/var/log)
                          </span>
                          {resumoVarLog?.tamanho_total && (
                            <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-800 border border-indigo-200">
                              Total: {resumoVarLog.tamanho_total}
                            </span>
                          )}
                        </div>
                        {openSections.logs ? (
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                      </button>
                      {openSections.logs && (
                        <div className="p-4 border-t border-slate-100 space-y-1.5">
                          {varLogItens.map((log, lIdx) => (
                            <div
                              key={lIdx}
                              className="flex items-center justify-between text-xs text-slate-600 py-1.5 border-b border-slate-100 last:border-none"
                              title={log.caminho || ''}
                            >
                              <span className="font-mono truncate max-w-md">{log.nome || log.pasta}</span>
                              <span className="font-mono font-medium text-slate-800">{log.tamanho}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ABA 3: PERIFÉRICOS CONECTADOS */}
              {activeTab === 'perifericos' && (
                <div className="space-y-4">
                  {perifericos.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 text-xs">
                      Nenhum periférico ou monitor registrado para este dispositivo.
                    </div>
                  ) : (
                    <>
                      {perifericosAgrupados && (
                        <div className="flex flex-wrap gap-2 text-[11px]">
                          {perifericosAgrupados.monitores?.length > 0 && (
                            <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-blue-700 font-semibold border border-blue-200">
                              Monitores: {perifericosAgrupados.monitores.length}
                            </span>
                          )}
                          {perifericosAgrupados.armazenamento_usb?.length > 0 && (
                            <span className="rounded-lg bg-cyan-50 px-2.5 py-1 text-cyan-700 font-semibold border border-cyan-200">
                              USB Storage: {perifericosAgrupados.armazenamento_usb.length}
                            </span>
                          )}
                          {perifericosAgrupados.smartphones?.length > 0 && (
                            <span className="rounded-lg bg-purple-50 px-2.5 py-1 text-purple-700 font-semibold border border-purple-200">
                              Celulares: {perifericosAgrupados.smartphones.length}
                            </span>
                          )}
                          {perifericosAgrupados.impressoras?.length > 0 && (
                            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-700 font-semibold border border-emerald-200">
                              Impressoras: {perifericosAgrupados.impressoras.length}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {perifericos.map((p, pIdx) => {
                        const tipo = (p.tipo || 'outro').toLowerCase();
                        let IconComp = Usb;
                        let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';

                        if (tipo === 'monitor') {
                          IconComp = Monitor;
                          badgeColor = 'bg-blue-100 text-blue-700 border-blue-200';
                        } else if (tipo === 'smartphone') {
                          IconComp = Smartphone;
                          badgeColor = 'bg-purple-100 text-purple-700 border-purple-200';
                        } else if (tipo === 'impressora') {
                          IconComp = Printer;
                          badgeColor = 'bg-emerald-100 text-emerald-700 border-emerald-200';
                        } else if (tipo === 'teclado') {
                          IconComp = Keyboard;
                          badgeColor = 'bg-amber-100 text-amber-700 border-amber-200';
                        } else if (tipo === 'mouse') {
                          IconComp = Mouse;
                          badgeColor = 'bg-amber-100 text-amber-700 border-amber-200';
                        } else if (tipo === 'armazenamento_usb') {
                          IconComp = Usb;
                          badgeColor = 'bg-cyan-100 text-cyan-700 border-cyan-200';
                        }

                        return (
                          <div
                            key={pIdx}
                            className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex items-start gap-3 hover:border-slate-300 transition-colors"
                          >
                            <div className="rounded-lg bg-slate-100 p-2 text-slate-600 shrink-0">
                              <IconComp className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0 text-xs">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-semibold text-slate-800 truncate" title={p.nome}>
                                  {p.nome}
                                </span>
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${badgeColor}`}>
                                  {p.tipo}
                                </span>
                              </div>
                              <div className="text-slate-500 mt-1 space-y-0.5 text-[11px]">
                                {p.fabricante && <div>Fabricante: {p.fabricante}</div>}
                                {p.conexao && <div>Conexão: {p.conexao}</div>}
                                {p.capacidade && <div>Capacidade: {p.capacidade}</div>}
                                {p.serial && (
                                  <div className="font-mono text-slate-700 flex items-center gap-1">
                                    <span>S/N: {p.serial}</span>
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(p.serial!, `perif_${pIdx}`)}
                                      className="text-slate-400 hover:text-slate-600"
                                      title="Copiar Serial"
                                    >
                                      {copiedKey === `perif_${pIdx}` ? (
                                        <Check className="h-3 w-3 text-emerald-600" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                </div>
              )}

              {/* ABA 4: SOFTWARES INSTALADOS */}
              {activeTab === 'softwares' && (
                <div className="space-y-4">
                  {/* Barra de Pesquisa e Filtro de Categoria */}
                  <div className="space-y-2.5">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={softwareSearch}
                        onChange={(e) => setSoftwareSearch(e.target.value)}
                        placeholder="Buscar por nome do aplicativo, agente ou pacote..."
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      {[
                        { key: 'todos', label: 'Todos', count: softwareCounts.todos, color: 'text-slate-700' },
                        { key: 'aplicativo', label: 'Aplicativos', count: softwareCounts.aplicativo, color: 'text-blue-700' },
                        { key: 'agente', label: 'Agentes', count: softwareCounts.agente, color: 'text-purple-700' },
                        { key: 'runtime', label: 'Runtimes', count: softwareCounts.runtime, color: 'text-emerald-700' },
                        { key: 'ferramenta', label: 'Ferramentas', count: softwareCounts.ferramenta, color: 'text-amber-700' },
                      ].map((cat) => {
                        const active = softwareCategoryFilter === cat.key;
                        return (
                          <button
                            key={cat.key}
                            type="button"
                            onClick={() => setSoftwareCategoryFilter(cat.key)}
                            className={`rounded-lg px-2.5 py-1 font-medium transition-colors border flex items-center gap-1.5 ${
                              active
                                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span>{cat.label}</span>
                            <span
                              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                                active ? 'bg-slate-700 text-slate-100' : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {cat.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {loadingSoftware ? (
                    <div className="text-center py-16 text-xs text-slate-400">
                      Carregando inventário de softwares da máquina...
                    </div>
                  ) : filteredSoftwares.length === 0 ? (
                    <div className="text-center py-16 text-xs text-slate-400">
                      Nenhum software encontrado.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                      {filteredSoftwares.map((sw: DeviceSoftwareItem, idx: number) => {
                        const catLower = (sw.tipo || '').toLowerCase();
                        let badgeClass = 'bg-slate-50 text-slate-700 border-slate-200';
                        if (catLower === 'aplicativo' || catLower === 'aplicativos') {
                          badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                        } else if (catLower === 'agente' || catLower === 'agentes') {
                          badgeClass = 'bg-purple-50 text-purple-700 border-purple-200';
                        } else if (catLower === 'runtime' || catLower === 'runtimes') {
                          badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                        } else if (catLower === 'ferramenta' || catLower === 'ferramentas') {
                          badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                        }

                        const pkgs = sw.pacotes || (sw as any).packages || [];

                        return (
                          <div key={idx} className="p-3 text-xs hover:bg-slate-50/70 transition-colors">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-800 flex items-center gap-1.5 truncate" title={sw.nome}>
                                <Package className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                <span className="truncate">{sw.nome}</span>
                              </span>
                              <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold shrink-0 uppercase tracking-wide ${badgeClass}`}>
                                {sw.tipo || 'aplicativo'}
                              </span>
                            </div>
                            {pkgs && pkgs.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {pkgs.map((p: any, pIdx: number) => (
                                  <span
                                    key={pIdx}
                                    className="rounded bg-slate-50 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 border border-slate-200"
                                  >
                                    {p.pacote} {p.versao && <span className="text-slate-400">@ {p.versao}</span>}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ABA 5: HISTÓRICO DE ALTERAÇÕES / HARDWARE DRIFT */}
              {activeTab === 'historico' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <History className="h-4 w-4 text-blue-600" />
                        Linha do Tempo de Alterações
                      </h4>
                      <p className="text-xs text-slate-500">
                        Histórico de mudanças em hardware, rede, sistema operacional e patrimônio (hardware drift).
                      </p>
                    </div>
                    {history.length > 0 && (
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                        {history.length} evento{history.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {historyError && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{historyError}</span>
                    </div>
                  )}

                  {loadingHistory ? (
                    <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="text-xs font-medium">Carregando linha do tempo...</span>
                    </div>
                  ) : history.length === 0 ? (
                    <div className="py-16 text-center text-xs text-slate-400 italic">
                      Nenhuma alteração registrada para este equipamento até o momento.
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-slate-200 ml-3 space-y-4 py-2">
                      {history.map((item) => (
                        <div key={item.id} className="relative pl-6">
                          {/* Ponto indicador */}
                          <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-white bg-blue-600" />

                          <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs shadow-2xs space-y-2">
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                              <span className="font-bold uppercase tracking-wider text-blue-700 text-[11px]">
                                {item.campo}
                              </span>
                              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                <Clock className="h-3 w-3" />
                                {item.data_alteracao}
                              </span>
                            </div>

                            <div className="space-y-1.5 pt-0.5">
                              {item.valor_anterior && (
                                <div className="text-slate-500 flex items-start gap-1.5">
                                  <span className="font-semibold text-slate-400 shrink-0">De:</span>
                                  <span className="line-through bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-mono text-[11px]">
                                    {item.valor_anterior}
                                  </span>
                                </div>
                              )}

                              <div className="text-slate-800 font-medium flex items-start gap-1.5">
                                <span className="font-semibold text-emerald-600 shrink-0 flex items-center">
                                  <ArrowRight className="h-3 w-3 inline mr-0.5" /> Para:
                                </span>
                                <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold">
                                  {item.valor_novo || '(vazio)'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Rodapé do Drawer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 bg-slate-50">
          <div className="text-xs text-slate-500 font-mono">
            {device ? `ID: #${device.id}` : ''}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && device && (
              <button
                type="button"
                onClick={() => onDeleteDevice(device)}
                className="flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Excluir</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
