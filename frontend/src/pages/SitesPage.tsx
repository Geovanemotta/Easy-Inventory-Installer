import React, { useCallback, useEffect, useMemo, useState } from 'react'
import '../styles/pages/sites.css'
import {
  createSite,
  deleteSite,
  getSites,
  reclassifySites,
  simulateSiteMatch,
  updateSite,
  type Site,
  type SiteReclassifyResult,
  type SiteSimulationResult,
  type UserResponse,
} from '../services/api'

type SitesPageProps = {
  token: string
  currentUser: UserResponse | null
  showToast: (msg: string) => void
  onRefreshInventory?: () => void
}

export default function SitesPage({
  token,
  currentUser,
  showToast,
  onRefreshInventory,
}: SitesPageProps) {
  const isAdmin = Boolean(
    currentUser?.is_superadmin || currentUser?.roles?.includes('admin'),
  )

  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Estado do Modal de Edição / Criação
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [formCode, setFormCode] = useState('')
  const [formName, setFormName] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [formIdentifiers, setFormIdentifiers] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)

  // Estado do Simulador
  const [simModalOpen, setSimModalOpen] = useState(false)
  const [simHostname, setSimHostname] = useState('')
  const [simLoja, setSimLoja] = useState('')
  const [simResult, setSimResult] = useState<SiteSimulationResult | null>(null)
  const [simLoading, setSimLoading] = useState(false)

  // Estado da Reclassificação
  const [reclassModalOpen, setReclassModalOpen] = useState(false)
  const [reclassOnlyUnassigned, setReclassOnlyUnassigned] = useState(true)
  const [reclassifying, setReclassifying] = useState(false)
  const [reclassResult, setReclassResult] = useState<SiteReclassifyResult | null>(null)

  // Estado de Confirmação de Exclusão
  const [deletingSite, setDeletingSite] = useState<Site | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Carregar Lojas
  const loadSites = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getSites(token, true)
      setSites(data)
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar lojas e filiais.')
    } finally {
      setLoading(false)
    }
  }, [token, showToast])

  useEffect(() => {
    loadSites()
  }, [loadSites])

  // Contadores Globais
  const metrics = useMemo(() => {
    const total = sites.length
    const active = sites.filter((s) => s.active).length
    const devices = sites.reduce((acc, s) => acc + (s.devices_count || 0), 0)
    const netAssets = sites.reduce((acc, s) => acc + (s.network_assets_count || 0), 0)
    return { total, active, devices, netAssets }
  }, [sites])

  // Lojas Filtradas
  const filteredSites = useMemo(() => {
    return sites.filter((site) => {
      if (statusFilter === 'active' && !site.active) return false
      if (statusFilter === 'inactive' && site.active) return false

      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      const matchCode = site.code.toLowerCase().includes(q)
      const matchName = site.name.toLowerCase().includes(q)
      const matchIdent = (site.identifiers || []).some((ident) =>
        ident.toLowerCase().includes(q),
      )
      return matchCode || matchName || matchIdent
    })
  }, [sites, statusFilter, searchQuery])

  // Sugestões Automáticas ao Digitar Código da Loja
  const suggestedPatterns = useMemo(() => {
    const cleanCode = formCode.trim().toUpperCase()
    if (!cleanCode) return []

    const suggestions: string[] = []
    const numMatch = cleanCode.match(/\d+/)
    const num = numMatch ? parseInt(numMatch[0], 10) : null

    if (num !== null) {
      const pad = String(num).padStart(2, '0')
      const isCombo = cleanCode.startsWith('CB') || cleanCode.startsWith('C')
      if (isCombo) {
        suggestions.push(`CB${pad}`, `C${pad}`, `COMBO-${pad}`, `CB${pad}*`)
      } else {
        suggestions.push(`LJ${pad}`, `L${pad}`, `LOJA-${pad}`, `LJ${pad}*`, `LOJA${pad}`)
      }
    } else {
      suggestions.push(`${cleanCode}*`, cleanCode)
    }

    // Filtrar os que já foram adicionados
    return suggestions.filter(
      (s) => !formIdentifiers.includes(s.toUpperCase()),
    )
  }, [formCode, formIdentifiers])

  // Abrir Modal para Criar
  const handleOpenCreate = () => {
    setEditingSite(null)
    setFormCode('')
    setFormName('')
    setFormActive(true)
    setFormIdentifiers([])
    setTagInput('')
    setModalOpen(true)
  }

  // Abrir Modal para Editar
  const handleOpenEdit = (site: Site) => {
    setEditingSite(site)
    setFormCode(site.code)
    setFormName(site.name)
    setFormActive(site.active)
    setFormIdentifiers([...(site.identifiers || [])])
    setTagInput('')
    setModalOpen(true)
  }

  // Adicionar Tag de Padrão
  const handleAddTag = (val?: string) => {
    const toAdd = (val || tagInput).trim().toUpperCase()
    if (!toAdd) return
    if (!formIdentifiers.includes(toAdd)) {
      setFormIdentifiers([...formIdentifiers, toAdd])
    }
    setTagInput('')
  }

  // Remover Tag de Padrão
  const handleRemoveTag = (tagToRemove: string) => {
    setFormIdentifiers(formIdentifiers.filter((t) => t !== tagToRemove))
  }

  // Salvar Loja (Criar ou Atualizar)
  const handleSaveSite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formCode.trim()) {
      showToast('O código da loja é obrigatório.')
      return
    }
    if (!formName.trim()) {
      showToast('O nome da loja é obrigatório.')
      return
    }

    setSaving(true)
    try {
      if (editingSite) {
        await updateSite(token, editingSite.id, {
          code: formCode.trim().toUpperCase(),
          name: formName.trim(),
          active: formActive,
          identifiers: formIdentifiers,
        })
        showToast(`Loja '${formName}' atualizada com sucesso!`)
      } else {
        await createSite(token, {
          code: formCode.trim().toUpperCase(),
          name: formName.trim(),
          active: formActive,
          identifiers: formIdentifiers,
        })
        showToast(`Loja '${formName}' cadastrada com sucesso!`)
      }

      setModalOpen(false)
      loadSites()
      if (onRefreshInventory) {
        onRefreshInventory()
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar loja.')
    } finally {
      setSaving(false)
    }
  }

  // Confirmar Exclusão ou Desativação
  const handleConfirmDelete = async () => {
    if (!deletingSite) return
    setActionLoading(true)
    try {
      const res = await deleteSite(token, deletingSite.id)
      showToast(res.detail)
      setDeletingSite(null)
      loadSites()
      if (onRefreshInventory) {
        onRefreshInventory()
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir filial.')
    } finally {
      setActionLoading(false)
    }
  }

  // Executar Simulação de Reconhecimento
  const handleRunSimulation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!simHostname.trim()) {
      showToast('Digite um hostname para testar.')
      return
    }

    setSimLoading(true)
    try {
      const result = await simulateSiteMatch(token, simHostname.trim(), simLoja.trim())
      setSimResult(result)
    } catch (err: any) {
      showToast(err.message || 'Erro na simulação.')
    } finally {
      setSimLoading(false)
    }
  }

  // Abrir Simulador com Hostname Pré-carregado de uma Loja
  const handleSimulateForSite = (site: Site) => {
    const defaultTag = (site.identifiers && site.identifiers[0]) || site.code
    const testSample = defaultTag.replace('*', '') + '-PDV01'
    setSimHostname(testSample)
    setSimLoja('')
    setSimResult(null)
    setSimModalOpen(true)
  }

  // Executar Reclassificação em Lote
  const handleExecuteReclassify = async () => {
    setReclassifying(true)
    try {
      const result = await reclassifySites(token, reclassOnlyUnassigned)
      setReclassResult(result)
      showToast(
        `Reclassificação concluída: ${result.total_reclassified} máquina(s) reatribuída(s).`,
      )
      loadSites()
      if (onRefreshInventory) {
        onRefreshInventory()
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao reclassificar computadores.')
    } finally {
      setReclassifying(false)
    }
  }

  return (
    <div id="view-sites">
      {/* 1. CABEÇALHO */}
      <div className="sites-header">
        <div className="sites-title-wrap">
          <h1>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M3 21h18M3 7v14M21 7v14M6 11h2M6 15h2M11 11h2M11 15h2M16 11h2M16 15h2M3 7l9-4 9 4" />
            </svg>
            Gerenciamento de Lojas &amp; Filiais
          </h1>
          <p>
            Configure lojas, padrões de nomenclatura de computadores (tags de hostname) e automações de inventário.
          </p>
        </div>

        <div className="sites-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setSimResult(null)
              setSimModalOpen(true)
            }}
            title="Testar como um hostname é reconhecido pelas regras"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Simulador de Regras
          </button>

          {isAdmin && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setReclassResult(null)
                setReclassModalOpen(true)
              }}
              title="Reclassificar máquinas do parque conforme os padrões atuais"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Reclassificar Máquinas
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenCreate}
              title="Cadastrar nova filial ou loja"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nova Loja / Filial
            </button>
          )}
        </div>
      </div>

      {/* 2. CARDS DE MÉTRICAS */}
      <div className="sites-metrics-grid">
        <div className="site-metric-card">
          <div className="site-metric-icon blue">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="site-metric-info">
            <span className="site-metric-value">{metrics.total}</span>
            <span className="site-metric-label">Lojas Cadastradas</span>
          </div>
        </div>

        <div className="site-metric-card">
          <div className="site-metric-icon green">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="site-metric-info">
            <span className="site-metric-value">{metrics.active}</span>
            <span className="site-metric-label">Filiais Ativas</span>
          </div>
        </div>

        <div className="site-metric-card">
          <div className="site-metric-icon purple">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <div className="site-metric-info">
            <span className="site-metric-value">{metrics.devices}</span>
            <span className="site-metric-label">Estações Atribuídas</span>
          </div>
        </div>

        <div className="site-metric-card">
          <div className="site-metric-icon amber">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <line x1="3.6" y1="9" x2="20.4" y2="9" />
              <line x1="3.6" y1="15" x2="20.4" y2="15" />
            </svg>
          </div>
          <div className="site-metric-info">
            <span className="site-metric-value">{metrics.netAssets}</span>
            <span className="site-metric-label">Ativos de Rede</span>
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR */}
      <div className="sites-toolbar">
        <div className="sites-search-wrap">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="sites-search-input"
            placeholder="Pesquisar por código (ex: 01, CB01), nome ou padrão (ex: LJ01)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="sites-filters-wrap">
          <select
            className="sites-select-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">Todas as Lojas</option>
            <option value="active">Apenas Ativas</option>
            <option value="inactive">Apenas Desativadas</option>
          </select>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadSites}
            disabled={loading}
            title="Recarregar lista"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Atualizar
          </button>
        </div>
      </div>

      {/* 4. TABELA DE LOJAS */}
      <div className="sites-card">
        <div className="sites-table-wrap">
          <table className="sites-table">
            <thead>
              <tr>
                <th style={{ width: '90px' }}>Status</th>
                <th style={{ width: '110px' }}>Código</th>
                <th>Nome da Filial</th>
                <th>Padrões de Nomenclatura (Hostname)</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Estações</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Ativos Rede</th>
                <th style={{ width: '140px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && sites.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                    Carregando lojas e filiais...
                  </td>
                </tr>
              ) : filteredSites.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                    Nenhuma loja encontrada para o filtro selecionado.
                  </td>
                </tr>
              ) : (
                filteredSites.map((site) => {
                  const isCombo = site.code.startsWith('CB') || site.code.startsWith('COMBO')
                  return (
                    <tr key={site.id}>
                      {/* Status */}
                      <td>
                        <span className={`site-status-pill ${site.active ? 'active' : 'inactive'}`}>
                          {site.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>

                      {/* Código */}
                      <td>
                        <span className={`site-code-tag ${isCombo ? 'combo' : ''}`}>
                          {site.code}
                        </span>
                      </td>

                      {/* Nome */}
                      <td className="site-name-cell">
                        {site.name}
                      </td>

                      {/* Padrões */}
                      <td>
                        <div className="site-patterns-cell">
                          {site.identifiers && site.identifiers.length > 0 ? (
                            site.identifiers.map((ident) => (
                              <span
                                key={ident}
                                className={`site-pattern-badge ${ident.includes('*') ? 'wildcard' : ''}`}
                                title={`Padrão cadastrado: ${ident}`}
                              >
                                {ident}
                              </span>
                            ))
                          ) : (
                            <span className="site-pattern-empty">
                              Padrão automático ({site.code})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Contagem de Estações */}
                      <td style={{ textAlign: 'center' }}>
                        <span className="site-count-pill" title={`${site.devices_count || 0} computadores vinculados`}>
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="3" width="20" height="14" rx="2" />
                            <line x1="8" y1="21" x2="16" y2="21" />
                          </svg>
                          {site.devices_count || 0}
                        </span>
                      </td>

                      {/* Contagem de Ativos de Rede */}
                      <td style={{ textAlign: 'center' }}>
                        <span className="site-count-pill" title={`${site.network_assets_count || 0} ativos de rede`}>
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="9" />
                          </svg>
                          {site.network_assets_count || 0}
                        </span>
                      </td>

                      {/* Ações */}
                      <td>
                        <div className="site-actions-cell" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn-icon btn-secondary"
                            onClick={() => handleSimulateForSite(site)}
                            title="Testar no Simulador de Reconhecimento"
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="11" cy="11" r="8" />
                              <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                          </button>

                          {isAdmin && (
                            <button
                              type="button"
                              className="btn btn-icon btn-secondary"
                              onClick={() => handleOpenEdit(site)}
                              title="Editar Loja e Padrões"
                            >
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                              </svg>
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              type="button"
                              className="btn btn-icon btn-danger"
                              onClick={() => setDeletingSite(site)}
                              title="Desativar ou Excluir Loja"
                            >
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================
         5. MODAL DE CRIAÇÃO / EDIÇÃO DE LOJA
         ========================================================= */}
      {modalOpen && (
        <div className="sites-modal-overlay">
          <div className="sites-modal-container">
            <div className="sites-modal-header">
              <h3>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 21h18M3 7v14M21 7v14M6 11h2M6 15h2M11 11h2M11 15h2M16 11h2M16 15h2M3 7l9-4 9 4" />
                </svg>
                {editingSite ? `Editar Loja: ${editingSite.name}` : 'Cadastrar Nova Filial / Loja'}
              </h3>
              <button
                type="button"
                className="sites-modal-close"
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSite}>
              <div className="sites-modal-body">
                {/* Linha 1: Código e Nome */}
                <div className="site-form-row">
                  <div className="site-form-field">
                    <label>Código da Filial *</label>
                    <input
                      type="text"
                      className="site-form-input"
                      placeholder="Ex: 28 ou CB03"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                      required
                    />
                  </div>

                  <div className="site-form-field">
                    <label>Nome Oficial da Loja *</label>
                    <input
                      type="text"
                      className="site-form-input"
                      placeholder="Ex: Balneário Camboriú (LJ 28)"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Status Ativo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="site-active-check"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                  />
                  <label htmlFor="site-active-check" style={{ fontSize: '13px', cursor: 'pointer', color: 'var(--ink)' }}>
                    Filial ativa no sistema de inventário
                  </label>
                </div>

                {/* Box de Sugestões Inteligentes */}
                {suggestedPatterns.length > 0 && (
                  <div className="site-suggestions-box">
                    <div className="site-suggestions-title">
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      Sugestões para o código '{formCode}': clique para adicionar
                    </div>
                    <div className="site-suggestions-chips">
                      {suggestedPatterns.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          className="site-suggest-chip"
                          onClick={() => handleAddTag(sug)}
                        >
                          + {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lista de Padrões / Tags Atuais */}
                <div className="site-tags-container">
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
                    Padrões de Nomenclatura Cadastrados ({formIdentifiers.length})
                  </label>

                  <div className="site-tags-list">
                    {formIdentifiers.length === 0 ? (
                      <span style={{ fontSize: '12px', color: 'var(--muted-dim)', fontStyle: 'italic' }}>
                        Nenhum padrão customizado. A identificação usará o código da loja ou fallback.
                      </span>
                    ) : (
                      formIdentifiers.map((tag) => (
                        <span key={tag} className="site-tag-item">
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            title={`Remover padrão ${tag}`}
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Input para Adicionar Tag Customizada */}
                  <div className="site-tag-input-row">
                    <input
                      type="text"
                      className="site-form-input"
                      placeholder="Adicionar prefixo ou curinga (ex: LJ28, L28*, COMBO-01)..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddTag()
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleAddTag()}
                    >
                      + Adicionar
                    </button>
                  </div>
                </div>

                {/* Dica Explicativa */}
                <div className="site-help-box">
                  💡 <b>Como funciona a identificação:</b>
                  <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                    <li>Prefixos como <code>LJ01</code> reconhecem <code>LJ01-PDV01</code>, <code>LJ01_SRV</code>, <code>LJ01.CAIXA</code> e <code>LJ01PDV</code>.</li>
                    <li>Curingas com asterisco como <code>LJ01*</code> aceitam qualquer texto após a sigla.</li>
                  </ul>
                </div>
              </div>

              <div className="sites-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : editingSite ? 'Salvar Alterações' : 'Cadastrar Loja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
         6. MODAL DO SIMULADOR DE RECONHECIMENTO
         ========================================================= */}
      {simModalOpen && (
        <div className="sites-modal-overlay">
          <div className="sites-modal-container">
            <div className="sites-modal-header">
              <h3>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                Simulador de Reconhecimento de Loja
              </h3>
              <button
                type="button"
                className="sites-modal-close"
                onClick={() => setSimModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRunSimulation}>
              <div className="sites-modal-body">
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
                  Digite um nome de máquina (hostname) para testar em tempo real qual filial será reconhecida pelo motor de regras do inventário.
                </p>

                <div className="site-form-field">
                  <label>Hostname para Teste *</label>
                  <input
                    type="text"
                    className="site-form-input"
                    placeholder="Ex: LJ01-PDV-01, CB02-GERENCIA, AC-FIN-01..."
                    value={simHostname}
                    onChange={(e) => setSimHostname(e.target.value.toUpperCase())}
                    required
                  />
                </div>

                <div className="site-form-field">
                  <label>Campo 'Loja' do Agente (Opcional)</label>
                  <input
                    type="text"
                    className="site-form-input"
                    placeholder="Ex: 01, 28, CB01 (se informado no JSON do agente)"
                    value={simLoja}
                    onChange={(e) => setSimLoja(e.target.value)}
                  />
                </div>

                {/* Resultado da Simulação */}
                {simResult && (
                  <div className={`sim-result-card ${simResult.matched ? 'success' : 'warning'}`}>
                    <div className="sim-result-header">
                      <span className="sim-matched-site">
                        {simResult.matched ? (
                          <>
                            🏢 {simResult.site_name} ({simResult.site_code})
                          </>
                        ) : (
                          <>
                            ⚠️ {simResult.site_name || 'Nenhuma filial identificada'}
                          </>
                        )}
                      </span>
                      {simResult.matched_by && (
                        <span className="sim-rule-pill">
                          {simResult.matched_by}
                        </span>
                      )}
                    </div>
                    <div className="sim-details-text">
                      {simResult.details}
                    </div>
                  </div>
                )}
              </div>

              <div className="sites-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSimModalOpen(false)}
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={simLoading}
                >
                  {simLoading ? 'Testando...' : 'Testar Reconhecimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
         7. MODAL DE RECLASSIFICAÇÃO EM LOTE
         ========================================================= */}
      {reclassModalOpen && (
        <div className="sites-modal-overlay">
          <div className="sites-modal-container">
            <div className="sites-modal-header">
              <h3>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Reclassificação em Lote de Estações
              </h3>
              <button
                type="button"
                className="sites-modal-close"
                onClick={() => setReclassModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="sites-modal-body">
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
                Esta rotina avalia os hostnames dos computadores existentes no banco de dados contra os padrões cadastrados e atualiza a filial associada caso encontre correspondência.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ink)', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="reclass-scope"
                    checked={reclassOnlyUnassigned}
                    onChange={() => setReclassOnlyUnassigned(true)}
                  />
                  <span>
                    <b>Recomendado:</b> Reclassificar apenas máquinas sem loja ou na categoria 'OUTROS'
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ink)', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="reclass-scope"
                    checked={!reclassOnlyUnassigned}
                    onChange={() => setReclassOnlyUnassigned(false)}
                  />
                  <span>
                    <b>Varredura completa:</b> Reavaliar todas as estações do parque
                  </span>
                </label>
              </div>

              {/* Resultado da Reclassificação */}
              {reclassResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="reclass-report-summary">
                    <div className="reclass-report-box">
                      <div className="num">{reclassResult.total_scanned}</div>
                      <div className="lbl">Máquinas Analisadas</div>
                    </div>
                    <div className="reclass-report-box">
                      <div className="num" style={{ color: '#34d399' }}>{reclassResult.total_reclassified}</div>
                      <div className="lbl">Reclassificadas</div>
                    </div>
                  </div>

                  {reclassResult.changes.length > 0 && (
                    <div className="reclass-changes-list">
                      {reclassResult.changes.map((item) => (
                        <div key={item.device_id} className="reclass-change-row">
                          <span className="reclass-hostname">{item.hostname}</span>
                          <div>
                            <span style={{ color: 'var(--muted)' }}>{item.old_site || 'Sem Loja'}</span>
                            <span className="reclass-arrow">→</span>
                            <span className="reclass-new">{item.new_site}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="sites-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setReclassModalOpen(false)}
                disabled={reclassifying}
              >
                Fechar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExecuteReclassify}
                disabled={reclassifying}
              >
                {reclassifying ? 'Reclassificando...' : 'Executar Reclassificação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
         8. MODAL DE CONFIRMAÇÃO DE EXCLUSÃO
         ========================================================= */}
      {deletingSite && (
        <div className="sites-modal-overlay">
          <div className="sites-modal-container" style={{ maxWidth: '440px' }}>
            <div className="sites-modal-header">
              <h3 style={{ color: '#ef4444' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                Confirmar Exclusão
              </h3>
              <button
                type="button"
                className="sites-modal-close"
                onClick={() => setDeletingSite(null)}
              >
                ✕
              </button>
            </div>

            <div className="sites-modal-body">
              <p style={{ fontSize: '13px', color: 'var(--ink)', margin: 0 }}>
                Tem certeza que deseja excluir a filial <b>{deletingSite.name}</b> (Código: <code>{deletingSite.code}</code>)?
              </p>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
                Nota: Se existirem computadores ou ativos de rede já vinculados a esta loja, o sistema a <b>desativará</b> com segurança para não corromper o histórico do inventário.
              </p>
            </div>

            <div className="sites-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeletingSite(null)}
                disabled={actionLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
