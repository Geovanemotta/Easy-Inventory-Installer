import React, { useState } from 'react';
import {
  X,
  Zap,
  Edit2,
  Trash2,
  Copy,
  Check,
  Cpu,
  Radio,
  Key,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Monitor,
} from 'lucide-react';
import { NetworkAsset } from '@/types/networkAsset';
import { Site } from '@/types/site';
import { formatarMac, getTipoIcon } from './NetworkAssetsTable';
import { AssignLicenseModal } from './AssignLicenseModal';
import { licenseService } from '@/services/licenseService';
import { copyToClipboard as robustCopy } from '@/utils/clipboard';

interface NetworkAssetDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  asset: NetworkAsset | null;
  site?: Site;
  isAdmin: boolean;
  onEdit: (asset: NetworkAsset) => void;
  onDelete: (asset: NetworkAsset) => void;
  onPing: (asset: NetworkAsset) => Promise<void>;
  isPinging: boolean;
  onUpdateAsset?: (updated: NetworkAsset) => void;
  showToast: (msg: string) => void;
}

export const NetworkAssetDetailsDrawer: React.FC<NetworkAssetDetailsDrawerProps> = ({
  isOpen,
  onClose,
  asset,
  site,
  isAdmin,
  onEdit,
  onDelete,
  onPing,
  isPinging,
  onUpdateAsset,
  showToast,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal de atribuição de licença
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [targetSlot, setTargetSlot] = useState<'windows' | 'office'>('windows');
  const [unbindingSlot, setUnbindingSlot] = useState<'windows' | 'office' | null>(null);

  if (!isOpen || !asset) return null;

  const copyToClipboard = (text: string, label: string, e?: React.MouseEvent) => {
    robustCopy(text, label, e);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const isLivre = asset.origem === 'livre';
  const isEstacao = asset.origem === 'estacao' || Boolean(asset.device_id);
  const canModify = isAdmin && !isLivre && !isEstacao;

  const TipoIcon = isEstacao ? Monitor : getTipoIcon(asset.tipo || '');

  const formatRelativeTime = (dateStr?: string | null) => {
    if (!dateStr) return 'Nunca testado';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Data inválida';
    const sec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (sec < 60) return 'Agora mesmo';
    const min = Math.floor(sec / 60);
    if (min < 60) return `Há ${min} min`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `Há ${hrs} h`;
    const days = Math.floor(hrs / 24);
    return `Há ${days} d atrás (${d.toLocaleDateString('pt-BR')})`;
  };

  // Desvincular serial rápido
  const handleUnbindSerial = async (slot: 'windows' | 'office') => {
    const slotLabel = slot === 'windows' ? 'Windows' : 'Office';
    const curKey = slot === 'windows' ? asset.serial_windows : asset.serial_office;

    if (!curKey) return;
    if (!window.confirm(`Deseja remover e desvincular a chave de ${slotLabel} (${curKey}) de "${asset.nome}"?`)) {
      return;
    }

    setUnbindingSlot(slot);
    try {
      const effectiveDeviceId = asset.device_id
        ? asset.device_id
        : asset.id && asset.id < 0
        ? Math.abs(asset.id)
        : undefined;
      const effectiveNetworkAssetId = !isEstacao && asset.id && asset.id > 0 ? asset.id : undefined;

      await licenseService.assignLicense({
        device_id: effectiveDeviceId,
        network_asset_id: effectiveNetworkAssetId,
        slot,
        chave: null,
      });

      const updated: NetworkAsset = {
        ...asset,
        ...(slot === 'windows' ? { serial_windows: null } : { serial_office: null }),
      };

      if (onUpdateAsset) onUpdateAsset(updated);
      showToast(`Licença de ${slotLabel} desvinculada com sucesso.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Erro ao desvincular chave: ${msg}`);
    } finally {
      setUnbindingSlot(null);
    }
  };

  const handleOpenLicenseModal = (slot: 'windows' | 'office') => {
    setTargetSlot(slot);
    setLicenseModalOpen(true);
  };

  const handleLicenseAssigned = (slot: 'windows' | 'office', chave: string | null) => {
    const updated: NetworkAsset = {
      ...asset,
      ...(slot === 'windows' ? { serial_windows: chave } : { serial_office: chave }),
    };
    if (onUpdateAsset) onUpdateAsset(updated);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-xl border mt-0.5 ${
                  isEstacao
                    ? 'bg-blue-50 border-blue-200 text-blue-600'
                    : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                }`}
              >
                <TipoIcon className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-800 leading-snug">
                    {asset.nome || 'Ativo de Rede'}
                  </h2>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isEstacao
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : isLivre
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {isEstacao ? 'Estação Integrada' : asset.origem}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                  <span>{isEstacao ? 'Estação de Trabalho Windows/Linux' : asset.tipo || 'Equipamento de Rede'}</span>
                  {site && (
                    <>
                      <span>•</span>
                      <span>
                        {site.code} - {site.name}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Action Bar */}
          <div className="px-6 py-3 border-b border-slate-100 bg-white flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {asset.status_online === true ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Online
                  {asset.tempo_resposta_ms !== undefined && asset.tempo_resposta_ms !== null && (
                    <span className="text-[10px] text-emerald-600 font-mono">
                      ({asset.tempo_resposta_ms} ms)
                    </span>
                  )}
                </span>
              ) : asset.status_online === false ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                  Offline
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                  Não testado
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {asset.ip && (
                <button
                  type="button"
                  onClick={() => onPing(asset)}
                  disabled={isPinging}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50"
                  title="Testar conectividade (Ping ICMP)"
                >
                  <Zap className={`h-3.5 w-3.5 ${isPinging ? 'animate-spin text-blue-600' : ''}`} />
                  {isPinging ? 'Pingando...' : 'Testar Ping'}
                </button>
              )}

              {canModify && (
                <>
                  <button
                    type="button"
                    onClick={() => onEdit(asset)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(asset)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                    title="Excluir ativo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Se for ESTAÇÃO DE TRABALHO: Visualização Enxuta e Focada */}
            {isEstacao ? (
              <>
                {/* 1. Sistema Operacional & Rede */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-blue-600" />
                    Sistema Operacional &amp; Conectividade
                  </h3>

                  {/* SO Badge */}
                  <div className="p-3 rounded-lg bg-white border border-blue-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Sistema Operacional
                      </span>
                      <span className="text-sm font-bold text-slate-800">
                        {asset.sistema_operacional || 'Sistema Integrado (Agente de Inventário)'}
                      </span>
                    </div>
                    {asset.patrimonio && (
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Patrimônio
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-700">
                          {asset.patrimonio}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-[11px] font-medium text-slate-400 block mb-1">
                        Endereço IPv4
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-slate-800">
                          {asset.ip || '—'}
                        </span>
                        {asset.ip && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(asset.ip!, 'ip')}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded"
                            title="Copiar IP"
                          >
                            {copiedKey === 'ip' ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-[11px] font-medium text-slate-400 block mb-1">
                        Endereço MAC
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-semibold text-slate-800">
                          {formatarMac(asset.mac)}
                        </span>
                        {asset.mac && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(formatarMac(asset.mac), 'mac')}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded"
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
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      Último Ping:
                    </span>
                    <span className="font-semibold text-slate-700">
                      {formatRelativeTime(asset.ultimo_ping)}
                    </span>
                  </div>

                  {asset.faixa_nome && (
                    <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-400">VLAN / Sub-rede:</span>
                      <span className="font-semibold text-slate-800">{asset.faixa_nome}</span>
                    </div>
                  )}
                </div>

                {/* 2. Licenças & Seriais (Windows / Office) com Ações do Admin */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-2">
                    <Key className="h-4 w-4 text-amber-600" />
                    Chaves &amp; Licenciamento (Windows / Office)
                  </h3>

                  <div className="space-y-2.5">
                    {/* Slot Windows */}
                    <div className="p-3 rounded-xl bg-white border border-amber-200/80 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Serial Windows</span>
                        {isAdmin && (
                          <div className="flex items-center gap-1.5">
                            {asset.serial_windows && (
                              <button
                                type="button"
                                onClick={() => handleUnbindSerial('windows')}
                                disabled={unbindingSlot === 'windows'}
                                className="px-2 py-0.5 rounded text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors disabled:opacity-50"
                                title="Desvincular chave"
                              >
                                {unbindingSlot === 'windows' ? 'Removendo...' : '✕ Remover'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenLicenseModal('windows')}
                              className="px-2 py-0.5 rounded text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                            >
                              {asset.serial_windows ? 'Alterar' : '+ Atribuir'}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                        {isAdmin ? (
                          asset.serial_windows ? (
                            <span className="font-mono text-xs font-bold text-slate-800 tracking-wide select-all">
                              {asset.serial_windows}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              — Nenhum serial de Windows vinculado —
                            </span>
                          )
                        ) : (
                          asset.serial_windows ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Licenciado / Possui chave
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                              Sem chave
                            </span>
                          )
                        )}

                        {asset.serial_windows && isAdmin && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(asset.serial_windows!, 'win')}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded"
                            title="Copiar serial"
                          >
                            {copiedKey === 'win' ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Slot Office */}
                    <div className="p-3 rounded-xl bg-white border border-amber-200/80 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Serial Office</span>
                        {isAdmin && (
                          <div className="flex items-center gap-1.5">
                            {asset.serial_office && (
                              <button
                                type="button"
                                onClick={() => handleUnbindSerial('office')}
                                disabled={unbindingSlot === 'office'}
                                className="px-2 py-0.5 rounded text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors disabled:opacity-50"
                                title="Desvincular chave"
                              >
                                {unbindingSlot === 'office' ? 'Removendo...' : '✕ Remover'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenLicenseModal('office')}
                              className="px-2 py-0.5 rounded text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                            >
                              {asset.serial_office ? 'Alterar' : '+ Atribuir'}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                        {isAdmin ? (
                          asset.serial_office ? (
                            <span className="font-mono text-xs font-bold text-slate-800 tracking-wide select-all">
                              {asset.serial_office}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              — Nenhum serial de Office vinculado —
                            </span>
                          )
                        ) : (
                          asset.serial_office ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Licenciado / Possui chave
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                              Sem chave
                            </span>
                          )
                        )}

                        {asset.serial_office && isAdmin && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(asset.serial_office!, 'off')}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded"
                            title="Copiar serial"
                          >
                            {copiedKey === 'off' ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Visualização Padrão para Ativos de Rede Gerais (Impressoras, Switches, APs, etc.) */
              <>
                {/* 1. Conectividade & Rede */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Radio className="h-4 w-4 text-blue-600" />
                    Conectividade &amp; Rede
                  </h3>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[11px] font-medium text-slate-400 block mb-1">
                        Endereço IPv4
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-slate-800">
                          {asset.ip || '—'}
                        </span>
                        {asset.ip && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(asset.ip!, 'ip')}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded"
                            title="Copiar IP"
                          >
                            {copiedKey === 'ip' ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[11px] font-medium text-slate-400 block mb-1">
                        Endereço MAC
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-semibold text-slate-800">
                          {formatarMac(asset.mac)}
                        </span>
                        {asset.mac && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(formatarMac(asset.mac), 'mac')}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded"
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
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      Último Teste de Ping:
                    </span>
                    <span className="font-medium text-slate-700">
                      {formatRelativeTime(asset.ultimo_ping)}
                    </span>
                  </div>
                </div>

                {/* 2. Identificação do Equipamento */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-indigo-600" />
                    Especificações do Equipamento
                  </h3>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Filial</span>
                      <span className="font-semibold text-slate-800">
                        {site
                          ? `${site.code} - ${site.name}`
                          : asset.site_id
                          ? `Filial #${asset.site_id}`
                          : 'Sem filial vinculada'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Localização / Setor</span>
                      <span className="font-semibold text-slate-800">
                        {asset.localizacao || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Patrimônio / Tombamento</span>
                      <span className="font-semibold font-mono text-slate-800">
                        {asset.patrimonio || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Nº de Série</span>
                      <span className="font-semibold font-mono text-slate-800">
                        {asset.numero_serie || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Fabricante</span>
                      <span className="font-semibold text-slate-800">
                        {asset.fabricante || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Modelo</span>
                      <span className="font-semibold text-slate-800">
                        {asset.modelo || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Licenciamento de Software */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <Key className="h-4 w-4 text-amber-500" />
                      Licenças &amp; Ativações
                    </h3>
                  </div>

                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[11px] font-medium text-slate-400 block">
                          Serial Windows
                        </span>
                        {isAdmin ? (
                          <span className="font-mono text-xs font-semibold text-slate-800">
                            {asset.serial_windows || 'Nenhuma licença vinculada'}
                          </span>
                        ) : asset.serial_windows ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mt-0.5">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Licenciado / Possui chave
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200 mt-0.5">
                            Sem chave
                          </span>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          {asset.serial_windows && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(asset.serial_windows!, 'win')}
                              className="text-slate-400 hover:text-slate-600 p-1 rounded"
                              title="Copiar serial"
                            >
                              {copiedKey === 'win' ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenLicenseModal('windows')}
                            className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold px-2 py-0.5 bg-white border border-slate-200 rounded"
                          >
                            {asset.serial_windows ? 'Alterar' : '+ Atribuir'}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[11px] font-medium text-slate-400 block">
                          Serial Office
                        </span>
                        {isAdmin ? (
                          <span className="font-mono text-xs font-semibold text-slate-800">
                            {asset.serial_office || 'Nenhuma licença vinculada'}
                          </span>
                        ) : asset.serial_office ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mt-0.5">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Licenciado / Possui chave
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200 mt-0.5">
                            Sem chave
                          </span>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          {asset.serial_office && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(asset.serial_office!, 'office')}
                              className="text-slate-400 hover:text-slate-600 p-1 rounded"
                              title="Copiar serial"
                            >
                              {copiedKey === 'office' ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenLicenseModal('office')}
                            className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold px-2 py-0.5 bg-white border border-slate-200 rounded"
                          >
                            {asset.serial_office ? 'Alterar' : '+ Atribuir'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Observações */}
                {asset.observacoes && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-500" />
                      Observações e Anotações
                    </h3>
                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed whitespace-pre-line">
                      {asset.observacoes}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Atribuição de Licença */}
      <AssignLicenseModal
        isOpen={licenseModalOpen}
        onClose={() => setLicenseModalOpen(false)}
        asset={asset}
        slot={targetSlot}
        onAssigned={handleLicenseAssigned}
        showToast={showToast}
      />
    </div>
  );
};
