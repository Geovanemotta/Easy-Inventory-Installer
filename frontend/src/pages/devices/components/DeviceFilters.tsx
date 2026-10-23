import React, { useState, useEffect } from 'react';
import { DeviceFilterOptions, DeviceQueryParams } from '@/types/device';
import { SelectDropdown, SelectOption } from '@/components/ui/SelectDropdown';
import { Search, RotateCcw, Download } from 'lucide-react';

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

  // Opções para o SelectDropdown de Filiais
  const siteOptions: SelectOption[] = [
    { value: '', label: 'Todas as filiais' },
    { value: '-1', label: 'Sem Filial (Não vinculada)' },
    ...(options?.sites?.map((s) => ({
      value: String(s.id),
      label: s.name,
    })) || []),
  ];

  // Opções para o SelectDropdown de Versões
  const versaoOptions: SelectOption[] = [
    { value: '', label: 'Todas as versões' },
    ...(options?.versoes?.map((v) => ({
      value: v,
      label: v,
    })) || []),
  ];

  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3.5 shadow-sm">
      <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2.5">
        {/* Campo de Busca Rápida (ocupa o espaço principal flex-1) */}
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-secondary" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por hostname, IP, MAC, usuário ou RustDesk (filtra ao digitar)..."
            className="w-full rounded-lg border border-border-medium bg-elevated py-2 pl-8 pr-3 text-xs text-fg placeholder:text-fg-muted focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
          />
        </div>

        {/* 1. Filtro de Filial / Loja */}
        <div className="w-56">
          <SelectDropdown
            value={filters.site_id ? String(filters.site_id) : (filters.loja || '')}
            options={siteOptions}
            onChange={(val) => {
              if (!val) {
                onFilterChange({ ...filters, site_id: undefined, loja: undefined, page: 1 });
              } else if (/^-?\d+$/.test(val)) {
                onFilterChange({ ...filters, site_id: Number(val), loja: undefined, page: 1 });
              } else {
                onFilterChange({ ...filters, site_id: undefined, loja: val, page: 1 });
              }
            }}
            placeholder="Todas as filiais"
            className="w-full"
          />
        </div>

        {/* 2. Filtro de Sistema / Versão */}
        <div className="w-52">
          <SelectDropdown
            value={filters.versao || ''}
            options={versaoOptions}
            onChange={(val) =>
              onFilterChange({
                ...filters,
                versao: val || undefined,
                page: 1,
              })
            }
            placeholder="Todas as versões"
            className="w-full"
          />
        </div>

        {/* Botão de Limpar Filtros */}
        <button
          type="button"
          onClick={handleReset}
          title="Limpar todos os filtros"
          className="flex items-center gap-1.5 rounded-lg border border-border-medium bg-elevated px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-border-subtle hover:text-fg transition-colors cursor-pointer"
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
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exportar CSV</span>
          </button>
        )}
      </form>
    </div>
  );
};
