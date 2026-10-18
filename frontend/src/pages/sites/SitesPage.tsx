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
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { siteService } from '@/services/siteService';
import { Site, SiteKPIs, SiteCreateInput, SiteUpdateInput, SiteIpRange, SiteIpRangeInput } from '@/types/site';
import { SitesTable } from './components/SitesTable';
import { SiteFormModal } from './components/SiteFormModal';
import { SiteIpRangesModal } from './components/SiteIpRangesModal';
import { SiteSimulatorModal } from './components/SiteSimulatorModal';
import { SiteReclassifyModal } from './components/SiteReclassifyModal';

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

  const handleDeleteSite = async (site: Site) => {
    if (
      !confirm(
        `Deseja realmente excluir ou desativar a filial '${site.code} - ${site.name}'?`
      )
    ) {
      return;
    }
    try {
      const res = await siteService.deleteSite(site.id);
      showToast(res.detail);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Erro ao excluir filial: ${msg}`);
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
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xl animate-in slide-in-from-bottom duration-150">
          <Sparkles className="h-4 w-4 text-blue-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Cabeçalho & Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              Lojas &amp; Filiais
            </h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700 font-mono">
              {sites.length} unidades
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Mapeamento de unidades, faixas de IP/VLANs e regras de reconhecimento automático
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenRanges()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Gerenciar faixas de IP e sub-redes (VLANs)"
          >
            <Network className="h-4 w-4 text-blue-600" />
            <span>Faixas de IP (VLANs)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSimInitialHostname('');
              setSimModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Testar como um hostname é reconhecido pelas regras"
          >
            <Search className="h-4 w-4 text-purple-600" />
            <span>Simulador de Regras</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setReclassModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              title="Reclassificar máquinas do parque conforme os padrões atuais"
            >
              <RefreshCw className="h-4 w-4 text-amber-600" />
              <span>Reclassificar Máquinas</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs"
              title="Cadastrar nova filial ou loja"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Loja / Filial</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Cards de Métricas e KPIs (calculados pelo back-end) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex items-center gap-3.5">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-slate-800">
              {kpis?.total_sites ?? sites.length}
            </div>
            <div className="text-xs font-medium text-slate-500">Lojas Cadastradas</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex items-center gap-3.5">
          <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-slate-800">
              {kpis?.active_sites ?? sites.filter((s) => s.active).length}
            </div>
            <div className="text-xs font-medium text-slate-500">Filiais Ativas</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex items-center gap-3.5">
          <div className="rounded-xl bg-purple-50 p-2.5 text-purple-600">
            <Monitor className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-slate-800">
              {kpis?.total_devices ?? sites.reduce((acc, s) => acc + (s.devices_count || 0), 0)}
            </div>
            <div className="text-xs font-medium text-slate-500">Estações Atribuídas</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex items-center gap-3.5">
          <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-slate-800">
              {kpis?.total_network_assets ?? sites.reduce((acc, s) => acc + (s.network_assets_count || 0), 0)}
            </div>
            <div className="text-xs font-medium text-slate-500">Ativos de Rede</div>
          </div>
        </div>
      </div>

      {/* 3. Barra de Busca e Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por código (ex: 01, CB01), nome ou padrão (ex: LJ01)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Todas as Lojas</option>
            <option value="active">Apenas Ativas</option>
            <option value="inactive">Apenas Desativadas</option>
          </select>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
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
        onDelete={handleDeleteSite}
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
    </div>
  );
};

export default SitesPage;
