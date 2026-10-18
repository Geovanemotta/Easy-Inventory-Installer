import React from 'react';
import {
  Printer,
  Radio,
  Wifi,
  Scale,
  Monitor,
  ShoppingCart,
  Cpu,
  Zap,
  Edit2,
  Trash2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Network,
} from 'lucide-react';
import { NetworkAsset } from '@/types/networkAsset';
import { formatarCodigoFilial } from '@/pages/devices/components/DeviceTable';
import { useCopyFeedback } from '@/utils/clipboard';

export type AssetSortField = 'nome' | 'tipo' | 'filial' | 'ip' | 'status' | 'patrimonio';

interface NetworkAssetsTableProps {
  assets: NetworkAsset[];
  loading: boolean;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  sortField: AssetSortField;
  sortAsc: boolean;
  onSort: (field: AssetSortField) => void;
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: number) => void;
  onPing: (asset: NetworkAsset) => Promise<void>;
  pingingId: number | string | null;
  onViewDetails: (asset: NetworkAsset) => void;
  onEdit: (asset: NetworkAsset) => void;
  onDelete: (asset: NetworkAsset) => void;
  isAdmin: boolean;
}

export function formatarMac(m: string | null | undefined): string {
  if (!m) return '—';
  const hex = m.toLowerCase().replace(/[^0-9a-f]/g, '');
  if (hex.length === 12) {
    return hex.match(/.{2}/g)!.join(':');
  }
  return m.replace(/-/g, ':');
}

export function getTipoIcon(tipo: string) {
  const t = (tipo || '').toUpperCase();
  if (t.includes('IMPRESSORA')) return Printer;
  if (t.includes('SWITCH') || t.includes('ROTEADOR') || t.includes('FIREWALL')) return Radio;
  if (t.includes('POINT') || t.includes('WIFI') || /\bAP\b/.test(t)) return Wifi;
  if (t.includes('BALAN')) return Scale;
  if (t.includes('DESKTOP') || t.includes('NOTEBOOK') || t.includes('ESTAÇÃO')) return Monitor;
  if (t.includes('PDV') || t.includes('CAIXA')) return ShoppingCart;
  return Cpu;
}

