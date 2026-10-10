import { useCallback, useEffect, useMemo, useState } from 'react'
import { IcoLnx, IcoWin } from '../components/Icons'
import { abrirTerminalSshPopup } from '../components/SshTerminalModal'
import {
  CATS,
  construirAppsMap,
  ipNum,
  isLinuxDevice,
  ORDEM_TIPO,
  versaoCompleta,
  type AppMapEntry,
  type EnrichedMachine,
} from '../services/inventoryHelpers'
import type { PacoteItem } from '../services/api'

type AppsPageProps = {
  inventario: EnrichedMachine[]
  abrirMaquinaNoInventario: (hostname: string) => void
  onOpenSsh?: (device: EnrichedMachine) => void
  canUseSsh?: boolean
}

type Inst = { m: EnrichedMachine; ver: string; pacotes: PacoteItem[] }
type Conformidade = 'todos' | 'outdated' | 'latest'

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

// Compara versões numéricas/semver de aplicativos e navegadores.
// Ignora o "epoch" (1:) e a revisão do pacote (-1, -3build6, ~build1), para que
// "154.0.8037.92" (Windows) e "154.0.8037.92-1" (Linux) sejam consideradas a mesma versão.
function parseVersionTokens(v: string): number[] {
  const clean = String(v || '')
    .replace(/^\d+:/, '')
    .trim()
    .replace(/^(\d+(?:\.\d+)+)[-~+].*$/, '$1')
  const matches = clean.match(/\d+/g)
  return matches ? matches.map(Number) : []
}

function compararVersoes(v1: string, v2: string): number {
  if (!v1 && !v2) return 0
  if (!v1) return -1
  if (!v2) return 1
  if (v1 === v2) return 0

  const p1 = parseVersionTokens(v1)
  const p2 = parseVersionTokens(v2)
  const len = Math.max(p1.length, p2.length)
  for (let i = 0; i < len; i++) {
    const n1 = p1[i] ?? 0
    const n2 = p2[i] ?? 0
    if (n1 > n2) return 1
    if (n1 < n2) return -1
  }
  return 0
}

const isBrowser = (nome: string, key?: string) =>
  /chrome|chromium|firefox|edge|brave|opera|safari|vivaldi/i.test(nome) ||
  (key ? /chrome|chromium|firefox|edge|brave|opera|safari|vivaldi/i.test(key) : false)

/* Uma única regra de conformidade para o painel de navegadores e para o aplicativo selecionado */
function analisarConformidade(ms: { ver: string }[]) {
  let maisRecente = ''
  for (const x of ms) {
    if (x.ver && (!maisRecente || compararVersoes(x.ver, maisRecente) > 0)) maisRecente = x.ver
  }
  if (!maisRecente) return null

  let conformes = 0
  let desatualizadas = 0
  for (const x of ms) {
    if (!x.ver) continue
    if (compararVersoes(x.ver, maisRecente) >= 0) conformes++
    else desatualizadas++
  }
  const comVersao = conformes + desatualizadas
  return {
    maisRecente,
    conformes,
    desatualizadas,
    comVersao,
    taxa: comVersao > 0 ? Math.round((conformes / comVersao) * 100) : 100,
  }
}

const ICONS = {
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  x: 'M18 6L6 18 M6 6l12 12',
  check: 'M20 6L9 17l-5-5',
  alert: 'M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z M12 9v4 M12 17h.01',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M2 12h20 M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20',
  box: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  server: 'M2 4h20v6H2z M2 14h20v6H2z M6 7h.01 M6 17h.01',
  layers: 'M12 2l10 5-10 5L2 7z M2 12l10 5 10-5 M2 17l10 5 10-5',
  terminal: 'M4 17l6-6-6-6 M12 19h8',
  chevron: 'M6 9l6 6 6-6',
} as const

function Icon({ name, size = 16 }: { name: keyof typeof ICONS; size?: number }) {
  return (
    <svg
      className="ap-ico"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  )
}

