import React, { useEffect, useState } from 'react';
import { X, Network, CheckCircle } from 'lucide-react';
import { NetworkAsset, NetworkAssetInput, TIPOS_PREDEFINIDOS } from '@/types/networkAsset';
import { Site } from '@/types/site';
import { SelectDropdown, SelectOption } from '@/components/common/SelectDropdown';
import { formatarChaveInput } from './AssignLicenseModal';

interface NetworkAssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NetworkAssetInput, assetId?: number) => Promise<void>;
  asset: NetworkAsset | null;
  sites: Site[];
  initialIp?: string;
}

export const NetworkAssetFormModal: React.FC<NetworkAssetFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  asset,
  sites,
  initialIp,
}) => {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<string>('IMPRESSORA');
  const [siteId, setSiteId] = useState<string>('');
  const [ip, setIp] = useState('');
  const [mac, setMac] = useState('');
  const [patrimonio, setPatrimonio] = useState('');
  const [fabricante, setFabricante] = useState('');
  const [modelo, setModelo] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [serialWindows, setSerialWindows] = useState('');
  const [serialOffice, setSerialOffice] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (asset) {
      setNome(asset.nome || '');
      setTipo(asset.tipo || 'IMPRESSORA');
      setSiteId(asset.site_id ? String(asset.site_id) : '');
      setIp(asset.ip || '');
      setMac(asset.mac || '');
      setPatrimonio(asset.patrimonio || '');
      setFabricante(asset.fabricante || '');
      setModelo(asset.modelo || '');
      setNumeroSerie(asset.numero_serie || '');
      setLocalizacao(asset.localizacao || '');
      setObservacoes(asset.observacoes || '');
      setSerialWindows(asset.serial_windows || '');
      setSerialOffice(asset.serial_office || '');
    } else {
      setNome('');
      setTipo('IMPRESSORA');
      setSiteId(sites.length > 0 ? String(sites[0].id) : '');
      setIp(initialIp || '');
      setMac('');
      setPatrimonio('');
      setFabricante('');
      setModelo('');
      setNumeroSerie('');
      setLocalizacao('');
      setObservacoes('');
      setSerialWindows('');
      setSerialOffice('');
    }
    setError(null);
  }, [asset, initialIp, sites, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setError('O nome/identificador do ativo é obrigatório.');
      return;
    }

    if (ip.trim()) {
      const parts = ip.trim().split('.');
      if (parts.length !== 4 || !parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)) {
        setError('O endereço IPv4 informado é inválido.');
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      const payload: NetworkAssetInput = {
        nome: nome.trim(),
        tipo: tipo.trim(),
        site_id: siteId ? Number(siteId) : null,
        ip: ip.trim() || null,
        mac: mac.trim() || null,
        patrimonio: patrimonio.trim() || null,
        fabricante: fabricante.trim() || null,
        modelo: modelo.trim() || null,
        numero_serie: numeroSerie.trim() || null,
        localizacao: localizacao.trim() || null,
        observacoes: observacoes.trim() || null,
        serial_windows: serialWindows.trim() || null,
        serial_office: serialOffice.trim() || null,
      };

      await onSave(payload, asset?.id || undefined);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Erro ao salvar ativo de rede.');
    } finally {
      setSaving(false);
    }
  };

  const tipoOptions: SelectOption[] = TIPOS_PREDEFINIDOS.map((t) => ({
    value: t,
    label: t,
  }));

  const siteOptions: SelectOption[] = [
    { value: '', label: 'Sem filial vinculada' },
    ...sites.map((s) => ({ value: String(s.id), label: s.name })),
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl max-h-[90vh] rounded-2xl bg-surface text-fg shadow-2xl border border-border-subtle overflow-hidden flex flex-col text-xs animate-in zoom-in-95 duration-150"
        role="dialog"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-app shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-orange-500/15 border border-orange-500/30 p-2 text-orange-400">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-fg">
                {asset ? `Editar Ativo: ${asset.nome}` : 'Cadastrar Novo Ativo de Rede'}
              </h3>
              <p className="text-[11px] text-fg-secondary mt-0.5">
                Impressoras, switches, pontos de acesso, coletores e dispositivos de rede
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-fg-secondary hover:bg-elevated hover:text-fg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulário com Rolagem */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-500/15 border border-rose-500/30 p-3 text-rose-700 dark:text-rose-300 font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Nome / Identificador <span className="text-orange-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: IMP-TERM-PADARIA01, SW-DIST-L02, AP-VENDAS"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full rounded-lg border border-border-medium bg-elevated px-3 py-2 text-fg placeholder:text-fg-muted focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30 font-medium"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Tipo de Ativo <span className="text-orange-400">*</span>
              </label>
              <SelectDropdown
                value={tipo}
                onChange={setTipo}
                options={tipoOptions}
                triggerClassName="py-2 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Filial / Loja</label>
              <SelectDropdown
                value={siteId}
                onChange={setSiteId}
                options={siteOptions}
                triggerClassName="py-2 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Endereço IPv4</label>
              <input
                type="text"
                placeholder="Ex: 192.168.4.15"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                className="w-full rounded-lg border border-border-medium bg-elevated px-3 py-2 font-mono tabular-nums text-fg placeholder:text-fg-muted focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Endereço MAC</label>
              <input
                type="text"
                placeholder="Ex: b4:2e:99:f2:a1:68"
                value={mac}
                onChange={(e) => setMac(e.target.value)}
                className="w-full rounded-lg border border-border-medium bg-elevated px-3 py-2 font-mono tabular-nums text-fg placeholder:text-fg-muted focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Patrimônio (Tombamento)</label>
              <input
                type="text"
                placeholder="Ex: pat.35192"
                value={patrimonio}
                onChange={(e) => setPatrimonio(e.target.value)}
                className="w-full rounded-lg border border-border-medium bg-elevated px-3 py-2 font-mono tabular-nums font-bold text-orange-400 placeholder:text-fg-muted focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Fabricante (Marca)</label>
              <input
                type="text"
                placeholder="Ex: Zebra, HP, Cisco, Elgin"
                value={fabricante}
                onChange={(e) => setFabricante(e.target.value)}
                className="w-full rounded-lg border border-border-medium bg-elevated px-3 py-2 text-fg placeholder:text-fg-muted focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Modelo</label>
              <input
                type="text"
                placeholder="Ex: ZD220, SG300-28, UniFi AP"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                className="w-full rounded-lg border border-border-medium bg-elevated px-3 py-2 text-fg placeholder:text-fg-muted focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Número de Série</label>
              <input
                type="text"
                placeholder="Ex: CNB210984"
                value={numeroSerie}
                onChange={(e) => setNumeroSerie(e.target.value)}
                className="w-full rounded-lg border border-border-medium bg-elevated px-3 py-2 font-mono tabular-nums text-fg placeholder:text-fg-muted focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Localização / Setor Físico</label>
              <input
                type="text"
                placeholder="Ex: Frente de Caixa 02, Depósito, CPD"
                value={localizacao}
                onChange={(e) => setLocalizacao(e.target.value)}
                className="w-full rounded-lg border border-border-medium bg-elevated px-3 py-2 text-fg placeholder:text-fg-muted focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Observações e Detalhes</label>
            <textarea
              rows={2}
              placeholder="Anotações adicionais, histórico de troca de peças ou porta do switch vinculada..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full rounded-lg border border-border-medium bg-elevated px-3 py-2 text-fg placeholder:text-fg-muted focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
            />
          </div>

          {/* Licenças (Opcional) - Limitado estritamente a 29 caracteres */}
          <div className="pt-2 border-t border-border-subtle grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Chave Windows (Opcional)</label>
              <input
                type="text"
                maxLength={29}
                placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                value={serialWindows}
                onChange={(e) => setSerialWindows(formatarChaveInput(e.target.value))}
                className="w-full rounded-lg border border-border-medium bg-elevated px-3 py-2 font-mono tabular-nums text-fg placeholder:text-fg-muted focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30 uppercase tracking-wider"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Chave Office (Opcional)</label>
              <input
                type="text"
                maxLength={29}
                placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                value={serialOffice}
                onChange={(e) => setSerialOffice(formatarChaveInput(e.target.value))}
                className="w-full rounded-lg border border-border-medium bg-elevated px-3 py-2 font-mono tabular-nums text-fg placeholder:text-fg-muted focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30 uppercase tracking-wider"
              />
            </div>
          </div>

          {/* Rodapé interno do form */}
          <div className="pt-3 border-t border-border-subtle flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-border-medium bg-elevated px-4 py-2 font-semibold text-gray-700 dark:text-slate-300 hover:bg-border-subtle hover:text-fg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 px-5 py-2 font-bold text-white transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle className="h-4 w-4" />
              <span>{saving ? 'Salvando...' : asset ? 'Salvar Alterações' : 'Cadastrar Ativo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
