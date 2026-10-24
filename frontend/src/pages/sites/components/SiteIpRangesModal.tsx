import React, { useMemo, useState } from 'react';
import { X, Plus, Network, Edit2, Trash2, CheckCircle, Database } from 'lucide-react';
import { Site, SiteIpRange, SiteIpRangeInput } from '@/types/site';
import { SelectDropdown, SelectOption } from '@/components/common/SelectDropdown';

interface SiteIpRangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  sites: Site[];
  ranges: SiteIpRange[];
  initialSiteId?: number | null;
  onSaveRange: (data: SiteIpRangeInput, rangeId?: number) => Promise<void>;
  onDeleteRange: (rangeId: number) => Promise<void>;
  isAdmin: boolean;
}

export const SiteIpRangesModal: React.FC<SiteIpRangesModalProps> = ({
  isOpen,
  onClose,
  sites,
  ranges,
  initialSiteId,
  onSaveRange,
  onDeleteRange,
  isAdmin,
}) => {
  const [selectedSiteId, setSelectedSiteId] = useState<string>(
    initialSiteId ? String(initialSiteId) : 'todos'
  );

  // Form State
  const [editingRange, setEditingRange] = useState<SiteIpRange | null>(null);
  const [formSiteId, setFormSiteId] = useState<string>(
    initialSiteId ? String(initialSiteId) : sites.length > 0 ? String(sites[0].id) : ''
  );
  const [nome, setNome] = useState('');
  const [ipInicio, setIpInicio] = useState('');
  const [ipFim, setIpFim] = useState('');
  const [gateway, setGateway] = useState('');
  const [mascara, setMascara] = useState('255.255.255.0');
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Opções sem duplicação de código
  const siteFilterOptions: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [
      { value: 'todos', label: `Todas as Filiais (${ranges.length} faixas)` },
    ];
    sites.forEach((s) => {
      const cleanName = s.name
        .replace(new RegExp(`^\\[?${s.code}\\]?\\s*[-–—]?\\s*`, 'i'), '')
        .trim();
      opts.push({
        value: String(s.id),
        label: `[${s.code}] ${cleanName || s.name}`,
      });
    });
    return opts;
  }, [sites, ranges.length]);

  const formSiteOptions: SelectOption[] = useMemo(() => {
    return sites.map((s) => {
      const cleanName = s.name
        .replace(new RegExp(`^\\[?${s.code}\\]?\\s*[-–—]?\\s*`, 'i'), '')
        .trim();
      return {
        value: String(s.id),
        label: `[${s.code}] ${cleanName || s.name}`,
      };
    });
  }, [sites]);

  const startEdit = (r: SiteIpRange) => {
    setEditingRange(r);
    setFormSiteId(String(r.site_id));
    setNome(r.nome);
    setIpInicio(r.ip_inicio);
    setIpFim(r.ip_fim);
    setGateway(r.gateway || '');
    setMascara(r.mascara || '255.255.255.0');
    setObservacoes(r.observacoes || '');
    setError(null);
  };

  const cancelEdit = () => {
    setEditingRange(null);
    setNome('');
    setIpInicio('');
    setIpFim('');
    setGateway('');
    setMascara('255.255.255.0');
    setObservacoes('');
    setError(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSiteId) {
      setError('Selecione uma filial para a faixa de IP.');
      return;
    }
    if (!nome.trim() || !ipInicio.trim() || (!ipFim.trim() && !ipInicio.includes('/') && !mascara.trim())) {
      setError('Preencha os campos obrigatórios (Nome, IP Inicial e IP Final ou Máscara/CIDR).');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: SiteIpRangeInput = {
        site_id: Number(formSiteId),
        nome: nome.trim(),
        ip_inicio: ipInicio.trim(),
        ip_fim: ipFim.trim() || null,
        gateway: gateway.trim() || null,
        mascara: mascara.trim() || null,
        observacoes: observacoes.trim() || null,
      };
      await onSaveRange(payload, editingRange?.id);
      cancelEdit();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Erro ao salvar faixa de IP.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente excluir esta faixa de IP?')) return;
    setDeletingId(id);
    try {
      await onDeleteRange(id);
      if (editingRange?.id === id) {
        cancelEdit();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Erro ao excluir: ${msg}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredRanges = ranges.filter((r) => {
    if (selectedSiteId === 'todos') return true;
    return String(r.site_id) === selectedSiteId;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-surface shadow-2xl border border-border-subtle overflow-hidden flex flex-col text-xs animate-in zoom-in-95 duration-150"
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
                Gerenciador de Faixas de IP &amp; Sub-redes (VLANs)
              </h3>
              <p className="text-[11px] text-fg-secondary">
                Mapeamento de sub-redes e controle de ocupação por loja do Grupo Giassi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-fg-secondary hover:bg-elevated hover:text-fg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo com rolagem */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Seletor de Filial para visualização com SelectDropdown sem código duplicado */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-app border border-border-subtle p-3 rounded-xl">
            <div className="flex items-center gap-2.5 flex-1">
              <span className="font-semibold text-gray-700 dark:text-slate-300 shrink-0">Filtrar por Filial:</span>
              <div className="w-72">
                <SelectDropdown
                  value={selectedSiteId}
                  onChange={setSelectedSiteId}
                  options={siteFilterOptions}
                  className="w-full"
                />
              </div>
            </div>
            <span className="text-[11px] text-fg-secondary font-mono">
              Total visível: <strong className="text-fg font-bold">{filteredRanges.length}</strong> faixa(s)
            </span>
          </div>

          {/* Lista de Faixas Cadastradas */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
              <Database className="h-4 w-4 text-orange-400" />
              Faixas Cadastradas
            </h4>

            {filteredRanges.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-subtle bg-app p-8 text-center text-fg-muted">
                Nenhuma faixa de IP cadastrada para a seleção atual.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredRanges.map((r) => {
                  const pct = r.total_ips && r.total_ips > 0
                    ? Math.round(((r.ips_ocupados || 0) / r.total_ips) * 100)
                    : 0;
                  const isHigh = pct >= 85;

                  return (
                    <div
                      key={r.id}
                      className="rounded-xl border border-border-subtle bg-app p-4 shadow-sm hover:border-orange-500/40 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-fg text-sm flex items-center gap-1.5">
                            <span>{r.nome}</span>
                          </div>
                          <div className="text-[11px] text-fg-secondary font-medium mt-0.5">
                            {r.site_codigo ? (
                              <span className="font-mono text-orange-400 font-bold mr-1">[{r.site_codigo}]</span>
                            ) : null}
                            {r.site_nome || 'Filial não vinculada'}
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(r)}
                              className="rounded p-1 text-fg-secondary hover:bg-elevated hover:text-orange-400 transition-colors cursor-pointer"
                              title="Editar Faixa"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(r.id)}
                              disabled={deletingId === r.id}
                              className="rounded p-1 text-fg-secondary hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-50 cursor-pointer"
                              title="Excluir Faixa"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Faixa e Gateway */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-elevated p-2.5 rounded-lg border border-border-medium">
                        <div>
                          <span className="text-fg-secondary block text-[9px] uppercase font-sans">Início / Fim</span>
                          <span className="text-fg font-bold">{r.ip_inicio}</span>
                          <span className="text-fg-secondary block">até {r.ip_fim}</span>
                        </div>
                        <div>
                          <span className="text-fg-secondary block text-[9px] uppercase font-sans">Gateway / Máscara</span>
                          <span className="text-fg">{r.gateway || '—'}</span>
                          <span className="text-fg-secondary block">{r.mascara || '/24'}</span>
                        </div>
                      </div>

                      {/* Barra de Ocupação */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-fg-secondary">
                            Ocupação: <strong className="text-fg font-bold">{r.ips_ocupados || 0}</strong> de {r.total_ips || 0} IPs
                          </span>
                          <span className={`font-bold font-mono ${isHigh ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {pct}% ({r.ips_livres || 0} livres)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-elevated border border-border-medium overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${isHigh ? 'bg-rose-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                          />
                        </div>
                      </div>

                      {r.observacoes && (
                        <div className="text-[11px] text-fg-secondary italic border-t border-border-subtle pt-1.5">
                          {r.observacoes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Formulário de Criação / Edição de Faixa */}
          {isAdmin && (
            <div className="rounded-xl border border-border-medium bg-elevated/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-orange-400" />
                  {editingRange ? `Editando Faixa: ${editingRange.nome}` : 'Cadastrar Nova Sub-rede / Faixa de IP'}
                </h4>
                {editingRange && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="text-xs font-medium text-fg-secondary hover:text-fg underline cursor-pointer"
                  >
                    Cancelar Edição
                  </button>
                )}
              </div>

              {error && (
                <div className="rounded-lg bg-rose-500/15 border border-rose-500/30 p-3 text-rose-700 dark:text-rose-300 font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      Filial / Loja <span className="text-orange-400">*</span>
                    </label>
                    <SelectDropdown
                      value={formSiteId}
                      onChange={setFormSiteId}
                      options={formSiteOptions}
                      placeholder="Selecione a loja..."
                      className="w-full"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      Nome da Faixa / VLAN <span className="text-orange-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: VLAN 10 - Frente de Caixa (PDVs)"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full rounded-lg border border-border-medium bg-surface px-3 py-2 text-fg placeholder:text-fg-muted focus:border-orange-500 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      IP Inicial <span className="text-orange-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 192.168.4.1 ou 10.1.0.0/20"
                      value={ipInicio}
                      onChange={(e) => setIpInicio(e.target.value)}
                      className="w-full rounded-lg border border-border-medium bg-surface px-3 py-2 font-mono text-fg placeholder:text-fg-muted focus:border-orange-500 focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      IP Final <span className="text-fg-muted font-normal text-[10px]">(ou auto via máscara)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 192.168.4.254 ou 10.1.15.254"
                      value={ipFim}
                      onChange={(e) => setIpFim(e.target.value)}
                      className="w-full rounded-lg border border-border-medium bg-surface px-3 py-2 font-mono text-fg placeholder:text-fg-muted focus:border-orange-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Gateway</label>
                    <input
                      type="text"
                      placeholder="Ex: 192.168.4.254"
                      value={gateway}
                      onChange={(e) => setGateway(e.target.value)}
                      className="w-full rounded-lg border border-border-medium bg-surface px-3 py-2 font-mono text-fg placeholder:text-fg-muted focus:border-orange-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Máscara Sub-rede</label>
                    <input
                      type="text"
                      placeholder="Ex: 255.255.240.0 ou /20"
                      value={mascara}
                      onChange={(e) => setMascara(e.target.value)}
                      className="w-full rounded-lg border border-border-medium bg-surface px-3 py-2 font-mono text-fg placeholder:text-fg-muted focus:border-orange-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Observações e Setores</label>
                  <input
                    type="text"
                    placeholder="Ex: Sub-rede dedicada para impressoras e balanças do setor de padaria"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    className="w-full rounded-lg border border-border-medium bg-surface px-3 py-2 text-fg placeholder:text-fg-muted focus:border-orange-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  {editingRange && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-lg border border-border-medium bg-surface px-4 py-2 font-semibold text-gray-700 dark:text-slate-300 hover:text-fg hover:bg-border-subtle transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 px-5 py-2 font-semibold text-white transition-colors shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>{saving ? 'Salvando...' : editingRange ? 'Atualizar Faixa' : 'Cadastrar Faixa'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-3 border-t border-border-subtle bg-app flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border-medium bg-elevated px-4 py-1.5 font-semibold text-gray-700 dark:text-slate-300 hover:text-fg hover:bg-border-subtle transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
