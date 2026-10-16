import React, { useEffect, useMemo, useState } from 'react'
import '../styles/pages/licenses.css'
import {
  assignLicense,
  createLicense,
  deleteLicense,
  getLicenses,
  getLicenseStats,
  getLicenseDevices,
  getSites,
  updateLicense,
  type License,
  type LicenseDeviceItem,
  type LicenseInput,
  type LicenseStats,
  type Site,
} from '../services/api'
import SiteSelect from '../components/SiteSelect'

type UserInfo = {
  id: number
  username: string
  email: string
  full_name: string
  company_id: number
  active: boolean
  is_superadmin: boolean
  roles?: string[]
}

type LicensesPageProps = {
  token: string
  currentUser: UserInfo | null
  showToast: (msg: string) => void
}

// Opções rápidas pré-definidas conforme preferências do usuário
export const SOFTWARES_PREDEFINIDOS = {
  windows: [
    'Windows 11 Pro',
    'Windows 10 Pro',
    'Windows Server 2022 Standard',
    'Windows Server 2019 Standard',
    'Windows Server 2022 Datacenter',
    'Windows Server 2016 Standard',
  ],
  office: [
    'Office Home & Business 2021',
    'Office Home & Business 2019',
    'Office Professional Plus 2021',
    'Microsoft 365 Business Standard',
    'Microsoft 365 Apps for Business',
    'Office 365 E3',
  ],
  outro: ['VMware vSphere', 'Red Hat Enterprise Linux', 'SQL Server Standard'],
}

const TIPOS_LICENCA = [
  'OEM',
  'Retail / FPP',
  'Volume (MAK)',
  'Volume (KMS)',
  'CSP / Assinatura',
  'Doação / Parceria',
]

function formatarChaveInput(val: string): string {
  // Limpa caracteres não alfanuméricos e converte para maiúsculo
  const limpo = val.toUpperCase().replace(/[^A-Z0-9]/g, '')
  // Agrupa de 5 em 5 até 25 caracteres (padrão Microsoft)
  if (limpo.length <= 25) {
    const partes: string[] = []
    for (let i = 0; i < limpo.length; i += 5) {
      partes.push(limpo.slice(i, i + 5))
    }
    return partes.join('-')
  }
  return val.toUpperCase()
}

function mascararChave(chave: string, visivel: boolean): string {
  if (visivel || !chave) return chave
  const partes = chave.split('-')
  if (partes.length === 5) {
    return `${partes[0]}-•••••-•••••-•••••-${partes[4]}`
  }
  if (chave.length > 10) {
    return `${chave.slice(0, 4)}••••••••${chave.slice(-4)}`
  }
  return chave
}

