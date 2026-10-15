import { useEffect, useMemo, useRef, useState } from 'react'
import type { Site } from '../services/api'

export type SiteKind = 'loja' | 'combo' | 'outros'

export function siteKind(code: string): SiteKind {
  const c = (code || '').toUpperCase()
  if (c === 'MATRIZ' || c === 'OUTROS') return 'outros'
  if (c.startsWith('C')) return 'combo'
  return 'loja'
}

function norm(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export type SiteSelectProps = {
  value: string
  onChange: (value: string) => void
  sites: Site[]
  siteOpcoes?: {
    grupos: Record<SiteKind, { s: Site; n: number }[]>
    semFilial: number
    totalBase: number
  }
  allowAll?: boolean
  allLabel?: string
  allowWithoutSite?: boolean
  emptyLabel?: string
  disabled?: boolean
  className?: string
  placeholder?: string
  fullWidth?: boolean
  ariaLabel?: string
}

export default function SiteSelect({
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
}: SiteSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  // Fecha ao clicar fora ou ao pressionar Escape
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  // Foco automático no campo de busca ao abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }
  }, [open])

  // Determina texto exibido no botão disparador
  const selectedLabel = useMemo(() => {
    if (allowAll && value === 'todos') {
      return allLabel
    }
    if ((allowWithoutSite && (value === 'sem' || value === '')) || (!allowAll && value === '')) {
      const count = siteOpcoes?.semFilial
      return count !== undefined && count > 0 ? `${emptyLabel} (${count})` : emptyLabel
    }
    const found = sites.find((s) => String(s.id) === String(value))
    if (found) {
      let count: number | undefined
      if (siteOpcoes) {
        const k = siteKind(found.code)
        const item = siteOpcoes.grupos[k]?.find((g) => g.s.id === found.id)
        if (item) count = item.n
      }
      return count !== undefined ? `${found.code} - ${found.name} (${count})` : `${found.code} - ${found.name}`
    }
    return placeholder || allLabel || emptyLabel
  }, [value, sites, siteOpcoes, allowAll, allLabel, allowWithoutSite, emptyLabel, placeholder])

  // Filtragem de lojas com busca
  const { filteredLojas, filteredCombos, filteredOutros, showAllOption, showWithoutSiteOption } = useMemo(() => {
    const q = norm(search)

    const matchAll = allowAll && (!q || norm(allLabel).includes(q) || 'todas'.includes(q))
    const matchWithoutSite =
      allowWithoutSite &&
      (!q || norm(emptyLabel).includes(q) || 'sem filial'.includes(q) || 'avulso'.includes(q))

    const filterList = (list: { s: Site; n?: number }[]) => {
      if (!q) return list
      return list.filter((item) => {
        const codeNorm = norm(item.s.code)
        const nameNorm = norm(item.s.name)
        return codeNorm.includes(q) || nameNorm.includes(q)
      })
    }

    if (siteOpcoes) {
      return {
        filteredLojas: filterList(siteOpcoes.grupos.loja),
        filteredCombos: filterList(siteOpcoes.grupos.combo),
        filteredOutros: filterList(siteOpcoes.grupos.outros),
        showAllOption: matchAll,
        showWithoutSiteOption: matchWithoutSite && (siteOpcoes.semFilial > 0 || !allowAll),
      }
    }

    const grouped: Record<SiteKind, { s: Site; n?: number }[]> = { loja: [], combo: [], outros: [] }
    sites.forEach((s) => {
      grouped[siteKind(s.code)].push({ s })
    })

    return {
      filteredLojas: filterList(grouped.loja),
      filteredCombos: filterList(grouped.combo),
      filteredOutros: filterList(grouped.outros),
      showAllOption: matchAll,
      showWithoutSiteOption: matchWithoutSite,
    }
  }, [search, sites, siteOpcoes, allowAll, allLabel, allowWithoutSite, emptyLabel])

  const totalResults =
    (showAllOption ? 1 : 0) +
    (showWithoutSiteOption ? 1 : 0) +
    filteredLojas.length +
    filteredCombos.length +
    filteredOutros.length

  const handleSelect = (val: string) => {
    onChange(val)
    setOpen(false)
    setSearch('')
  }

  return (
    <div
      ref={containerRef}
      className={`na-site-select-wrapper ${fullWidth ? 'full-width' : ''} ${className}`}
      aria-label={ariaLabel}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`na-site-select-trigger ${open ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="na-site-select-label" title={selectedLabel}>
          {selectedLabel}
        </span>
        <span className="na-site-select-chevron">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="na-site-select-dropdown" role="listbox">
          <div className="na-site-select-search">
            <svg
              className="search-icon"
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Pesquisar loja (código ou nome)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setOpen(false)
                  setSearch('')
                }
              }}
            />
            {search && (
              <button
                type="button"
                className="clear-icon"
                onClick={() => setSearch('')}
                title="Limpar pesquisa"
                aria-label="Limpar pesquisa"
              >
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div className="na-site-select-list">
            {showAllOption && (
              <div
                role="option"
                aria-selected={value === 'todos'}
                className={`na-site-select-item ${value === 'todos' ? 'selected' : ''}`}
                onClick={() => handleSelect('todos')}
              >
                <span>{allLabel}</span>
                {siteOpcoes && <span className="na-site-select-badge">{siteOpcoes.totalBase}</span>}
              </div>
            )}

            {filteredLojas.length > 0 && (
              <>
                <div className="na-site-select-group-title">Lojas ({filteredLojas.length})</div>
                {filteredLojas.map(({ s, n }) => {
                  const isSelected = String(value) === String(s.id)
                  return (
                    <div
                      key={s.id}
                      role="option"
                      aria-selected={isSelected}
                      className={`na-site-select-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelect(String(s.id))}
                    >
                      <span>
                        <strong>{s.code}</strong> - {s.name}
                      </span>
                      {n !== undefined && <span className="na-site-select-badge">{n}</span>}
                    </div>
                  )
                })}
              </>
            )}

            {filteredCombos.length > 0 && (
              <>
                <div className="na-site-select-group-title">Combos ({filteredCombos.length})</div>
                {filteredCombos.map(({ s, n }) => {
                  const isSelected = String(value) === String(s.id)
                  return (
                    <div
                      key={s.id}
                      role="option"
                      aria-selected={isSelected}
                      className={`na-site-select-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelect(String(s.id))}
                    >
                      <span>
                        <strong>{s.code}</strong> - {s.name}
                      </span>
                      {n !== undefined && <span className="na-site-select-badge">{n}</span>}
                    </div>
                  )
                })}
              </>
            )}

            {filteredOutros.length > 0 && (
              <>
                <div className="na-site-select-group-title">Matriz / Outros ({filteredOutros.length})</div>
                {filteredOutros.map(({ s, n }) => {
                  const isSelected = String(value) === String(s.id)
                  return (
                    <div
                      key={s.id}
                      role="option"
                      aria-selected={isSelected}
                      className={`na-site-select-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelect(String(s.id))}
                    >
                      <span>
                        <strong>{s.code}</strong> - {s.name}
                      </span>
                      {n !== undefined && <span className="na-site-select-badge">{n}</span>}
                    </div>
                  )
                })}
              </>
            )}

            {showWithoutSiteOption && (
              <div
                role="option"
                aria-selected={value === 'sem' || (value === '' && !allowAll)}
                className={`na-site-select-item ${
                  value === 'sem' || (value === '' && !allowAll) ? 'selected' : ''
                }`}
                onClick={() => handleSelect(allowAll ? 'sem' : '')}
              >
                <span>{emptyLabel}</span>
                {siteOpcoes && siteOpcoes.semFilial > 0 && (
                  <span className="na-site-select-badge">{siteOpcoes.semFilial}</span>
                )}
              </div>
            )}

            {totalResults === 0 && (
              <div className="na-site-select-empty">
                Nenhuma loja encontrada para &quot;{search}&quot;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
