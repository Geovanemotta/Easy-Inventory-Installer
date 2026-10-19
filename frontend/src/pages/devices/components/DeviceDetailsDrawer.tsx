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
  Monitor,
  AlertTriangle,
  Terminal,
  Trash2,
  History,
} from 'lucide-react';
import { copyToClipboard as robustCopy } from '@/utils/clipboard';

import { DeviceOverviewTab } from './drawer-tabs/DeviceOverviewTab';
import { DeviceDisksTab } from './drawer-tabs/DeviceDisksTab';
import { DevicePeripheralsTab } from './drawer-tabs/DevicePeripheralsTab';
import { DeviceSoftwareTab } from './drawer-tabs/DeviceSoftwareTab';
import { DeviceHistoryTab } from './drawer-tabs/DeviceHistoryTab';

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

    // Carrega histórico para exibir o contador na aba
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

  const isLinux = Boolean(device?.sistema && !device.sistema.toLowerCase().includes('windows'));

  // Parse de unidades de disco (normalizadas pelo back-end)
  const unidadesDisco: UnidadeDisco[] = useMemo(() => {
    if (!device?.analise_disco) return [];
    if (Array.isArray(device.analise_disco)) return device.analise_disco as UnidadeDisco[];
    if (Array.isArray(device.analise_disco.unidades)) return device.analise_disco.unidades;
    if (Array.isArray(device.analise_disco.particoes)) return device.analise_disco.particoes;
    if (Array.isArray(device.analise_disco.drives)) return device.analise_disco.drives;
    return [];
  }, [device?.analise_disco]);

  // Parse de análise de usuários
  const usuariosPastas: AnaliseUsuario[] = useMemo(() => {
    if (!device?.analise_disco || Array.isArray(device.analise_disco)) return [];
    if (Array.isArray(device.analise_disco.usuarios)) return device.analise_disco.usuarios;
    if (Array.isArray(device.analise_disco.top_usuarios)) return device.analise_disco.top_usuarios;
    return [];
  }, [device?.analise_disco]);

  // Parse de /var/log
  const varLogItens: ItemVarLog[] = useMemo(() => {
    if (!device?.analise_disco || Array.isArray(device.analise_disco)) return [];
    const an = device.analise_disco;
    if (Array.isArray(an.var_log)) return an.var_log;
    if (an.var_log && Array.isArray(an.var_log.top_itens)) return an.var_log.top_itens;
    return [];
  }, [device?.analise_disco]);

  const resumoUsuarios = device?.analise_disco?.resumo_usuarios;
  const resumoVarLog = device?.analise_disco?.var_log;

  // Periféricos normalizados e agrupados
  const perifericos: PerifericoItem[] = Array.isArray(device?.perifericos) ? device.perifericos : [];
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
                className="mt-4 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
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
                <DeviceOverviewTab
                  device={device}
                  isAdmin={isAdmin}
                  onOpenPatrimonio={onOpenPatrimonio}
                  onOpenApproval={onOpenApproval}
                  openSections={openSections}
                  toggleSection={toggleSection}
                  copyToClipboard={copyToClipboard}
                  copiedKey={copiedKey}
                />
              )}

              {/* ABA 2: DISCOS & PASTAS */}
              {activeTab === 'discos' && (
                <DeviceDisksTab
                  device={device}
                  unidadesDisco={unidadesDisco}
                  usuariosPastas={usuariosPastas}
                  varLogItens={varLogItens}
                  resumoUsuarios={resumoUsuarios}
                  resumoVarLog={resumoVarLog}
                  openSections={openSections}
                  toggleSection={toggleSection}
                  expandedUsers={expandedUsers}
                  toggleUser={toggleUser}
                />
              )}

              {/* ABA 3: PERIFÉRICOS CONECTADOS */}
              {activeTab === 'perifericos' && (
                <DevicePeripheralsTab
                  perifericos={perifericos}
                  perifericosAgrupados={perifericosAgrupados}
                  copyToClipboard={copyToClipboard}
                  copiedKey={copiedKey}
                />
              )}

              {/* ABA 4: SOFTWARES INSTALADOS */}
              {activeTab === 'softwares' && (
                <DeviceSoftwareTab
                  loadingSoftware={loadingSoftware}
                  filteredSoftwares={filteredSoftwares}
                  softwareSearch={softwareSearch}
                  setSoftwareSearch={setSoftwareSearch}
                  softwareCategoryFilter={softwareCategoryFilter}
                  setSoftwareCategoryFilter={setSoftwareCategoryFilter}
                  softwareCounts={softwareCounts}
                />
              )}

              {/* ABA 5: HISTÓRICO DE ALTERAÇÕES / HARDWARE DRIFT */}
              {activeTab === 'historico' && (
                <DeviceHistoryTab
                  history={history}
                  loadingHistory={loadingHistory}
                  historyError={historyError}
                />
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
export default DeviceDetailsDrawer;