export default function LicensesPage({
  token,
  currentUser,
  showToast,
}: LicensesPageProps) {
  const isAdmin = Boolean(
    currentUser?.is_superadmin || currentUser?.roles?.includes('admin'),
  )

  const [licenses, setLicenses] = useState<License[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [stats, setStats] = useState<LicenseStats | null>(null)
  const [loading, setLoading] = useState(false)

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroSite, setFiltroSite] = useState<string>('todos')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos')
  const [filtroStatus, setFiltroStatus] = useState<string>('todas')
  const [filtroSoftware, setFiltroSoftware] = useState<string>('todos')

  // Controle de visibilidade de chaves (ID -> booleano)
  const [chavesReveladas, setChavesReveladas] = useState<Record<number, boolean>>({})

  // Modal Cadastro / Edição
  const [modalAberto, setModalAberto] = useState(false)
  const [licencaEditando, setLicencaEditando] = useState<License | null>(null)
  const [formCategoria, setFormCategoria] = useState('windows')
  const [formSoftwareNome, setFormSoftwareNome] = useState('Windows 11 Pro')
  const [formChave, setFormChave] = useState('')
  const [formTipo, setFormTipo] = useState('OEM')
  const [formNF, setFormNF] = useState('')
  const [formQtdTotal, setFormQtdTotal] = useState(1)
  const [formSiteId, setFormSiteId] = useState<string>('matriz')
  const [formDataAquisicao, setFormDataAquisicao] = useState('')
  const [formObs, setFormObs] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Modal Computadores Vinculados
  const [modalDispositivosAberto, setModalDispositivosAberto] = useState(false)
  const [licencaSelecionada, setLicencaSelecionada] = useState<License | null>(null)
  const [dispositivosVinculados, setDispositivosVinculados] = useState<LicenseDeviceItem[]>([])
  const [carregandoDispositivos, setCarregandoDispositivos] = useState(false)
  const [desvinculandoId, setDesvinculandoId] = useState<string | null>(null)

  // Modal Confirmação de Exclusão
  const [licencaParaExcluir, setLicencaParaExcluir] = useState<License | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  // Carrega lista e estatísticas
  async function carregarDados() {
    setLoading(true)
    try {
      const sId = filtroSite === 'todos' ? undefined : filtroSite === 'matriz' ? 0 : Number(filtroSite)
      const [lista, estats, listaSites] = await Promise.all([
        getLicenses(token, {
          site_id: sId,
          categoria: filtroCategoria,
          status: filtroStatus,
          search: busca,
          software_nome: filtroSoftware,
        }),
        getLicenseStats(token, sId),
        sites.length === 0 ? getSites(token) : Promise.resolve(sites),
      ])
      setLicenses(lista)
      setStats(estats)
      if (sites.length === 0) setSites(listaSites)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      showToast(`Erro ao carregar licenças: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [filtroSite, filtroCategoria, filtroStatus, filtroSoftware])

  // Busca com debounce leve
  useEffect(() => {
    const timer = setTimeout(() => {
      carregarDados()
    }, 250)
    return () => clearTimeout(timer)
  }, [busca])

  function alternarRevelarChave(id: number) {
    setChavesReveladas((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function copiarTexto(texto: string, msg = 'Copiado para a área de transferência!') {
    navigator.clipboard.writeText(texto)
    showToast(msg)
  }

  function abrirNovoCadastro() {
    setLicencaEditando(null)
    setFormCategoria('windows')
    setFormSoftwareNome('Windows 11 Pro')
    setFormChave('')
    setFormTipo('OEM')
    setFormNF('')
    setFormQtdTotal(1)
    setFormSiteId(filtroSite !== 'todos' ? filtroSite : 'matriz')
    setFormDataAquisicao('')
    setFormObs('')
    setModalAberto(true)
  }

  function abrirEdicao(l: License) {
    setLicencaEditando(l)
    setFormCategoria(l.categoria)
    setFormSoftwareNome(l.software_nome)
    setFormChave(l.chave)
    setFormTipo(l.tipo_licenca || 'OEM')
    setFormNF(l.nota_fiscal || '')
    setFormQtdTotal(l.quantidade_total)
    setFormSiteId(l.site_id ? String(l.site_id) : 'matriz')
    setFormDataAquisicao(l.data_aquisicao ? l.data_aquisicao.slice(0, 10) : '')
    setFormObs(l.observacoes || '')
    setModalAberto(true)
  }

  async function handleSalvarLicenca(e: React.FormEvent) {
    e.preventDefault()
    if (!formSoftwareNome.trim()) {
      showToast('Informe o nome do software / edição.')
      return
    }
    if (!formChave.trim()) {
      showToast('Informe a chave do produto (serial).')
      return
    }
    if (formQtdTotal < 1) {
      showToast('A quantidade total deve ser de pelo menos 1 licença.')
      return
    }

    setSalvando(true)
    try {
      const payload: LicenseInput = {
        categoria: formCategoria,
        software_nome: formSoftwareNome.trim(),
        chave: formChave.trim(),
        tipo_licenca: formTipo,
        nota_fiscal: formNF.trim() || undefined,
        quantidade_total: Number(formQtdTotal),
        site_id: formSiteId === 'matriz' ? null : Number(formSiteId),
        data_aquisicao: formDataAquisicao ? new Date(formDataAquisicao).toISOString() : undefined,
        observacoes: formObs.trim() || undefined,
      }

      if (licencaEditando) {
        await updateLicense(token, licencaEditando.id, payload)
        showToast('Lote de licença atualizado com sucesso!')
      } else {
        await createLicense(token, payload)
        showToast('Nova licença cadastrada com sucesso!')
      }
      setModalAberto(false)
      carregarDados()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      showToast(msg)
    } finally {
      setSalvando(false)
    }
  }

  async function handleExcluirLicenca() {
    if (!licencaParaExcluir) return
    setExcluindo(true)
    try {
      await deleteLicense(token, licencaParaExcluir.id)
      showToast(`Licença "${licencaParaExcluir.software_nome}" excluída com sucesso.`)
      setLicencaParaExcluir(null)
      carregarDados()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      showToast(msg)
    } finally {
      setExcluindo(false)
    }
  }

  async function abrirComputadoresVinculados(l: License) {
    setLicencaSelecionada(l)
    setModalDispositivosAberto(true)
    setCarregandoDispositivos(true)
    try {
      const devs = await getLicenseDevices(token, l.id)
      setDispositivosVinculados(devs)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      showToast(`Erro ao listar computadores: ${msg}`)
    } finally {
      setCarregandoDispositivos(false)
    }
  }

  async function handleDesvincularDispositivo(dev: LicenseDeviceItem) {
    if (!licencaSelecionada) return
    const idKey = `${dev.origem}-${dev.id}`
    setDesvinculandoId(idKey)
    try {
      await assignLicense(token, {
        device_id: dev.origem === 'estacao' ? dev.id : undefined,
        network_asset_id: dev.origem === 'ativo' ? dev.id : undefined,
        slot: dev.slot,
        chave: null, // desvincula
      })
      showToast(`Licença desvinculada de ${dev.hostname}!`)
      // Atualiza listagem interna do modal
      setDispositivosVinculados((prev) => prev.filter((d) => !(d.id === dev.id && d.slot === dev.slot && d.origem === dev.origem)))
      carregarDados()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      showToast(`Erro ao desvincular: ${msg}`)
    } finally {
      setDesvinculandoId(null)
    }
  }

  // Lista única de nomes de softwares cadastrados para filtro rápido
  const softwaresCadastrados = useMemo(() => {
    return Array.from(new Set(licenses.map((l) => l.software_nome))).sort()
  }, [licenses])

  return (
    <div className="lic-page-container">
      {/* ================= TOPO / CABEÇALHO ================= */}
      <header className="lic-header">
        <div className="lic-header-titles">
          <div className="lic-title-badge">
            <span className="lic-title-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            </span>
            <h1>Controle de Licenças &amp; Seriais</h1>
          </div>
          <p>
            Planilha dinâmica e sincronizada de chaves de produto Windows e Office vinculadas aos computadores e ativos da rede.
          </p>
        </div>

        <div className="lic-header-actions">
          <button
            type="button"
            className="btn"
            onClick={carregarDados}
            disabled={loading}
            title="Atualizar lista e contadores"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Atualizar
          </button>

          {isAdmin && (
            <button
              type="button"
              className="btn primary"
              onClick={abrirNovoCadastro}
              title="Cadastrar novo lote ou chave de licença"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Cadastrar Licença
            </button>
          )}
        </div>
      </header>

      {/* ================= CARDS / KPIS DINÂMICOS ================= */}
      {stats && (
        <section className="lic-kpi-grid">
          <div className="lic-kpi-card total">
            <div className="lic-kpi-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M7 8h10M7 12h10M7 16h6" />
              </svg>
            </div>
            <div className="lic-kpi-info">
              <span className="lic-kpi-label">Total de Licenças</span>
              <strong className="lic-kpi-value">{stats.total_licencas}</strong>
              <span className="lic-kpi-sub">Adquiridas via Nota Fiscal</span>
            </div>
          </div>

          <div className="lic-kpi-card uso">
            <div className="lic-kpi-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div className="lic-kpi-info">
              <span className="lic-kpi-label">Em Uso Ativo</span>
              <strong className="lic-kpi-value">{stats.total_em_uso}</strong>
              <span className="lic-kpi-sub">
                {stats.total_licencas > 0
                  ? `${Math.round((stats.total_em_uso / stats.total_licencas) * 100)}% de ocupação`
                  : 'Nenhuma chave ativa'}
              </span>
            </div>
          </div>

          <div className="lic-kpi-card disp">
            <div className="lic-kpi-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v8M8 12h8" />
              </svg>
            </div>
            <div className="lic-kpi-info">
              <span className="lic-kpi-label">Saldo Disponível</span>
              <strong className="lic-kpi-value">{stats.total_disponiveis}</strong>
              <span className="lic-kpi-sub">Prontas para ativação</span>
            </div>
          </div>

          <div className={`lic-kpi-card ${stats.total_esgotadas > 0 ? 'esgotada alert' : 'esgotada'}`}>
            <div className="lic-kpi-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="lic-kpi-info">
              <span className="lic-kpi-label">Lotes Esgotados</span>
              <strong className="lic-kpi-value">{stats.total_esgotadas}</strong>
              <span className="lic-kpi-sub">
                {stats.total_esgotadas > 0 ? 'Requer aquisição de novas chaves' : 'Todas com cotas normais'}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ================= BARRA DE FILTROS ================= */}
      <section className="lic-filter-bar">
        {/* Busca por texto */}
        <div className="lic-search-box">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por chave, software, número da NF ou observação..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          {busca && (
            <button type="button" className="lic-clear-search" onClick={() => setBusca('')} aria-label="Limpar">
              ✕
            </button>
          )}
        </div>

        {/* Filtro por Filial (SiteSelect) */}
        <div className="lic-filter-group" style={{ minWidth: '220px' }}>
          <SiteSelect
            sites={sites}
            value={filtroSite}
            onChange={setFiltroSite}
            allowAll
            allLabel="Todas as Lojas / Geral"
            allowWithoutSite
            emptyLabel="Matriz / Geral (Sem Loja Específica)"
          />
        </div>

        {/* Categoria */}
        <div className="lic-filter-group">
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
            <option value="todos">Todas as Categorias</option>
            <option value="windows">Windows / SO</option>
            <option value="office">Office / Softwares</option>
            <option value="outro">Outras Licenças</option>
          </select>
        </div>

        {/* Status */}
        <div className="lic-filter-group">
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="todas">Todos os Status</option>
            <option value="disponiveis">Apenas com Saldo Disponível</option>
            <option value="esgotadas">Apenas Esgotadas (Sem Saldo)</option>
          </select>
        </div>

        {/* Software Específico */}
        {softwaresCadastrados.length > 0 && (
          <div className="lic-filter-group">
            <select value={filtroSoftware} onChange={(e) => setFiltroSoftware(e.target.value)}>
              <option value="todos">Todos os Softwares</option>
              {softwaresCadastrados.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </section>

      {/* ================= TABELA / PLANILHA DIGITAL ================= */}
      <section className="lic-table-wrapper">
        <table className="lic-table">
          <thead>
            <tr>
              <th>Filial / Escopo</th>
              <th>Categoria</th>
              <th>Software / Edição</th>
              <th>Chave de Produto (Serial)</th>
              <th>Nota Fiscal</th>
              <th>Tipo</th>
              <th style={{ textAlign: 'center' }}>Total</th>
              <th style={{ textAlign: 'center' }}>Em Uso</th>
              <th style={{ textAlign: 'center' }}>Disponível</th>
              <th style={{ minWidth: '150px' }}>Ocupação da Cota</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && licenses.length === 0 ? (
              <tr>
                <td colSpan={12} className="lic-loading-row">
                  <div className="lic-spinner" />
                  Carregando planilha de licenças...
                </td>
              </tr>
            ) : licenses.length === 0 ? (
              <tr>
                <td colSpan={12} className="lic-empty-row">
                  <div className="lic-empty-box">
                    <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                      <path d="M7 8h10M7 12h10M7 16h6" />
                    </svg>
                    <h4>Nenhuma licença encontrada</h4>
                    <p>
                      {busca || filtroSite !== 'todos' || filtroCategoria !== 'todos'
                        ? 'Nenhum resultado corresponde aos filtros selecionados. Tente ajustar os termos.'
                        : 'Cadastre sua primeira licença para iniciar o controle sincronizado com as máquinas.'}
                    </p>
                    {isAdmin && (
                      <button type="button" className="btn primary" onClick={abrirNovoCadastro}>
                        + Cadastrar Licença
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              licenses.map((l) => {
                const isRevelada = Boolean(chavesReveladas[l.id])
                const chaveExibida = mascararChave(l.chave, isRevelada)
                const percUso = l.quantidade_total > 0 ? Math.min(100, Math.round((l.quantidade_em_uso / l.quantidade_total) * 100)) : 0

                return (
                  <tr key={l.id} className={l.esgotada ? 'lic-row-esgotada' : ''}>
                    {/* Filial */}
                    <td>
                      {l.site_nome ? (
                        <span className="lic-tag-filial" title={`Loja: ${l.site_nome}`}>
                          {l.site_codigo ? `${l.site_codigo} - ${l.site_nome}` : l.site_nome}
                        </span>
                      ) : (
                        <span className="lic-tag-matriz" title="Licença de uso geral / Matriz">
                          Geral / Matriz
                        </span>
                      )}
                    </td>

                    {/* Categoria */}
                    <td>
                      <span className={`lic-cat-badge cat-${l.categoria}`}>
                        {l.categoria === 'windows' ? (
                          <>
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                              <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                            </svg>
                            Windows
                          </>
                        ) : l.categoria === 'office' ? (
                          <>
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="4" y="2" width="16" height="20" rx="2" />
                              <line x1="8" y1="6" x2="16" y2="6" />
                              <line x1="8" y1="10" x2="16" y2="10" />
                              <line x1="8" y1="14" x2="12" y2="14" />
                            </svg>
                            Office
                          </>
                        ) : (
                          l.categoria.toUpperCase()
                        )}
                      </span>
                    </td>

                    {/* Software / Edição */}
                    <td>
                      <div className="lic-software-cell">
                        <strong>{l.software_nome}</strong>
                        {l.observacoes && <span className="lic-sub-obs">{l.observacoes}</span>}
                      </div>
                    </td>

                    {/* Chave (Serial) */}
                    <td>
                      <div className="lic-key-box">
                        <span className="lic-key-text" title={l.chave}>
                          {chaveExibida}
                        </span>
                        <div className="lic-key-actions">
                          <button
                            type="button"
                            className="lic-mini-btn"
                            onClick={() => alternarRevelarChave(l.id)}
                            title={isRevelada ? 'Ocultar parte da chave' : 'Revelar chave completa'}
                            aria-label="Revelar ou ocultar chave"
                          >
                            {isRevelada ? '👁️' : '🔒'}
                          </button>
                          <button
                            type="button"
                            className="lic-mini-btn"
                            onClick={() => copiarTexto(l.chave, 'Chave de licença copiada!')}
                            title="Copiar chave completa"
                            aria-label="Copiar chave"
                          >
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Nota Fiscal */}
                    <td>
                      {l.nota_fiscal ? (
                        <span
                          className="lic-tag-nf"
                          title={`Nota Fiscal: ${l.nota_fiscal} (Clique para filtrar)`}
                          onClick={() => setBusca(l.nota_fiscal!)}
                          role="button"
                          tabIndex={0}
                        >
                          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          {l.nota_fiscal}
                        </span>
                      ) : (
                        <span className="lic-muted">—</span>
                      )}
                    </td>

                    {/* Tipo */}
                    <td>
                      <span className="lic-tag-tipo">{l.tipo_licenca || 'OEM'}</span>
                    </td>

                    {/* Quantidades */}
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{l.quantidade_total}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="lic-count-btn"
                        onClick={() => abrirComputadoresVinculados(l)}
                        title="Ver computadores vinculados a esta chave"
                      >
                        {l.quantidade_em_uso}
                      </button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <strong className={l.quantidade_disponivel === 0 ? 'lic-disp-zero' : 'lic-disp-ok'}>
                        {l.quantidade_disponivel}
                      </strong>
                    </td>

                    {/* Barra de Progresso de Cota */}
                    <td>
                      <div className="lic-progress-wrapper" title={`${percUso}% utilizado (${l.quantidade_em_uso} de ${l.quantidade_total})`}>
                        <div className="lic-progress-bar">
                          <div
                            className={`lic-progress-fill ${percUso >= 100 ? 'full' : percUso >= 75 ? 'warn' : 'ok'}`}
                            style={{ width: `${percUso}%` }}
                          />
                        </div>
                        <span className="lic-progress-txt">{percUso}%</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ textAlign: 'center' }}>
                      {l.esgotada ? (
                        <span className="lic-status-badge esgotada" title="Todas as licenças deste lote foram atribuídas!">
                          ● Esgotada
                        </span>
                      ) : (
                        <span className="lic-status-badge disponivel">
                          ✓ Disponível
                        </span>
                      )}
                    </td>

                    {/* Ações */}
                    <td style={{ textAlign: 'right' }}>
                      <div className="lic-row-actions">
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => abrirComputadoresVinculados(l)}
                          title="Visualizar máquinas vinculadas"
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="3" width="20" height="14" rx="2" />
                            <line x1="8" y1="21" x2="16" y2="21" />
                            <line x1="12" y1="17" x2="12" y2="21" />
                          </svg>
                        </button>

                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              className="btn-icon"
                              onClick={() => abrirEdicao(l)}
                              title="Editar licença ou alterar cota"
                            >
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>

                            <button
                              type="button"
                              className="btn-icon danger"
                              onClick={() => setLicencaParaExcluir(l)}
                              title="Excluir licença"
                            >
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </section>

      {/* ================= MODAL: CADASTRO / EDIÇÃO DE LICENÇA ================= */}
      {modalAberto && (
        <div className="lic-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !salvando) setModalAberto(false) }}>
          <div className="lic-modal" role="dialog" aria-modal="true">
            <div className="lic-modal-head">
              <h2>{licencaEditando ? 'Editar Lote de Licença' : 'Cadastrar Nova Licença'}</h2>
              <button
                type="button"
                className="lic-close-btn"
                onClick={() => !salvando && setModalAberto(false)}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarLicenca} className="lic-form">
              <div className="lic-form-grid">
                {/* Categoria */}
                <div className="lic-field">
                  <label>Categoria de Software *</label>
                  <select
                    value={formCategoria}
                    onChange={(e) => {
                      const c = e.target.value
                      setFormCategoria(c)
                      if (c === 'windows') setFormSoftwareNome('Windows 11 Pro')
                      else if (c === 'office') setFormSoftwareNome('Office Home & Business 2021')
                      else setFormSoftwareNome('')
                    }}
                  >
                    <option value="windows">Sistema Operacional (Windows)</option>
                    <option value="office">Pacote Office / Softwares</option>
                    <option value="outro">Outro Software</option>
                  </select>
                </div>

                {/* Tipo de Licença */}
                <div className="lic-field">
                  <label>Tipo de Aquisição *</label>
                  <select value={formTipo} onChange={(e) => setFormTipo(e.target.value)}>
                    {TIPOS_LICENCA.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Software / Edição (com Datalist de sugestões) */}
                <div className="lic-field full">
                  <label>Software / Edição *</label>
                  <input
                    type="text"
                    list="softwares-sugestoes"
                    placeholder="Ex: Windows 11 Pro, Office Home & Business 2021..."
                    value={formSoftwareNome}
                    onChange={(e) => setFormSoftwareNome(e.target.value)}
                    required
                  />
                  <datalist id="softwares-sugestoes">
                    {(SOFTWARES_PREDEFINIDOS[formCategoria as keyof typeof SOFTWARES_PREDEFINIDOS] || []).map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                  <span className="lic-hint">
                    Selecione uma das opções sugeridas ou digite o nome específico da versão.
                  </span>
                </div>

                {/* Chave de Produto (Serial) */}
                <div className="lic-field full">
                  <label>Chave do Produto (Product Key) *</label>
                  <input
                    type="text"
                    className="lic-mono-input"
                    placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                    value={formChave}
                    onChange={(e) => setFormChave(formatarChaveInput(e.target.value))}
                    maxLength={35}
                    required
                  />
                  <span className="lic-hint">
                    Padrão de 25 caracteres alfanuméricos separados por hífen.
                  </span>
                </div>

                {/* Nota Fiscal */}
                <div className="lic-field">
                  <label>Número da Nota Fiscal (NF)</label>
                  <input
                    type="text"
                    placeholder="Ex: NF 049182 ou 12345"
                    value={formNF}
                    onChange={(e) => setFormNF(e.target.value)}
                  />
                </div>

                {/* Quantidade Total */}
                <div className="lic-field">
                  <label>Quantidade Total de Ativações *</label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={formQtdTotal}
                    onChange={(e) => setFormQtdTotal(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                  />
                  <span className="lic-hint">
                    Para chaves unitárias OEM use 1. Para contratos de volume (MAK) informe a cota total.
                  </span>
                </div>

                {/* Filial / Escopo */}
                <div className="lic-field">
                  <label>Filial / Loja Destinada</label>
                  <select value={formSiteId} onChange={(e) => setFormSiteId(e.target.value)}>
                    <option value="matriz">Geral / Matriz (Qualquer Filial)</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code ? `${s.code} - ${s.name}` : s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Data de Aquisição */}
                <div className="lic-field">
                  <label>Data de Aquisição</label>
                  <input
                    type="date"
                    value={formDataAquisicao}
                    onChange={(e) => setFormDataAquisicao(e.target.value)}
                  />
                </div>

                {/* Observações */}
                <div className="lic-field full">
                  <label>Observações / Fornecedor / Detalhes</label>
                  <textarea
                    rows={2}
                    placeholder="Detalhes da compra, fornecedor, observações de garantia..."
                    value={formObs}
                    onChange={(e) => setFormObs(e.target.value)}
                  />
                </div>
              </div>

              <div className="lic-modal-foot">
                <button type="button" className="btn" onClick={() => setModalAberto(false)} disabled={salvando}>
                  Cancelar
                </button>
                <button type="submit" className="btn primary" disabled={salvando}>
                  {salvando ? 'Salvando...' : licencaEditando ? 'Salvar Alterações' : 'Cadastrar Licença'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: COMPUTADORES VINCULADOS ================= */}
      {modalDispositivosAberto && licencaSelecionada && (
        <div className="lic-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setModalDispositivosAberto(false) }}>
          <div className="lic-modal lg" role="dialog" aria-modal="true">
            <div className="lic-modal-head">
              <div>
                <h2>Computadores Vinculados</h2>
                <span className="lic-modal-sub">
                  {licencaSelecionada.software_nome} — Chave: <code>{licencaSelecionada.chave}</code>
                </span>
              </div>
              <button
                type="button"
                className="lic-close-btn"
                onClick={() => setModalDispositivosAberto(false)}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="lic-dev-body">
              <div className="lic-dev-stats-bar">
                <span>
                  Total em uso:{' '}
                  <b>
                    {dispositivosVinculados.length} de {licencaSelecionada.quantidade_total}
                  </b>
                </span>
                <span className={licencaSelecionada.quantidade_disponivel === 0 ? 'lic-disp-zero' : 'lic-disp-ok'}>
                  Saldo disponível: <b>{licencaSelecionada.quantidade_disponivel}</b>
                </span>
              </div>

              {carregandoDispositivos ? (
                <div className="lic-loading-row">
                  <div className="lic-spinner" /> Carregando dispositivos vinculados...
                </div>
              ) : dispositivosVinculados.length === 0 ? (
                <div className="lic-empty-devices">
                  <p>Nenhum computador está utilizando esta chave no momento.</p>
                  <span>
                    Você pode atribuir esta licença aos computadores diretamente pelo módulo de Ativos de Rede ou
                    importação CSV.
                  </span>
                </div>
              ) : (
                <table className="lic-subtable">
                  <thead>
                    <tr>
                      <th>Filial</th>
                      <th>Hostname</th>
                      <th>Endereço IP</th>
                      <th>Patrimônio</th>
                      <th>Slot Atribuído</th>
                      <th>Origem</th>
                      <th style={{ textAlign: 'right' }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispositivosVinculados.map((dev) => (
                      <tr key={`${dev.origem}-${dev.id}-${dev.slot}`}>
                        <td>{dev.site_nome || 'Matriz'}</td>
                        <td>
                          <strong>{dev.hostname}</strong>
                        </td>
                        <td>
                          <span className="lic-mono">{dev.ip || '—'}</span>
                        </td>
                        <td>
                          {dev.patrimonio ? (
                            <span className="lic-patrimonio-tag">{dev.patrimonio}</span>
                          ) : (
                            <span className="lic-muted">—</span>
                          )}
                        </td>
                        <td>
                          <span className={`lic-cat-badge cat-${dev.slot}`}>
                            {dev.slot.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span className="lic-origem-tag">{dev.origem === 'estacao' ? 'Estação' : 'Ativo'}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {isAdmin && (
                            <button
                              type="button"
                              className="btn btn-sm danger"
                              onClick={() => handleDesvincularDispositivo(dev)}
                              disabled={desvinculandoId === `${dev.origem}-${dev.id}`}
                              title="Desvincular licença desta máquina (libera cota)"
                            >
                              {desvinculandoId === `${dev.origem}-${dev.id}` ? 'Liberando...' : 'Desvincular'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="lic-modal-foot">
              <button type="button" className="btn" onClick={() => setModalDispositivosAberto(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONFIRMAR EXCLUSÃO ================= */}
      {licencaParaExcluir && (
        <div className="lic-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !excluindo) setLicencaParaExcluir(null) }}>
          <div className="lic-modal sm" role="dialog" aria-modal="true">
            <div className="lic-modal-head">
              <h2>Confirmar Exclusão</h2>
              <button type="button" className="lic-close-btn" onClick={() => setLicencaParaExcluir(null)}>
                ✕
              </button>
            </div>
            <div className="lic-form" style={{ padding: '16px 20px' }}>
              <p>
                Tem certeza que deseja excluir o cadastro da licença <b>{licencaParaExcluir.software_nome}</b>?
              </p>
              {licencaParaExcluir.quantidade_em_uso > 0 && (
                <div className="lic-alert-box">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>
                    Atenção: Esta chave está atualmente em uso por <b>{licencaParaExcluir.quantidade_em_uso} máquina(s)</b>!
                  </span>
                </div>
              )}
              <div className="lic-modal-foot" style={{ marginTop: '16px', padding: 0 }}>
                <button type="button" className="btn" onClick={() => setLicencaParaExcluir(null)} disabled={excluindo}>
                  Cancelar
                </button>
                <button type="button" className="btn danger" onClick={handleExcluirLicenca} disabled={excluindo}>
                  {excluindo ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