const CATEGORIAS = [
  ['', 'Todas'],
  ['Aplicativo', 'Aplicativos'],
  ['Agente', 'Agentes'],
  ['Runtime', 'Runtimes'],
  ['Ferramenta', 'Ferramentas'],
] as const

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */
export default function AppsPage({
  inventario,
  abrirMaquinaNoInventario,
  onOpenSsh,
  canUseSsh = true,
}: AppsPageProps) {
  const [appBusca, setAppBusca] = useState<string>('')
  const [appCat, setAppCat] = useState<string>('')
  const [appPlat, setAppPlat] = useState<string>('')
  const [appSo, setAppSo] = useState<string>('')
  const [appOrigem, setAppOrigem] = useState<string>('')
  const [appVerModo, setAppVerModo] = useState<'full' | 'major'>('full')
  const [verOrdem, setVerOrdem] = useState<'qtd' | 'versao'>('qtd')
  const [appSel, setAppSel] = useState<string | null>(null)
  const [appVerSel, setAppVerSel] = useState<string | null>(null)
  const [appConformidade, setAppConformidade] = useState<Conformidade>('todos')
  const [appAba, setAppAba] = useState<'com' | 'sem'>('com')
  const [appLimit, setAppLimit] = useState<number>(100)
  const [navAberto, setNavAberto] = useState(false)

  const handleOpenSsh = (m: EnrichedMachine) => {
    if (!canUseSsh) return
    if (onOpenSsh) onOpenSsh(m)
    else abrirTerminalSshPopup(m)
  }

  /** Seleciona um aplicativo e volta o detalhe para o estado inicial */
  function selecionarApp(key: string, conf: Conformidade = 'todos') {
    setAppSel(key)
    setAppVerSel(null)
    setAppConformidade(conf)
    setAppAba('com')
    setAppLimit(100)
  }

  const filtrosAtivos = !!(appBusca || appCat || appPlat || appSo || appOrigem)
  function limparFiltros() {
    setAppBusca('')
    setAppCat('')
    setAppPlat('')
    setAppSo('')
    setAppOrigem('')
    setAppLimit(100)
  }

  /* ---------------- Filtros por plataforma / sistema ---------------- */
  const matchSo = useCallback(
    (m: EnrichedMachine) => {
      if (appPlat && m._so !== appPlat) return false
      if (appSo && versaoCompleta(m) !== appSo) return false
      return true
    },
    [appPlat, appSo]
  )

  const soListaDisponiveis = useMemo(() => {
    const set = new Set<string>()
    inventario.forEach((m) => {
      if (appPlat && m._so !== appPlat) return
      const s = versaoCompleta(m)
      if (s) set.add(s)
    })
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [inventario, appPlat])

  const { appsMap, origens: appOrigensDisponiveis } = useMemo(() => construirAppsMap(inventario), [inventario])

  const temInventario = (m: EnrichedMachine) =>
    CATS.some((cat) => Array.isArray(m[cat[0]]) && (m[cat[0]] as unknown[]).length > 0)

  const maqsComInventario = useMemo(
    () => inventario.filter((m: EnrichedMachine) => matchSo(m) && temInventario(m)),
    [inventario, matchSo]
  )

  const maqsSemInventario = useMemo(
    () => inventario.filter((m: EnrichedMachine) => matchSo(m) && !temInventario(m)).length,
    [inventario, matchSo]
  )

  const verTxt = useCallback(
    (v: string) => {
      v = String(v || '').trim()
      if (!v) return 'Sem versão'
      if (appVerModo === 'major') {
        const m = v.replace(/^\d+:/, '').match(/^\d+/)
        return m ? m[0] : v
      }
      return v
    },
    [appVerModo]
  )

  /* ---------------- Lista de aplicativos ---------------- */
  // Tudo, menos o filtro de categoria (usado para contar cada categoria)
  const baseLista = useMemo(() => {
    const q = appBusca.toLowerCase().trim()
    const lista: { e: AppMapEntry; ms: Inst[] }[] = []

    appsMap.forEach((e: AppMapEntry) => {
      if (appOrigem && !e.origens.has(appOrigem)) return
      if (q && !(e.nome + ' ' + [...e.pks].join(' ')).toLowerCase().includes(q)) return
      const ms = [...e.maq.values()].filter((x) => matchSo(x.m))
      if (ms.length > 0) lista.push({ e, ms })
    })

    lista.sort((a, b) => b.ms.length - a.ms.length || a.e.nome.localeCompare(b.e.nome, 'pt-BR'))
    return lista
  }, [appsMap, appOrigem, appBusca, matchSo])

  const catCounts = useMemo(() => {
    const c: Record<string, number> = { '': baseLista.length }
    baseLista.forEach((x) => {
      c[x.e.cat] = (c[x.e.cat] || 0) + 1
    })
    return c
  }, [baseLista])

  const appLista = useMemo(
    () => (appCat ? baseLista.filter((x) => x.e.cat === appCat) : baseLista),
    [baseLista, appCat]
  )

  const totalInstalacoes = useMemo(() => appLista.reduce((t, x) => t + x.ms.length, 0), [appLista])

  /* ---------------- Conformidade de navegadores ---------------- */
  const navegadoresConformidade = useMemo(
    () =>
      appLista
        .filter((x) => isBrowser(x.e.nome, x.e.key))
        .map((item) => ({ app: item, info: analisarConformidade(item.ms), total: item.ms.length })),
    [appLista]
  )

  // Seleciona automaticamente um aplicativo (prefere o Chrome)
  useEffect(() => {
    if (appLista.length > 0 && (!appSel || !appLista.some((x) => x.e.key === appSel))) {
      const pref = appLista.find((x) => /chrome/i.test(x.e.nome)) || appLista[0]
      selecionarApp(pref.e.key)
    }
  }, [appLista, appSel])

  const appSelecionado = useMemo(() => appLista.find((x) => x.e.key === appSel), [appLista, appSel])

  const infoConf = useMemo(() => (appSelecionado ? analisarConformidade(appSelecionado.ms) : null), [appSelecionado])

  const { appVersoes, comLista, semLista } = useMemo(() => {
    if (!appSelecionado) return { appVersoes: [] as [string, number][], comLista: [] as Inst[], semLista: [] as Inst[] }

    const ms = appSelecionado.ms
    const vc = new Map<string, number>()
    ms.forEach((x) => {
      const k = verTxt(x.ver)
      vc.set(k, (vc.get(k) || 0) + 1)
    })
    const vers = [...vc.entries()].sort((a, b) =>
      verOrdem === 'versao' ? compararVersoes(b[0], a[0]) : b[1] - a[1] || compararVersoes(b[0], a[0])
    )

    const cf = (a: EnrichedMachine, b: EnrichedMachine) =>
      (ORDEM_TIPO[a._f.tipo] ?? 99) - (ORDEM_TIPO[b._f.tipo] ?? 99) ||
      a._f.num - b._f.num ||
      ipNum(a.ip) - ipNum(b.ip)

    const set = new Set(ms.map((x) => x.m.hostname))

    let com = ms.filter((x) => !appVerSel || verTxt(x.ver) === appVerSel)
    if (infoConf && appConformidade === 'outdated') {
      com = com.filter((x) => x.ver && compararVersoes(x.ver, infoConf.maisRecente) < 0)
    } else if (infoConf && appConformidade === 'latest') {
      com = com.filter((x) => x.ver && compararVersoes(x.ver, infoConf.maisRecente) >= 0)
    }
    com = [...com].sort((a, b) => cf(a.m, b.m))

    const sem: Inst[] = maqsComInventario
      .filter((m: EnrichedMachine) => !set.has(m.hostname))
      .sort(cf)
      .map((m: EnrichedMachine) => ({ m, ver: '', pacotes: [] as PacoteItem[] }))

    return { appVersoes: vers, comLista: com, semLista: sem }
  }, [appSelecionado, appVerSel, appConformidade, infoConf, maqsComInventario, verTxt, verOrdem])

  const appTabelaRows = appAba === 'com' ? comLista : semLista

  /* ---------------- Exportação ---------------- */
  function exportarAppsCSV() {
    if (!appSelecionado) return
    const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const cab = ['Situação', 'Filial', 'Hostname', 'IP', 'Plataforma', 'Sistema / Distro', 'Aplicativo', 'Versão', 'Conformidade']
    const linhas = appTabelaRows.map((r) => {
      let statusConformidade = '—'
      if (r.ver && infoConf) {
        statusConformidade =
          compararVersoes(r.ver, infoConf.maisRecente) >= 0 ? 'Atualizado (Conforme)' : 'Fora de conformidade'
      }
      return [
        appAba === 'com' ? 'Instalado' : 'Não instalado',
        r.m._f.filial,
        r.m.hostname,
        r.m.ip,
        r.m._so,
        versaoCompleta(r.m),
        appSelecionado.e.nome,
        r.ver || '',
        statusConformidade,
      ]
        .map(q)
        .join(';')
    })
    const blob = new Blob(['\ufeff' + [cab.map(q).join(';'), ...linhas].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `aplicativo-${appSelecionado.e.nome.replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const pctParque = (n: number) => Math.round((n / Math.max(maqsComInventario.length, 1)) * 100)
  const pctInventariadas = inventario.length ? Math.round((maqsComInventario.length / inventario.length) * 100) : 0
  const maxVer = appVersoes.length ? appVersoes[0][1] : 1
  const maisRecenteTxt = infoConf ? verTxt(infoConf.maisRecente) : ''

  return (
    <section id="view-apps" className="ap-page">
      {/* ============ INDICADORES ============ */}
      <div className="ap-kpis">
        <div className="ap-kpi">
          <span className="ap-kpi-ico blue"><Icon name="box" size={18} /></span>
          <div>
            <span className="ap-kpi-label">Aplicativos distintos</span>
            <b>{appLista.length}</b>
            <small>no filtro atual</small>
          </div>
        </div>
        <div className="ap-kpi">
          <span className="ap-kpi-ico green"><Icon name="server" size={18} /></span>
          <div>
            <span className="ap-kpi-label">Máquinas com inventário</span>
            <b>{maqsComInventario.length}</b>
            <small>de {inventario.length} cadastradas ({pctInventariadas}%)</small>
          </div>
        </div>
        <div className="ap-kpi">
          <span className={`ap-kpi-ico ${maqsSemInventario > 0 ? 'amber' : 'green'}`}><Icon name="alert" size={18} /></span>
          <div>
            <span className="ap-kpi-label">Sem inventário de apps</span>
            <b>{maqsSemInventario}</b>
            <small>ainda não enviaram a lista</small>
          </div>
        </div>
        <div className="ap-kpi">
          <span className="ap-kpi-ico violet"><Icon name="layers" size={18} /></span>
          <div>
            <span className="ap-kpi-label">Instalações registradas</span>
            <b>{totalInstalacoes}</b>
            <small>somando todos os aplicativos</small>
          </div>
        </div>
      </div>

      {/* ============ CONFORMIDADE DE NAVEGADORES ============ */}
      {navegadoresConformidade.length > 0 && (
        <section className="ap-card">
          <header className="ap-card-head">
            <div className="ap-card-title">
              <span className="ap-badge-ico"><Icon name="globe" size={16} /></span>
              <div>
                <h3>Conformidade de navegadores</h3>
                <p>A versão mais recente é a maior encontrada no parque. Clique em uma linha para ver as máquinas.</p>
              </div>
            </div>
            <button
              type="button"
              className="ap-btn ghost sm"
              onClick={() => setNavAberto((v) => !v)}
              aria-expanded={navAberto}
            >
              {navAberto ? 'Recolher' : 'Expandir'}
              <span className={`ap-chev ${navAberto ? 'open' : ''}`}><Icon name="chevron" size={14} /></span>
            </button>
          </header>

          {navAberto && (
            <div className="ap-scroll-x">
              <table className="ap-comp">
                <thead>
                  <tr>
                    <th>Navegador</th>
                    <th>Versão mais recente</th>
                    <th className="num">Máquinas</th>
                    <th className="num">Atualizadas</th>
                    <th className="num">Desatualizadas</th>
                    <th>Conformidade</th>
                    <th aria-label="Ação" />
                  </tr>
                </thead>
                <tbody>
                  {navegadoresConformidade.map(({ app, info, total }) => {
                    const sel = appSel === app.e.key
                    return (
                      <tr
                        key={app.e.key}
                        className={sel ? 'sel' : ''}
                        onClick={() => selecionarApp(app.e.key)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') selecionarApp(app.e.key)
                        }}
                        tabIndex={0}
                        title={`Ver detalhes de ${app.e.nome}`}
                      >
                        <td><b>{app.e.nome}</b></td>
                        <td>
                          {info ? <span className="ap-ver-pill">v{info.maisRecente}</span> : <span className="ap-muted">—</span>}
                        </td>
                        <td className="num">{total}</td>
                        <td className="num ok">{info ? info.conformes : '—'}</td>
                        <td className={`num ${info && info.desatualizadas > 0 ? 'warn' : 'ok'}`}>
                          {info ? info.desatualizadas : '—'}
                        </td>
                        <td>
                          {info ? (
                            <div className="ap-meter" title={`${info.taxa}% em conformidade`}>
                              <span className="ap-meter-bar"><i className={info.taxa >= 90 ? 'ok' : info.taxa >= 60 ? 'mid' : 'low'} style={{ width: `${info.taxa}%` }} /></span>
                              <b>{info.taxa}%</b>
                            </div>
                          ) : (
                            <span className="ap-muted">sem versão informada</span>
                          )}
                        </td>
                        <td className="act">
                          {info && info.desatualizadas > 0 ? (
                            <button
                              type="button"
                              className="ap-btn warn sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                selecionarApp(app.e.key, 'outdated')
                              }}
                              title={`Listar as ${info.desatualizadas} máquinas desatualizadas de ${app.e.nome}`}
                            >
                              Ver {info.desatualizadas} desatualizadas
                            </button>
                          ) : info ? (
                            <span className="ap-ok-text"><Icon name="check" size={13} /> Conforme</span>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ============ FILTROS ============ */}
      <section className="ap-filters">
        <div className="ap-filters-top">
          <div className="ap-search">
            <Icon name="search" size={15} />
            <input
              id="appBusca"
              value={appBusca}
              onChange={(e) => {
                setAppBusca(e.target.value)
                setAppLimit(100)
              }}
              placeholder="Buscar aplicativo ou pacote (ex.: chrome, firefox, zabbix, java...)"
              aria-label="Buscar aplicativo ou pacote"
            />
            {appBusca && (
              <button type="button" className="ap-clear" onClick={() => setAppBusca('')} aria-label="Limpar busca">
                <Icon name="x" size={13} />
              </button>
            )}
          </div>

          <div className="ap-seg" role="group" aria-label="Categoria">
            {CATEGORIAS.map(([id, label]) => (
              <button
                key={id || 'todas'}
                type="button"
                className={appCat === id ? 'on' : ''}
                onClick={() => {
                  setAppCat(id)
                  setAppLimit(100)
                }}
              >
                {label} <span>{catCounts[id] || 0}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="ap-filters-bottom">
          <label className="ap-sel">
            <span>Plataforma</span>
            <select
              id="appPlat"
              value={appPlat}
              onChange={(e) => {
                setAppPlat(e.target.value)
                setAppSo('')
                setAppLimit(100)
              }}
            >
              <option value="">Linux e Windows</option>
              <option value="Linux">Linux</option>
              <option value="Windows">Windows</option>
            </select>
          </label>

          <label className="ap-sel">
            <span>Sistema / distro</span>
            <select
              id="appSo"
              value={appSo}
              onChange={(e) => {
                setAppSo(e.target.value)
                setAppLimit(100)
              }}
            >
              <option value="">Todos os sistemas</option>
              {soListaDisponiveis.map((so) => (
                <option key={so} value={so}>{so}</option>
              ))}
            </select>
          </label>

          <label className="ap-sel">
            <span>Origem do pacote</span>
            <select
              id="appOrigem"
              value={appOrigem}
              onChange={(e) => {
                setAppOrigem(e.target.value)
                setAppLimit(100)
              }}
            >
              <option value="">Todas as origens</option>
              {appOrigensDisponiveis.map((org: string) => (
                <option key={org} value={org}>{org}</option>
              ))}
            </select>
          </label>

          {filtrosAtivos && (
            <button type="button" className="ap-link" onClick={limparFiltros}>Limpar filtros</button>
          )}
        </div>
      </section>

      {/* ============ LISTA + DETALHE ============ */}
      <div className="ap-grid">
        {/* Lista de aplicativos */}
        <section className="ap-card ap-list-card">
          <header className="ap-card-head tight">
            <div>
              <h3>Aplicativos</h3>
              <p>{appLista.length} encontrados · ordenados por instalações</p>
            </div>
          </header>

          {appLista.length === 0 ? (
            <div className="ap-empty">Sem dados para os filtros atuais</div>
          ) : (
            <div className="ap-list" role="listbox" aria-label="Aplicativos">
              {appLista.slice(0, 400).map((x) => {
                const isSel = x.e.key === appSel
                const pct = pctParque(x.ms.length)
                return (
                  <button
                    key={x.e.key}
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    className={`ap-app ${isSel ? 'sel' : ''}`}
                    onClick={() => selecionarApp(x.e.key)}
                    title={x.e.nome}
                  >
                    <span className="ap-app-name">{x.e.nome}</span>
                    <span className="ap-app-n">{x.ms.length}</span>
                    <span className="ap-app-meta">
                      <span className={`ap-chip c-${x.e.cat}`}>{x.e.cat}</span>
                      <span className="ap-app-bar"><i style={{ width: `${pct}%` }} /></span>
                      <span className="ap-app-pct">{pct}%</span>
                    </span>
                  </button>
                )
              })}
              {appLista.length > 400 && (
                <div className="ap-empty slim">Mostrando os 400 mais instalados. Use a busca para refinar.</div>
              )}
            </div>
          )}
        </section>

        {/* Detalhe do aplicativo selecionado */}
        <section className="ap-card ap-detail">
          {!appSelecionado ? (
            <div className="ap-empty">Selecione um aplicativo na lista ao lado</div>
          ) : (
            <>
              <header className="ap-det-head">
                <div className="ap-det-title">
                  <h2>{appSelecionado.e.nome}</h2>
                  <span className={`ap-chip c-${appSelecionado.e.cat}`}>{appSelecionado.e.cat}</span>
                  {[...appSelecionado.e.origens].map((o) => (
                    <span key={o} className="ap-chip origin">{o}</span>
                  ))}
                </div>
                <button type="button" className="ap-btn" onClick={exportarAppsCSV}>
                  <Icon name="download" /> Exportar CSV
                </button>
              </header>

              {/* Resumo em 4 colunas iguais */}
              <div className="ap-stats">
                <div className="ap-stat">
                  <span>Instalado em</span>
                  <b>{appSelecionado.ms.length}</b>
                  <small>{pctParque(appSelecionado.ms.length)}% das {maqsComInventario.length} máquinas</small>
                </div>
                <div className="ap-stat">
                  <span>Versões distintas</span>
                  <b>{new Set(appSelecionado.ms.map((x) => verTxt(x.ver))).size}</b>
                  <small>{appVerModo === 'major' ? 'agrupadas pela principal' : 'versão completa'}</small>
                </div>
                <div className="ap-stat">
                  <span>Versão mais recente</span>
                  <b className="mono">{infoConf ? `v${infoConf.maisRecente}` : '—'}</b>
                  <small>{infoConf ? 'maior versão no parque' : 'sem versão informada'}</small>
                </div>
                <div className={`ap-stat ${infoConf && infoConf.desatualizadas > 0 ? 'warn' : infoConf ? 'ok' : ''}`}>
                  <span>Conformidade</span>
                  <b>{infoConf ? `${infoConf.taxa}%` : '—'}</b>
                  <small>
                    {infoConf
                      ? infoConf.desatualizadas > 0
                        ? `${infoConf.desatualizadas} fora de conformidade`
                        : 'todas atualizadas'
                      : 'não avaliada'}
                  </small>
                </div>
              </div>

              {/* Versões instaladas */}
              <div className="ap-sec">
                <div className="ap-sec-head">
                  <div>
                    <h4>Versões instaladas</h4>
                    <small>{appVersoes.length} diferentes. Clique para filtrar a tabela.</small>
                  </div>
                  <div className="ap-sec-tools">
                    <div className="ap-seg sm" role="group" aria-label="Agrupar versões">
                      <button
                        type="button"
                        className={appVerModo === 'full' ? 'on' : ''}
                        onClick={() => { setAppVerModo('full'); setAppVerSel(null); setAppLimit(100) }}
                      >
                        Completa
                      </button>
                      <button
                        type="button"
                        className={appVerModo === 'major' ? 'on' : ''}
                        onClick={() => { setAppVerModo('major'); setAppVerSel(null); setAppLimit(100) }}
                      >
                        Principal
                      </button>
                    </div>
                    <div className="ap-seg sm" role="group" aria-label="Ordenar versões">
                      <button type="button" className={verOrdem === 'qtd' ? 'on' : ''} onClick={() => setVerOrdem('qtd')}>
                        Mais instaladas
                      </button>
                      <button type="button" className={verOrdem === 'versao' ? 'on' : ''} onClick={() => setVerOrdem('versao')}>
                        Mais recentes
                      </button>
                    </div>
                  </div>
                </div>

                <div className="ap-vers">
                  {appVersoes.map(([v, n]) => {
                    const isSelVer = v === appVerSel
                    const ehRecente = !!infoConf && v !== 'Sem versão' && compararVersoes(v, maisRecenteTxt) >= 0
                    const ehAntiga = !!infoConf && v !== 'Sem versão' && compararVersoes(v, maisRecenteTxt) < 0
                    return (
                      <button
                        key={v}
                        type="button"
                        className={`ap-ver ${isSelVer ? 'sel' : ''}`}
                        aria-pressed={isSelVer}
                        onClick={() => {
                          setAppVerSel(isSelVer ? null : v)
                          setAppConformidade('todos')
                          setAppLimit(100)
                        }}
                        title={v}
                      >
                        <span className="ap-ver-name">
                          <span className="mono">{v}</span>
                          {ehRecente && <span className="ap-tag ok">mais recente</span>}
                          {ehAntiga && <span className="ap-tag warn">antiga</span>}
                        </span>
                        <span className="ap-ver-bar"><i className={ehAntiga ? 'old' : ''} style={{ width: `${(n / maxVer) * 100}%` }} /></span>
                        <span className="ap-ver-n">{n}</span>
                        <span className="ap-ver-pct">{Math.round((n / appSelecionado.ms.length) * 100)}%</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Máquinas */}
              <div className="ap-sec">
                <div className="ap-toolbar">
                  <div className="ap-tabs" role="tablist">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={appAba === 'com'}
                      className={appAba === 'com' ? 'on' : ''}
                      onClick={() => { setAppAba('com'); setAppLimit(100) }}
                    >
                      Com o aplicativo <span>{appSelecionado.ms.length}</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={appAba === 'sem'}
                      className={appAba === 'sem' ? 'on' : ''}
                      onClick={() => { setAppAba('sem'); setAppLimit(100) }}
                    >
                      Sem o aplicativo <span>{semLista.length}</span>
                    </button>
                  </div>

                  {appAba === 'com' && infoConf && infoConf.desatualizadas > 0 && (
                    <div className="ap-seg sm" role="group" aria-label="Conformidade">
                      <button type="button" className={appConformidade === 'todos' ? 'on' : ''} onClick={() => { setAppConformidade('todos'); setAppLimit(100) }}>
                        Todas
                      </button>
                      <button type="button" className={`warn ${appConformidade === 'outdated' ? 'on' : ''}`} onClick={() => { setAppConformidade('outdated'); setAppVerSel(null); setAppLimit(100) }}>
                        Fora de conformidade ({infoConf.desatualizadas})
                      </button>
                      <button type="button" className={`ok ${appConformidade === 'latest' ? 'on' : ''}`} onClick={() => { setAppConformidade('latest'); setAppVerSel(null); setAppLimit(100) }}>
                        Mais recente ({infoConf.conformes})
                      </button>
                    </div>
                  )}

                  <span className="ap-count">
                    {appTabelaRows.length} {appTabelaRows.length === 1 ? 'máquina' : 'máquinas'}
                    {appVerSel && appAba === 'com' && <> · versão {appVerSel} <button type="button" className="ap-link" onClick={() => setAppVerSel(null)}>limpar</button></>}
                  </span>
                </div>

                {appTabelaRows.length === 0 ? (
                  <div className="ap-empty slim">Nenhuma máquina neste grupo</div>
                ) : (
                  <>
                    <div className="ap-scroll-x">
                      <table className="ap-table">
                        <thead>
                          <tr>
                            <th>Filial</th>
                            <th>Hostname</th>
                            <th>IP</th>
                            <th>Sistema / distro</th>
                            {appAba === 'com' && <th>Versão</th>}
                            {appAba === 'com' && <th>Pacote(s)</th>}
                            {canUseSsh && <th className="c">SSH</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {appTabelaRows.slice(0, appLimit).map((r) => {
                            const distroOuSo = versaoCompleta(r.m) || r.m._so
                            const ehOutdated = !!(infoConf && r.ver && compararVersoes(r.ver, infoConf.maisRecente) < 0)
                            const ehLatest = !!(infoConf && r.ver && compararVersoes(r.ver, infoConf.maisRecente) >= 0)
                            return (
                              <tr key={`${r.m.id ?? r.m.hostname}-${r.m.ip ?? ''}`} className={ehOutdated ? 'outdated' : ''}>
                                <td><span className="ap-filial">{r.m._f.filial}</span></td>
                                <td>
                                  <span className="ap-host">
                                    {r.m._so === 'Windows' ? <IcoWin /> : <IcoLnx />}
                                    <a
                                      href="#inv"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        abrirMaquinaNoInventario(r.m.hostname)
                                      }}
                                      title="Ver no Inventário"
                                    >
                                      {r.m.hostname}
                                    </a>
                                  </span>
                                </td>
                                <td className="mono">{r.m.ip || '—'}</td>
                                <td>
                                  <span className={`ap-distro ${r.m._so === 'Linux' ? 'linux' : 'windows'}`} title={distroOuSo}>
                                    {distroOuSo}
                                  </span>
                                </td>
                                {appAba === 'com' && (
                                  <td>
                                    {r.ver ? (
                                      <span className="ap-vercell">
                                        <b className="mono">{r.ver}</b>
                                        {ehOutdated && (
                                          <span className="ap-tag warn" title={`Fora de conformidade. Versão mais nova no parque: ${infoConf?.maisRecente}`}>
                                            Desatualizado
                                          </span>
                                        )}
                                        {ehLatest && (
                                          <span className="ap-tag ok" title="Na versão mais nova presente no parque">
                                            Atual
                                          </span>
                                        )}
                                      </span>
                                    ) : (
                                      <span className="ap-muted">—</span>
                                    )}
                                  </td>
                                )}
                                {appAba === 'com' && (
                                  <td>
                                    {r.pacotes.length > 0 ? (
                                      <span className="ap-pkgs" title={r.pacotes.map((p) => p.pacote).join(', ')}>
                                        {r.pacotes.slice(0, 2).map((p) => (
                                          <code key={p.pacote}>{p.pacote}</code>
                                        ))}
                                        {r.pacotes.length > 2 && <em>+{r.pacotes.length - 2}</em>}
                                      </span>
                                    ) : (
                                      <span className="ap-muted">—</span>
                                    )}
                                  </td>
                                )}
                                {canUseSsh && (
                                  <td className="c">
                                    {isLinuxDevice(r.m) && r.m.ip ? (
                                      <button
                                        type="button"
                                        className="ap-ssh"
                                        onClick={() => handleOpenSsh(r.m)}
                                        title={`Conectar via terminal SSH em ${r.m.hostname} (${r.m.ip})`}
                                      >
                                        <Icon name="terminal" size={13} /> SSH
                                      </button>
                                    ) : (
                                      <span className="ap-muted">—</span>
                                    )}
                                  </td>
                                )}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {appTabelaRows.length > appLimit && (
                      <button type="button" className="ap-btn block" onClick={() => setAppLimit((l) => l + 200)}>
                        Mostrar mais {Math.min(200, appTabelaRows.length - appLimit)} (restam {appTabelaRows.length - appLimit})
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  )
}