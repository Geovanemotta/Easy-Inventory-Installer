import React, { useCallback, useEffect, useState } from 'react';
import {
  Layers,
  Trash2,
  CheckCircle2,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/apiClient';
import { networkAssetService } from '@/services/networkAssetService';
import { siteService } from '@/services/siteService';
import {
  NetworkAsset,
  NetworkAssetKPIs,
  NetworkAssetInput,
} from '@/types/networkAsset';
import { Site, SiteIpRange } from '@/types/site';

import { NetworkAssetKpiStrip } from './components/NetworkAssetKpiStrip';
import { NetworkAssetFilters } from './components/NetworkAssetFilters';
import { NetworkAssetsTable, AssetSortField } from './components/NetworkAssetsTable';
import { NetworkAssetFormModal } from './components/NetworkAssetFormModal';
import { NetworkAssetDetailsDrawer } from './components/NetworkAssetDetailsDrawer';
import { NetworkAssetScanModal } from './components/NetworkAssetScanModal';
import { NetworkAssetImportModal } from './components/NetworkAssetImportModal';
import { NetworkAssetDeleteModals } from './components/NetworkAssetDeleteModals';

export const NetworkAssetsPage: React.FC = () => {
  const { isAdmin } = useAuth();

  // Dados principais
  const [assets, setAssets] = useState<NetworkAsset[]>([]);
  const [kpis, setKpis] = useState<NetworkAssetKPIs | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [faixas, setFaixas] = useState<SiteIpRange[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [siteId, setSiteId] = useState<string>('todos');
  const [tipo, setTipo] = useState<string>('todos');
  const [statusOnline, setStatusOnline] = useState<'todos' | 'online' | 'offline' | 'nao_testado'>('todos');
  const [filtroGrupo, setFiltroGrupo] = useState<'' | 'impressora' | 'rede' | 'wifi'>('');
  const [filtroOcupacao, setFiltroOcupacao] = useState<'todos' | 'ocupados' | 'livres' | 'estacoes' | 'ativos'>('todos');
  const [faixaId, setFaixaId] = useState<string>('todas');

  // Ordenação e Paginação
  const [sortField, setSortField] = useState<AssetSortField>('ip');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalItems, setTotalItems] = useState(0);

  // Seleção múltipla
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Modais e Drawers
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<NetworkAsset | null>(null);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [selectedAssetForDrawer, setSelectedAssetForDrawer] = useState<NetworkAsset | null>(null);

  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanning, setScanning] = useState(false);

  const [importModalOpen, setImportModalOpen] = useState(false);

  // Confirmações de Exclusão
  const [assetToDelete, setAssetToDelete] = useState<NetworkAsset | null>(null);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Estado de Ping individual
  const [pingingId, setPingingId] = useState<number | string | null>(null);

  // Toasts
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Carregamento de dados
  const loadSitesAndFaixas = useCallback(async () => {
    try {
      const [sitesData, faixasData] = await Promise.all([
        siteService.listSites(true).catch(() => []),
        networkAssetService.listIpRanges().catch(() => []),
      ]);
      setSites(sitesData);
      setFaixas(faixasData);
    } catch (err) {
      console.warn('Erro ao carregar lojas e faixas:', err);
    }
  }, []);



  const loadKpis = useCallback(async () => {
    try {
      const siteIdParam = siteId !== 'todos' && siteId !== 'sem' ? Number(siteId) : undefined;
      const faixaIdParam = faixaId !== 'todas' ? Number(faixaId) : undefined;
      const kpisData = await networkAssetService.getKPIs({
        site_id: siteIdParam,
        faixa_id: faixaIdParam,
        tipo: tipo !== 'todos' ? tipo : undefined,
        search: search.trim() || undefined,
        filtro_ocupacao: filtroOcupacao,
        grupo: filtroGrupo || undefined,
      });
      setKpis(kpisData);
    } catch (err) {
      console.warn('Erro ao carregar KPIs de ativos:', err);
    }
  }, [siteId, faixaId, tipo, search, filtroOcupacao, filtroGrupo]);

  const loadAssets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const siteIdParam = siteId !== 'todos' && siteId !== 'sem' ? Number(siteId) : undefined;
      const faixaIdParam = faixaId !== 'todas' ? Number(faixaId) : undefined;

      const data = await networkAssetService.listAssets({
        site_id: siteIdParam,
        faixa_id: faixaIdParam,
        tipo: tipo !== 'todos' ? tipo : undefined,
        status_online: statusOnline === 'online' ? true : statusOnline === 'offline' ? false : undefined,
        search: search.trim() || undefined,
        filtro_ocupacao: filtroOcupacao,
        grupo: filtroGrupo || undefined,
        page,
        per_page: pageSize,
        sort_by: sortField,
        sort_dir: sortAsc ? 'asc' : 'desc',
      });

      setAssets(data.items || []);
      setTotalItems(data.total || 0);
      if (data.kpis) {
        setKpis(data.kpis);
      }
    } catch (err: unknown) {
      if (!silent) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Erro ao carregar ativos de rede: ${msg}`);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [siteId, faixaId, tipo, statusOnline, search, filtroOcupacao, filtroGrupo, page, pageSize, sortField, sortAsc]);

  const [showKpis, setShowKpis] = useState(true);

  useEffect(() => {
    loadSitesAndFaixas();
  }, [loadSitesAndFaixas]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // Escuta evento global de refresh disparado pelo Header
  useEffect(() => {
    const handleGlobalRefresh = (e: Event) => {
      const customEvent = e as CustomEvent<{ silent?: boolean }>;
      loadAssets(customEvent.detail?.silent ?? false);
    };

    window.addEventListener('app:refresh-data', handleGlobalRefresh);
    return () => {
      window.removeEventListener('app:refresh-data', handleGlobalRefresh);
    };
  }, [loadAssets]);

  // Auto-refresh silencioso a cada 20 segundos em background (trafega apenas ~25 KB)
  useEffect(() => {
    const interval = setInterval(() => {
      loadAssets(true);
    }, 20000);

    return () => clearInterval(interval);
  }, [loadAssets]);

  // Reseta seleção de faixa caso não pertença à loja selecionada
  useEffect(() => {
    if (siteId !== 'todos' && siteId !== 'sem' && faixaId !== 'todas') {
      const existeNaLoja = faixas.some((f) => String(f.site_id) === siteId && String(f.id) === faixaId);
      if (!existeNaLoja) setFaixaId('todas');
    }
  }, [siteId, faixas, faixaId]);

  // Reseta página quando filtros mudam
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [search, siteId, tipo, statusOnline, filtroGrupo, filtroOcupacao, faixaId]);

  // Contagem para varredura em lote
  const assetsWithIpCount = (kpis?.total || 0) - (kpis?.livres || 0);

  // Handlers de Ações
  const handleSort = (field: AssetSortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
    setPage(1);
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    const selectable = assets.filter((a) => a.id && a.origem !== 'livre' && a.origem !== 'estacao');
    if (selectedIds.size === selectable.length && selectable.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectable.map((a) => a.id!)));
    }
  };

  // Ping individual
  const handlePing = async (asset: NetworkAsset) => {
    if (!asset.ip) {
      showToast('Este ativo não possui endereço IP configurado.');
      return;
    }

    const targetKey = asset.id ? asset.id : (asset.device_id ? -asset.device_id : asset.ip);
    setPingingId(targetKey);
    try {
      const effectiveId = asset.id ?? (asset.device_id ? -asset.device_id : 0);
      const res = await networkAssetService.pingAsset(effectiveId, asset.ip || undefined);

      // Atualiza o estado em memória localmente para resposta instantânea
      setAssets((prev) =>
        prev.map((item) => {
          const match =
            (item.id !== null && item.id !== undefined && item.id === asset.id) ||
            (item.device_id && asset.device_id && item.device_id === asset.device_id) ||
            (item.ip && asset.ip && item.ip.trim() === asset.ip.trim());

          if (match) {
            return {
              ...item,
              status_online: res.online,
              tempo_resposta_ms: res.tempo_resposta_ms,
              ultimo_ping: res.ultimo_ping || res.timestamp,
            };
          }
          return item;
        })
      );

      // Se drawer estiver aberto para o mesmo ativo, atualiza também
      if (
        selectedAssetForDrawer &&
        (selectedAssetForDrawer.id === asset.id ||
          (selectedAssetForDrawer.device_id && selectedAssetForDrawer.device_id === asset.device_id) ||
          selectedAssetForDrawer.ip === asset.ip)
      ) {
        setSelectedAssetForDrawer((prev) =>
          prev
            ? {
                ...prev,
                status_online: res.online,
                tempo_resposta_ms: res.tempo_resposta_ms,
                ultimo_ping: res.ultimo_ping || res.timestamp,
              }
            : null
        );
      }

      // Atualiza os KPIs
      loadKpis();

      if (asset.origem === 'livre') {
        if (res.online) {
          showToast(`⚠️ Alerta: IP ${asset.ip} sem cadastro respondendo na rede (${res.tempo_resposta_ms ?? 0} ms)!`);
        } else {
          showToast(`✅ IP ${asset.ip} verificado: desocupado na rede.`);
        }
      } else if (res.online) {
        showToast(`✅ ${asset.nome || asset.ip} ONLINE (${res.tempo_resposta_ms ?? 0} ms)`);
      } else {
        showToast(`❌ ${asset.nome || asset.ip} OFFLINE (sem resposta ICMP)`);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 429) {
        showToast(`⏳ ${err.message}`);
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Erro ao testar ping: ${msg}`);
      }
    } finally {
      setPingingId(null);
    }
  };

  // Scan em lote
  const handleExecuteScanBatch = async () => {
    setScanning(true);
    try {
      const ips = assets.map((a: NetworkAsset) => a.ip).filter((ip): ip is string => Boolean(ip && ip.trim()));
      const siteIdParam = siteId !== 'todos' && siteId !== 'sem' ? Number(siteId) : undefined;

      const res = await networkAssetService.scanBatch({
        site_id: siteIdParam,
        ips: ips.length <= 150 ? ips : undefined,
      });

      // Atualiza o estado em memória imediatamente com os resultados do scan
      const resMap = new Map(res.map((r) => [r.ip.trim(), r]));
      setAssets((prev) =>
        prev.map((item) => {
          if (item.ip && resMap.has(item.ip.trim())) {
            const r = resMap.get(item.ip.trim())!;
            return {
              ...item,
              status_online: r.online,
              tempo_resposta_ms: r.tempo_resposta_ms,
              ultimo_ping: r.timestamp,
            };
          }
          return item;
        })
      );

      const onlineCount = res.filter((r) => r.online).length;
      showToast(`Varredura concluída: ${res.length} testados, ${onlineCount} online, ${res.length - onlineCount} offline`);
      setScanModalOpen(false);
      loadAssets();
      loadKpis();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Erro na varredura em lote: ${msg}`);
    } finally {
      setScanning(false);
    }
  };

  // Salvar ativo (novo ou edição)
  const handleSaveAsset = async (input: NetworkAssetInput, assetId?: number) => {
    if (assetId) {
      await networkAssetService.updateAsset(assetId, input);
      showToast('Ativo de rede atualizado com sucesso!');
    } else {
      await networkAssetService.createAsset(input);
      showToast('Ativo de rede cadastrado com sucesso!');
    }
    setFormModalOpen(false);
    loadAssets();
    loadKpis();
  };

  // Exclusão individual
  const handleDeleteAsset = (asset: NetworkAsset) => {
    setAssetToDelete(asset);
  };

  const handleConfirmSingleDelete = async () => {
    if (!assetToDelete || !assetToDelete.id) return;
    setDeleting(true);
    try {
      await networkAssetService.deleteAsset(assetToDelete.id);
      showToast(`Ativo "${assetToDelete.nome}" excluído com sucesso.`);
      setAssetToDelete(null);
      if (selectedAssetForDrawer?.id === assetToDelete.id) {
        setDetailsDrawerOpen(false);
        setSelectedAssetForDrawer(null);
      }
      loadAssets();
      loadKpis();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Erro ao excluir ativo: ${msg}`);
    } finally {
      setDeleting(false);
    }
  };

  // Exclusão em massa
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setConfirmBulkDeleteOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await networkAssetService.bulkDeleteAssets(ids);
      showToast(`${res.removidos} ativos excluídos com sucesso.`);
      setSelectedIds(new Set());
      setConfirmBulkDeleteOpen(false);
      loadAssets();
      loadKpis();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Erro na exclusão em massa: ${msg}`);
    } finally {
      setDeleting(false);
    }
  };

  // Exportar CSV
  const handleExportCSV = async () => {
    try {
      const siteIdParam = siteId !== 'todos' && siteId !== 'sem' ? Number(siteId) : undefined;
      const faixaIdParam = faixaId !== 'todas' ? Number(faixaId) : undefined;
      const res = await networkAssetService.listAssets({
        site_id: siteIdParam,
        faixa_id: faixaIdParam,
        tipo: tipo !== 'todos' ? tipo : undefined,
        status_online: statusOnline === 'online' ? true : statusOnline === 'offline' ? false : undefined,
        search: search.trim() || undefined,
        filtro_ocupacao: filtroOcupacao,
        grupo: filtroGrupo || undefined,
        sort_by: sortField,
        sort_dir: sortAsc ? 'asc' : 'desc',
        export_all: true,
      });
      networkAssetService.exportCSV(res.items);
      showToast('Exportação CSV gerada com sucesso!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Erro ao exportar CSV: ${msg}`);
    }
  };

  // Resetar filtros
  const handleResetFilters = () => {
    setSearch('');
    setSiteId('todos');
    setTipo('todos');
    setStatusOnline('todos');
    setFiltroGrupo('');
    setFiltroOcupacao('todos');
    setFaixaId('todas');
  };

  const hasActiveFilters = Boolean(
    search.trim() ||
      siteId !== 'todos' ||
      tipo !== 'todos' ||
      statusOnline !== 'todos' ||
      filtroGrupo !== '' ||
      filtroOcupacao !== 'todos' ||
      faixaId !== 'todas'
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl border border-slate-700 animate-slide-up">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Layers className="h-6 w-6 text-orange-400" />
            Ativos de Rede &amp; Conectividade
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestão integrada de impressoras, switches, roteadores, APs Wi-Fi, balanças, mapa de IPs e testes de ping
          </p>
        </div>
      </div>

      {/* KPI Cards Strip (recolhida por padrão) */}
      {showKpis && (
        <div className="animate-in fade-in-50 duration-200">
          <NetworkAssetKpiStrip
            kpis={kpis || { total: 0, online: 0, offline: 0, nao_testado: 0, impressoras: 0, switches: 0, aps: 0, outros: 0, estacoes: 0, livres: 0, ativos: 0, testados: 0 }}
            filtroStatus={statusOnline}
            filtroGrupo={filtroGrupo}
            onSelectStatus={(st) => {
              setStatusOnline(st);
              if (st !== 'todos') setFiltroGrupo('');
            }}
            onSelectGrupo={(grp) => {
              setFiltroGrupo(grp);
              if (grp !== '') setStatusOnline('todos');
            }}
          />
        </div>
      )}

      {/* Linha do botão de recolher/expandir indicadores (mb-3 isolada) */}
      <div className="flex items-center justify-end mb-3">
        <button
          type="button"
          onClick={() => setShowKpis((prev) => !prev)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
            showKpis
              ? 'bg-orange-500/15 border-orange-500/30 text-orange-400 hover:bg-orange-500/25'
              : 'border-[#263044] bg-[#181F2E] text-slate-300 hover:bg-[#263044] hover:text-white'
          }`}
          title="Exibir ou ocultar resumo e indicadores"
        >
          <BarChart3 className="h-3.5 w-3.5 text-orange-400" />
          <span>{showKpis ? 'Ocultar Indicadores' : 'Exibir Indicadores'}</span>
          {showKpis ? (
            <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          )}
        </button>
      </div>

      {/* Filters Toolbar em Linha Única */}
      <div className="relative z-20 mb-3">
        <NetworkAssetFilters
          search={search}
          onSearchChange={setSearch}
          siteId={siteId}
          onSiteChange={setSiteId}
          tipo={tipo}
          onTipoChange={setTipo}
          statusOnline={statusOnline}
          onStatusChange={setStatusOnline}
          filtroOcupacao={filtroOcupacao}
          onOcupacaoChange={setFiltroOcupacao}
          faixaId={faixaId}
          onFaixaChange={setFaixaId}
          sites={sites}
          faixas={faixas}
          onOpenCreate={() => {
            setEditingAsset(null);
            setFormModalOpen(true);
          }}
          onOpenScan={() => setScanModalOpen(true)}
          onOpenImport={() => setImportModalOpen(true)}
          onExportCSV={handleExportCSV}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
          isAdmin={isAdmin}
          loading={loading}
        />
      </div>

      {/* Bulk action floating/sticky strip */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-xs shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="font-bold text-orange-300">
              {selectedIds.size} {selectedIds.size === 1 ? 'ativo selecionado' : 'ativos selecionados'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 rounded-lg border border-[#263044] bg-[#181F2E] text-slate-300 hover:bg-[#263044] hover:text-white transition-colors cursor-pointer"
            >
              Desmarcar todos
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-500 shadow-2xs transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir selecionados
              </button>
            )}
          </div>
        </div>
      )}

      {/* Assets Table */}
      <NetworkAssetsTable
        assets={assets}
        loading={loading}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        sortField={sortField}
        sortAsc={sortAsc}
        onSort={handleSort}
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onPing={handlePing}
        pingingId={pingingId}
        onViewDetails={(asset) => {
          setSelectedAssetForDrawer(asset);
          setDetailsDrawerOpen(true);
        }}
        onEdit={(asset) => {
          setEditingAsset(asset);
          setFormModalOpen(true);
        }}
        onDelete={handleDeleteAsset}
        isAdmin={isAdmin}
      />

      {/* Modals & Drawers */}

      {/* 1. Form Modal (Create / Edit / Assign Free IP) */}
      <NetworkAssetFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSave={handleSaveAsset}
        asset={editingAsset}
        sites={sites}
      />

      {/* 2. Details Slide-over Drawer */}
      <NetworkAssetDetailsDrawer
        isOpen={detailsDrawerOpen}
        onClose={() => {
          setDetailsDrawerOpen(false);
          setSelectedAssetForDrawer(null);
        }}
        asset={selectedAssetForDrawer}
        site={sites.find((s) => s.id === selectedAssetForDrawer?.site_id)}
        isAdmin={isAdmin}
        onEdit={(asset) => {
          setDetailsDrawerOpen(false);
          setEditingAsset(asset);
          setFormModalOpen(true);
        }}
        onDelete={(asset) => {
          handleDeleteAsset(asset);
        }}
        onPing={handlePing}
        isPinging={
          pingingId !== null &&
          (pingingId === selectedAssetForDrawer?.id ||
            (selectedAssetForDrawer?.device_id !== null &&
              selectedAssetForDrawer?.device_id !== undefined &&
              (pingingId === -selectedAssetForDrawer.device_id ||
                pingingId === selectedAssetForDrawer.device_id)))
        }
        onUpdateAsset={(updated) => {
          setSelectedAssetForDrawer(updated);
          setAssets((prev) =>
            prev.map((a) =>
              (a.id !== null && a.id !== undefined && a.id === updated.id) ||
              (a.device_id && updated.device_id && a.device_id === updated.device_id) ||
              (a.ip && updated.ip && a.ip.trim() === updated.ip.trim())
                ? updated
                : a
            )
          );
        }}
        showToast={showToast}
      />

      {/* 3. Batch Scan Modal */}
      <NetworkAssetScanModal
        isOpen={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
        onConfirm={handleExecuteScanBatch}
        scanning={scanning}
        targetCount={assetsWithIpCount}
        siteName={sites.find((s) => String(s.id) === siteId)?.name}
        tipo={tipo}
        search={search}
      />

      {/* 4. Import CSV Modal */}
      <NetworkAssetImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          loadAssets();
          loadKpis();
        }}
      />

      {/* 5. Delete Confirmation Modals (Single & Bulk) */}
      <NetworkAssetDeleteModals
        assetToDelete={assetToDelete}
        onCancelSingleDelete={() => setAssetToDelete(null)}
        onConfirmSingleDelete={handleConfirmSingleDelete}
        confirmBulkDeleteOpen={confirmBulkDeleteOpen}
        selectedCount={selectedIds.size}
        onCancelBulkDelete={() => setConfirmBulkDeleteOpen(false)}
        onConfirmBulkDelete={handleConfirmBulkDelete}
        deleting={deleting}
      />
    </div>
  );
};
