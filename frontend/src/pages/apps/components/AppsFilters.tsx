import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  X,
  Download,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Building2,
  Monitor,
  Tag,
} from 'lucide-react';
import { Site } from '@/types/site';
import { SelectDropdown, SelectOption } from '@/components/common/SelectDropdown';

interface AppsFiltersProps {
  search: string;
  onSearchChange: (search: string) => void;
  siteId: string;
  onSiteChange: (siteId: string) => void;
  sites: Site[];
  plataforma: string;
  onPlataformaChange: (plataforma: string) => void;
  categoria: string;
  onCategoriaChange: (categoria: string) => void;
  onRefresh: () => void;
  onResetFilters: () => void;
  onExportCsv: () => void;
  loading?: boolean;
  totalFiltered: number;
}

const PLATAFORMA_OPTIONS: SelectOption[] = [
  { value: 'todas', label: 'Todas as Plataformas' },
  { value: 'windows', label: 'Apenas Windows' },
  { value: 'linux', label: 'Apenas Linux' },
];

const CATEGORIA_OPTIONS: SelectOption[] = [
  { value: 'todas', label: 'Todas as Categorias' },
  { value: 'aplicativo', label: 'Aplicativos' },
  { value: 'agente', label: 'Agentes' },
  { value: 'runtime', label: 'Runtimes' },
  { value: 'ferramenta', label: 'Ferramentas' },
];

export const AppsFilters: React.FC<AppsFiltersProps> = ({
  search,
  onSearchChange,
  siteId,
  onSiteChange,
  sites,
  plataforma,
  onPlataformaChange,
  categoria,
  onCategoriaChange,
  onRefresh,
  onResetFilters,
  onExportCsv,
  loading = false,
  totalFiltered,
}) => {
  const [localSearch, setLocalSearch] = useState(search);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearch);
    }, 250);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const siteOptions: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [{ value: 'todos', label: 'Todas as Lojas' }];
    sites.forEach((s) => {
      opts.push({
        value: String(s.id),
        label: s.name || s.code,
      });
    });
    return opts;
  }, [sites]);

  const hasActiveFilters = Boolean(
    localSearch ||
      (siteId && siteId !== 'todos') ||
      (plataforma && plataforma !== 'todas') ||
      (categoria && categoria !== 'todas' && categoria !== ''),
  );

  return (
    <div className="bg-[#121721] rounded-xl border border-[#1E2636] p-3 shadow-sm space-y-3">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Campo de Busca */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nome do aplicativo, navegador, pacote..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-[#263044] bg-[#181F2E] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch('');
                onSearchChange('');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white rounded cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filtros em linha */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filtro por Loja / Filial */}
          <div className="w-48 shrink-0">
            <SelectDropdown
              value={siteId || 'todos'}
              onChange={onSiteChange}
              options={siteOptions}
              icon={<Building2 className="h-3.5 w-3.5" />}
              className="w-full"
            />
          </div>

          {/* Filtro de Plataforma */}
          <div className="w-40 shrink-0">
            <SelectDropdown
              value={plataforma || 'todas'}
              onChange={onPlataformaChange}
              options={PLATAFORMA_OPTIONS}
              icon={<Monitor className="h-3.5 w-3.5" />}
              className="w-full"
            />
          </div>

          {/* Filtro de Categoria */}
          <div className="w-40 shrink-0">
            <SelectDropdown
              value={categoria || 'todas'}
              onChange={onCategoriaChange}
              options={CATEGORIA_OPTIONS}
              icon={<Tag className="h-3.5 w-3.5" />}
              className="w-full"
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-1.5 ml-auto">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setLocalSearch('');
                  onResetFilters();
                }}
                disabled={loading}
                title="Limpar todos os filtros"
                className="flex items-center gap-1.5 py-2 px-3 text-xs font-semibold text-slate-300 hover:text-white bg-[#181F2E] hover:bg-[#222B3D] rounded-lg border border-[#263044] transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Limpar</span>
              </button>
            )}

            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              title="Atualizar catálogo"
              className="p-2 text-slate-300 hover:text-white bg-[#181F2E] hover:bg-[#222B3D] rounded-lg border border-[#263044] transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onExportCsv}
              disabled={loading || totalFiltered === 0}
              className="flex items-center gap-1.5 py-2 px-3 text-xs font-medium text-slate-300 hover:text-white bg-[#181F2E] hover:bg-[#222B3D] rounded-lg border border-[#263044] transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Status e Contagem */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-[#1E2636]">
        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
          <span>
            Exibindo <strong className="text-white font-semibold">{totalFiltered}</strong> software{totalFiltered !== 1 ? 's' : ''} no catálogo
          </span>
          {categoria !== 'todas' && categoria !== '' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-500/15 text-orange-400 border border-orange-500/30">
              Categoria: {categoria}
              <button
                type="button"
                onClick={() => onCategoriaChange('todas')}
                className="hover:text-white cursor-pointer ml-0.5"
              >
                &times;
              </button>
            </span>
          )}
          {plataforma !== 'todas' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/15 text-purple-400 border border-purple-500/30">
              Plataforma: {plataforma}
              <button
                type="button"
                onClick={() => onPlataformaChange('todas')}
                className="hover:text-white cursor-pointer ml-0.5"
              >
                &times;
              </button>
            </span>
          )}
          {siteId && siteId !== 'todos' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Loja filtrada
              <button
                type="button"
                onClick={() => onSiteChange('todos')}
                className="hover:text-white cursor-pointer ml-0.5"
              >
                &times;
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
