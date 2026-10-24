import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  X,
  Plus,
  RefreshCw,
  Download,
  SlidersHorizontal,
  RotateCcw,
  Building2,
  Tag,
  CheckCircle2,
  AppWindow,
} from 'lucide-react';
import { Site } from '@/types/site';
import { SelectDropdown, SelectOption } from '@/components/common/SelectDropdown';

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

const CATEGORIA_OPTIONS: SelectOption[] = [
  { value: 'todos', label: 'Todas Categorias' },
  { value: 'windows', label: 'Windows OS' },
  { value: 'office', label: 'Office / M365' },
  { value: 'outro', label: 'Outros Softwares' },
];

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'todas', label: 'Todos os Status' },
  { value: 'disponiveis', label: 'Disponíveis (livres)' },
  { value: 'esgotadas', label: 'Esgotadas (100% uso)' },
];

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

  const siteOptions: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [{ value: 'todos', label: 'Todas as Lojas' }];
    sites.forEach((s) => {
      const cleanName = s.name
        .replace(new RegExp(`^\\[?${s.code}\\]?\\s*[-–—]?\\s*`, 'i'), '')
        .trim();
      opts.push({
        value: String(s.id),
        label: `[${s.code}] ${cleanName || s.name}`,
      });
    });
    return opts;
  }, [sites]);

  const softwareOptions: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [{ value: 'todos', label: 'Todos Softwares' }];
    softwaresDisponiveis.forEach((s) => {
      opts.push({ value: s, label: s });
    });
    return opts;
  }, [softwaresDisponiveis]);

  const hasActiveFilters = Boolean(
    localSearch ||
      (siteId && siteId !== 'todos') ||
      (categoria && categoria !== 'todos') ||
      (status && status !== 'todas') ||
      (softwareNome && softwareNome !== 'todos'),
  );

  return (
    <div className="bg-surface rounded-xl border border-border-subtle p-3 shadow-sm space-y-3">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Campo de Busca */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
          <input
            type="text"
            placeholder="Buscar por chave serial, software, nota fiscal, observações..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-border-medium bg-elevated text-fg placeholder:text-fg-muted focus:outline-none focus:border-orange-500 transition-colors"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch('');
                onSearchChange('');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-fg-secondary hover:text-fg rounded cursor-pointer"
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

          {/* Filtro por Categoria */}
          <div className="w-40 shrink-0">
            <SelectDropdown
              value={categoria || 'todos'}
              onChange={onCategoriaChange}
              options={CATEGORIA_OPTIONS}
              icon={<Tag className="h-3.5 w-3.5" />}
              className="w-full"
            />
          </div>

          {/* Filtro por Status */}
          <div className="w-40 shrink-0">
            <SelectDropdown
              value={status || 'todas'}
              onChange={onStatusChange}
              options={STATUS_OPTIONS}
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              className="w-full"
            />
          </div>

          {/* Filtro por Software específico */}
          {softwaresDisponiveis.length > 0 && (
            <div className="w-44 shrink-0">
              <SelectDropdown
                value={softwareNome || 'todos'}
                onChange={onSoftwareNomeChange}
                options={softwareOptions}
                icon={<AppWindow className="h-3.5 w-3.5" />}
                className="w-full"
              />
            </div>
          )}

          {/* Ações */}
          <div className="flex items-center gap-1.5 ml-auto">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setLocalSearch('');
                  onSearchChange('');
                  onSiteChange('todos');
                  onCategoriaChange('todos');
                  onStatusChange('todas');
                  onSoftwareNomeChange('todos');
                }}
                disabled={loading}
                title="Limpar todos os filtros"
                className="flex items-center gap-1.5 py-2 px-3 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:text-fg bg-elevated hover:bg-border-subtle rounded-lg border border-border-medium transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Limpar</span>
              </button>
            )}

            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              title="Recarregar"
              className="p-2 text-gray-700 dark:text-slate-300 hover:text-fg bg-elevated hover:bg-border-subtle rounded-lg border border-border-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onExportCsv}
              disabled={loading || totalFiltered === 0}
              className="flex items-center gap-1.5 py-2 px-3 text-xs font-medium text-gray-700 dark:text-slate-300 hover:text-fg bg-elevated hover:bg-border-subtle rounded-lg border border-border-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-fg-secondary" />
              <span>Exportar</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={onNewLicense}
                className="flex items-center gap-1.5 py-2 px-3 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-md shadow-orange-500/20 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Nova Licença</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contadores da listagem */}
      <div className="flex items-center justify-between text-xs text-fg-secondary pt-2 border-t border-border-subtle">
        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal className="h-3.5 w-3.5 text-fg-muted" />
          <span>
            Exibindo <strong className="text-fg font-semibold">{totalFiltered}</strong> lote{totalFiltered !== 1 ? 's' : ''} de licenças
          </span>
          {categoria !== 'todos' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-500/15 text-orange-400 border border-orange-500/30">
              Categoria: {categoria}
              <button
                type="button"
                onClick={() => onCategoriaChange('todos')}
                className="hover:text-fg cursor-pointer ml-0.5"
              >
                &times;
              </button>
            </span>
          )}
          {status !== 'todas' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              Status: {status}
              <button
                type="button"
                onClick={() => onStatusChange('todas')}
                className="hover:text-fg cursor-pointer ml-0.5"
              >
                &times;
              </button>
            </span>
          )}
          {siteId !== 'todos' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
              Loja filtrada
              <button
                type="button"
                onClick={() => onSiteChange('todos')}
                className="hover:text-fg cursor-pointer ml-0.5"
              >
                &times;
              </button>
            </span>
          )}
          {softwareNome !== 'todos' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
              Software: {softwareNome}
              <button
                type="button"
                onClick={() => onSoftwareNomeChange('todos')}
                className="hover:text-fg cursor-pointer ml-0.5"
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
