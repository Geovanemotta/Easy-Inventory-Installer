import React, { useState } from 'react';
import { DeviceQueryParams } from '@/types/device';
import { Search, RotateCcw, Filter } from 'lucide-react';

interface DeviceFiltersProps {
  filters: DeviceQueryParams;
  onFilterChange: (newFilters: DeviceQueryParams) => void;
  loading: boolean;
}

export const DeviceFilters: React.FC<DeviceFiltersProps> = ({
  filters,
  onFilterChange,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ ...filters, search: searchTerm.trim() || undefined, page: 1 });
  };

  const handleReset = () => {
    setSearchTerm('');
    onFilterChange({ page: 1, per_page: filters.per_page || 50 });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
      <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
        {/* Campo de Busca Rápida */}
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por hostname, IP, MAC ou RustDesk ID..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Filtro de Status Operacional */}
        <div className="w-40">
          <select
            value={filters.status || ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                status: e.target.value || undefined,
                page: 1,
              })
            }
            className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Status (Todos)</option>
            <option value="OK">OK</option>
            <option value="ALERTA">ALERTA</option>
            <option value="OFFLINE">OFFLINE</option>
          </select>
        </div>

        {/* Filtro de Sistema Operacional */}
        <div className="w-40">
          <select
            value={filters.sistema || ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                sistema: e.target.value || undefined,
                page: 1,
              })
            }
            className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">SO (Todos)</option>
            <option value="Windows">Windows</option>
            <option value="Linux">Linux</option>
            <option value="Zorin OS">Zorin OS</option>
            <option value="Ubuntu">Ubuntu</option>
          </select>
        </div>

        {/* Botão de Pesquisar */}
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Filter className="h-4 w-4" />
          <span>Filtrar</span>
        </button>

        {/* Botão de Limpar Filtros */}
        <button
          type="button"
          onClick={handleReset}
          title="Limpar todos os filtros"
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Limpar</span>
        </button>
      </form>
    </div>
  );
};
