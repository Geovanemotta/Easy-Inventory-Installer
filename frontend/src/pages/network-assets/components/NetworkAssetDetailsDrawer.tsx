import React, { useState } from 'react';
import {
  X,
  Zap,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Monitor,
} from 'lucide-react';
import { NetworkAsset } from '@/types/networkAsset';
import { Site } from '@/types/site';
import { getTipoIcon } from './NetworkAssetsTable';
import { AssignLicenseModal } from './AssignLicenseModal';
import { licenseService } from '@/services/licenseService';
import { copyToClipboard as robustCopy } from '@/utils/clipboard';

import { NetworkAssetTelemetrySection } from './NetworkAssetTelemetrySection';
import { NetworkAssetFormSection } from './NetworkAssetFormSection';

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
      showToast(`Chave de ${slotLabel} removida com sucesso.`);
    } catch (err: any) {
      console.error(`Erro ao desvincular serial ${slot}:`, err);
      showToast(err?.message || `Não foi possível remover a chave de ${slotLabel}.`);
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
            <NetworkAssetTelemetrySection
              asset={asset}
              site={site}
              isEstacao={isEstacao}
              copiedKey={copiedKey}
              copyToClipboard={copyToClipboard}
              formatRelativeTime={formatRelativeTime}
            />

            <NetworkAssetFormSection
              asset={asset}
              site={site}
              isEstacao={isEstacao}
              isAdmin={isAdmin}
              copiedKey={copiedKey}
              copyToClipboard={copyToClipboard}
              handleUnbindSerial={handleUnbindSerial}
              handleOpenLicenseModal={handleOpenLicenseModal}
              unbindingSlot={unbindingSlot}
            />
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
export default NetworkAssetDetailsDrawer;
