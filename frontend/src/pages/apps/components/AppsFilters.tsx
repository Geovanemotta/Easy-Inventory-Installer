import React, { useEffect, useState } from 'react';
import {
  Search,
  X,
  Download,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { Site } from '@/types/site';
import { SiteSelect } from '@/components/common/SiteSelect';

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

  const hasActiveFilters = Boolean(
    localSearch ||
      (siteId && siteId !== 'todos') ||
      (plataforma && plataforma !== 'todas') ||
      (categoria && categoria !== 'todas' && categoria !== ''),
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Campo de Busca */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome do aplicativo, navegador, pacote..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch('');
                onSearchChange('');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filtros em linha */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro por Loja / Filial */}
          <div className="w-52">
            <SiteSelect
              value={siteId}
              onChange={onSiteChange}
              sites={sites}
              allowAll
              allLabel="Todas as Lojas"
              placeholder="Filtrar por loja..."
            />
          </div>

          {/* Filtro de Plataforma */}
          <select
            value={plataforma}
            onChange={(e) => onPlataformaChange(e.target.value)}
            className="py-2 px-3 text-xs rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700"
          >
            <option value="todas">Todas as Plataformas</option>
            <option value="windows">Apenas Windows</option>
            <option value="linux">Apenas Linux</option>
          </select>

          {/* Filtro de Categoria */}
          <select
            value={categoria}
            onChange={(e) => onCategoriaChange(e.target.value)}
            className="py-2 px-3 text-xs rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700"
          >
            <option value="todas">Todas as Categorias</option>
            <option value="aplicativo">Aplicativos</option>
            <option value="agente">Agentes</option>
            <option value="runtime">Runtimes</option>
            <option value="ferramenta">Ferramentas</option>
          </select>

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
                className="flex items-center gap-1 py-2 px-2.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors"
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
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onExportCsv}
              disabled={loading || totalFiltered === 0}
              className="flex items-center gap-1.5 py-2 px-3 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-2xs transition-colors disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Status e Contagem */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
          <span>
            Exibindo <strong>{totalFiltered}</strong> software{totalFiltered !== 1 ? 's' : ''} no catálogo
          </span>
          {categoria !== 'todas' && categoria !== '' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
              Categoria: {categoria}
              <button
                type="button"
                onClick={() => onCategoriaChange('todas')}
                className="hover:text-blue-900"
              >
                &times;
              </button>
            </span>
          )}
          {plataforma !== 'todas' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
              Plataforma: {plataforma}
              <button
                type="button"
                onClick={() => onPlataformaChange('todas')}
                className="hover:text-purple-900"
              >
                &times;
              </button>
            </span>
          )}
          {siteId !== 'todos' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              Loja filtrada
              <button
                type="button"
                onClick={() => onSiteChange('todos')}
                className="hover:text-emerald-900"
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