export const NetworkAssetsTable: React.FC<NetworkAssetsTableProps> = ({
  assets,
  loading,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  sortField,
  sortAsc,
  onSort,
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  onPing,
  pingingId,
  onViewDetails,
  onEdit,
  onDelete,
  isAdmin,
}) => {
  const { copiedKey, copy } = useCopyFeedback();

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const isAllSelected =
    assets.length > 0 &&
    assets.every((a) => a.id && selectedIds.has(a.id));

  if (loading && assets.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto mb-3" />
        <span className="text-xs">Carregando ativos de rede...</span>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400">
        <Network className="h-8 w-8 mx-auto text-slate-300 mb-2" />
        <h4 className="text-sm font-semibold text-slate-700">Nenhum ativo de rede encontrado</h4>
        <p className="text-xs text-slate-400 mt-1">
          Ajuste os filtros de pesquisa ou cadastre novos equipamentos de rede.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Tabela Principal Compacta */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-600 select-none">
              <tr>
                {isAdmin && (
                  <th className="py-2.5 px-3 w-8 text-center whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={onToggleSelectAll}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                )}
                {/* 1. FILIAL */}
                <th
                  className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => onSort('filial')}
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Filial</span>
                    <ArrowUpDown className={`h-3 w-3 ${sortField === 'filial' ? (sortAsc ? 'text-blue-600' : 'text-blue-600 rotate-180') : 'text-slate-300'}`} />
                  </div>
                </th>

                {/* 2. IP */}
                <th
                  className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => onSort('ip')}
                >
                  <div className="inline-flex items-center gap-1">
                    <span>IP</span>
                    <ArrowUpDown className={`h-3 w-3 ${sortField === 'ip' ? (sortAsc ? 'text-blue-600' : 'text-blue-600 rotate-180') : 'text-slate-300'}`} />
                  </div>
                </th>

                {/* 3. TIPO */}
                <th
                  className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => onSort('tipo')}
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Tipo</span>
                    <ArrowUpDown className={`h-3 w-3 ${sortField === 'tipo' ? (sortAsc ? 'text-blue-600' : 'text-blue-600 rotate-180') : 'text-slate-300'}`} />
                  </div>
                </th>

                {/* 4. NOME DO EQUIPAMENTO */}
                <th
                  className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => onSort('nome')}
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Nome do Equipamento</span>
                    <ArrowUpDown className={`h-3 w-3 ${sortField === 'nome' ? (sortAsc ? 'text-blue-600' : 'text-blue-600 rotate-180') : 'text-slate-300'}`} />
                  </div>
                </th>

                {/* 5. PATRIMÔNIO */}
                <th
                  className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => onSort('patrimonio')}
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Patrimônio</span>
                    <ArrowUpDown className={`h-3 w-3 ${sortField === 'patrimonio' ? (sortAsc ? 'text-blue-600' : 'text-blue-600 rotate-180') : 'text-slate-300'}`} />
                  </div>
                </th>

                {/* 6. MAC */}
                <th className="py-2.5 px-3 whitespace-nowrap">MAC</th>

                {/* 7. VLAN */}
                <th className="py-2.5 px-3 whitespace-nowrap">VLAN / Faixa</th>

                {/* 8. STATUS */}
                <th
                  className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => onSort('status')}
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Status</span>
                    <ArrowUpDown className={`h-3 w-3 ${sortField === 'status' ? (sortAsc ? 'text-blue-600' : 'text-blue-600 rotate-180') : 'text-slate-300'}`} />
                  </div>
                </th>

                {/* 9. AÇÕES */}
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {assets.map((asset, idx) => {
                const Icon = getTipoIcon(asset.tipo);
                const isSelected = asset.id ? selectedIds.has(asset.id) : false;
                const isLivre = asset.origem === 'livre';
                const isEstacao = asset.origem === 'estacao';
                const isPinging = Boolean(
                  pingingId !== null && (
                    (asset.id !== null && asset.id !== undefined && String(pingingId) === String(asset.id)) ||
                    (asset.device_id !== null && asset.device_id !== undefined && (String(pingingId) === String(-asset.device_id) || String(pingingId) === String(asset.device_id))) ||
                    (isLivre && asset.ip && String(pingingId) === String(asset.ip))
                  )
                );

                const filialInfo = formatarCodigoFilial(asset.site_nome, asset.site_id);
                const filialDisplay = asset.filial_codigo || filialInfo.text;
                const isBench = Boolean(asset.ip && asset.ip.startsWith('192.168.88.'));

                // Subtítulo abaixo do hostname:
                // - Estações de Trabalho: apenas "Windows" ou "Linux" (família do SO)
                // - Ativos de rede físicos: Marca / Modelo se preenchido na edição
                // - IPs Livres: nenhum subtítulo
                let subtitulo: string | null = null;
                if (isEstacao) {
                  const soStr = (asset.sistema_operacional || asset.marca_modelo || '').toLowerCase();
                  subtitulo = soStr.includes('lin') || soStr.includes('kubuntu') || soStr.includes('ubuntu') || soStr.includes('zorin')
                    ? 'Linux'
                    : 'Windows';
                } else if (!isLivre) {
                  subtitulo = asset.marca_modelo || (asset.fabricante && asset.modelo ? `${asset.fabricante} ${asset.modelo}` : asset.fabricante || asset.modelo) || null;
                }

                return (
                  <tr
                    key={asset.id ? `asset-${asset.id}` : `free-${asset.ip}-${idx}`}
                    onClick={() => {
                      if (!isLivre) {
                        onViewDetails(asset);
                      }
                    }}
                    className={`transition-colors group ${
                      isSelected
                        ? 'bg-blue-50/60'
                        : isLivre
                        ? 'bg-amber-50/20 hover:bg-amber-50/40 text-slate-400 cursor-default'
                        : 'hover:bg-blue-50/40 cursor-pointer'
                    }`}
                    title={isLivre ? 'Endereço IP livre na faixa' : 'Clique para abrir detalhes desta máquina / ativo'}
                  >
                    {/* Checkbox */}
                    {isAdmin && (
                      <td
                        className="py-2.5 px-3 text-center whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {asset.id ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSelect(asset.id!)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        ) : null}
                      </td>
                    )}

                    {/* 1. FILIAL (Badge curto padrão idêntico a Estações) */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {filialInfo.isUnlinked ? (
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">
                          {filialDisplay}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                          {filialDisplay}
                        </span>
                      )}
                    </td>

                    {/* 2. IP (com cópia no hover e badge .88 se bancada) */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-xs">
                      {asset.ip ? (
                        <div className="flex items-center gap-1">
                          <span className={isBench ? 'font-bold text-orange-700' : 'text-slate-800'}>
                            {asset.ip}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => copy(asset.ip!, `ip_${asset.id ?? asset.ip}`, 'IP', e)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-slate-700 transition-opacity"
                            title="Copiar IP"
                          >
                            {copiedKey === `ip_${asset.id ?? asset.ip}` ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                          {isBench && (
                            <span className="rounded bg-orange-100 px-1 py-0.2 text-[10px] font-bold text-orange-800">
                              .88
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 font-mono">—</span>
                      )}
                    </td>

                    {/* 3. TIPO (Traço discreto se IP Livre; Badge com ícone para os demais) */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isLivre ? (
                        <span className="text-slate-300 font-mono pl-1">—</span>
                      ) : isEstacao ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200">
                          <Monitor className="h-3 w-3 text-blue-600" />
                          <span>Estação</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200">
                          <Icon className="h-3 w-3 text-slate-500" />
                          <span>{asset.tipo || '—'}</span>
                        </span>
                      )}
                    </td>

                    {/* 4. NOME DO EQUIPAMENTO (Nome + Subtítulo OS family/Marca, sem filial embaixo) */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <strong className={`group-hover:text-blue-600 transition-colors ${isLivre ? 'text-slate-400 italic' : 'text-slate-900'}`}>
                          {asset.nome || '—'}
                        </strong>
                        {subtitulo && !isLivre && (
                          <span className="text-[10px] text-slate-400 font-normal truncate max-w-xs">
                            {subtitulo}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 5. PATRIMÔNIO (Badge pat.XXXXX padronizado) */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {asset.patrimonio ? (
                        <div className="flex items-center gap-1 font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200 w-fit text-xs">
                          <span>
                            {asset.patrimonio.startsWith('pat.')
                              ? asset.patrimonio
                              : `pat.${asset.patrimonio.replace(/\D/g, '') || asset.patrimonio}`}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => copy(asset.patrimonio!, `pat_${asset.id ?? asset.patrimonio}`, 'Patrimônio', e)}
                            className="p-0.5 text-red-400 hover:text-red-700"
                            title="Copiar Patrimônio"
                          >
                            {copiedKey === `pat_${asset.id ?? asset.patrimonio}` ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-300 italic text-xs font-mono">—</span>
                      )}
                    </td>

                    {/* 6. MAC (Fonte mono com cópia) */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <span>{formatarMac(asset.mac)}</span>
                        {asset.mac && (
                          <button
                            type="button"
                            onClick={(e) => copy(asset.mac!, `mac_${asset.id ?? asset.mac}`, 'MAC', e)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-slate-700 transition-opacity"
                            title="Copiar MAC"
                          >
                            {copiedKey === `mac_${asset.id ?? asset.mac}` ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* 7. VLAN / FAIXA */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {asset.vlan || asset.faixa_nome ? (
                        <span
                          className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200 truncate max-w-[150px]"
                          title={asset.faixa_nome || asset.vlan || ''}
                        >
                          {asset.vlan || asset.faixa_nome}
                        </span>
                      ) : (
                        <span className="text-slate-300 font-mono">—</span>
                      )}
                    </td>

                    {/* 8. STATUS (Apenas bolinha colorida + XX ms quando houver, sem texto) */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isLivre ? (
                        asset.status_online === true ? (
                          <span
                            className="inline-flex items-center gap-1.5 font-semibold text-amber-700 cursor-help"
                            title={`Alerta: IP sem cadastro respondendo na rede${asset.tempo_resposta_ms != null ? ` (${asset.tempo_resposta_ms}ms)` : ''}${asset.ultimo_ping ? ` - Testado em: ${new Date(asset.ultimo_ping).toLocaleString()}` : ''}`}
                          >
                            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                            {asset.tempo_resposta_ms != null && (
                              <span className="font-mono text-[11px] text-amber-600 font-semibold">{asset.tempo_resposta_ms}ms</span>
                            )}
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center text-rose-500 cursor-help"
                            title={
                              asset.status_online === false
                                ? `IP Livre confirmado - Sem resposta na rede (desocupado)${asset.ultimo_ping ? ` - Testado em: ${new Date(asset.ultimo_ping).toLocaleString()}` : ''}`
                                : 'IP Livre - Sem resposta de rede (desocupado)'
                            }
                          >
                            <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                          </span>
                        )
                      ) : asset.status_online === true ? (
                        <span
                          className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 cursor-help"
                          title={`Online - Último ping respondido: ${asset.ultimo_ping ? new Date(asset.ultimo_ping).toLocaleString() : 'recente'}${asset.tempo_resposta_ms != null ? ` (${asset.tempo_resposta_ms}ms)` : ''}`}
                        >
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                          {asset.tempo_resposta_ms != null && (
                            <span className="font-mono text-[11px] text-emerald-600 font-semibold">{asset.tempo_resposta_ms}ms</span>
                          )}
                        </span>
                      ) : asset.status_online === false ? (
                        <span
                          className="inline-flex items-center text-rose-500 cursor-help"
                          title={`Offline - Sem resposta de ping${asset.ultimo_ping ? ` (Último teste: ${new Date(asset.ultimo_ping).toLocaleString()})` : ''}`}
                        >
                          <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center text-slate-400 cursor-help"
                          title="Não testado recentemente"
                        >
                          <span className="h-2 w-2 rounded-full bg-slate-300 shrink-0" />
                        </span>
                      )}
                    </td>

                    {/* 9. AÇÕES (Ping rápido habilitado também para IPs Livres, Editar, Excluir) */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {asset.ip && (
                          <button
                            type="button"
                            onClick={() => onPing(asset)}
                            disabled={isPinging}
                            className="rounded p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors disabled:opacity-50"
                            title={isLivre ? 'Testar se IP está realmente livre (Ping)' : 'Testar Conectividade (Ping)'}
                          >
                            <Zap className={`h-3.5 w-3.5 ${isPinging ? 'animate-pulse text-amber-500' : ''}`} />
                          </button>
                        )}

                        {isAdmin && !isLivre && !isEstacao && (
                          <>
                            <button
                              type="button"
                              onClick={() => onEdit(asset)}
                              className="rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              title="Editar Ativo"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onDelete(asset)}
                              className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Excluir Ativo"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Controles de Paginação */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 px-1">
        <div className="flex items-center gap-2">
          <span>Exibindo</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value={25}>25 por página</option>
            <option value={50}>50 por página</option>
            <option value={100}>100 por página</option>
          </select>
          <span>de <strong>{totalItems}</strong> ativo(s)</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Anterior</span>
          </button>

          <span className="px-2 font-mono font-bold text-slate-800">
            {page} / {totalPages}
          </span>

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            <span>Próxima</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
