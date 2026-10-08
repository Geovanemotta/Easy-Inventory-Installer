import { useEffect, useMemo, useState } from 'react'
import { IcoLnx, IcoWin } from '../components/Icons'
import {
  CAMPOS,
  ipNum,
  ORDEM_TIPO,
  versaoCompleta,
  type EnrichedMachine,
} from '../services/inventoryHelpers'

type FilialOption = {
  filial: string
  tipo: string
  num: number
  n: number
}

type ReportsPageProps = {
  inventario: EnrichedMachine[]
  filiaisOpcoes: FilialOption[]
  isSuperAdmin: boolean
  abrirMaquinaNoInventario: (hostname: string) => void
}

export default function ReportsPage({
  inventario,
  filiaisOpcoes,
  isSuperAdmin,
  abrirMaquinaNoInventario,
}: ReportsPageProps) {
  const [relCampo, setRelCampo] = useState<string>('processador')
  const [relPlat, setRelPlat] = useState<string>('')
  const [relFilial, setRelFilial] = useState<string>('')
  const [relTexto, setRelTexto] = useState<string>('')
  const [relSelKey, setRelSelKey] = useState<string | null>(null)

  const [relNomeCampo, relFn] = CAMPOS[relCampo] || CAMPOS.processador

  const relLista = useMemo(() => {
    const mapa = new Map<string, EnrichedMachine[]>()
    const txt = relTexto.toLowerCase().trim()

    inventario.forEach((i: EnrichedMachine) => {
      if (relPlat && i._so !== relPlat) return
      if (relFilial && i._f.filial !== relFilial) return
      const k = relFn(i) || 'Não informado'
      if (txt && !k.toLowerCase().includes(txt)) return
      if (!mapa.has(k)) mapa.set(k, [])
      mapa.get(k)!.push(i)
    })

    return [...mapa.entries()].sort(
      (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])
    )
  }, [inventario, relPlat, relFilial, relTexto, relFn])

  useEffect(() => {
    if (relSelKey !== null && !relLista.some(([k]) => k === relSelKey)) {
      setRelSelKey(null)
    }
  }, [relLista, relSelKey])

  const relBaseCount = useMemo(() => {
    return relLista.reduce((acc, [, list]) => acc + list.length, 0)
  }, [relLista])

  const maxRelGrupo = relLista.length > 0 ? relLista[0][1].length : 1

  const relMaquinas = useMemo(() => {
    let list: EnrichedMachine[]
    if (relSelKey !== null) {
      const match = relLista.find(([k]) => k === relSelKey)
      list = match ? match[1] : []
    } else {
      list = relLista.flatMap(([, v]) => v)
    }

    if (relPlat || relFilial) {
      list = list.filter((i) => {
        if (relPlat && i._so !== relPlat) return false
        if (relFilial && i._f.filial !== relFilial) return false
        return true
      })
    }

    const cf = (a: EnrichedMachine, b: EnrichedMachine) =>
      (ORDEM_TIPO[a._f.tipo] ?? 99) - (ORDEM_TIPO[b._f.tipo] ?? 99) ||
      a._f.num - b._f.num ||
      ipNum(a.ip) - ipNum(b.ip)
    return [...list].sort(cf)
  }, [relLista, relSelKey, relPlat, relFilial])

  function exportarRelatorioCSV() {
    const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const linhas = relMaquinas.map((i: EnrichedMachine) =>
      [
        i._f.filial,
        i.hostname,
        i.ip,
        i._so,
        versaoCompleta(i),
        relFn(i) || 'Não informado',
      ]
        .map(q)
        .join(';')
    )
    const blob = new Blob(
      [
        '\ufeff' +
          [
            ['Filial', 'Hostname', 'IP', 'Plataforma', 'Sistema', relNomeCampo]
              .map(q)
              .join(';'),
            ...linhas,
          ].join('\n'),
      ],
      { type: 'text/csv;charset=utf-8' }
    )
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `relatorio-${relCampo}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <section id="view-rel">
      <div className="relbar">
        <div className="field">
          <label htmlFor="relCampo">Agrupar por</label>
          <select
            id="relCampo"
            value={relCampo}
            onChange={(e) => {
              setRelCampo(e.target.value)
              setRelSelKey(null)
            }}
          >
            <option value="processador">Processador</option>
            <option value="modelo">Placa-mãe / modelo</option>
            <option value="ram">Memória RAM</option>
            <option value="ram_tipo">Tipo de memória RAM (DDR4, DDR5...)</option>
            <option value="disco">Tamanho do disco</option>
            <option value="sistema">Sistema operacional</option>
            <option value="windows_release">Versão Release Windows (22H2, 24H2...)</option>
            <option value="fabricante">Fabricante</option>
            <option value="dominio">Domínio</option>
            <option value="filial">Filial</option>
            <option value="status">Status</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="relPlat">Plataforma</label>
          <select
            id="relPlat"
            value={relPlat}
            onChange={(e) => {
              setRelPlat(e.target.value)
              setRelSelKey(null)
            }}
          >
            <option value="">Linux e Windows</option>
            <option value="Linux">Linux</option>
            <option value="Windows">Windows</option>
          </select>
        </div>

        {isSuperAdmin && (
          <div className="field">
            <label htmlFor="relFilial">Filial</label>
            <select
              id="relFilial"
              value={relFilial}
              onChange={(e) => {
                setRelFilial(e.target.value)
                setRelSelKey(null)
              }}
            >
              <option value="">Todas as filiais</option>
              {filiaisOpcoes.map((f) => (
                <option key={f.filial} value={f.filial}>
                  {f.filial} ({f.n})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="field">
          <label htmlFor="relTexto">Valor contém</label>
          <input
            id="relTexto"
            value={relTexto}
            onChange={(e) => {
              setRelTexto(e.target.value)
              setRelSelKey(null)
            }}
            placeholder="Ex.: i3, Gigabyte, 8 GB..."
          />
        </div>

        <button className="btn primary" onClick={exportarRelatorioCSV}>
          Exportar CSV
        </button>
      </div>

      <div className="rel-grid">
        {/* Left Panel: Groups */}
        <section className="panel">
          <h2>Máquinas por {relNomeCampo.toLowerCase()}</h2>
          <p>
            {relLista.length} valores diferentes em {relBaseCount}{' '}
            máquinas.
          </p>
          {relLista.length === 0 ? (
            <div className="empty">Sem dados para os filtros atuais</div>
          ) : (
            <div className="scroll">
              {relLista.map(([k, v]) => {
                const isSel = k === relSelKey
                return (
                  <button
                    key={k}
                    className={`hb ${isSel ? 'sel' : ''}`}
                    onClick={() => setRelSelKey(isSel ? null : k)}
                    title={k}
                    style={
                      isSel
                        ? {
                            borderColor: 'var(--brand)',
                            background: 'var(--brand-soft)',
                          }
                        : undefined
                    }
                  >
                    <span
                      className="hb-n w"
                      style={{ fontWeight: isSel ? 700 : undefined }}
                    >
                      {isSel ? '✓ ' : ''}
                      {k}
                    </span>
                    <span className="hb-t">
                      <span
                        style={{
                          width: `${(v.length / maxRelGrupo) * 100}%`,
                          background: isSel ? 'var(--brand-hover)' : 'var(--brand)',
                        }}
                      />
                    </span>
                    <b className="w">{v.length}</b>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* Right Panel: Machines */}
        <section className="panel">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap',
              marginBottom: '8px',
            }}
          >
            <h2 style={{ margin: 0 }}>
              {relSelKey ? relSelKey : 'Todas as máquinas do resultado'}
            </h2>
            {relSelKey && (
              <button
                className="btn"
                onClick={() => setRelSelKey(null)}
                style={{
                  fontSize: '12px',
                  padding: '4px 10px',
                  height: 'auto',
                }}
                title="Limpar seleção para ver todas as máquinas"
              >
                ✕ Limpar seleção
              </button>
            )}
          </div>
          <p>
            {relMaquinas.length} máquinas
            {relMaquinas.length > 300
              ? ' (mostrando 300)'
              : ''}
          </p>
          {relMaquinas.length === 0 ? (
            <div className="empty">Sem dados para os filtros atuais</div>
          ) : (
            <div className="scroll">
              <table className="mini">
                <thead>
                  <tr>
                    <th>Filial</th>
                    <th>Hostname</th>
                    <th>IP</th>
                    <th>{relNomeCampo}</th>
                  </tr>
                </thead>
                <tbody>
                  {relMaquinas.slice(0, 300).map((i) => (
                    <tr key={`${i.id ?? i.hostname}-${i.ip ?? ''}`}>
                      <td>{i._f.filial}</td>
                      <td>
                        {i._so === 'Windows' ? <IcoWin /> : <IcoLnx />}
                        <a
                          href="#inv"
                          onClick={(e) => {
                            e.preventDefault()
                            abrirMaquinaNoInventario(i.hostname)
                          }}
                          title="Ver no Inventário"
                        >
                          {i.hostname}
                        </a>
                      </td>
                      <td>{i.ip || '-'}</td>
                      <td>{relFn(i) || 'Não informado'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}
