import React, { useEffect, useState } from 'react';
import {
  Search,
  X,
  Plus,
  Upload,
  Download,
  Zap,
  RotateCcw,
} from 'lucide-react';
import { Site, SiteIpRange } from '@/types/site';
import { TIPOS_PREDEFINIDOS } from '@/types/networkAsset';
import { SelectDropdown, SelectOption } from '@/components/common/SelectDropdown';

interface NetworkAssetFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  siteId: string;
  onSiteChange: (siteId: string) => void;
  tipo: string;
  onTipoChange: (tipo: string) => void;
  statusOnline?: 'todos' | 'online' | 'offline' | 'nao_testado';
  onStatusChange?: (status: 'todos' | 'online' | 'offline' | 'nao_testado') => void;
  filtroOcupacao: 'todos' | 'ocupados' | 'livres' | 'estacoes' | 'ativos';
  onOcupacaoChange: (val: 'todos' | 'ocupados' | 'livres' | 'estacoes' | 'ativos') => void;
  faixaId: string;
  onFaixaChange: (faixaId: string) => void;
  sites: Site[];
  faixas: SiteIpRange[];
  showKpis?: boolean;
  onToggleKpis?: () => void;
  onOpenCreate: () => void;
  onOpenScan: () => void;
  onOpenImport: () => void;
  onExportCSV: () => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  isAdmin: boolean;
  loading: boolean;
}

export const NetworkAssetFilters: React.FC<NetworkAssetFiltersProps> = ({
  search,
  onSearchChange,
  siteId,
  onSiteChange,
  tipo,
  onTipoChange,
  statusOnline: _statusOnline,
  onStatusChange: _onStatusChange,
  filtroOcupacao,
  onOcupacaoChange,
  faixaId,
  onFaixaChange,
  sites,
  faixas,
  showKpis: _showKpis,
  onToggleKpis: _onToggleKpis,
  onOpenCreate,
  onOpenScan,
  onOpenImport,
  onExportCSV,
  onResetFilters,
  hasActiveFilters,
  isAdmin,
  loading: _loading,
}) => {
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        onSearchChange(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, search, onSearchChange]);

  // Seletor de Filial (Apenas o nome da filial, sem código)
  const siteOptions: SelectOption[] = [
    { value: 'todos', label: 'Todas as Filiais' },
    { value: 'sem', label: 'Sem Filial' },
    ...sites.map((s) => ({ value: String(s.id), label: s.name })),
  ];

  // Seletor de Tipos Predefinidos
  const tipoOptions: SelectOption[] = [
    { value: 'todos', label: 'Todos os Tipos' },
    ...TIPOS_PREDEFINIDOS.map((t) => ({ value: t, label: t })),
  ];

  // Seletor de Ocupação
  const ocupacaoOptions: SelectOption[] = [
    { value: 'todos', label: 'Ocupação (Todos)' },
    { value: 'ocupados', label: 'Apenas Ocupados' },
    { value: 'livres', label: 'Apenas IPs Livres' },
    { value: 'estacoes', label: 'Apenas Estações' },
    { value: 'ativos', label: 'Apenas Ativos' },
  ];

  // VLAN condicional: exibido somente se uma filial específica estiver selecionada
  const hasSpecificSite = siteId !== 'todos' && siteId !== '' && siteId !== 'sem';
  const faixasDisponiveis = hasSpecificSite
    ? faixas.filter((f) => String(f.site_id) === siteId)
    : [];

  const faixaOptions: SelectOption[] = [
    { value: 'todas', label: 'VLANs (Todas)' },
    ...faixasDisponiveis.map((f) => ({ value: String(f.id), label: f.nome })),
  ];

  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3 shadow-xs">
      {/* Barra de Filtros e Ações em Linha Única Horizontal no Desktop */}
      <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5 w-full">
        {/* 1. Busca com Debounce (flex-1 min-w-[180px]) */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-secondary" />
          <input
            type="text"
            placeholder="Buscar nome, IP, MAC, patrimônio..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full rounded-lg border border-border-medium bg-elevated py-1.5 pl-8 pr-7 text-xs text-fg placeholder:text-fg-muted focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch('');
                onSearchChange('');
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-secondary hover:text-fg p-0.5 cursor-pointer"
              title="Limpar busca"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* 2. Filial (Apenas nome da loja) */}
        <div className="w-44 shrink-0">
          <SelectDropdown
            value={siteId}
            onChange={onSiteChange}
            options={siteOptions}
            placeholder="Filial..."
            triggerClassName="py-1.5 text-xs"
          />
        </div>

        {/* 3. Faixa de IP / VLAN (Exibida SOMENTE com filial específica selecionada) */}
        {hasSpecificSite && (
          <div className="w-40 shrink-0 animate-in fade-in duration-150">
            <SelectDropdown
              value={faixaId}
              onChange={onFaixaChange}
              options={faixaOptions}
              placeholder="VLAN / Faixa..."
              triggerClassName="py-1.5 text-xs"
              disabled={faixasDisponiveis.length === 0}
            />
          </div>
        )}

        {/* 4. Tipo de Ativo */}
        <div className="w-36 shrink-0">
          <SelectDropdown
            value={tipo}
            onChange={onTipoChange}
            options={tipoOptions}
            placeholder="Tipo..."
            triggerClassName="py-1.5 text-xs"
          />
        </div>

        {/* 5. Ocupação / Origem */}
        <div className="w-36 shrink-0">
          <SelectDropdown
            value={filtroOcupacao}
            onChange={(val) => onOcupacaoChange(val as any)}
            options={ocupacaoOptions}
            placeholder="Ocupação..."
            triggerClassName="py-1.5 text-xs"
          />
        </div>

        {/* 6. Botão Limpar Padronizado */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            title="Limpar todos os filtros"
            className="flex items-center gap-1.5 bg-elevated hover:bg-border-subtle text-gray-700 dark:text-slate-300 border border-border-medium px-3 py-2 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Limpar</span>
          </button>
        )}

        {/* 7. Botões de Ação Administrativos e Utilitários */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={onOpenScan}
                className="flex items-center gap-1 rounded-lg border border-border-medium bg-elevated px-2.5 py-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-border-subtle hover:text-fg transition-colors shadow-xs cursor-pointer"
                title="Testar conectividade (Ping) em lote"
              >
                <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span className="hidden sm:inline">Varredura</span>
              </button>

              <button
                type="button"
                onClick={onOpenImport}
                className="flex items-center gap-1 rounded-lg border border-border-medium bg-elevated px-2.5 py-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-border-subtle hover:text-fg transition-colors shadow-xs cursor-pointer"
                title="Importar ativos via planilha CSV"
              >
                <Upload className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Importar</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onExportCSV}
            className="flex items-center gap-1 rounded-lg border border-border-medium bg-elevated px-2.5 py-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-border-subtle hover:text-fg transition-colors shadow-xs cursor-pointer"
            title="Exportar ativos filtrados para CSV"
          >
            <Download className="h-3.5 w-3.5 text-orange-400" />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          {/* Único Botão Novo Ativo (Admin) */}
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenCreate}
              className="flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 px-3 py-1.5 text-xs font-bold text-white transition-colors shadow-xs cursor-pointer"
              title="Cadastrar novo ativo de rede"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Ativo</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
