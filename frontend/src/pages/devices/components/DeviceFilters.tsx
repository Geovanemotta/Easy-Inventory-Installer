import React, { useState, useEffect } from 'react';
import { DeviceFilterOptions, DeviceQueryParams } from '@/types/device';
import { Search, RotateCcw, Download, Building, Layers } from 'lucide-react';

interface DeviceFiltersProps {
  filters: DeviceQueryParams;
  options?: DeviceFilterOptions;
  onFilterChange: (newFilters: DeviceQueryParams) => void;
  loading: boolean;
  onExportCsv?: () => void;
}

export const DeviceFilters: React.FC<DeviceFiltersProps> = ({
  filters,
  options,
  onFilterChange,
  loading,
  onExportCsv,
}) => {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  // Sincroniza o input com o estado externo (ex: ao clicar em Limpar)
  useEffect(() => {
    setSearchTerm(filters.search || '');
  }, [filters.search]);

  // Debounce automático na barra de busca (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchTerm.trim();
      const current = filters.search || '';
      if (trimmed !== current) {
        onFilterChange({
          ...filters,
          search: trimmed || undefined,
          page: 1,
        });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Se a versão selecionada deixar de existir nas opções dinâmicas, limpa automaticamente
  useEffect(() => {
    if (filters.versao && options?.versoes && options.versoes.length > 0) {
      const exists = options.versoes.some(
        (v) => v.toLowerCase() === filters.versao?.toLowerCase()
      );
      if (!exists) {
        onFilterChange({ ...filters, versao: undefined, page: 1 });
      }
    }
  }, [options?.versoes, filters.versao]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ ...filters, search: searchTerm.trim() || undefined, page: 1 });
  };

  const handleReset = () => {
    setSearchTerm('');
    onFilterChange({ page: 1, per_page: filters.per_page || 50 });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
      <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2.5">
        {/* Campo de Busca Rápida com Debounce */}
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por hostname, IP, MAC, usuário ou RustDesk (filtra ao digitar)..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* 1. Filtro de Filial / Loja */}
        <div className="w-44 flex items-center gap-1">
          <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <select
            value={filters.site_id ? String(filters.site_id) : (filters.loja || '')}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                onFilterChange({ ...filters, site_id: undefined, loja: undefined, page: 1 });
              } else if (/^-?\d+$/.test(val)) {
                onFilterChange({ ...filters, site_id: Number(val), loja: undefined, page: 1 });
              } else {
                onFilterChange({ ...filters, site_id: undefined, loja: val, page: 1 });
              }
            }}
            className="w-full rounded-lg border border-slate-300 py-2 px-2 text-xs focus:border-blue-500 focus:outline-none"
          >
            <option value="">Todas as filiais</option>
            <option value="-1">Sem Filial (Não vinculada)</option>
            {options?.sites?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Filtro de Plataforma (Linux / Windows) */}
        <div className="w-32">
          <select
            value={filters.plataforma || ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                plataforma: e.target.value || undefined,
                versao: undefined, // Limpa versão ao alterar plataforma
                page: 1,
              })
            }
            className="w-full rounded-lg border border-slate-300 py-2 px-2 text-xs focus:border-blue-500 focus:outline-none"
          >
            <option value="">Plataforma (Todas)</option>
            <option value="Linux">Linux</option>
            <option value="Windows">Windows</option>
          </select>
        </div>

        {/* 3. Filtro de Sistema / Versão */}
        <div className="w-44 flex items-center gap-1">
          <Layers className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <select
            value={filters.versao || ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                versao: e.target.value || undefined,
                page: 1,
              })
            }
            className="w-full rounded-lg border border-slate-300 py-2 px-2 text-xs focus:border-blue-500 focus:outline-none"
          >
            <option value="">Todas as versões</option>
            {options?.versoes?.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Filtro de Status Operacional */}
        <div className="w-36">
          <select
            value={filters.status || ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                status: e.target.value || undefined,
                page: 1,
              })
            }
            className="w-full rounded-lg border border-slate-300 py-2 px-2 text-xs focus:border-blue-500 focus:outline-none"
          >
            <option value="">Status (Todos)</option>
            <option value="OK">Atualizada</option>
            <option value="UPGRADE_REQUIRED">Atualização Necessária</option>
            <option value="OUTRO">Desatualizada</option>
          </select>
        </div>

        {/* 5. Filtro de Disco Crítico */}
        <div className="w-32">
          <select
            value={filters.disco_critico === true ? 'critico' : ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                disco_critico: e.target.value === 'critico' ? true : undefined,
                page: 1,
              })
            }
            className="w-full rounded-lg border border-slate-300 py-2 px-2 text-xs focus:border-blue-500 focus:outline-none"
          >
            <option value="">Uso Disco (Todos)</option>
            <option value="critico">Crítico (&ge; 85%)</option>
          </select>
        </div>

        {/* Botão de Limpar Filtros */}
        <button
          type="button"
          onClick={handleReset}
          title="Limpar todos os filtros"
          className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Limpar</span>
        </button>

        {/* Botão de Exportar CSV */}
        {onExportCsv && (
          <button
            type="button"
            onClick={onExportCsv}
            disabled={loading}
            title="Exportar inventário filtrado em CSV com UTF-8 BOM"
            className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exportar CSV</span>
          </button>
        )}
      </form>
    </div>
  );
};
