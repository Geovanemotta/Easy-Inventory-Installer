import React, { useEffect, useMemo, useState } from 'react';
import { X, Plus, Sparkles, Building2, Tag, AlertCircle } from 'lucide-react';
import { Site, SiteCreateInput, SiteUpdateInput } from '@/types/site';

interface SiteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SiteCreateInput | SiteUpdateInput, siteId?: number) => Promise<void>;
  site: Site | null;
}

export const SiteFormModal: React.FC<SiteFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  site,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [circuito, setCircuito] = useState('');
  const [active, setActive] = useState(true);
  const [identifiers, setIdentifiers] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (site) {
      setCode(site.code);
      setName(site.name);
      setCircuito(site.circuito || '');
      setActive(site.active);
      setIdentifiers([...(site.identifiers || [])]);
    } else {
      setCode('');
      setName('');
      setCircuito('');
      setActive(true);
      setIdentifiers([]);
    }
    setTagInput('');
    setError(null);
  }, [site, isOpen]);

  // Sugestões inteligentes ao digitar o código da filial
  const suggestedPatterns = useMemo(() => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return [];

    const suggestions: string[] = [];
    const numMatch = cleanCode.match(/\d+/);
    const num = numMatch ? parseInt(numMatch[0], 10) : null;

    if (num !== null) {
      const pad = String(num).padStart(2, '0');
      const isCombo = cleanCode.startsWith('CB') || cleanCode.startsWith('C');
      if (isCombo) {
        suggestions.push(`CB${pad}`, `C${pad}`, `COMBO-${pad}`, `CB${pad}*`);
      } else {
        suggestions.push(`LJ${pad}`, `L${pad}`, `LOJA-${pad}`, `LJ${pad}*`, `LOJA${pad}`);
      }
    } else {
      suggestions.push(`${cleanCode}*`, cleanCode);
    }

    return suggestions.filter((s) => !identifiers.includes(s.toUpperCase()));
  }, [code, identifiers]);

  const handleAddTag = (val?: string) => {
    const toAdd = (val || tagInput).trim().toUpperCase();
    if (!toAdd) return;
    if (!identifiers.includes(toAdd)) {
      setIdentifiers([...identifiers, toAdd]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setIdentifiers(identifiers.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('O código da filial é obrigatório.');
      return;
    }
    if (!name.trim()) {
      setError('O nome da filial é obrigatório.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: SiteCreateInput = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        circuito: circuito.trim() || undefined,
        active,
        identifiers,
      };
      await onSave(payload, site?.id);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Erro ao salvar filial.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-2xl bg-[#121721] shadow-2xl border border-[#1E2636] overflow-hidden text-xs animate-in zoom-in-95 duration-150"
        role="dialog"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2636] bg-[#0E131B]">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-orange-500/15 border border-orange-500/30 p-2 text-orange-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {site ? `Editar Filial: ${site.code} - ${site.name}` : 'Cadastrar Nova Filial / Loja'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Configure os dados cadastrais e identificadores de hostname da unidade
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-[#181F2E] hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 p-3.5 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">
                {error}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Código da Loja <span className="text-orange-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: 01, CB04, MATRIZ"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-[#263044] bg-[#181F2E] px-3 py-2 font-mono font-bold text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none transition-colors"
                required
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Ex: 01, CB01, CD</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Nome da Filial <span className="text-orange-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Giassi Criciúma Centro"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-[#263044] bg-[#181F2E] px-3 py-2 text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none font-medium transition-colors"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Circuito do Firewall
              </label>
              <input
                type="text"
                placeholder="Ex: giassi-lj19"
                value={circuito}
                onChange={(e) => setCircuito(e.target.value)}
                className="w-full rounded-lg border border-[#263044] bg-[#181F2E] px-3 py-2 text-white font-mono placeholder:text-slate-500 focus:border-orange-500 focus:outline-none transition-colors"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Reserva de IP/MAC</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="site-active-check"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-[#263044] bg-[#181F2E] text-orange-500 focus:ring-orange-500 cursor-pointer"
            />
            <label htmlFor="site-active-check" className="font-semibold text-slate-300 cursor-pointer">
              Filial Operacional e Ativa
            </label>
          </div>

          {/* Padrões de Nomenclatura / Hostnames */}
          <div className="pt-2 border-t border-[#1E2636] space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-orange-400" />
                Padrões de Nomenclatura (Hostnames)
              </label>
              <span className="text-[10px] text-slate-500">Reconhecimento automático</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Prefixos de hostname ou tags usados para vincular estações automaticamente a esta filial (ex: LJ01, CB01, LJ01*).
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Digitar prefixo (ex: LJ01) e pressionar Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 rounded-lg border border-[#263044] bg-[#181F2E] px-3 py-1.5 font-mono text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => handleAddTag()}
                className="flex items-center gap-1 rounded-lg bg-[#181F2E] hover:bg-[#222B3D] border border-[#263044] px-3 py-1.5 font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </button>
            </div>

            {/* Sugestões Automáticas Inteligentes */}
            {suggestedPatterns.length > 0 && (
              <div className="rounded-lg bg-orange-500/10 border border-orange-500/30 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1 mb-1.5">
                  <Sparkles className="h-3 w-3 text-orange-400" /> Sugestões automáticas baseadas no código {code}:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedPatterns.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => handleAddTag(sug)}
                      className="inline-flex items-center gap-1 rounded-md bg-[#181F2E] px-2 py-0.5 text-[10px] font-mono font-semibold text-orange-400 border border-orange-500/40 hover:bg-orange-500/20 transition-colors cursor-pointer"
                    >
                      <span>+ {sug}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tags Atuais */}
            <div className="min-h-[42px] rounded-lg border border-[#1E2636] bg-[#0B0E14] p-2 flex flex-wrap gap-1.5">
              {identifiers.length === 0 ? (
                <span className="text-slate-500 italic text-[11px] self-center">
                  Nenhum padrão cadastrado. Digite acima ou selecione uma sugestão.
                </span>
              ) : (
                identifiers.map((ident) => (
                  <span
                    key={ident}
                    className="inline-flex items-center gap-1.5 rounded-md bg-orange-500/15 border border-orange-500/30 px-2.5 py-1 text-xs font-mono font-bold text-orange-400"
                  >
                    <span>{ident}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(ident)}
                      className="text-orange-400/70 hover:text-orange-300 transition-colors cursor-pointer"
                      title={`Remover ${ident}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Botões do Rodapé */}
          <div className="pt-3 border-t border-[#1E2636] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-[#263044] bg-[#181F2E] px-4 py-2 font-semibold text-slate-300 hover:text-white hover:bg-[#222B3D] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-orange-500 px-5 py-2 font-semibold text-white hover:bg-orange-600 transition-colors shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Salvando...' : site ? 'Salvar Alterações' : 'Cadastrar Filial'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
