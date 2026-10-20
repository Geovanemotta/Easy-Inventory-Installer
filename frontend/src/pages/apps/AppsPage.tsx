import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppWindow } from 'lucide-react';
import {
  BrowserComplianceSummary,
  SoftwareCatalogItem,
  SoftwareCatalogKPIs,
  SoftwareCatalogResponse,
} from '@/types/software';
import { Site } from '@/types/site';
import { softwareService } from '@/services/softwareService';
import { siteService } from '@/services/siteService';

import { AppsKpiStrip } from './components/AppsKpiStrip';
import { BrowserComplianceBanner } from './components/BrowserComplianceBanner';
import { AppsFilters } from './components/AppsFilters';
import { AppsTable } from './components/AppsTable';
import { SoftwareDevicesDrawer } from './components/SoftwareDevicesDrawer';
import { DevicesWithoutAppsDrawer } from './components/DevicesWithoutAppsDrawer';

export const AppsPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<SoftwareCatalogItem[]>([]);
  const [kpis, setKpis] = useState<SoftwareCatalogKPIs | null>(null);
  const [navegadores, setNavegadores] = useState<BrowserComplianceSummary[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [siteId, setSiteId] = useState<string>('todos');
  const [plataforma, setPlataforma] = useState<string>('todas');
  const [categoria, setCategoria] = useState<string>('todas');

  // Paginação Server-Side
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Drawer de máquinas de software específico
  const [selectedSoftware, setSelectedSoftware] = useState<SoftwareCatalogItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Drawer de máquinas sem/com inventário
  const [isSemAppsDrawerOpen, setIsSemAppsDrawerOpen] = useState(false);
  const [semAppsDrawerMode, setSemAppsDrawerMode] = useState<'sem_apps' | 'com_apps'>('sem_apps');

  // Carregar lista de filiais uma única vez
  useEffect(() => {
    siteService
      .listSites()
      .then((res) => setSites(res))
      .catch((err) => console.error('Erro ao carregar lojas:', err));
  }, []);

  // Carregar catálogo de softwares e KPIs
  const loadCatalog = useCallback(() => {
    setLoading(true);
    const siteIdNum = siteId !== 'todos' ? Number(siteId) : undefined;

    softwareService
      .getCatalog({
        page,
        per_page: perPage,
        site_id: siteIdNum,
        plataforma,
        categoria,
        search,
      })
      .then((res: SoftwareCatalogResponse) => {
        setItems(res.items || []);
        setTotalItems(res.total || 0);
        setTotalPages(res.total_pages || 1);
        setKpis(res.kpis);
        if (res.navegadores_conformidade) {
          setNavegadores(res.navegadores_conformidade);
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar catálogo de softwares:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, perPage, siteId, plataforma, categoria, search]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleSiteChange = (val: string) => {
    setSiteId(val);
    setPage(1);
  };

  const handlePlataformaChange = (val: string) => {
    setPlataforma(val);
    setPage(1);
  };

  const handleCategoriaChange = (val: string) => {
    setCategoria(val);
    setPage(1);
  };

  const handleSelectSoftware = (software: SoftwareCatalogItem) => {
    setSelectedSoftware(software);
    setIsDrawerOpen(true);
  };

  const handleSelectSoftwareById = (softwareId: number) => {
    const item = items.find((i) => i.id === softwareId);
    if (item) {
      setSelectedSoftware(item);
      setIsDrawerOpen(true);
    } else {
      const navItem = navegadores.find((n) => n.software_id === softwareId);
      if (navItem) {
        setSelectedSoftware({
          id: navItem.software_id,
          identifier: navItem.identifier,
          nome: navItem.software_nome,
          tipo: 'aplicativo',
          origem: 'canonical',
          total_instalacoes: navItem.total_instalacoes,
          percentual_parque: 0,
          total_versoes: 1,
          total_atualizadas: navItem.total_atualizadas,
          total_desatualizadas: navItem.total_desatualizadas,
          taxa_conformidade: navItem.taxa_conformidade,
          versao_mais_recente: navItem.mais_recente,
          versoes: [],
        });
        setIsDrawerOpen(true);
      }
    }
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedSoftware(null);
  };

  const handleResetFilters = () => {
    setSearch('');
    setSiteId('todos');
    setPlataforma('todas');
    setCategoria('todas');
    setPage(1);
  };

  const handleOpenSemApps = () => {
    setSemAppsDrawerMode('sem_apps');
    setIsSemAppsDrawerOpen(true);
  };

  const handleOpenComApps = () => {
    setSemAppsDrawerMode('com_apps');
    setIsSemAppsDrawerOpen(true);
  };

  const handleCloseSemAppsDrawer = () => {
    setIsSemAppsDrawerOpen(false);
  };

  const handleNavigateSemApps = () => {
    const params = new URLSearchParams();
    params.set('sem_apps', 'true');
    if (siteId !== 'todos') {
      params.set('site_id', siteId);
    }
    navigate(`/devices?${params.toString()}`);
  };

  const handleExportCatalogCsv = async () => {
    try {
      const siteIdNum = siteId !== 'todos' ? Number(siteId) : undefined;
      const res = await softwareService.getCatalog({
        site_id: siteIdNum,
        plataforma,
        categoria,
        search,
        export_all: true,
      });

      const exportItems = res.items || [];
      if (exportItems.length === 0) return;

      const headers = [
        'Nome do Software',
        'Identificador',
        'Categoria',
        'Versão Mais Recente (Parque)',
        'Total de Versões Distintas',
        'Total de Instalações',
        'Percentual da Frota (%)',
        'Atualizadas',
        'Desatualizadas',
        'Taxa de Conformidade (%)',
      ];
      const rows = exportItems.map((item) => [
        item.nome,
        item.identifier,
        item.tipo,
        item.versao_mais_recente || item.ultima_versao || 'N/D',
        item.total_versoes,
        item.total_instalacoes,
        `${item.percentual_parque}%`,
        item.total_atualizadas ?? 0,
        item.total_desatualizadas ?? 0,
        `${item.taxa_conformidade ?? 100}%`,
      ]);

      const csvContent = [
        headers.join(';'),
        ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')),
      ].join('\r\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `catalogo_softwares_giassi.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Erro ao exportar catálogo para CSV:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho da Página Padronizado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <AppWindow className="h-6 w-6 text-orange-400" />
            Catálogo de Aplicativos &amp; Softwares
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Visão unificada de softwares, agentes, runtimes e ferramentas instaladas nas estações Linux e Windows
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 border border-orange-500/30 text-orange-400 font-mono tabular-nums">
            {kpis?.total_softwares ?? 0} softwares catalogados
          </span>
        </div>
      </div>

      {/* Faixa de KPIs Operacionais */}
      <AppsKpiStrip
        kpis={kpis}
        categoriaAtiva={categoria}
        onSelectCategoria={handleCategoriaChange}
        onOpenSemApps={handleOpenSemApps}
        onOpenComApps={handleOpenComApps}
        onNavigateSemApps={handleNavigateSemApps}
        loading={loading}
      />

      {/* Painel de Conformidade de Navegadores (Destaque Google Chrome) */}
      <BrowserComplianceBanner
        browsers={navegadores}
        onSelectSoftware={handleSelectSoftwareById}
        loading={loading}
      />

      {/* Filtros de Busca, Filial e Plataforma com Botão de Limpar */}
      <AppsFilters
        search={search}
        onSearchChange={handleSearchChange}
        siteId={siteId}
        onSiteChange={handleSiteChange}
        sites={sites}
        plataforma={plataforma}
        onPlataformaChange={handlePlataformaChange}
        categoria={categoria}
        onCategoriaChange={handleCategoriaChange}
        onRefresh={loadCatalog}
        onResetFilters={handleResetFilters}
        onExportCsv={handleExportCatalogCsv}
        loading={loading}
        totalFiltered={totalItems}
      />

      {/* Tabela do Catálogo Paginada no Servidor */}
      <AppsTable
        items={items}
        totalFleet={kpis?.total_maquinas_inventariadas ?? 0}
        onSelectSoftware={handleSelectSoftware}
        selectedSoftwareId={selectedSoftware?.id}
        loading={loading}
        page={page}
        perPage={perPage}
        totalItems={totalItems}
        totalPages={totalPages}
        onPageChange={setPage}
        onPerPageChange={(newPerPage) => {
          setPerPage(newPerPage);
          setPage(1);
        }}
      />

      {/* Drawer de Máquinas do Software Paginado e com SSH */}
      <SoftwareDevicesDrawer
        software={selectedSoftware}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        siteIdFilter={siteId}
      />

      {/* Drawer Lateral de Máquinas sem/com Inventário de Aplicativos */}
      <DevicesWithoutAppsDrawer
        isOpen={isSemAppsDrawerOpen}
        onClose={handleCloseSemAppsDrawer}
        mode={semAppsDrawerMode}
        siteIdFilter={siteId}
      />
    </div>
  );
};

export default AppsPage;
