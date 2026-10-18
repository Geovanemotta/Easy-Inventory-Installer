import React, { useEffect, useState } from 'react';
import { X, KeyRound } from 'lucide-react';
import {
  License,
  LicenseInput,
  SOFTWARES_PREDEFINIDOS,
  TIPOS_LICENCA,
} from '@/types/license';
import { Site } from '@/types/site';
import { SiteSelect } from '@/components/common/SiteSelect';

interface LicenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: LicenseInput) => Promise<void>;
  editingLicense?: License | null;
  sites: Site[];
  initialSiteId?: string;
}

function formatarChaveInput(val: string): string {
  const limpo = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (limpo.length <= 25) {
    const partes: string[] = [];
    for (let i = 0; i < limpo.length; i += 5) {
      partes.push(limpo.slice(i, i + 5));
    }
    return partes.join('-');
  }
  return val.toUpperCase();
}

export const LicenseFormModal: React.FC<LicenseFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingLicense,
  sites,
  initialSiteId,
}) => {
  const [categoria, setCategoria] = useState<'windows' | 'office' | 'outro'>('windows');
  const [softwareNome, setSoftwareNome] = useState('Windows 11 Pro');
  const [customSoftware, setCustomSoftware] = useState(false);
  const [chave, setChave] = useState('');
  const [tipoLicenca, setTipoLicenca] = useState('OEM');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [quantidadeTotal, setQuantidadeTotal] = useState(1);
  const [siteId, setSiteId] = useState<string>('todos');
  const [dataAquisicao, setDataAquisicao] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      return;
    }

    if (editingLicense) {
      const cat = (editingLicense.categoria as 'windows' | 'office' | 'outro') || 'windows';
      setCategoria(cat);
      setSoftwareNome(editingLicense.software_nome);
      const presetList = (SOFTWARES_PREDEFINIDOS[cat] as readonly string[]) || [];
      const isPreset = presetList.includes(editingLicense.software_nome);
      setCustomSoftware(!isPreset);
      setChave(editingLicense.chave);
      setTipoLicenca(editingLicense.tipo_licenca || 'OEM');
      setNotaFiscal(editingLicense.nota_fiscal || '');
      setQuantidadeTotal(editingLicense.quantidade_total);
      setSiteId(editingLicense.site_id ? String(editingLicense.site_id) : 'todos');
      setDataAquisicao(
        editingLicense.data_aquisicao ? editingLicense.data_aquisicao.slice(0, 10) : '',
      );
      setObservacoes(editingLicense.observacoes || '');
    } else {
      setCategoria('windows');
      setSoftwareNome('Windows 11 Pro');
      setCustomSoftware(false);
      setChave('');
      setTipoLicenca('OEM');
      setNotaFiscal('');
      setQuantidadeTotal(1);
      setSiteId(initialSiteId && initialSiteId !== 'todos' ? initialSiteId : 'todos');
      setDataAquisicao('');
      setObservacoes('');
    }
    setError(null);
  }, [isOpen, editingLicense, initialSiteId]);

  if (!isOpen) return null;

  const handleChaveChange = (val: string) => {
    if (categoria === 'windows' || categoria === 'office') {
      setChave(formatarChaveInput(val));
    } else {
      setChave(val);
    }
  };

  const handleCategoriaChange = (newCat: 'windows' | 'office' | 'outro') => {
    setCategoria(newCat);
    const presets = SOFTWARES_PREDEFINIDOS[newCat] || [];
    if (presets.length > 0 && !customSoftware) {
      setSoftwareNome(presets[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!softwareNome.trim()) {
      setError('Informe o nome do software / edição.');
      return;
    }
    if (!chave.trim()) {
      setError('Informe a chave do produto (serial).');
      return;
    }
    if (quantidadeTotal < 1) {
      setError('A quantidade total deve ser de pelo menos 1 licença.');
      return;
    }
    if (editingLicense && quantidadeTotal < editingLicense.quantidade_em_uso) {
      setError(
        `A quantidade total (${quantidadeTotal}) não pode ser menor que o total atualmente em uso (${editingLicense.quantidade_em_uso}).`,
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: LicenseInput = {
        categoria,
        software_nome: softwareNome.trim(),
        chave: chave.trim(),
        tipo_licenca: tipoLicenca,
        nota_fiscal: notaFiscal.trim() || undefined,
        quantidade_total: Number(quantidadeTotal),
        site_id: siteId === 'todos' ? null : Number(siteId),
        data_aquisicao: dataAquisicao ? new Date(dataAquisicao).toISOString() : undefined,
        observacoes: observacoes.trim() || undefined,
      };

      await onSave(payload);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const presets = SOFTWARES_PREDEFINIDOS[categoria] || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {editingLicense ? 'Editar Lote de Licença' : 'Cadastrar Nova Licença'}
              </h3>
              <p className="text-xs text-slate-500">
                Gerencie lotes, seriais OEM/Volume e notas fiscais
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Categoria */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Categoria do Software</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'windows', label: 'Windows OS' },
                { id: 'office', label: 'Office / M365' },
                { id: 'outro', label: 'Outros Softwares' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleCategoriaChange(c.id as any)}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                    categoria === c.id
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Software / Edição */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 block">Nome do Software / Edição *</label>
              <button
                type="button"
                onClick={() => setCustomSoftware(!customSoftware)}
                className="text-[11px] text-blue-600 hover:underline font-medium"
              >
                {customSoftware ? 'Usar modelos pré-definidos' : 'Digitar nome personalizado'}
              </button>
            </div>

            {customSoftware ? (
              <input
                type="text"
                required
                placeholder="Ex: Windows 11 Enterprise LTSC, AutoCAD 2024..."
                value={softwareNome}
                onChange={(e) => setSoftwareNome(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <select
                value={softwareNome}
                onChange={(e) => setSoftwareNome(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {presets.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Chave Serial */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Chave do Produto (Serial) *</label>
            <input
              type="text"
              required
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
              value={chave}
              onChange={(e) => handleChaveChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-wider text-sm font-semibold uppercase"
            />
          </div>

          {/* Tipo e Quantidade */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">Tipo de Licença</label>
              <select
                value={tipoLicenca}
                onChange={(e) => setTipoLicenca(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TIPOS_LICENCA.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">Quantidade de Ativações *</label>
              <input
                type="number"
                min={editingLicense?.quantidade_em_uso || 1}
                required
                value={quantidadeTotal}
                onChange={(e) => setQuantidadeTotal(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>
          </div>

          {/* Filial / Loja */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Filial Vinculada</label>
            <SiteSelect
              value={siteId}
              onChange={setSiteId}
              sites={sites}
              allowAll
              allLabel="Matriz / Uso Corporativo Global"
              placeholder="Selecione a filial..."
            />
          </div>

          {/* NF e Data de Aquisição */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">Nota Fiscal (Opcional)</label>
              <input
                type="text"
                placeholder="Ex: NF-14920"
                value={notaFiscal}
                onChange={(e) => setNotaFiscal(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">Data de Aquisição</label>
              <input
                type="date"
                value={dataAquisicao}
                onChange={(e) => setDataAquisicao(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Observações (Opcional)</label>
            <textarea
              rows={2}
              placeholder="Ex: Adquirido via Dell, contrato corporativo anual..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Botões de Ação */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving && <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />}
              <span>{editingLicense ? 'Salvar Alterações' : 'Cadastrar Licença'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
