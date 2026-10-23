import React from 'react';
import { DeviceListItem, DevicePagination } from '@/types/device';
import {
  Tag,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Terminal,
  Copy,
  Check,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import { useCopyFeedback } from '@/utils/clipboard';

interface DeviceTableProps {
  devices: DeviceListItem[];
  loading: boolean;
  pagination: DevicePagination;
  onPageChange: (page: number) => void;
  onSelectDevice: (device: DeviceListItem) => void;
  onOpenHistory?: (device: DeviceListItem) => void;
  onOpenPatrimonio?: (device: DeviceListItem) => void;
  onOpenApproval?: (device: DeviceListItem) => void;
  onOpenSsh?: (device: DeviceListItem) => void;
  onClearAlert?: (device: DeviceListItem) => void;
  onDeleteDevice?: (device: DeviceListItem) => void;
  isAdmin: boolean;
  isMatrizOperator: boolean;
  ordenarPor?: string;
  ordemDir?: 'asc' | 'desc';
  onSortChange?: (campo: string) => void;
}

export function formatarCodigoFilial(
  loja?: string | null,
  siteId?: number | null,
): { text: string; isUnlinked: boolean } {
  if (siteId === null || siteId === undefined) {
    if (!loja || loja === 'OUTROS') {
      return { text: 'Sem Filial', isUnlinked: true };
    }
  }
  const l = (loja || '').trim().toUpperCase();
  if (!l) return { text: 'Sem Filial', isUnlinked: true };
  if (l.includes('MATRIZ') || l === 'AC') return { text: 'MATRIZ', isUnlinked: false };
  if (l === 'OUTROS') return { text: 'Sem Filial', isUnlinked: true };
  if (l.startsWith('COMBO') || l.startsWith('CB')) {
    const num = l.match(/\d+/);
    return { text: num ? `COMBO-${num[0].padStart(2, '0')}` : 'COMBO', isUnlinked: false };
  }
  if (l.includes('LOJA') || l.startsWith('LJ') || l.startsWith('L')) {
    const num = l.match(/\d+/);
    return { text: num ? `LOJA-${num[0].padStart(2, '0')}` : l, isUnlinked: false };
  }
  return { text: l, isUnlinked: false };
}

export const DeviceTable: React.FC<DeviceTableProps> = ({
  devices,
  loading,
  pagination,
  onPageChange,
  onSelectDevice,
  onOpenPatrimonio,
  onOpenApproval,
  onClearAlert,
  onDeleteDevice,
  isAdmin,
  isMatrizOperator,
  ordenarPor = 'loja',
  ordemDir = 'asc',
  onSortChange,
}) => {
  const { copiedKey, copy } = useCopyFeedback();

  const isBenchSubnet = (ip?: string | null) => {
    return Boolean(ip && ip.startsWith('192.168.88.'));
  };

  const isLinux = (sistema?: string | null) => {
    return Boolean(sistema && !sistema.toLowerCase().includes('windows'));
  };

  const getSyncStatus = (device: DeviceListItem) => {
    if (device.status_conexao) {
      const dot =
        device.status_conexao === 'online'
          ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
          : device.status_conexao === 'alerta'
          ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]'
          : 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]';
      return {
        status: device.status_conexao,
        text: `${device.status_conexao_label || ''} (${device.tempo_relativo_coleta || ''})`,
        dotClass: dot,
      };
    }
    const dataColeta = device.data_coleta;
    if (!dataColeta) {
      return { status: 'offline', text: 'Sem comunicação (+48h)', dotClass: 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]' };
    }
    const cleanStr = String(dataColeta).trim().replace(' ', 'T');
    const timestamp = new Date(cleanStr).getTime();
    if (isNaN(timestamp)) {
      return { status: 'offline', text: 'Sem comunicação (+48h)', dotClass: 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]' };
    }
    const diffHours = (Date.now() - timestamp) / (1000 * 60 * 60);
    if (diffHours < 24) {
      return { status: 'online', text: 'Ativa (< 24h)', dotClass: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]' };
    }
    if (diffHours < 48) {
      return { status: 'alerta', text: 'Atenção (24h - 48h)', dotClass: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]' };
    }
    return { status: 'offline', text: 'Inativa (+48h)', dotClass: 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]' };
  };

  const renderStatusBadge = (dev: DeviceListItem) => {
    const label =
      dev.status_operacional_label ||
      (dev.status === 'OK'
        ? 'Atualizada'
        : dev.status === 'UPGRADE_REQUIRED'
        ? 'Atualização Necessária'
        : 'Desatualizada');
    const nivel =
      dev.status_operacional_nivel ||
      (dev.status === 'OK' ? 'ok' : dev.status === 'UPGRADE_REQUIRED' ? 'warning' : 'danger');

    if (nivel === 'ok') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          <span>{label}</span>
        </span>
      );
    }
    if (nivel === 'warning') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/30">
          <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          <span>{label}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 border border-rose-500/30">
        <XCircle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
        <span>{label}</span>
      </span>
    );
  };

  const renderFirewallBadge = (dev: DeviceListItem) => {
    const bench = isBenchSubnet(dev.ip);

    // Ação direta na bancada (192.168.88.x)
    if (bench && dev.firewall_status !== 'confirmado') {
      if (dev.firewall_status === 'pendente') {
        if (isAdmin && onOpenApproval) {
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenApproval(dev);
              }}
              title="Clique para revisar e homologar cadastro do equipamento"
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 hover:scale-105 cursor-pointer shadow-xs transition-all"
            >
              <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              <span>Homologar</span>
            </button>
          );
        }
        if (isMatrizOperator && onOpenPatrimonio) {
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenPatrimonio(dev);
              }}
              title="Clique para ajustar dados do patrimônio ou solicitação na bancada"
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 cursor-pointer shadow-xs transition-all"
            >
              <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              <span>Pendente - Ajustar</span>
            </button>
          );
        }
      } else {
        // Não solicitado ou rejeitado na bancada .88
        if ((isMatrizOperator || isAdmin) && onOpenPatrimonio) {
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenPatrimonio(dev);
              }}
              title="Clique para cadastrar patrimônio e solicitar liberação no firewall"
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-orange-500/15 text-orange-600 dark:text-orange-300 border border-orange-500/30 hover:bg-orange-500/25 cursor-pointer shadow-xs transition-all"
            >
              <Tag className="h-3 w-3 text-orange-400" />
              <span>Solicitar</span>
            </button>
          );
        }
      }
    }

    switch (dev.firewall_status) {
      case 'confirmado':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3" /> Confirmado
          </span>
        );
      case 'pendente':
        return (
          <button
            type="button"
            onClick={(e) => {
              if (isAdmin && onOpenApproval) {
                e.stopPropagation();
                onOpenApproval(dev);
              }
            }}
            title={
              isAdmin
                ? 'Clique para revisar e homologar cadastro do equipamento'
                : `Aguardando homologação no Firewall. Solicitado por: ${dev.firewall_solicitado_por || 'Operador'}`
            }
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold border transition-all ${
              isAdmin
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/30 hover:scale-105 cursor-pointer shadow-xs'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 cursor-default'
            }`}
          >
            <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            <span>Pendente {isAdmin ? '(Homologar)' : ''}</span>
          </button>
        );
      case 'rejeitado':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <XCircle className="h-3 w-3" /> Rejeitado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-elevated/60 px-2 py-0.5 text-[11px] text-fg-secondary border border-border-medium/60">
            Não solicitado
          </span>
        );
    }
  };

  const renderDiscoSingleLine = (device: DeviceListItem) => {
    const pct = device.disco_percentual || 0;
    const isCritico = pct >= 85;
    const isAlerta = pct >= 70 && pct < 85;
    const usado = device.disco_usado_formatado || device.disco_usado || '---';
    const total = device.disco_total_formatado || device.disco_total || '---';
    const livre = device.disco_livre_formatado || device.disco_livre || '---';

    const tipoStorage = device.disco_tipo || 'Não Identificado';
    const tooltipText = `Tipo: ${tipoStorage} — Usado: ${usado} / Total: ${total}${livre !== '---' ? ` (Livre: ${livre})` : ''}`;

    let tagClass = 'bg-elevated text-fg-secondary border-border-medium';
    let tagLabel = 'N/I';

    const tLower = (device.disco_tipo || '').trim().toLowerCase();
    if (tLower === 'nvme') {
      tagClass = 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30';
      tagLabel = 'NVMe';
    } else if (tLower === 'ssd') {
      tagClass = 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30';
      tagLabel = 'SSD';
    } else if (tLower === 'hdd') {
      tagClass = 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
      tagLabel = 'HDD';
    } else if (tLower === 'virtual') {
      tagClass = 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30';
      tagLabel = 'Virtual';
    }

    if (pct > 0 || device.disco_usado || device.disco_total) {
      return (
        <div
          className="flex flex-col gap-1 items-start w-28 cursor-help"
          title={tooltipText}
        >
          {/* Linha superior: Micro-tag de Tipo + Porcentagem */}
          <div className="flex items-center justify-between w-full">
            <span
              className={`text-[10px] leading-none px-1.5 py-0.5 rounded font-semibold border ${tagClass}`}
            >
              {tagLabel}
            </span>
            <span
              className={`font-semibold shrink-0 text-[11px] leading-none font-mono ${
                isCritico
                  ? 'text-rose-600 dark:text-rose-400 font-bold'
                  : isAlerta
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-gray-700 dark:text-slate-300'
              }`}
            >
              {pct > 0 ? `${Math.round(pct)}%` : (device.disco_percentual != null ? `${device.disco_percentual}%` : '---')}
            </span>
          </div>

          {/* Linha inferior: Barrinha de percentual do disco com trilha bg-slate-800 */}
          <div className="w-full h-1.5 rounded-full bg-elevated overflow-hidden shrink-0 border border-border-medium/50">
            <div
              className={`h-full rounded-full transition-all ${
                isCritico ? 'bg-rose-500' : isAlerta ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
            />
          </div>
        </div>
      );
    }
    return <span className="text-fg-muted text-xs">---</span>;
  };

  const renderOsIcon = (device: DeviceListItem) => {
    const isWin = device.familia_so === 'Windows' || !isLinux(device.sistema);
    if (isWin) {
      return (
        <span className="inline-flex text-sky-600 dark:text-[#38BDF8] shrink-0" title="Windows">
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
          </svg>
        </span>
      );
    }
    return (
      <span className="inline-flex text-[#F97316] shrink-0" title="Linux">
        <Terminal className="w-3.5 h-3.5" />
      </span>
    );
  };

  const renderSortIcon = (col: string) => {
    const isSorted =
      ordenarPor === col || (col === 'loja' && (ordenarPor === 'loja' || ordenarPor === 'filial'));
    if (!isSorted) {
      return (
        <ArrowUpDown className="h-3 w-3 text-fg-muted group-hover/th:text-gray-700 dark:group-hover/th:text-slate-300 transition-colors shrink-0" />
      );
    }
    if (ordemDir === 'desc') {
      return <ArrowDown className="h-3 w-3 text-orange-400 shrink-0" />;
    }
    return <ArrowUp className="h-3 w-3 text-orange-400 shrink-0" />;
  };

  const isColSorted = (col: string) => {
    return ordenarPor === col || (col === 'loja' && (ordenarPor === 'loja' || ordenarPor === 'filial'));
  };

  return (
    <div className="rounded-xl border border-border-subtle bg-surface shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border-subtle bg-app text-[11px] font-semibold uppercase tracking-wider text-fg-secondary select-none">
              <th
                onClick={() => onSortChange?.('loja')}
                className={`py-2.5 px-3 whitespace-nowrap cursor-pointer hover:bg-elevated/60 transition-colors group/th ${
                  isColSorted('loja') ? 'text-orange-400 font-bold' : ''
                }`}
                title="Clique para alternar ordenação por Filial"
              >
                <div className="inline-flex items-center gap-1">
                  <span>Filial</span>
                  {renderSortIcon('loja')}
                </div>
              </th>
              <th className="py-2.5 px-3 whitespace-nowrap">Hostname</th>
              <th
                onClick={() => onSortChange?.('ip')}
                className={`py-2.5 px-3 whitespace-nowrap cursor-pointer hover:bg-elevated/60 transition-colors group/th ${
                  isColSorted('ip') ? 'text-orange-400 font-bold' : ''
                }`}
                title="Clique para alternar ordenação por IP"
              >
                <div className="inline-flex items-center gap-1">
                  <span>IP</span>
                  {renderSortIcon('ip')}
                </div>
              </th>
              <th className="py-2.5 px-3 whitespace-nowrap">MAC</th>
              <th
                onClick={() => onSortChange?.('disco')}
                className={`py-2.5 px-3 whitespace-nowrap cursor-pointer hover:bg-elevated/60 transition-colors group/th ${
                  isColSorted('disco') ? 'text-orange-400 font-bold' : ''
                }`}
                title="Clique para alternar ordenação por Uso de Disco"
              >
                <div className="inline-flex items-center gap-1">
                  <span>Disco</span>
                  {renderSortIcon('disco')}
                </div>
              </th>
              <th className="py-2.5 px-3 whitespace-nowrap">SO / Versão</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Firewall</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Patrimônio</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {loading ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-fg-secondary text-sm">
                  <div className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-orange-400 animate-ping" />
                    <span>Carregando dispositivos...</span>
                  </div>
                </td>
              </tr>
            ) : devices.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-fg-muted text-sm">
                  Nenhum dispositivo encontrado com os filtros selecionados.
                </td>
              </tr>
            ) : (
              devices.map((device) => {
                const bench = isBenchSubnet(device.ip);
                const sync = getSyncStatus(device);
                const filialInfo = formatarCodigoFilial(device.loja, device.site_id);
                const soFormatado = device.so_formatado || device.versao || device.sistema || 'SO não informado';

                return (
                  <tr
                    key={device.id}
                    onClick={() => onSelectDevice(device)}
                    className="hover:bg-elevated/90 transition-colors cursor-pointer group"
                    title="Clique para abrir detalhes desta máquina"
                  >
                    {/* 1. FILIAL (Badges Translúcidos de Alto Contraste) */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {filialInfo.isUnlinked ? (
                        <span className="inline-flex items-center rounded-md bg-surface/60 px-2 py-0.5 text-xs font-medium text-fg-secondary border border-border-subtle">
                          {filialInfo.text}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-elevated/80 px-2 py-0.5 text-xs font-semibold text-fg border border-border-medium">
                          {filialInfo.text}
                        </span>
                      )}
                    </td>

                    {/* 2. HOSTNAME (Strictly single-line: dot + hostname + hover copy + optional HW alert icon) */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${sync.dotClass}`}
                          title={sync.text}
                        />
                        <strong className="text-fg group-hover:text-orange-400 transition-colors font-medium">
                          {device.hostname}
                        </strong>
                        {device.alerta_hardware && (
                          <span title={`Alerta HW: ${device.alerta_hardware}`} className="inline-flex shrink-0">
                            <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400 cursor-help" />
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => copy(device.hostname, `host_${device.id}`, 'Hostname', e)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-fg-muted hover:text-gray-700 dark:hover:text-slate-300 transition-opacity"
                          title="Copiar hostname"
                        >
                          {copiedKey === `host_${device.id}` ? (
                            <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* 3. IP (Coluna própria com botão copiar e badge .88 / +N) */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-xs">
                      <div className="flex items-center gap-1">
                        <span className={bench ? 'font-bold text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-slate-300'}>
                          {device.ip || '---'}
                        </span>
                        {device.ip && (
                          <button
                            type="button"
                            onClick={(e) => copy(device.ip!, `ip_${device.id}`, 'IP', e)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-fg-muted hover:text-gray-700 dark:hover:text-slate-300 transition-opacity"
                            title="Copiar IP Principal"
                          >
                            {copiedKey === `ip_${device.id}` ? (
                              <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        )}
                        {bench && (
                          <span className="rounded bg-amber-500/15 px-1 py-0.2 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            .88
                          </span>
                        )}
                        {device.ips_extras && device.ips_extras.length > 0 && (
                          <span
                            className="inline-flex items-center rounded bg-elevated hover:bg-border-subtle px-1.5 py-0.2 text-[10px] font-bold text-gray-700 dark:text-slate-300 border border-border-medium transition-colors cursor-help"
                            title={`IPs adicionais: ${device.ips_extras.join(', ')}`}
                          >
                            +{device.ips_extras.length}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 4. MAC (Coluna própria em fonte mono + copiar) */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-xs text-fg-secondary">
                      <div className="flex items-center gap-1">
                        <span>{device.mac || '---'}</span>
                        {device.mac && (
                          <button
                            type="button"
                            onClick={(e) => copy(device.mac!, `mac_${device.id}`, 'MAC', e)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-fg-muted hover:text-gray-700 dark:hover:text-slate-300 transition-opacity"
                            title="Copiar MAC"
                          >
                            {copiedKey === `mac_${device.id}` ? (
                              <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* 5. DISCO (Compactado em 1 linha horizontal: barra + % + usado/total) */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {renderDiscoSingleLine(device)}
                    </td>

                    {/* 6. SO / VERSÃO (Ícone + so_formatado) */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-fg font-medium">
                        {renderOsIcon(device)}
                        <span className="truncate max-w-[200px]" title={soFormatado}>
                          {soFormatado}
                        </span>
                      </div>
                    </td>

                    {/* 7. STATUS (Badge Atualizada / Atualização Necessária / Desatualizada) */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {renderStatusBadge(device)}
                    </td>

                    {/* 8. FIREWALL (Status / Ação na Bancada .88 ou Homologação) */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {renderFirewallBadge(device)}
                    </td>

                    {/* 9. PATRIMÔNIO (Badge técnico elegante em laranja suave) */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {device.patrimonio ? (
                        <div className="flex items-center gap-1 font-mono font-bold text-orange-600 dark:text-orange-300 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/25 w-fit text-xs">
                          <span>
                            {device.patrimonio.startsWith('pat.')
                              ? device.patrimonio
                              : `pat.${device.patrimonio.replace(/\D/g, '') || device.patrimonio}`}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => copy(device.patrimonio!, `pat_${device.id}`, 'Patrimônio', e)}
                            className="p-0.5 text-orange-400/80 hover:text-orange-200"
                            title="Copiar Patrimônio"
                          >
                            {copiedKey === `pat_${device.id}` ? (
                              <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-fg-muted italic text-xs">Não informado</span>
                      )}
                    </td>

                    {/* 10. AÇÕES (Limpa: Homologação se pendente/bancada, Resolver Alerta, Excluir) */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Homologação (Admin) */}
                        {isAdmin && onOpenApproval && (
                          <button
                            type="button"
                            onClick={() => onOpenApproval(device)}
                            title="Homologação e Ajuste Cadastral"
                            className={`rounded p-1.5 transition-colors ${
                              device.firewall_status === 'pendente' || bench
                                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30 ring-1 ring-amber-500/40'
                                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                            }`}
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* Resolver Alerta */}
                        {isAdmin && device.alerta_hardware && onClearAlert && (
                          <button
                            type="button"
                            onClick={() => onClearAlert(device)}
                            title="Resolver / Limpar Alerta de Hardware"
                            className="rounded p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* Excluir Máquina */}
                        {isAdmin && onDeleteDevice && (
                          <button
                            type="button"
                            onClick={() => onDeleteDevice(device)}
                            title="Excluir Dispositivo"
                            className="rounded p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* Barra de Paginação Inferior */}
      <div className="flex items-center justify-between border-t border-border-subtle px-4 py-3 bg-app text-xs text-fg-secondary">
        <div>
          Exibindo{' '}
          <span className="font-semibold text-fg font-mono tabular-nums">
            {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.per_page + 1}
          </span>{' '}
          a{' '}
          <span className="font-semibold text-fg font-mono tabular-nums">
            {Math.min(pagination.page * pagination.per_page, pagination.total)}
          </span>{' '}
          de <span className="font-semibold text-fg font-mono tabular-nums">{pagination.total}</span> registros
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1 || loading}
            className="flex items-center gap-1 rounded border border-border-medium bg-elevated px-2.5 py-1 text-gray-700 dark:text-slate-300 hover:bg-border-subtle hover:text-fg disabled:opacity-40 transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Anterior
          </button>
          <span>
            Página <strong className="font-semibold text-fg">{pagination.page}</strong> de{' '}
            {pagination.total_pages || 1}
          </span>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.total_pages || loading}
            className="flex items-center gap-1 rounded border border-border-medium bg-elevated px-2.5 py-1 text-gray-700 dark:text-slate-300 hover:bg-border-subtle hover:text-fg disabled:opacity-40 transition-colors cursor-pointer"
          >
            Próxima <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
