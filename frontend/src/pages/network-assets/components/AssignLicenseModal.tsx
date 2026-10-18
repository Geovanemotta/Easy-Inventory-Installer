import React, { useEffect, useState } from 'react';
import { X, Key, Check, AlertCircle, Loader2 } from 'lucide-react';
import { NetworkAsset } from '@/types/networkAsset';
import { LicenseAvailable } from '@/types/license';
import { licenseService } from '@/services/licenseService';

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
        // Se a chave atual não estiver na lista de lotes cadastrados, abre no modo avulso
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          onClick={() => !saving && onClose()}
        />

        {/* Modal Window */}
        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
                <Key className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {currentKey ? `Alterar Licença de ${slotLabel}` : `Atribuir Licença de ${slotLabel}`}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Alvo: <strong className="text-slate-700">{asset.nome}</strong> ({asset.ip || 'Sem IP'})
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Toggle Modo: Lote vs Avulso */}
            <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setIsCustomMode(false)}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  !isCustomMode
                    ? 'bg-white text-slate-800 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Lotes Disponíveis ({availableList.length})
              </button>
              <button
                type="button"
                onClick={() => setIsCustomMode(true)}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  isCustomMode
                    ? 'bg-white text-slate-800 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Digitar Chave Avulsa
              </button>
            </div>

            {!isCustomMode ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Selecione um lote cadastrado com licenças disponíveis:
                </label>

                {loading ? (
                  <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span>Carregando licenças disponíveis...</span>
                  </div>
                ) : availableList.length === 0 ? (
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-center text-xs text-slate-500 space-y-2">
                    <p>Nenhum lote com licenças disponíveis encontrado para esta filial/categoria.</p>
                    <button
                      type="button"
                      onClick={() => setIsCustomMode(true)}
                      className="text-blue-600 hover:underline font-semibold"
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
                              ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/20'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="licenseChoice"
                            value={lic.chave}
                            checked={isSelected}
                            onChange={() => setSelectedKey(lic.chave)}
                            className="mt-1 h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800 truncate">
                                {lic.software_nome}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  lic.quantidade_disponivel > 0
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {lic.quantidade_disponivel} disp. ({lic.quantidade_em_uso}/
                                {lic.quantidade_total})
                              </span>
                            </div>
                            <span className="font-mono text-xs font-semibold text-slate-600 block mt-0.5">
                              {lic.chave}
                            </span>
                            {lic.site_nome && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">
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
                <label className="text-xs font-bold text-slate-700 block">
                  Chave do Produto (Serial / Product Key):
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Ex: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-xs font-bold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 uppercase"
                />
                <p className="text-[11px] text-slate-400 leading-normal">
                  Insira o serial avulso (OEM, etiqueta de gabinete ou chave por volume). Ele será
                  vinculado ao equipamento e registrado no histórico de auditoria.
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || (!isCustomMode && !selectedKey) || (isCustomMode && !customKey.trim())}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors disabled:opacity-50"
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
};
