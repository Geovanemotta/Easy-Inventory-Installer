import React, { useState } from 'react';
import { X, Plus, Network, Edit2, Trash2, CheckCircle, Database } from 'lucide-react';
import { Site, SiteIpRange, SiteIpRangeInput } from '@/types/site';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col text-xs animate-in zoom-in-95 duration-150"
        role="dialog"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-blue-100 p-2 text-blue-600">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Gerenciador de Faixas de IP &amp; Sub-redes (VLANs)
              </h3>
              <p className="text-[11px] text-slate-500">
                Mapeamento de sub-redes e controle de ocupação por loja do Grupo Giassi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo com rolagem */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Seletor de Filial para visualização */}
          <div className="flex items-center justify-between gap-4 bg-slate-50 border border-slate-200 p-3 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Filtrar por Filial:</span>
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="todos">Todas as Filiais ({ranges.length} faixas)</option>
                {sites.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Total visível: <strong>{filteredRanges.length}</strong> faixa(s)
            </span>
          </div>

          {/* Lista de Faixas Cadastradas */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Database className="h-4 w-4 text-blue-600" />
              Faixas Cadastradas
            </h4>

            {filteredRanges.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
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
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                            <span>{r.nome}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {r.site_codigo ? (
                              <span className="font-mono text-blue-700 font-bold mr-1">[{r.site_codigo}]</span>
                            ) : null}
                            {r.site_nome || 'Filial não vinculada'}
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(r)}
                              className="rounded p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              title="Editar Faixa"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(r.id)}
                              disabled={deletingId === r.id}
                              className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-50"
                              title="Excluir Faixa"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Faixa e Gateway */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-sans">Início / Fim</span>
                          <span className="text-slate-800 font-bold">{r.ip_inicio}</span>
                          <span className="text-slate-400 block">até {r.ip_fim}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-sans">Gateway / Máscara</span>
                          <span className="text-slate-700">{r.gateway || '—'}</span>
                          <span className="text-slate-400 block">{r.mascara || '/24'}</span>
                        </div>
                      </div>

                      {/* Barra de Ocupação */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-slate-500">
                            Ocupação: <strong className="text-slate-800">{r.ips_ocupados || 0}</strong> de {r.total_ips || 0} IPs
                          </span>
                          <span className={`font-bold ${isHigh ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {pct}% ({r.ips_livres || 0} livres)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isHigh ? 'bg-rose-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                          />
                        </div>
                      </div>

                      {r.observacoes && (
                        <div className="text-[11px] text-slate-500 italic border-t border-slate-100 pt-1.5">
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
            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-blue-600" />
                  {editingRange ? `Editando Faixa: ${editingRange.nome}` : 'Cadastrar Nova Sub-rede / Faixa de IP'}
                </h4>
                {editingRange && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700 underline"
                  >
                    Cancelar Edição
                  </button>
                )}
              </div>

              {error && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-rose-700 font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Filial / Loja <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formSiteId}
                      onChange={(e) => setFormSiteId(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    >
                      <option value="">Selecione a loja...</option>
                      {sites.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                          {s.code} - {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nome da Faixa / VLAN <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: VLAN 10 - Frente de Caixa (PDVs)"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      IP Inicial <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 192.168.4.1 ou 10.1.0.0/20"
                      value={ipInicio}
                      onChange={(e) => setIpInicio(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      IP Final <span className="text-slate-400 font-normal text-[10px]">(ou auto via máscara)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 192.168.4.254 ou 10.1.15.254"
                      value={ipFim}
                      onChange={(e) => setIpFim(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Gateway</label>
                    <input
                      type="text"
                      placeholder="Ex: 192.168.4.254"
                      value={gateway}
                      onChange={(e) => setGateway(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Máscara Sub-rede</label>
                    <input
                      type="text"
                      placeholder="Ex: 255.255.240.0 ou /20"
                      value={mascara}
                      onChange={(e) => setMascara(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Observações e Setores</label>
                  <input
                    type="text"
                    placeholder="Ex: Sub-rede dedicada para impressoras e balanças do setor de padaria"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  {editingRange && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50"
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
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
