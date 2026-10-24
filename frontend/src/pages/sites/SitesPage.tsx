import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Network,
  Search,
  RefreshCw,
  Plus,
  Monitor,
  Radio,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  AlertTriangle,
  X,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { siteService } from '@/services/siteService';
import { Site, SiteKPIs, SiteCreateInput, SiteUpdateInput, SiteIpRange, SiteIpRangeInput } from '@/types/site';
import { SelectDropdown, SelectOption } from '@/components/common/SelectDropdown';
import { SitesTable } from './components/SitesTable';
import { SiteFormModal } from './components/SiteFormModal';
import { SiteIpRangesModal } from './components/SiteIpRangesModal';
import { SiteSimulatorModal } from './components/SiteSimulatorModal';
import { SiteReclassifyModal } from './components/SiteReclassifyModal';

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Todas as Lojas' },
  { value: 'active', label: 'Apenas Ativas' },
  { value: 'inactive', label: 'Apenas Desativadas' },
];

export const SitesPage: React.FC = () => {
  const { isAdmin } = useAuth();

  const [sites, setSites] = useState<Site[]>([]);
  const [kpis, setKpis] = useState<SiteKPIs | null>(null);
  const [ranges, setRanges] = useState<SiteIpRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modais
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  const [rangesModalOpen, setRangesModalOpen] = useState(false);
  const [rangesTargetSiteId, setRangesTargetSiteId] = useState<number | null>(null);

  const [simModalOpen, setSimModalOpen] = useState(false);
  const [simInitialHostname, setSimInitialHostname] = useState('');

  const [reclassModalOpen, setReclassModalOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sitesData, kpisData, rangesData] = await Promise.all([
        siteService.listSites(true),
        siteService.getSiteKPIs().catch(() => null),
        siteService.listIpRanges().catch(() => []),
      ]);
      setSites(sitesData || []);
      setKpis(kpisData);
      setRanges(rangesData || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Erro ao carregar lojas: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtro de Lojas
  const filteredSites = useMemo(() => {
    return sites.filter((site) => {
      if (statusFilter === 'active' && !site.active) return false;
      if (statusFilter === 'inactive' && site.active) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchCode = site.code.toLowerCase().includes(q);
      const matchName = site.name.toLowerCase().includes(q);
      const matchIdent = (site.identifiers || []).some((ident) =>
        ident.toLowerCase().includes(q)
      );
      return matchCode || matchName || matchIdent;
    });
  }, [sites, statusFilter, searchQuery]);

  // Handlers
  const handleOpenCreate = () => {
    setEditingSite(null);
    setFormModalOpen(true);
  };

  const handleOpenEdit = (site: Site) => {
    setEditingSite(site);
    setFormModalOpen(true);
  };

  const handleSaveSite = async (data: SiteCreateInput | SiteUpdateInput, siteId?: number) => {
    if (siteId) {
      await siteService.updateSite(siteId, data);
      showToast('Filial atualizada com sucesso!');
    } else {
      await siteService.createSite(data as SiteCreateInput);
      showToast('Nova filial cadastrada com sucesso!');
    }
    await loadData();
  };

  const handleConfirmDeleteSite = async () => {
    if (!siteToDelete) return;
    setIsDeleting(true);
    try {
      const res = await siteService.deleteSite(siteToDelete.id);
      showToast(res.detail);
      setSiteToDelete(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Erro ao excluir filial: ${msg}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenRanges = (siteId?: number) => {
    setRangesTargetSiteId(siteId || null);
    setRangesModalOpen(true);
  };

  const handleSaveRange = async (data: SiteIpRangeInput, rangeId?: number) => {
    if (rangeId) {
      await siteService.updateIpRange(rangeId, data);
      showToast('Faixa de IP atualizada com sucesso!');
    } else {
      await siteService.createIpRange(data);
      showToast('Nova faixa de IP cadastrada com sucesso!');
    }
    const updatedRanges = await siteService.listIpRanges();
    setRanges(updatedRanges);
    const updatedSites = await siteService.listSites(true);
    setSites(updatedSites);
  };

  const handleDeleteRange = async (rangeId: number) => {
    await siteService.deleteIpRange(rangeId);
    showToast('Faixa de IP excluída com sucesso!');
    const updatedRanges = await siteService.listIpRanges();
    setRanges(updatedRanges);
    const updatedSites = await siteService.listSites(true);
    setSites(updatedSites);
  };

  const handleSimulate = (site: Site) => {
    const defaultTag = (site.identifiers && site.identifiers[0]) || site.code;
    const testSample = defaultTag.replace('*', '') + '-PDV01';
    setSimInitialHostname(testSample);
    setSimModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-app border border-border-medium px-4 py-2.5 text-xs font-semibold text-fg shadow-2xl animate-in slide-in-from-bottom duration-150">
          <Sparkles className="h-4 w-4 text-orange-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Cabeçalho & Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-fg flex items-center gap-2.5">
              <Building2 className="h-6 w-6 text-orange-400" />
              Lojas &amp; Filiais
            </h1>
            <span className="rounded-full bg-orange-500/15 border border-orange-500/30 px-2.5 py-0.5 text-xs font-bold text-orange-400 font-mono">
              {sites.length} unidades
            </span>
          </div>
          <p className="text-xs text-fg-secondary mt-0.5">
            Mapeamento de unidades, faixas de IP/VLANs e regras de reconhecimento automático
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenRanges()}
            className="flex items-center gap-1.5 rounded-lg border border-border-medium bg-elevated px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:text-fg hover:bg-border-subtle transition-colors cursor-pointer"
            title="Gerenciar faixas de IP e sub-redes (VLANs)"
          >
            <Network className="h-4 w-4 text-orange-400" />
            <span>Faixas de IP (VLANs)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSimInitialHostname('');
              setSimModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-border-medium bg-elevated px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:text-fg hover:bg-border-subtle transition-colors cursor-pointer"
            title="Testar como um hostname é reconhecido pelas regras"
          >
            <Search className="h-4 w-4 text-orange-400" />
            <span>Simulador de Regras</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setReclassModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border-medium bg-elevated px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:text-fg hover:bg-border-subtle transition-colors cursor-pointer"
              title="Reclassificar máquinas do parque conforme os padrões atuais"
            >
              <RefreshCw className="h-4 w-4 text-orange-400" />
              <span>Reclassificar Parque</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-orange-600 transition-colors shadow-md shadow-orange-500/20 cursor-pointer"
              title="Cadastrar nova filial ou loja"
            >
              <Plus className="h-4 w-4" />
              <span>+ Nova Filial</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Cards de Métricas e KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Lojas Cadastradas */}
        <div className="relative overflow-hidden rounded-xl border border-border-subtle bg-surface p-4 shadow-sm group hover:border-border-medium transition-all duration-200">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-500 to-amber-500" />
          <div className="flex items-center gap-3.5">
            <div className="rounded-xl bg-orange-500/15 border border-orange-500/30 p-2.5 text-orange-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono text-fg tabular-nums">
                {kpis?.total_sites ?? sites.length}
              </div>
              <div className="text-xs font-medium text-fg-secondary">Lojas Cadastradas</div>
            </div>
          </div>
        </div>

        {/* Card 2: Filiais Ativas */}
        <div className="relative overflow-hidden rounded-xl border border-border-subtle bg-surface p-4 shadow-sm group hover:border-border-medium transition-all duration-200">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="flex items-center gap-3.5">
            <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-2.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono text-fg tabular-nums">
                {kpis?.active_sites ?? sites.filter((s) => s.active).length}
              </div>
              <div className="text-xs font-medium text-fg-secondary">Filiais Ativas</div>
            </div>
          </div>
        </div>

        {/* Card 3: Estações Atribuídas */}
        <div className="relative overflow-hidden rounded-xl border border-border-subtle bg-surface p-4 shadow-sm group hover:border-border-medium transition-all duration-200">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-indigo-500" />
          <div className="flex items-center gap-3.5">
            <div className="rounded-xl bg-blue-500/15 border border-blue-500/30 p-2.5 text-blue-600 dark:text-blue-400">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono text-fg tabular-nums">
                {kpis?.total_devices ?? sites.reduce((acc, s) => acc + (s.devices_count || 0), 0)}
              </div>
              <div className="text-xs font-medium text-fg-secondary">Estações Atribuídas</div>
            </div>
          </div>
        </div>

        {/* Card 4: Ativos de Rede */}
        <div className="relative overflow-hidden rounded-xl border border-border-subtle bg-surface p-4 shadow-sm group hover:border-border-medium transition-all duration-200">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 to-yellow-500" />
          <div className="flex items-center gap-3.5">
            <div className="rounded-xl bg-amber-500/15 border border-amber-500/30 p-2.5 text-amber-600 dark:text-amber-400">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono text-fg tabular-nums">
                {kpis?.total_network_assets ?? sites.reduce((acc, s) => acc + (s.network_assets_count || 0), 0)}
              </div>
              <div className="text-xs font-medium text-fg-secondary">Ativos de Rede</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Barra de Busca e Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3 rounded-xl border border-border-subtle shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
          <input
            type="text"
            placeholder="Pesquisar por código (ex: 01, CB01), nome ou padrão (ex: LJ01)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border-medium bg-elevated pl-9 pr-8 py-2 text-xs text-fg placeholder:text-fg-muted focus:border-orange-500 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-fg-secondary hover:text-fg rounded cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="flex items-center gap-1.5 py-2 px-3 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:text-fg bg-elevated hover:bg-border-subtle rounded-lg border border-border-medium transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Limpar</span>
            </button>
          )}

          <div className="w-44">
            <SelectDropdown
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as 'all' | 'active' | 'inactive')}
              options={STATUS_OPTIONS}
              className="w-full"
            />
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-border-medium bg-elevated px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:text-fg hover:bg-border-subtle transition-colors cursor-pointer disabled:opacity-50"
            title="Recarregar lista"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* 4. Tabela de Lojas */}
      <SitesTable
        sites={filteredSites}
        loading={loading}
        isAdmin={isAdmin}
        onEdit={handleOpenEdit}
        onDelete={(site) => setSiteToDelete(site)}
        onOpenRanges={handleOpenRanges}
        onSimulate={handleSimulate}
      />

      {/* 5. Modais Operacionais */}
      <SiteFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSave={handleSaveSite}
        site={editingSite}
      />

      <SiteIpRangesModal
        isOpen={rangesModalOpen}
        onClose={() => setRangesModalOpen(false)}
        sites={sites}
        ranges={ranges}
        initialSiteId={rangesTargetSiteId}
        onSaveRange={handleSaveRange}
        onDeleteRange={handleDeleteRange}
        isAdmin={isAdmin}
      />

      <SiteSimulatorModal
        isOpen={simModalOpen}
        onClose={() => setSimModalOpen(false)}
        initialHostname={simInitialHostname}
      />

      <SiteReclassifyModal
        isOpen={reclassModalOpen}
        onClose={() => setReclassModalOpen(false)}
        onSuccess={loadData}
      />

      {/* Modal de Confirmação de Exclusão de Filial */}
      {siteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-md rounded-2xl bg-surface shadow-2xl border border-border-subtle overflow-hidden text-xs animate-in zoom-in-95 duration-150"
            role="dialog"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-app">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 p-2 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-fg">Excluir / Desativar Filial</h3>
                  <p className="text-[11px] text-fg-secondary">Confirmação de segurança</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSiteToDelete(null)}
                className="rounded-lg p-1 text-fg-secondary hover:text-fg hover:bg-elevated transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-gray-700 dark:text-slate-300 text-xs leading-relaxed">
                Deseja realmente excluir ou desativar a filial{' '}
                <strong className="text-fg font-mono bg-elevated px-2 py-0.5 rounded border border-border-medium">
                  {siteToDelete.code} - {siteToDelete.name}
                </strong>
                ?
              </p>
              <p className="text-fg-secondary text-[11px]">
                Se a filial possuir estações ou sub-redes vinculadas, ela será desativada para manter o histórico de auditoria.
              </p>
            </div>

            <div className="px-6 py-3 border-t border-border-subtle bg-app flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSiteToDelete(null)}
                disabled={isDeleting}
                className="rounded-lg border border-border-medium bg-elevated px-4 py-2 font-semibold text-gray-700 dark:text-slate-300 hover:text-fg hover:bg-border-subtle transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSite}
                disabled={isDeleting}
                className="flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 px-4 py-2 font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isDeleting ? 'Excluindo...' : 'Excluir Filial'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SitesPage;
