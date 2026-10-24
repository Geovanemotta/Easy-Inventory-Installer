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
import { UnbindLicenseModal } from './UnbindLicenseModal';
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
  const [unbindModalSlot, setUnbindModalSlot] = useState<'windows' | 'office' | null>(null);
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

  // Abrir modal de desvinculação padronizado
  const handleOpenUnbindModal = (slot: 'windows' | 'office') => {
    setUnbindModalSlot(slot);
  };

  const handleConfirmUnbind = async () => {
    if (!asset || !unbindModalSlot) return;
    const slot = unbindModalSlot;
    const slotLabel = slot === 'windows' ? 'Windows' : 'Office';

    setUnbindingSlot(slot);
    try {
      const effectiveDeviceId = asset.device_id
        ? asset.device_id
        : asset.id && asset.id < 0
        ? Math.abs(asset.id)
        : undefined;
      const effectiveNetworkAssetId = !isEstacao && asset.id && asset.id > 0 ? asset.id : undefined;

      const res = await licenseService.assignLicense({
        device_id: effectiveDeviceId,
        network_asset_id: effectiveNetworkAssetId,
        slot,
        chave: null,
      });

      showToast(res.message || `Licença de ${slotLabel} desvinculada.`);
      if (onUpdateAsset) {
        onUpdateAsset({
          ...asset,
          ...(slot === 'windows' ? { serial_windows: null } : { serial_office: null }),
        });
      }
      setUnbindModalSlot(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Erro ao desvincular licença: ${msg}`);
    } finally {
      setUnbindingSlot(null);
    }
  };

  const handleOpenLicenseModal = (slot: 'windows' | 'office') => {
    setTargetSlot(slot);
    setLicenseModalOpen(true);
  };

  const handleLicenseAssigned = (slot: 'windows' | 'office', chave: string | null) => {
    if (onUpdateAsset) {
      onUpdateAsset({
        ...asset,
        ...(slot === 'windows' ? { serial_windows: chave } : { serial_office: chave }),
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-app shadow-2xl flex flex-col border-l border-border-subtle">
          {/* Header Padronizado igual ao Drawer de Estações */}
          <div className="px-6 py-5 border-b border-border-subtle bg-app flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-xl border mt-0.5 ${
                  isEstacao
                    ? 'bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400'
                    : 'bg-orange-500/15 border-orange-500/30 text-orange-400'
                }`}
              >
                <TipoIcon className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-fg leading-snug">
                    {asset.nome || 'Ativo de Rede'}
                  </h2>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                      isEstacao
                        ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                        : isLivre
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                        : 'bg-elevated text-gray-700 dark:text-slate-300 border-border-medium'
                    }`}
                  >
                    {isEstacao ? 'Estação Integrada' : asset.origem}
                  </span>
                </div>
                {/* Abaixo do nome: Apenas o badge da Filial */}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="inline-flex items-center rounded-md bg-elevated border border-border-medium px-2 py-0.5 text-xs font-semibold text-gray-700 dark:text-slate-300 font-sans">
                    {site ? site.name : asset.site_nome || 'Sem Filial'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-fg-secondary hover:text-fg hover:bg-elevated transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Action Bar */}
          <div className="px-6 py-3 border-b border-border-subtle bg-surface flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {asset.status_online === true ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Online
                  {asset.tempo_resposta_ms !== undefined && asset.tempo_resposta_ms !== null && (
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono tabular-nums">
                      ({asset.tempo_resposta_ms} ms)
                    </span>
                  )}
                </span>
              ) : asset.status_online === false ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                  Offline
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-elevated text-fg-secondary border border-border-medium">
                  <HelpCircle className="h-3.5 w-3.5 text-fg-secondary" />
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
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/30 hover:bg-orange-500/25 transition-colors disabled:opacity-50 cursor-pointer"
                  title="Testar conectividade (Ping ICMP)"
                >
                  <Zap className={`h-3.5 w-3.5 ${isPinging ? 'animate-spin text-orange-400' : ''}`} />
                  {isPinging ? 'Pingando...' : 'Testar Ping'}
                </button>
              )}

              {canModify && (
                <>
                  <button
                    type="button"
                    onClick={() => onEdit(asset)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-elevated text-fg border border-border-medium hover:bg-border-subtle hover:text-fg transition-colors cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-fg-secondary" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(asset)}
                    className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-transparent hover:border-rose-500/30 transition-colors cursor-pointer"
                    title="Excluir ativo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-app">
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
              handleUnbindSerial={handleOpenUnbindModal}
              handleOpenLicenseModal={handleOpenLicenseModal}
              unbindingSlot={unbindingSlot}
            />
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border-subtle bg-surface flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-elevated border border-border-medium text-gray-700 dark:text-slate-300 hover:bg-border-subtle hover:text-fg transition-colors cursor-pointer"
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

      {/* Modal de Desvinculação de Licença */}
      {asset && unbindModalSlot && (
        <UnbindLicenseModal
          isOpen={Boolean(unbindModalSlot)}
          onClose={() => !unbindingSlot && setUnbindModalSlot(null)}
          targetName={asset.nome}
          targetIp={asset.ip}
          slot={unbindModalSlot}
          currentKey={
            (unbindModalSlot === 'windows' ? asset.serial_windows : asset.serial_office) || ''
          }
          onConfirm={handleConfirmUnbind}
          loading={Boolean(unbindingSlot)}
        />
      )}
    </div>
  );
};
export default NetworkAssetDetailsDrawer;
