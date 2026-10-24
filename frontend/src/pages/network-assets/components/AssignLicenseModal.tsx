import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Key, Check, AlertCircle, Loader2 } from 'lucide-react';
import { NetworkAsset } from '@/types/networkAsset';
import { LicenseAvailable } from '@/types/license';
import { licenseService } from '@/services/licenseService';

export function formatarChaveInput(val: string): string {
  const limpo = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 25);
  const partes: string[] = [];
  for (let i = 0; i < limpo.length; i += 5) {
    partes.push(limpo.slice(i, i + 5));
  }
  return partes.join('-');
}

interface AssignLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: NetworkAsset | null;
  slot: 'windows' | 'office';
  onAssigned: (slot: 'windows' | 'office', chave: string | null) => void;
  showToast: (msg: string) => void;
}

export const AssignLicenseModal: React.FC<AssignLicenseModalProps> = ({
  isOpen,
  onClose,
  asset,
  slot,
  onAssigned,
  showToast,
}) => {
  const [availableList, setAvailableList] = useState<LicenseAvailable[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const slotLabel = slot === 'windows' ? 'Windows' : 'Office / Microsoft 365';
  const currentKey = slot === 'windows' ? asset?.serial_windows : asset?.serial_office;

  useEffect(() => {
    if (!isOpen || !asset) return;

    const initialKey = currentKey || '';
    setSelectedKey(initialKey);
    setCustomKey(initialKey);
    setIsCustomMode(false);
    setErrorMsg(null);
    setLoading(true);

    licenseService
      .getAvailableLicenses({
        categoria: slot,
        site_id: asset.site_id,
        chave_atual: initialKey || undefined,
      })
      .then((list) => {
        setAvailableList(list || []);
        if (initialKey && !list.some((l) => l.chave.toUpperCase() === initialKey.toUpperCase())) {
          setIsCustomMode(true);
        }
      })
      .catch((err) => {
        console.warn('Erro ao carregar licenças disponíveis:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, asset, slot, currentKey]);

  if (!isOpen || !asset) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalKey = isCustomMode ? customKey.trim() : selectedKey.trim();

    if (!finalKey) {
      setErrorMsg('Informe ou selecione uma chave válida para atribuir.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      const isEstacao = asset.origem === 'estacao' || Boolean(asset.device_id);
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
        chave: finalKey,
      });

      showToast(res.message || `Licença de ${slotLabel} atribuída com sucesso!`);
      onAssigned(slot, res.chave);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            if (!saving) onClose();
          }}
        />

        {/* Modal Window Obsidian & Amber */}
        <div
          className="relative transform overflow-hidden rounded-2xl bg-surface text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-border-subtle"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-border-subtle bg-app flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400">
                <Key className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-fg">
                  {currentKey ? `Alterar Licença de ${slotLabel}` : `Atribuir Licença de ${slotLabel}`}
                </h3>
                <p className="text-[11px] text-fg-secondary mt-0.5">
                  Alvo: <strong className="text-fg font-semibold">{asset.nome}</strong> ({asset.ip || 'Sem IP'})
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="p-1.5 rounded-lg text-fg-secondary hover:text-fg hover:bg-elevated transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Toggle Modo: Lote vs Avulso */}
            <div className="flex rounded-xl bg-app border border-border-subtle p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setIsCustomMode(false)}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  !isCustomMode
                    ? 'bg-elevated text-orange-400 border border-border-medium shadow-xs font-bold'
                    : 'text-fg-secondary hover:text-fg'
                }`}
              >
                Lotes Disponíveis ({availableList.length})
              </button>
              <button
                type="button"
                onClick={() => setIsCustomMode(true)}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  isCustomMode
                    ? 'bg-elevated text-orange-400 border border-border-medium shadow-xs font-bold'
                    : 'text-fg-secondary hover:text-fg'
                }`}
              >
                Digitar Chave Avulsa
              </button>
            </div>

            {!isCustomMode ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block">
                  Selecione um lote cadastrado com licenças disponíveis:
                </label>

                {loading ? (
                  <div className="p-8 text-center text-xs text-fg-secondary flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
                    <span>Carregando licenças disponíveis...</span>
                  </div>
                ) : availableList.length === 0 ? (
                  <div className="p-4 rounded-xl border border-border-subtle bg-app text-center text-xs text-fg-secondary space-y-2">
                    <p>Nenhum lote com licenças disponíveis encontrado para esta filial/categoria.</p>
                    <button
                      type="button"
                      onClick={() => setIsCustomMode(true)}
                      className="text-orange-400 hover:underline font-semibold cursor-pointer"
                    >
                      Inserir chave avulsa manualmente
                    </button>
                  </div>
                ) : (
                  <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                    {availableList.map((lic) => {
                      const isSelected = selectedKey.toUpperCase() === lic.chave.toUpperCase();
                      return (
                        <label
                          key={lic.id}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-orange-500 bg-orange-500/10 ring-1 ring-orange-500/30'
                              : 'border-border-subtle bg-elevated hover:border-border-medium'
                          }`}
                        >
                          <input
                            type="radio"
                            name="licenseChoice"
                            value={lic.chave}
                            checked={isSelected}
                            onChange={() => setSelectedKey(lic.chave)}
                            className="mt-1 h-3.5 w-3.5 text-orange-500 focus:ring-orange-500 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-fg truncate">
                                {lic.software_nome}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                  lic.quantidade_disponivel > 0
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                }`}
                              >
                                {lic.quantidade_disponivel} disp. ({lic.quantidade_em_uso}/
                                {lic.quantidade_total})
                              </span>
                            </div>
                            <span className="font-mono text-xs font-semibold text-gray-700 dark:text-slate-300 block mt-0.5">
                              {lic.chave}
                            </span>
                            {lic.site_nome && (
                              <span className="text-[10px] text-fg-secondary block mt-0.5">
                                Filial: {lic.site_nome}
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block">
                  Chave do Produto (Serial / Product Key):
                </label>
                <input
                  type="text"
                  autoFocus
                  maxLength={29}
                  placeholder="Ex: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                  value={customKey}
                  onChange={(e) => setCustomKey(formatarChaveInput(e.target.value))}
                  className="w-full rounded-xl border border-border-medium bg-elevated px-3.5 py-2.5 font-mono text-xs font-bold text-fg placeholder:text-fg-muted focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30 uppercase tracking-wider"
                />
                <p className="text-[11px] text-fg-secondary leading-normal">
                  Insira o serial avulso (OEM, etiqueta de gabinete ou chave por volume). Limite máximo de 25 caracteres alfanuméricos formatados.
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-subtle">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-slate-300 bg-elevated border border-border-medium hover:bg-border-subtle hover:text-fg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || (!isCustomMode && !selectedKey) || (isCustomMode && !customKey.trim())}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                {saving ? 'Atribuindo...' : 'Confirmar Atribuição'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
