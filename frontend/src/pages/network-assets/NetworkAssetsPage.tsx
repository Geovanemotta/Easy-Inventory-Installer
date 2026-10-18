import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Layers,
  Trash2,
  AlertTriangle,
  CheckCircle2,
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
      });
      setKpis(kpisData);
    } catch (err) {
      console.warn('Erro ao carregar KPIs de ativos:', err);
    }
  }, [siteId, faixaId]);

  const loadAssets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const siteIdParam = siteId !== 'todos' && siteId !== 'sem' ? Number(siteId) : undefined;
      const faixaIdParam = faixaId !== 'todas' ? Number(faixaId) : undefined;

      const data = await networkAssetService.listAssets({
        site_id: siteIdParam,
        faixa_id: faixaIdParam,
      });

      setAssets(data || []);
    } catch (err: unknown) {
      if (!silent) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Erro ao carregar ativos de rede: ${msg}`);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [siteId, faixaId]);

  const [showKpis, setShowKpis] = useState(false);

  useEffect(() => {
    loadSitesAndFaixas();
  }, [loadSitesAndFaixas]);

  useEffect(() => {
    loadAssets();
    loadKpis();
  }, [loadAssets, loadKpis]);

  // Escuta evento global de refresh disparado pelo Header
  useEffect(() => {
    const handleGlobalRefresh = (e: Event) => {
      const customEvent = e as CustomEvent<{ silent?: boolean }>;
      loadAssets(customEvent.detail?.silent ?? false);
      loadKpis();
    };

    window.addEventListener('app:refresh-data', handleGlobalRefresh);
    return () => {
      window.removeEventListener('app:refresh-data', handleGlobalRefresh);
    };
  }, [loadAssets, loadKpis]);

  // Auto-refresh silencioso a cada 20 segundos em background (sem loading que pisque a tabela)
  useEffect(() => {
    const interval = setInterval(() => {
      loadAssets(true);
      loadKpis();
    }, 20000);

    return () => clearInterval(interval);
  }, [loadAssets, loadKpis]);

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
  }, [search, siteId, tipo, statusOnline, filtroGrupo, filtroOcupacao, faixaId, sortField, sortAsc, pageSize]);

  // Cálculo dinâmico e em tempo real dos KPIs baseado no conjunto unificado de assets carregados
  const computedKpis = useMemo<NetworkAssetKPIs>(() => {
    let online = 0;
    let offline = 0;
    let naoTestado = 0;
    let impressoras = 0;
    let switches = 0;
    let aps = 0;
    let outros = 0;
    let estacoes = 0;
    let livres = 0;
    let ativos = 0;

    for (const a of assets) {
      if (a.status_online === true) {
        online++;
      } else if (a.status_online === false) {
        offline++;
      } else {
        naoTestado++;
      }

      if (a.origem === 'estacao') {
        estacoes++;
      } else if (a.origem === 'livre') {
        livres++;
      } else if (a.origem === 'manual' || a.origem === 'planilha') {
        ativos++;
      }

      const t = (a.tipo || '').toUpperCase();
      if (t.includes('IMPRESSORA')) {
        impressoras++;
      } else if (t.includes('SWITCH') || t.includes('ROTEADOR') || t.includes('FIREWALL')) {
        switches++;
      } else if (t.includes('POINT') || t.includes('WIFI') || /\bAP\b/.test(t)) {
        aps++;
      } else {
        outros++;
      }
    }

    return {
      total: assets.length,
      online,
      offline,
      nao_testado: naoTestado,
      impressoras,
      switches,
      aps,
      outros,
      estacoes,
      livres,
      ativos,
      testados: online + offline,
      ultimo_ping: kpis?.ultimo_ping || null,
    };
  }, [assets, kpis?.ultimo_ping]);

  // Filtro unificado de busca, tipo, status, grupo e ocupação no front-end
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      // 1. Filial sem vínculo
      if (siteId === 'sem' && asset.site_id) return false;

      // 2. Grupo de KPI (Impressora, Rede, WiFi)
      if (filtroGrupo === 'impressora') {
        const t = (asset.tipo || '').toUpperCase();
        if (!t.includes('IMPRESSORA')) return false;
      } else if (filtroGrupo === 'rede') {
        const t = (asset.tipo || '').toUpperCase();
        if (!t.includes('SWITCH') && !t.includes('ROTEADOR') && !t.includes('FIREWALL')) return false;
      } else if (filtroGrupo === 'wifi') {
        const t = (asset.tipo || '').toUpperCase();
        if (!t.includes('POINT') && !t.includes('WIFI') && !/\bAP\b/.test(t)) return false;
      }

      // 3. Tipo específico do dropdown
      if (tipo !== 'todos') {
        if ((asset.tipo || '').toUpperCase().trim() !== tipo.toUpperCase().trim()) return false;
      }

      // 4. Status de conexão
      if (statusOnline === 'online' && asset.status_online !== true) return false;
      if (statusOnline === 'offline' && asset.status_online !== false) return false;
      if (statusOnline === 'nao_testado' && asset.status_online !== null && asset.status_online !== undefined) return false;

      // 5. Ocupação
      if (filtroOcupacao === 'ocupados' && asset.origem === 'livre') return false;
      if (filtroOcupacao === 'livres' && asset.origem !== 'livre') return false;
      if (filtroOcupacao === 'estacoes' && asset.origem !== 'estacao') return false;
      if (filtroOcupacao === 'ativos' && asset.origem !== 'manual' && asset.origem !== 'planilha') return false;

      // 6. Busca textual unificada
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const campos = [
          asset.nome,
          asset.ip,
          asset.mac,
          asset.patrimonio,
          asset.fabricante,
          asset.modelo,
          asset.localizacao,
          asset.tipo,
          asset.site_nome,
          asset.site_codigo,
          asset.observacoes,
          asset.faixa_nome,
        ];
        if (!campos.some((c) => (c || '').toLowerCase().includes(q))) return false;
      }

      return true;
    });
  }, [assets, siteId, filtroGrupo, tipo, statusOnline, filtroOcupacao, search]);

  // Ordenação dos ativos
  const sortedAssets = useMemo(() => {
    const list = [...filteredAssets];

    const ipToNum = (ip?: string | null) => {
      if (!ip) return Infinity;
      const parts = ip.trim().split('.');
      if (parts.length !== 4) return Infinity;
      let num = 0;
      for (const p of parts) {
        const v = parseInt(p, 10);
        if (isNaN(v) || v < 0 || v > 255) return Infinity;
        num = num * 256 + v;
      }
      return num;
    };

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'ip':
          cmp = ipToNum(a.ip) - ipToNum(b.ip);
          break;
        case 'nome':
          cmp = (a.nome || '').localeCompare(b.nome || '');
          break;
        case 'tipo':
          cmp = (a.tipo || '').localeCompare(b.tipo || '');
          break;
        case 'filial':
          cmp = (a.site_nome || a.site_codigo || '').localeCompare(b.site_nome || b.site_codigo || '');
          break;
        case 'status': {
          const valA = a.status_online === true ? 2 : a.status_online === false ? 1 : 0;
          const valB = b.status_online === true ? 2 : b.status_online === false ? 1 : 0;
          cmp = valA - valB;
          break;
        }
        case 'patrimonio':
          cmp = (a.patrimonio || '').localeCompare(b.patrimonio || '');
          break;
        default:
          cmp = 0;
      }
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [filteredAssets, sortField, sortAsc]);

  // Itens paginados
  const paginatedAssets = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedAssets.slice(start, start + pageSize);
  }, [sortedAssets, page, pageSize]);

  // Contagem para varredura em lote
  const assetsWithIpCount = useMemo(() => {
    return filteredAssets.filter((a) => a.ip && a.ip.trim()).length;
  }, [filteredAssets]);

  // Handlers de Ações
  const handleSort = (field: AssetSortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
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
    const selectable = paginatedAssets.filter((a) => a.id && a.origem !== 'livre' && a.origem !== 'estacao');
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
      const ips = filteredAssets.map((a) => a.ip).filter((ip): ip is string => Boolean(ip && ip.trim()));
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
  const handleExportCSV = () => {
    try {
      networkAssetService.exportCSV(filteredAssets);
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
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
            <Layers className="h-6 w-6 text-blue-600" />
            Ativos de Rede &amp; Conectividade
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestão integrada de impressoras, switches, roteadores, APs Wi-Fi, balanças, mapa de IPs e testes de ping
          </p>
        </div>
      </div>

      {/* KPI Cards Strip (recolhida por padrão) */}
      {showKpis && (
        <div className="animate-in fade-in-50 duration-200">
          <NetworkAssetKpiStrip
            kpis={computedKpis}
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

      {/* Filters Toolbar em Linha Única */}
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
        showKpis={showKpis}
        onToggleKpis={() => setShowKpis((prev) => !prev)}
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

      {/* Bulk action floating/sticky strip */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50/90 border border-blue-200 text-xs shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="font-bold text-blue-900">
              {selectedIds.size} {selectedIds.size === 1 ? 'ativo selecionado' : 'ativos selecionados'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-white/80 transition-colors"
            >
              Desmarcar todos
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 shadow-2xs transition-colors"
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
        assets={paginatedAssets}
        loading={loading}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        sortField={sortField}
        sortAsc={sortAsc}
        onSort={handleSort}
        page={page}
        pageSize={pageSize}
        totalItems={sortedAssets.length}
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

      {/* 5. Single Delete Confirmation */}
      {assetToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => !deleting && setAssetToDelete(null)}
            />
            <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-slate-200 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600">
                  <Trash2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Excluir Ativo de Rede?</h3>
                  <p className="text-xs text-slate-500">Esta ação não poderá ser desfeita.</p>
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                Tem certeza que deseja remover o equipamento{' '}
                <strong className="text-slate-900 font-bold">{assetToDelete.nome}</strong>{' '}
                {assetToDelete.ip ? `(${assetToDelete.ip})` : ''} do inventário permanente?
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAssetToDelete(null)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSingleDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-xs disabled:opacity-50"
                >
                  {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Bulk Delete Confirmation */}
      {confirmBulkDeleteOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => !deleting && setConfirmBulkDeleteOpen(false)}
            />
            <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-slate-200 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Excluir {selectedIds.size} Ativos Selecionados?
                  </h3>
                  <p className="text-xs text-slate-500">Exclusão permanente em lote</p>
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                Você está prestes a remover permanentemente{' '}
                <strong className="text-slate-900 font-bold">{selectedIds.size} equipamentos</strong>{' '}
                do inventário de ativos. Esta ação não poderá ser desfeita.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmBulkDeleteOpen(false)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBulkDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-xs disabled:opacity-50"
                >
                  {deleting ? 'Excluindo...' : `Excluir ${selectedIds.size} Ativos`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
