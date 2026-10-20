import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X, Building2 } from 'lucide-react';
import { Site } from '@/types/site';

export type SiteKind = 'loja' | 'combo' | 'outros';

export function siteKind(code: string): SiteKind {
  const c = (code || '').toUpperCase();
  if (c === 'MATRIZ' || c === 'OUTROS') return 'outros';
  if (c.startsWith('C')) return 'combo';
  return 'loja';
}

function norm(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export interface SiteSelectProps {
  value: string;
  onChange: (value: string) => void;
  sites: Site[];
  siteOpcoes?: {
    grupos: Record<SiteKind, { s: Site; n: number }[]>;
    semFilial: number;
    totalBase: number;
  };
  allowAll?: boolean;
  allLabel?: string;
  allowWithoutSite?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  fullWidth?: boolean;
  ariaLabel?: string;
}

export const SiteSelect: React.FC<SiteSelectProps> = ({
  value,
  onChange,
  sites,
  siteOpcoes,
  allowAll = false,
  allLabel = 'Todas as filiais',
  allowWithoutSite = false,
  emptyLabel = '(Sem filial vinculada)',
  disabled = false,
  className = '',
  placeholder,
  fullWidth = false,
  ariaLabel = 'Filial',
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Fecha ao clicar fora ou Escape
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Foco automático ao abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [open]);

  // Label selecionado
  const selectedLabel = useMemo(() => {
    if (allowAll && value === 'todos') {
      return allLabel;
    }
    if ((allowWithoutSite && (value === 'sem' || value === '')) || (!allowAll && value === '')) {
      const count = siteOpcoes?.semFilial;
      return count !== undefined && count > 0 ? `${emptyLabel} (${count})` : emptyLabel;
    }
    const found = sites.find((s) => String(s.id) === String(value));
    if (found) {
      let count: number | undefined;
      if (siteOpcoes) {
        const k = siteKind(found.code);
        const item = siteOpcoes.grupos[k]?.find((g) => g.s.id === found.id);
        if (item) count = item.n;
      }
      return count !== undefined ? `${found.name} (${count})` : found.name;
    }
    return placeholder || allLabel || emptyLabel;
  }, [value, sites, siteOpcoes, allowAll, allLabel, allowWithoutSite, emptyLabel, placeholder]);

  // Filtragem de opções
  const { filteredLojas, filteredCombos, filteredOutros, showAllOption, showWithoutSiteOption } = useMemo(() => {
    const q = norm(search);

    const matchAll = allowAll && (!q || norm(allLabel).includes(q) || 'todas'.includes(q));
    const matchWithoutSite =
      allowWithoutSite &&
      (!q || norm(emptyLabel).includes(q) || 'sem filial'.includes(q) || 'avulso'.includes(q));

    const filterList = (list: { s: Site; n?: number }[]) => {
      if (!q) return list;
      return list.filter((item) => {
        const codeNorm = norm(item.s.code);
        const nameNorm = norm(item.s.name);
        return codeNorm.includes(q) || nameNorm.includes(q);
      });
    };

    if (siteOpcoes) {
      return {
        filteredLojas: filterList(siteOpcoes.grupos.loja),
        filteredCombos: filterList(siteOpcoes.grupos.combo),
        filteredOutros: filterList(siteOpcoes.grupos.outros),
        showAllOption: matchAll,
        showWithoutSiteOption: matchWithoutSite && (siteOpcoes.semFilial > 0 || !allowAll),
      };
    }

    const grouped: Record<SiteKind, { s: Site; n?: number }[]> = { loja: [], combo: [], outros: [] };
    sites.forEach((s) => {
      grouped[siteKind(s.code)].push({ s });
    });

    return {
      filteredLojas: filterList(grouped.loja),
      filteredCombos: filterList(grouped.combo),
      filteredOutros: filterList(grouped.outros),
      showAllOption: matchAll,
      showWithoutSiteOption: matchWithoutSite,
    };
  }, [search, sites, siteOpcoes, allowAll, allLabel, allowWithoutSite, emptyLabel]);

  const totalResults =
    (showAllOption ? 1 : 0) +
    (showWithoutSiteOption ? 1 : 0) +
    filteredLojas.length +
    filteredCombos.length +
    filteredOutros.length;

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setSearch('');
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left text-xs ${fullWidth ? 'w-full' : ''} ${className}`}
      aria-label={ariaLabel}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border border-[#263044] bg-[#181F2E] px-3 py-2 text-[#F1F5F9] transition-colors hover:border-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 ${
          open ? 'border-orange-500 ring-1 ring-orange-500/30' : ''
        } ${disabled ? 'cursor-not-allowed opacity-50 bg-[#121721]' : 'cursor-pointer'}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 truncate">
          <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate font-medium" title={selectedLabel}>
            {selectedLabel}
          </span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180 text-orange-400' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 max-h-80 w-full min-w-[280px] overflow-hidden rounded-xl border border-[#263044] bg-[#121721] shadow-2xl animate-in fade-in zoom-in-95 duration-100"
          role="listbox"
        >
          {/* Campo de Busca */}
          <div className="p-2 border-b border-[#1E2636] bg-[#181F2E]/60">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Pesquisar filial (código ou nome)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-[#263044] bg-[#121721] pl-8 pr-7 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setOpen(false);
                    setSearch('');
                  }
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  title="Limpar pesquisa"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Lista com Rolagem */}
          <div className="max-h-64 overflow-y-auto p-1 text-xs">
            {showAllOption && (
              <div
                role="option"
                aria-selected={value === 'todos'}
                className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors ${
                  value === 'todos'
                    ? 'bg-orange-500/20 text-orange-400 font-semibold'
                    : 'text-slate-300 hover:bg-orange-500/15 hover:text-orange-400'
                }`}
                onClick={() => handleSelect('todos')}
              >
                <span>{allLabel}</span>
                {siteOpcoes && (
                  <span className="rounded bg-[#181F2E] border border-[#263044] px-1.5 py-0.2 text-[10px] font-mono text-slate-400">
                    {siteOpcoes.totalBase}
                  </span>
                )}
              </div>
            )}

            {filteredLojas.length > 0 && (
              <>
                <div className="px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-orange-400/90">
                  Lojas Giassi ({filteredLojas.length})
                </div>
                {filteredLojas.map(({ s, n }) => {
                  const isSelected = String(value) === String(s.id);
                  return (
                    <div
                      key={s.id}
                      role="option"
                      aria-selected={isSelected}
                      className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors ${
                        isSelected
                          ? 'bg-orange-500/20 text-orange-400 font-semibold'
                          : 'text-slate-300 hover:bg-orange-500/15 hover:text-orange-400'
                      }`}
                      onClick={() => handleSelect(String(s.id))}
                    >
                      <span className="truncate">
                        {s.name}
                      </span>
                      {n !== undefined && (
                        <span className="ml-2 rounded bg-[#181F2E] border border-[#263044] px-1.5 py-0.2 text-[10px] font-mono text-slate-400">
                          {n}
                        </span>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {filteredCombos.length > 0 && (
              <>
                <div className="px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-orange-400/90">
                  Combo Atacarejo ({filteredCombos.length})
                </div>
                {filteredCombos.map(({ s, n }) => {
                  const isSelected = String(value) === String(s.id);
                  return (
                    <div
                      key={s.id}
                      role="option"
                      aria-selected={isSelected}
                      className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors ${
                        isSelected
                          ? 'bg-orange-500/20 text-orange-400 font-semibold'
                          : 'text-slate-300 hover:bg-orange-500/15 hover:text-orange-400'
                      }`}
                      onClick={() => handleSelect(String(s.id))}
                    >
                      <span className="truncate">
                        {s.name}
                      </span>
                      {n !== undefined && (
                        <span className="ml-2 rounded bg-[#181F2E] border border-[#263044] px-1.5 py-0.2 text-[10px] font-mono text-slate-400">
                          {n}
                        </span>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {filteredOutros.length > 0 && (
              <>
                <div className="px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-orange-400/90">
                  Matriz / Outros ({filteredOutros.length})
                </div>
                {filteredOutros.map(({ s, n }) => {
                  const isSelected = String(value) === String(s.id);
                  return (
                    <div
                      key={s.id}
                      role="option"
                      aria-selected={isSelected}
                      className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors ${
                        isSelected
                          ? 'bg-orange-500/20 text-orange-400 font-semibold'
                          : 'text-slate-300 hover:bg-orange-500/15 hover:text-orange-400'
                      }`}
                      onClick={() => handleSelect(String(s.id))}
                    >
                      <span className="truncate">
                        {s.name}
                      </span>
                      {n !== undefined && (
                        <span className="ml-2 rounded bg-[#181F2E] border border-[#263044] px-1.5 py-0.2 text-[10px] font-mono text-slate-400">
                          {n}
                        </span>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {showWithoutSiteOption && (
              <div
                role="option"
                aria-selected={value === 'sem' || (value === '' && !allowAll)}
                className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 mt-1 border-t border-[#1E2636] transition-colors ${
                  value === 'sem' || (value === '' && !allowAll)
                    ? 'bg-amber-500/20 text-amber-300 font-semibold'
                    : 'text-amber-400 hover:bg-amber-500/15 hover:text-amber-300'
                }`}
                onClick={() => handleSelect(allowAll ? 'sem' : '')}
              >
                <span>{emptyLabel}</span>
                {siteOpcoes && siteOpcoes.semFilial > 0 && (
                  <span className="rounded bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 text-[10px] font-mono font-bold text-amber-300">
                    {siteOpcoes.semFilial}
                  </span>
                )}
              </div>
            )}

            {totalResults === 0 && (
              <div className="py-6 text-center text-xs text-slate-500">
                Nenhuma filial encontrada para &ldquo;{search}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteSelect;
