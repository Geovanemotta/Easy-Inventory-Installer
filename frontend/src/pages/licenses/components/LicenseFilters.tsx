import React, { useEffect, useState } from 'react';
import {
  Search,
  X,
  Plus,
  RefreshCw,
  Download,
  SlidersHorizontal,
} from 'lucide-react';
import { Site } from '@/types/site';
import { SiteSelect } from '@/components/common/SiteSelect';

interface LicenseFiltersProps {
  search: string;
  onSearchChange: (search: string) => void;
  siteId: string;
  onSiteChange: (siteId: string) => void;
  sites: Site[];
  categoria: string;
  onCategoriaChange: (categoria: string) => void;
  status: string;
  onStatusChange: (status: string) => void;
  softwareNome: string;
  onSoftwareNomeChange: (nome: string) => void;
  softwaresDisponiveis: string[];
  isAdmin: boolean;
  onNewLicense: () => void;
  onRefresh: () => void;
  onExportCsv: () => void;
  loading?: boolean;
  totalFiltered: number;
}

export const LicenseFilters: React.FC<LicenseFiltersProps> = ({
  search,
  onSearchChange,
  siteId,
  onSiteChange,
  sites,
  categoria,
  onCategoriaChange,
  status,
  onStatusChange,
  softwareNome,
  onSoftwareNomeChange,
  softwaresDisponiveis,
  isAdmin,
  onNewLicense,
  onRefresh,
  onExportCsv,
  loading = false,
  totalFiltered,
}) => {
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearch);
    }, 250);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Campo de Busca */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por chave serial, software, nota fiscal, observações..."
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
              placeholder="Filtrar por filial..."
            />
          </div>

          {/* Filtro por Categoria */}
          <select
            value={categoria}
            onChange={(e) => onCategoriaChange(e.target.value)}
            className="py-2 px-3 text-xs rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700"
          >
            <option value="todos">Todas Categorias</option>
            <option value="windows">Windows</option>
            <option value="office">Office / M365</option>
            <option value="outro">Outros Softwares</option>
          </select>

          {/* Filtro por Status */}
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="py-2 px-3 text-xs rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700"
          >
            <option value="todas">Todos os Status</option>
            <option value="disponiveis">Disponíveis (livres)</option>
            <option value="esgotadas">Esgotadas (100% em uso)</option>
          </select>

          {/* Filtro por Software específico */}
          {softwaresDisponiveis.length > 0 && (
            <select
              value={softwareNome}
              onChange={(e) => onSoftwareNomeChange(e.target.value)}
              className="py-2 px-3 text-xs rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700 max-w-[160px] truncate"
            >
              <option value="todos">Todos Softwares</option>
              {softwaresDisponiveis.map((nome) => (
                <option key={nome} value={nome}>
                  {nome}
                </option>
              ))}
            </select>
          )}

          {/* Ações */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              title="Recarregar"
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
              <span>Exportar</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={onNewLicense}
                className="flex items-center gap-1.5 py-2 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Nova Licença</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contadores da listagem */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
          <span>
            Exibindo <strong>{totalFiltered}</strong> lote{totalFiltered !== 1 ? 's' : ''} de licenças
          </span>
          {categoria !== 'todos' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
              Categoria: {categoria}
              <button
                type="button"
                onClick={() => onCategoriaChange('todos')}
                className="hover:text-blue-900"
              >
                &times;
              </button>
            </span>
          )}
          {status !== 'todas' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              Status: {status}
              <button
                type="button"
                onClick={() => onStatusChange('todas')}
                className="hover:text-emerald-900"
              >
                &times;
              </button>
            </span>
          )}
          {siteId !== 'todos' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
              Loja filtrada
              <button
                type="button"
                onClick={() => onSiteChange('todos')}
                className="hover:text-indigo-900"
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
