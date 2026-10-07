import { useEffect, useMemo, useState } from 'react'
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
}

export default function AppsPage({
  inventario,
  abrirMaquinaNoInventario,
  onOpenSsh,
}: AppsPageProps) {
  const [appBusca, setAppBusca] = useState<string>('')
  const [appCat, setAppCat] = useState<string>('')
  const [appPlat, setAppPlat] = useState<string>('')
  const [appOrigem, setAppOrigem] = useState<string>('')
  const [appVerModo, setAppVerModo] = useState<'full' | 'major'>('full')
  const [appSel, setAppSel] = useState<string | null>(null)
  const [appVerSel, setAppVerSel] = useState<string | null>(null)
  const [appAba, setAppAba] = useState<'com' | 'sem'>('com')
  const [appLimit, setAppLimit] = useState<number>(100)

  const handleOpenSsh = (m: EnrichedMachine) => {
    if (onOpenSsh) {
      onOpenSsh(m)
    } else {
      abrirTerminalSshPopup(m)
    }
  }

  const { appsMap, origens: appOrigensDisponiveis } = useMemo(() => {
    return construirAppsMap(inventario)
  }, [inventario])

  const maqsComInventario = useMemo(() => {
    return inventario.filter(
      (m: EnrichedMachine) =>
        (!appPlat || m._so === appPlat) &&
        CATS.some((cat) => Array.isArray(m[cat[0]]) && (m[cat[0]] as unknown[]).length > 0)
    )
  }, [inventario, appPlat])

  const maqsSemInventario = useMemo(() => {
    return inventario.filter(
      (m: EnrichedMachine) =>
        (!appPlat || m._so === appPlat) &&
        !CATS.some((cat) => Array.isArray(m[cat[0]]) && (m[cat[0]] as unknown[]).length > 0)
    ).length
  }, [inventario, appPlat])

  const verTxt = (v: string) => {
    v = String(v || '').trim()
    if (!v) return 'Sem versão'
    if (appVerModo === 'major') {
      const m = v.replace(/^\d+:/, '').match(/^\d+/)
      return m ? m[0] : v
    }
    return v
  }

  const appLista = useMemo(() => {
    const q = appBusca.toLowerCase().trim()
    const lista: {
      e: AppMapEntry
      ms: { m: EnrichedMachine; ver: string; pacotes: PacoteItem[] }[]
    }[] = []

    appsMap.forEach((e: AppMapEntry) => {
      if (appCat && e.cat !== appCat) return
      if (appOrigem && !e.origens.has(appOrigem)) return
      if (q && !(e.nome + ' ' + [...e.pks].join(' ')).toLowerCase().includes(q)) return

      const ms = [...e.maq.values()].filter(
        (x) => !appPlat || x.m._so === appPlat
      )
      if (ms.length > 0) {
        lista.push({ e, ms })
      }
    })

    lista.sort(
      (a, b) =>
        b.ms.length - a.ms.length || a.e.nome.localeCompare(b.e.nome, 'pt-BR')
    )
    return lista
  }, [appsMap, appCat, appOrigem, appPlat, appBusca])

  useEffect(() => {
    if (appLista.length > 0) {
      if (!appSel || !appLista.some((x) => x.e.key === appSel)) {
        const pref =
          appLista.find((x) => /chrome/i.test(x.e.nome)) || appLista[0]
        setAppSel(pref.e.key)
        setAppVerSel(null)
        setAppAba('com')
        setAppLimit(100)
      }
    }
  }, [appLista, appSel])

  const appSelecionado = useMemo(() => {
    return appLista.find((x) => x.e.key === appSel)
  }, [appLista, appSel])

  const { appVersoes, appTabelaRows } = useMemo(() => {
    if (!appSelecionado) {
      return { appVersoes: [], appTabelaRows: [] }
    }

    const ms = appSelecionado.ms
    const vc = new Map<string, number>()
    ms.forEach((x) => {
      const k = verTxt(x.ver)
      vc.set(k, (vc.get(k) || 0) + 1)
    })
    const vers = [...vc.entries()].sort((a, b) => b[1] - a[1])

    const cf = (a: EnrichedMachine, b: EnrichedMachine) =>
      (ORDEM_TIPO[a._f.tipo] ?? 99) - (ORDEM_TIPO[b._f.tipo] ?? 99) ||
      a._f.num - b._f.num ||
      ipNum(a.ip) - ipNum(b.ip)

    const set = new Set(ms.map((x) => x.m.hostname))
    const com = ms
      .filter((x) => !appVerSel || verTxt(x.ver) === appVerSel)
      .sort((a, b) => cf(a.m, b.m))

    const sem = maqsComInventario
      .filter((m: EnrichedMachine) => !set.has(m.hostname))
      .sort(cf)
      .map((m: EnrichedMachine) => ({ m, ver: '', pacotes: [] as PacoteItem[] }))

    return {
      appVersoes: vers,
      appTabelaRows: appAba === 'com' ? com : sem,
    }
  }, [appSelecionado, appVerSel, appAba, maqsComInventario, appVerModo])

  function exportarAppsCSV() {
    if (!appSelecionado) return
    const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const cab = [
      'Situação',
      'Filial',
      'Hostname',
      'IP',
      'Plataforma',
      'Sistema',
      'Aplicativo',
      'Versão',
    ]
    const linhas = appTabelaRows.map((r) =>
      [
        appAba === 'com' ? 'Instalado' : 'Não instalado',
        r.m._f.filial,
        r.m.hostname,
        r.m.ip,
        r.m._so,
        versaoCompleta(r.m),
        appSelecionado.e.nome,
        r.ver || '',
      ]
        .map(q)
        .join(';')
    )
    const blob = new Blob(
      ['\ufeff' + [cab.map(q).join(';'), ...linhas].join('\n')],
      { type: 'text/csv;charset=utf-8' }
    )
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `aplicativo-${appSelecionado.e.nome.replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <section id="view-apps">
      {/* App Metric Cards */}
      <div className="cards c4">
        <div
          className="card"
          style={{ '--c': '#2563eb' } as React.CSSProperties}
        >
          <div className="card-title">Aplicativos distintos</div>
          <div className="card-value">{appLista.length}</div>
          <div className="card-sub">no filtro atual</div>
        </div>

        <div
          className="card"
          style={{ '--c': '#16a34a' } as React.CSSProperties}
        >
          <div className="card-title">Máquinas com inventário</div>
          <div className="card-value">{maqsComInventario.length}</div>
          <div className="card-sub">
            de {inventario.length} cadastradas
          </div>
        </div>

        <div
          className="card"
          style={{ '--c': '#f59e0b' } as React.CSSProperties}
        >
          <div className="card-title">Sem inventário de apps</div>
          <div className="card-value">{maqsSemInventario}</div>
          <div className="card-sub">ainda não enviaram a lista</div>
        </div>

        <div
          className="card"
          style={{ '--c': '#7c3aed' } as React.CSSProperties}
        >
          <div className="card-title">Instalações registradas</div>
          <div className="card-value">
            {appLista.reduce((t, x) => t + x.ms.length, 0)}
          </div>
        </div>
      </div>

      {/* App Filters */}
      <div className="relbar">
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="appBusca">Buscar aplicativo ou pacote</label>
          <input
            id="appBusca"
            value={appBusca}
            onChange={(e) => {
              setAppBusca(e.target.value)
              setAppLimit(100)
            }}
            placeholder="Ex.: chrome, firefox, zabbix, java..."
          />
        </div>

        <div className="field">
          <label htmlFor="appCat">Categoria</label>
          <select
            id="appCat"
            value={appCat}
            onChange={(e) => {
              setAppCat(e.target.value)
              setAppLimit(100)
            }}
          >
            <option value="">Todas</option>
            <option value="Aplicativo">Aplicativos</option>
            <option value="Agente">Agentes</option>
            <option value="Runtime">Runtimes</option>
            <option value="Ferramenta">Ferramentas</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="appPlat">Plataforma</label>
          <select
            id="appPlat"
            value={appPlat}
            onChange={(e) => {
              setAppPlat(e.target.value)
              setAppLimit(100)
            }}
          >
            <option value="">Linux e Windows</option>
            <option value="Linux">Linux</option>
            <option value="Windows">Windows</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="appOrigem">Origem</label>
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
              <option key={org} value={org}>
                {org}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="appVerModo">Agrupar versões</label>
          <select
            id="appVerModo"
            value={appVerModo}
            onChange={(e) => {
              setAppVerModo(e.target.value as 'full' | 'major')
              setAppVerSel(null)
              setAppLimit(100)
            }}
          >
            <option value="full">Versão completa</option>
            <option value="major">Versão principal</option>
          </select>
        </div>
      </div>

      {/* 2-Panel Apps Grid */}
      <div className="rel-grid">
        {/* Left Panel: App List */}
        <section className="panel">
          <h2>Aplicativos</h2>
          <p>
            {appLista.length} aplicativos. Clique para ver versões e
            máquinas
          </p>
          {appLista.length === 0 ? (
            <div className="empty">Sem dados para os filtros atuais</div>
          ) : (
            <div className="scroll">
              {appLista.slice(0, 400).map((x, n) => {
                const isSel = x.e.key === appSel
                const pct = Math.round(
                  (x.ms.length /
                    Math.max(maqsComInventario.length, 1)) *
                    100
                )
                return (
                  <button
                    key={n}
                    className={`hb ${isSel ? 'sel' : ''}`}
                    onClick={() => {
                      setAppSel(x.e.key)
                      setAppVerSel(null)
                      setAppAba('com')
                      setAppLimit(100)
                    }}
                    title={x.e.nome}
                  >
                    <span className="hb-n w">
                      {x.e.nome}
                      <small className={`chip c-${x.e.cat}`}>
                        {x.e.cat}
                      </small>
                    </span>
                    <span className="hb-t">
                      <span
                        style={{
                          width: `${pct}%`,
                          background: '#2563eb',
                        }}
                      />
                    </span>
                    <b className="w">
                      {x.ms.length} · {pct}%
                    </b>
                  </button>
                )
              })}
              {appLista.length > 400 && (
                <div className="empty">
                  Mostrando os 400 mais instalados. Use a busca para
                  refinar.
                </div>
              )}
            </div>
          )}
        </section>

        {/* Right Panel: Selected App Details */}
        <section className="panel">
          {!appSelecionado ? (
            <>
              <h2>Detalhes</h2>
              <div className="empty">
                Selecione um aplicativo na lista ao lado
              </div>
            </>
          ) : (
            <>
              <h2>
                {appSelecionado.e.nome}
                <small className={`chip c-${appSelecionado.e.cat}`}>
                  {appSelecionado.e.cat}
                </small>
              </h2>
              <p>
                {appSelecionado.ms.length} de{' '}
                {maqsComInventario.length} máquinas com inventário (
                {Math.round(
                  (appSelecionado.ms.length /
                    Math.max(maqsComInventario.length, 1)) *
                    100
                )}
                %)
                {appSelecionado.e.origens.size > 0
                  ? ` · origem: ${[...appSelecionado.e.origens].join(', ')}`
                  : ''}
              </p>

              <div className="detail-sec" style={{ marginTop: 0 }}>
                Versões instaladas
                <small>
                  {appVersoes.length} diferentes. Clique para filtrar
                </small>
              </div>

              <div className="scroll" style={{ maxHeight: '190px' }}>
                {appVersoes.map(([v, n], k) => {
                  const maxV = appVersoes[0][1]
                  const isSelVer = v === appVerSel
                  return (
                    <button
                      key={k}
                      className={`hb ${isSelVer ? 'sel' : ''}`}
                      onClick={() => {
                        setAppVerSel(isSelVer ? null : v)
                        setAppLimit(100)
                      }}
                      title={v}
                    >
                      <span className="hb-n w">{v}</span>
                      <span className="hb-t">
                        <span
                          style={{
                            width: `${(n / maxV) * 100}%`,
                            background: '#7c3aed',
                          }}
                        />
                      </span>
                      <b className="w">
                        {n} ·{' '}
                        {Math.round(
                          (n / appSelecionado.ms.length) * 100
                        )}
                        %
                      </b>
                    </button>
                  )
                })}
              </div>

              <div className="tabs sm">
                <button
                  className={`tab ${appAba === 'com' ? 'active' : ''}`}
                  onClick={() => {
                    setAppAba('com')
                    setAppLimit(100)
                  }}
                >
                  Com o aplicativo{' '}
                  <span>
                    {
                      appSelecionado.ms.filter(
                        (x) =>
                          !appVerSel || verTxt(x.ver) === appVerSel
                      ).length
                    }
                  </span>
                </button>

                <button
                  className={`tab ${appAba === 'sem' ? 'active' : ''}`}
                  onClick={() => {
                    setAppAba('sem')
                    setAppLimit(100)
                  }}
                >
                  Sem o aplicativo{' '}
                  <span>
                    {Math.max(
                      0,
                      maqsComInventario.length -
                        appSelecionado.ms.length
                    )}
                  </span>
                </button>

                <button
                  className="btn"
                  onClick={exportarAppsCSV}
                  style={{ marginLeft: 'auto' }}
                >
                  Exportar CSV
                </button>
              </div>

              {appTabelaRows.length === 0 ? (
                <div className="empty">
                  Nenhuma máquina neste grupo
                </div>
              ) : (
                <>
                  <div className="scroll">
                    <table className="mini">
                      <thead>
                        <tr>
                          <th>Filial</th>
                          <th>Hostname</th>
                          <th>IP</th>
                          <th style={{ width: '70px', textAlign: 'center' }}>SSH</th>
                          <th>Versão</th>
                          <th>Pacote(s)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appTabelaRows.slice(0, appLimit).map((r) => (
                          <tr key={`${r.m.id ?? r.m.hostname}-${r.m.ip ?? ''}`}>
                            <td>{r.m._f.filial}</td>
                            <td>
                              {r.m._so === 'Windows' ? (
                                <IcoWin />
                              ) : (
                                <IcoLnx />
                              )}
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
                            </td>
                            <td>{r.m.ip || '-'}</td>
                            <td style={{ textAlign: 'center' }}>
                              {isLinuxDevice(r.m) && r.m.ip ? (
                                <button
                                  type="button"
                                  className="btn-ssh-table"
                                  onClick={() => handleOpenSsh(r.m)}
                                  title={`Conectar via terminal SSH em ${r.m.hostname} (${r.m.ip})`}
                                >
                                  🖥️ SSH
                                </button>
                              ) : (
                                <span className="ssh-na">—</span>
                              )}
                            </td>
                            <td>
                              {r.ver ? (
                                <b>{r.ver}</b>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>
                                  —
                                </span>
                              )}
                            </td>
                            <td>
                              {r.pacotes.length > 0 ? (
                                <span
                                  title={r.pacotes
                                    .map((p) => p.pacote)
                                    .join(', ')}
                                >
                                  {r.pacotes.map((p) => p.pacote).join(', ')}
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {appTabelaRows.length > appLimit && (
                    <button
                      className="btn"
                      style={{ marginTop: '8px', width: '100%' }}
                      onClick={() => setAppLimit((l) => l + 200)}
                    >
                      Mostrar mais{' '}
                      {Math.min(
                        200,
                        appTabelaRows.length - appLimit
                      )}{' '}
                      (restam {appTabelaRows.length - appLimit})
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </section>
      </div>
    </section>
  )
}
