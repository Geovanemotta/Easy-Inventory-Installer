import React, { useCallback, useEffect, useMemo, useState } from 'react'
import DonutChart from '../components/DonutChart'
import { IcoLnx, IconCopy, IcoWin } from '../components/Icons'
import {
  confirmarDeviceFirewall,
  solicitarDeviceFirewall,
  updateDevicePatrimonio,
  type AnaliseUsuario,
  type AppItem,
  type HistoryItem,
  type ItemVarLog,
  type PastaUsuario,
  type UnidadeDisco,
} from '../services/api'
import {
  CATS,
  classificar,
  CORES,
  fmtMB,
  ipNum,
  nivelDisco,
  obterStatusConexao,
  ORDEM_TIPO,
  padronizarTamanho,
  tamanhoMB,
  TIPOS,
  versaoCompleta,
  type EnrichedMachine,
} from '../services/inventoryHelpers'

type FilialOption = {
  filial: string
  tipo: string
  num: number
  n: number
}

type InventoryPageProps = {
  inventario: EnrichedMachine[]
  filiaisOpcoes?: FilialOption[]
  isSuperAdmin: boolean
  userRoles?: string[]
  loading: boolean
  historicoMap: Record<number, HistoryItem[]>
  loadingHistorico: Record<number, boolean>
  onLoadHistorico: (deviceId: number) => Promise<void>
  onClearAlert: (deviceId: number) => Promise<void>
  onRequestDelete: (device: EnrichedMachine) => void
  copiarTexto: (texto: string) => Promise<void>
  inventoryTarget?: string | null
  onClearTarget?: () => void
  onUpdateDevice?: (updated: Partial<EnrichedMachine> & { id: number }) => void
  showToast?: (msg: string) => void
}

export default function InventoryPage({
  inventario,
  isSuperAdmin,
  userRoles,
  loading,
  historicoMap,
  loadingHistorico,
  onLoadHistorico,
  onClearAlert,
  onRequestDelete,
  copiarTexto,
  inventoryTarget,
  onClearTarget,
  onUpdateDevice,
  showToast,
}: InventoryPageProps) {
  const canManage = Boolean(isSuperAdmin || userRoles?.includes('admin'))
  const isOperadorMatriz = Boolean(userRoles?.includes('operador_matriz'))
  const canRequestFirewall = canManage || isOperadorMatriz
  const canConfirmFirewall = canManage

  // Filtros internos do inventário
  const [tipoAtivo, setTipoAtivo] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [selectedFilial, setSelectedFilial] = useState<string>('')
  const [selectedPlataforma, setSelectedPlataforma] = useState<string>('')
  const [selectedVersao, setSelectedVersao] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [selectedDisco, setSelectedDisco] = useState<string>('')
  const [filtroAlerta, setFiltroAlerta] = useState<boolean>(false)
  const [filtroInativas, setFiltroInativas] = useState<boolean>(false)
  const [filtroFirewall, setFiltroFirewall] = useState<'' | 'pendente'>('')
  const [ordem, setOrdem] = useState<string>('filial')
  const [sortDir, setSortDir] = useState<number>(1)
  const [porPagina, setPorPagina] = useState<number>(50)
  const [paginaAtual, setPaginaAtual] = useState<number>(1)
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set())

  // Estado para patrimônio e ações de firewall
  const [patrimonioInputs, setPatrimonioInputs] = useState<Record<number, string>>({})
  const [salvandoPatrimonio, setSalvandoPatrimonio] = useState<Record<number, boolean>>({})
  const [solicitandoFirewall, setSolicitandoFirewall] = useState<Record<number, boolean>>({})
  const [confirmandoFirewall, setConfirmandoFirewall] = useState<Record<number, boolean>>({})

  async function handleSalvarPatrimonio(item: EnrichedMachine) {
    if (!item.id) return
    const rawVal =
      patrimonioInputs[item.id] !== undefined
        ? patrimonioInputs[item.id]
        : item.patrimonio
        ? item.patrimonio.replace(/\D/g, '')
        : ''

    if (!rawVal.trim()) {
      alert('Por favor, informe ao menos os números do patrimônio.')
      return
    }

    const token = localStorage.getItem('access_token')
    if (!token) return

    setSalvandoPatrimonio((prev) => ({ ...prev, [item.id!]: true }))
    try {
      const res = await updateDevicePatrimonio(token, item.id, rawVal.trim())
      onUpdateDevice?.({ id: item.id, patrimonio: res.patrimonio })
      showToast?.(`Patrimônio salvo: ${res.patrimonio}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      alert(msg)
    } finally {
      setSalvandoPatrimonio((prev) => ({ ...prev, [item.id!]: false }))
    }
  }

  async function handleSolicitarFirewall(item: EnrichedMachine) {
    if (!item.id) return
    const token = localStorage.getItem('access_token')
    if (!token) return

    const rawVal =
      patrimonioInputs[item.id] !== undefined
        ? patrimonioInputs[item.id]
        : item.patrimonio
        ? item.patrimonio.replace(/\D/g, '')
        : ''

    setSolicitandoFirewall((prev) => ({ ...prev, [item.id!]: true }))
    try {
      const res = await solicitarDeviceFirewall(token, item.id, rawVal.trim() || undefined)
      onUpdateDevice?.({
        id: item.id,
        firewall_status: 'pendente',
        patrimonio: rawVal.trim() ? `pat.${rawVal.trim()}` : item.patrimonio,
        firewall_solicitado_em: new Date().toISOString(),
      })
      showToast?.(res.message || 'Máquina marcada para homologação no Firewall!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      alert(msg)
    } finally {
      setSolicitandoFirewall((prev) => ({ ...prev, [item.id!]: false }))
    }
  }

  async function handleConfirmarFirewall(item: EnrichedMachine) {
    if (!item.id) return
    const token = localStorage.getItem('access_token')
    if (!token) return

    setConfirmandoFirewall((prev) => ({ ...prev, [item.id!]: true }))
    try {
      const res = await confirmarDeviceFirewall(token, item.id)
      onUpdateDevice?.({
        id: item.id,
        firewall_status: 'confirmado',
        firewall_confirmado_em: new Date().toISOString(),
      })
      showToast?.(res.message || `Máquina ${item.hostname} liberada no Firewall!`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      alert(msg)
    } finally {
      setConfirmandoFirewall((prev) => ({ ...prev, [item.id!]: false }))
    }
  }

  function limparFiltros() {
    setTipoAtivo('')
    setSearch('')
    setSelectedFilial('')
    setSelectedPlataforma('')
    setSelectedVersao('')
    setSelectedStatus('')
    setSelectedDisco('')
    setFiltroAlerta(false)
    setFiltroInativas(false)
    setFiltroFirewall('')
    setOrdem('filial')
    setSortDir(1)
    setPaginaAtual(1)
  }

  // Se houver navegação direta de outra página (Relatórios ou Apps)
  useEffect(() => {
    if (inventoryTarget) {
      limparFiltros()
      setSearch(inventoryTarget)
      setExpandedDetails(new Set([inventoryTarget]))
      const matched = inventario.find(
        (m) => m.hostname.toLowerCase() === inventoryTarget.toLowerCase()
      )
      if (matched && matched.id) {
        onLoadHistorico(matched.id)
      }
      onClearTarget?.()
    }
  }, [inventoryTarget, inventario, onLoadHistorico, onClearTarget])

  const totaisTabs = useMemo(() => {
    const res = { '': inventario.length, Loja: 0, Combo: 0, Matriz: 0 }
    inventario.forEach((i: EnrichedMachine) => {
      if (i._f.tipo in res) {
        res[i._f.tipo as keyof typeof res]++
      }
    })
    return res
  }, [inventario])

  const versoesDisponiveis = useMemo(() => {
    return [...new Set(inventario.map(versaoCompleta).filter(Boolean))].sort()
  }, [inventario])

  const passaFiltro = useCallback(
    (
      i: EnrichedMachine,
      comFilial = true,
      ignorar?: {
        versao?: boolean
        status?: boolean
        disco?: boolean
        plataforma?: boolean
      }
    ) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const campos = [
          i.hostname,
          i.ip,
          i._extras.join(' '),
          i.mac,
          i.rustdesk_id,
          i._f.filial,
          i.usuario,
          i.modelo,
          i._so,
        ]
          .join(' ')
          .toLowerCase()
        if (!campos.includes(q)) return false
      }

      if (tipoAtivo && i._f.tipo !== tipoAtivo) return false
      if (!ignorar?.plataforma && selectedPlataforma && i._so !== selectedPlataforma) return false
      if (comFilial && selectedFilial && i._f.filial !== selectedFilial) return false
      if (!ignorar?.versao && selectedVersao && versaoCompleta(i) !== selectedVersao) return false
      if (
        !ignorar?.status &&
        (selectedStatus === 'OUTRO'
          ? i.status === 'OK' || i.status === 'UPGRADE_REQUIRED'
          : selectedStatus && i.status !== selectedStatus)
      )
        return false

      if (
        !ignorar?.disco &&
        (selectedDisco === 'gt75'
          ? !(i._p !== null && i._p > 75)
          : selectedDisco && nivelDisco(i._p) !== selectedDisco)
      )
        return false

      if (filtroAlerta && !i.alerta_hardware) return false
      if (filtroInativas && obterStatusConexao(i.data_coleta).status !== 'offline') return false
      if (filtroFirewall && i.firewall_status !== filtroFirewall) return false

      return true
    },
    [
      search,
      tipoAtivo,
      selectedPlataforma,
      selectedFilial,
      selectedVersao,
      selectedStatus,
      selectedDisco,
      filtroAlerta,
      filtroInativas,
      filtroFirewall,
    ]
  )

  const compareFn = useMemo(() => {
    const txt = (a: unknown, b: unknown) =>
      String(a || '').localeCompare(String(b || ''), 'pt-BR', { numeric: true })
    const porHost = (a: EnrichedMachine, b: EnrichedMachine) => txt(a.hostname, b.hostname)
    const porIp = (a: EnrichedMachine, b: EnrichedMachine) =>
      ipNum(a.ip) === ipNum(b.ip) ? 0 : ipNum(a.ip) < ipNum(b.ip) ? -1 : 1

    return (a: EnrichedMachine, b: EnrichedMachine) => {
      let res = 0
      switch (ordem) {
        case 'hostname':
          res = porHost(a, b)
          break
        case 'ip':
          res = porIp(a, b) || porHost(a, b)
          break
        case 'disco':
          res = (b._p ?? -1) - (a._p ?? -1) || porHost(a, b)
          break
        case 'coleta':
          res = txt(b.data_coleta, a.data_coleta)
          break
        default:
          res =
            (ORDEM_TIPO[a._f.tipo] ?? 99) - (ORDEM_TIPO[b._f.tipo] ?? 99) ||
            a._f.num - b._f.num ||
            porIp(a, b) ||
            porHost(a, b)
          break
      }
      return res * sortDir
    }
  }, [ordem, sortDir])

  const filtrados = useMemo(() => {
    const list = inventario.filter((i: EnrichedMachine) => passaFiltro(i, true))
    list.sort(compareFn)
    return list
  }, [inventario, compareFn, passaFiltro])

  const totL = useMemo(
    () => inventario.filter((i: EnrichedMachine) => i._so === 'Linux').length,
    [inventario]
  )
  const totW = inventario.length - totL
  const fl = useMemo(
    () => filtrados.filter((i: EnrichedMachine) => i._so === 'Linux').length,
    [filtrados]
  )
  const fw = filtrados.length - fl
  const criticoCount = useMemo(
    () =>
      filtrados.filter((i: EnrichedMachine) => nivelDisco(i._p) === 'bad').length,
    [filtrados]
  )

  const totalAlertas = useMemo(
    () => inventario.filter((i: EnrichedMachine) => Boolean(i.alerta_hardware)).length,
    [inventario]
  )

  const inativasCount = useMemo(
    () =>
      inventario.filter((i: EnrichedMachine) => {
        const c = obterStatusConexao(i.data_coleta)
        return c.status === 'offline'
      }).length,
    [inventario]
  )

  const novasFirewallCount = useMemo(
    () =>
      inventario.filter(
        (i: EnrichedMachine) => i.firewall_status === 'pendente'
      ).length,
    [inventario]
  )

  const distroSistema = useMemo(() => {
    const cont: Record<string, number> = {}
    inventario.forEach((i: EnrichedMachine) => {
      if (!passaFiltro(i, true, { versao: true })) return
      const k = versaoCompleta(i) || 'Não informado'
      cont[k] = (cont[k] || 0) + 1
    })
    const ord = Object.entries(cont).sort((a, b) => b[1] - a[1])
    const top: [string, number, string][] = ord
      .slice(0, 6)
      .map(([n, v], k) => [n, v, CORES[k % CORES.length]])
    const resto = ord.slice(6).reduce((s, x) => s + x[1], 0)
    if (resto > 0) {
      top.push(['Outros', resto, CORES[6]])
    }
    return top
  }, [inventario, passaFiltro])

  const totalDistroSistema = useMemo(() => {
    return distroSistema.reduce((s, item) => s + item[1], 0)
  }, [distroSistema])

  const distroStatus = useMemo(() => {
    let ok = 0
    let up = 0
    let ot = 0
    inventario.forEach((i: EnrichedMachine) => {
      if (!passaFiltro(i, true, { status: true })) return
      if (i.status === 'OK') ok++
      else if (i.status === 'UPGRADE_REQUIRED') up++
      else ot++
    })
    const list: [string, number, string][] = []
    if (ok > 0) list.push(['OK', ok, '#16a34a'])
    if (up > 0) list.push(['Upgrade necessário', up, '#f59e0b'])
    if (ot > 0) list.push(['Outro', ot, '#94a3b8'])
    return list
  }, [inventario, passaFiltro])

  const totalDistroStatus = useMemo(() => {
    return distroStatus.reduce((s, item) => s + item[1], 0)
  }, [distroStatus])

  const filiaisOpcoes = useMemo(() => {
    const fm = new Map<
      string,
      { filial: string; tipo: string; num: number; n: number }
    >()
    inventario.forEach((i: EnrichedMachine) => {
      if (!passaFiltro(i, false)) return
      const cur = fm.get(i._f.filial) || {
        filial: i._f.filial,
        tipo: i._f.tipo,
        num: i._f.num,
        n: 0,
      }
      cur.n++
      fm.set(i._f.filial, cur)
    })
    if (selectedFilial && !fm.has(selectedFilial)) {
      const cf = classificar(
        selectedFilial.replace('LOJA-', 'L').replace('COMBO-', 'C') + '-'
      )
      fm.set(selectedFilial, {
        filial: selectedFilial,
        tipo: cf.tipo,
        num: cf.num,
        n: 0,
      })
    }
    return [...fm.values()].sort(
      (a, b) =>
        (ORDEM_TIPO[a.tipo] ?? 99) - (ORDEM_TIPO[b.tipo] ?? 99) ||
        a.num - b.num
    )
  }, [inventario, passaFiltro, selectedFilial])

  const altasDisco = useMemo(() => {
    return inventario
      .filter(
        (i: EnrichedMachine) =>
          passaFiltro(i, true, { disco: true }) &&
          i._p !== null &&
          i._p > 75
      )
      .sort((a: EnrichedMachine, b: EnrichedMachine) => (b._p ?? 0) - (a._p ?? 0))
  }, [inventario, passaFiltro])

  const totalPaginas = Math.ceil(filtrados.length / porPagina) || 1
  const inicio = (paginaAtual - 1) * porPagina
  const fim = Math.min(inicio + porPagina, filtrados.length)
  const itensPagina = useMemo(() => {
    return filtrados.slice(inicio, fim)
  }, [filtrados, inicio, fim])

  function handleSort(col: string) {
    if (ordem === col) {
      setSortDir((d) => -1 * d)
    } else {
      setOrdem(col)
      setSortDir(1)
    }
    setPaginaAtual(1)
  }

  function toggleDetails(hostname: string, deviceId?: number) {
    setExpandedDetails((prev) => {
      const next = new Set(prev)
      if (next.has(hostname)) {
        next.delete(hostname)
      } else {
        next.add(hostname)
        if (deviceId && !historicoMap[deviceId]) {
          onLoadHistorico(deviceId)
        }
      }
      return next
    })
  }

  function exportarInventarioCSV() {
    const cols = [
      'Filial',
      'Plataforma',
      'Hostname',
      'IP',
      'IPs adicionais',
      'MAC',
      'Disco %',
      'Disco usado',
      'Disco total',
      'Sistema',
      'Status',
      'Processador',
      'RAM',
      'RustDesk',
      'Última coleta',
    ]
    const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const linhas = filtrados.map((i: EnrichedMachine) =>
      [
        i._f.filial,
        i._so,
        i.hostname,
        i.ip,
        i._extras.join(' '),
        i.mac,
        i.disco_percentual || i.porcentagem_disco,
        i.disco_usado,
        i.disco_total,
        versaoCompleta(i),
        i.status,
        i.processador,
        i.ram_total,
        i.rustdesk_id,
        i.data_coleta,
      ]
        .map(q)
        .join(';')
    )
    const blob = new Blob(
      ['\ufeff' + [cols.map(q).join(';'), ...linhas].join('\n')],
      { type: 'text/csv;charset=utf-8' }
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventario-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section id="view-inv">
      {/* Stat Cards */}
      <div className="cards">
        <div
          className={`card click ${
            selectedPlataforma === 'Linux' ? 'on' : ''
          }`}
          role="button"
          tabIndex={0}
          title="Clique para filtrar por Linux"
          onClick={() => {
            setSelectedPlataforma((p) => (p === 'Linux' ? '' : 'Linux'))
            setPaginaAtual(1)
          }}
          style={{ '--c': '#3b82f6' } as React.CSSProperties}
        >
          <div className="card-title">
            <IcoLnx /> Máquinas Linux
          </div>
          <div className="card-value">{fl}</div>
          <div className="card-sub">de {totL} cadastradas</div>
        </div>

        <div
          className={`card click ${
            selectedPlataforma === 'Windows' ? 'on' : ''
          }`}
          role="button"
          tabIndex={0}
          title="Clique para filtrar por Windows"
          onClick={() => {
            setSelectedPlataforma((p) =>
              p === 'Windows' ? '' : 'Windows'
            )
            setPaginaAtual(1)
          }}
          style={{ '--c': '#8b5cf6' } as React.CSSProperties}
        >
          <div className="card-title">
            <IcoWin /> Máquinas Windows
          </div>
          <div className="card-value">{fw}</div>
          <div className="card-sub">de {totW} cadastradas</div>
        </div>

        <div
          className={`card click ${filtroAlerta ? 'on' : ''}`}
          role="button"
          tabIndex={0}
          title="Clique para filtrar apenas máquinas com alertas de hardware ou conflito de MAC"
          onClick={() => {
            setFiltroAlerta((f) => !f)
            setPaginaAtual(1)
          }}
          style={{ '--c': '#ef4444' } as React.CSSProperties}
        >
          <div className="card-title">⚠️ Conflitos / Alertas HW</div>
          <div
            className="card-value"
            style={totalAlertas > 0 ? { color: '#dc2626' } : undefined}
          >
            {totalAlertas}
          </div>
          <div className="card-sub">
            {totalAlertas > 0 ? 'Conflito MAC / Troca SSD' : 'Nenhum alerta ativo'}
          </div>
        </div>

        <div
          className={`card click ${filtroInativas ? 'on' : ''}`}
          role="button"
          tabIndex={0}
          title="Clique para filtrar máquinas inativas (sem envio de inventário há mais de 48 horas)"
          onClick={() => {
            setFiltroInativas((f) => !f)
            setPaginaAtual(1)
          }}
          style={{ '--c': '#ea580c' } as React.CSSProperties}
        >
          <div className="card-title">🔴 Máquinas Inativas</div>
          <div
            className="card-value"
            style={inativasCount > 0 ? { color: '#ea580c' } : undefined}
          >
            {inativasCount}
          </div>
          <div className="card-sub">
            {inativasCount > 0 ? 'Sem coleta há mais de 48h' : 'Todas sincronizadas'}
          </div>
        </div>

        <div
          className={`card click ${selectedDisco === 'bad' ? 'on' : ''}`}
          role="button"
          tabIndex={0}
          title="Clique para filtrar por disco crítico"
          onClick={() => {
            setSelectedDisco((d) => (d === 'bad' ? '' : 'bad'))
            setPaginaAtual(1)
          }}
          style={{ '--c': '#dc2626' } as React.CSSProperties}
        >
          <div className="card-title">Disco crítico (filtro)</div>
          <div className="card-value">{criticoCount}</div>
          <div className="card-sub">uso a partir de 85%</div>
        </div>

        <div
          className={`card click ${filtroFirewall === 'pendente' ? 'on' : ''}`}
          role="button"
          tabIndex={0}
          title="Clique para filtrar máquinas novas aguardando liberação no Firewall"
          onClick={() => {
            setFiltroFirewall((f) => (f === 'pendente' ? '' : 'pendente'))
            setPaginaAtual(1)
          }}
          style={{ '--c': '#f59e0b' } as React.CSSProperties}
        >
          <div className="card-title">🛡️ Novas / Firewall</div>
          <div
            className="card-value"
            style={novasFirewallCount > 0 ? { color: '#d97706' } : undefined}
          >
            {novasFirewallCount}
          </div>
          <div className="card-sub">
            {novasFirewallCount > 0 ? 'Aguardando liberação' : 'Nenhuma pendente'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      {(isSuperAdmin || userRoles?.includes('admin') || userRoles?.includes('operador_matriz')) && (
        <div className="tabs">
          {[
            { id: '', label: 'Todas', cor: '#94a3b8' },
            { id: 'Loja', label: 'Lojas', cor: TIPOS.Loja },
            { id: 'Combo', label: 'Combos', cor: TIPOS.Combo },
            { id: 'Matriz', label: 'Matriz', cor: TIPOS.Matriz },
          ].map((t) => (
            <button
              key={t.id}
              className={`tab ${tipoAtivo === t.id ? 'active' : ''}`}
              onClick={() => {
                setTipoAtivo((cur) => (cur === t.id ? '' : t.id))
                setSelectedFilial('')
                setPaginaAtual(1)
              }}
              style={{ '--c': t.cor } as React.CSSProperties}
            >
              <i />
              {t.label}{' '}
              <span>
                {totaisTabs[t.id as keyof typeof totaisTabs] ?? 0}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Interactive Charts Panels */}
      <div className="charts">
        {/* 1) Donut: Distribuição por sistema */}
        <section className="panel">
          <h2>Distribuição por sistema</h2>
          <p>Clique em um item para filtrar</p>
          {totalDistroSistema === 0 ? (
            <div className="empty">Sem dados para os filtros atuais</div>
          ) : (
            <DonutChart
              items={distroSistema}
              total={totalDistroSistema}
              activeItem={selectedVersao}
              onItemClick={(n) => {
                if (n === 'Outros') return
                setSelectedVersao((cur) => (cur === n ? '' : n))
                setPaginaAtual(1)
              }}
            />
          )}
        </section>

        {/* 2) Donut: Status das máquinas */}
        <section className="panel">
          <h2>Status das máquinas</h2>
          <p>Clique em um item para filtrar</p>
          {totalDistroStatus === 0 ? (
            <div className="empty">Sem dados para os filtros atuais</div>
          ) : (
            <DonutChart
              items={distroStatus}
              total={totalDistroStatus}
              modoValor="qtd"
              activeItem={
                selectedStatus === 'OK'
                  ? 'OK'
                  : selectedStatus === 'UPGRADE_REQUIRED'
                  ? 'Upgrade necessário'
                  : selectedStatus === 'OUTRO'
                  ? 'Outro'
                  : ''
              }
              onItemClick={(label) => {
                const code =
                  label === 'OK'
                    ? 'OK'
                    : label === 'Upgrade necessário'
                    ? 'UPGRADE_REQUIRED'
                    : 'OUTRO'
                setSelectedStatus((cur) => (cur === code ? '' : code))
                setPaginaAtual(1)
              }}
            />
          )}
        </section>

        {/* 3) Disco > 75% */}
        <section className="panel">
          <h2>Máquinas com disco acima de 75%</h2>
          <p>
            {altasDisco.length} de {filtrados.length} máquinas acima de
            75%. Clique para filtrar
          </p>
          <div>
            {altasDisco.length === 0 ? (
              <div className="empty">
                Nenhuma máquina acima de 75% de uso
              </div>
            ) : (
              <>
                {altasDisco.slice(0, 7).map((i: EnrichedMachine) => {
                  const p = i._p ?? 0
                  const cor = p >= 85 ? '#dc2626' : '#f59e0b'
                  return (
                    <button
                      key={`${i.id ?? i.hostname}-${i.ip ?? ''}`}
                      className="hb"
                      onClick={() => {
                        setSearch((s) =>
                          s === i.hostname ? '' : i.hostname
                        )
                        setPaginaAtual(1)
                      }}
                      title={i.hostname}
                    >
                      <span
                        className="hb-n"
                        style={{
                          width: '128px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {i.hostname}
                      </span>
                      <span className="hb-t">
                        <span
                          style={{
                            width: `${Math.min(p, 100)}%`,
                            background: cor,
                          }}
                        />
                      </span>
                      <b>{Math.round(p)}%</b>
                    </button>
                  )
                })}
                {altasDisco.length > 7 && (
                  <button
                    className={`btn ${
                      selectedDisco === 'gt75' ? 'primary' : ''
                    }`}
                    style={{ marginTop: '8px', width: '100%' }}
                    onClick={() => {
                      setSelectedDisco((cur) =>
                        cur === 'gt75' ? '' : 'gt75'
                      )
                      setPaginaAtual(1)
                    }}
                  >
                    {selectedDisco === 'gt75'
                      ? 'Limpar filtro de disco > 75%'
                      : `Ver todas as ${altasDisco.length} máquinas (> 75%)`}
                  </button>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      {/* Filters Form */}
      <div className="filters">
        <div className="field search">
          <label htmlFor="search">Pesquisar</label>
          <input
            id="search"
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPaginaAtual(1)
            }}
            placeholder="Hostname, IP, MAC, RustDesk ou filial..."
          />
        </div>

        {(isSuperAdmin || isOperadorMatriz || (filiaisOpcoes && filiaisOpcoes.length > 1)) && (
          <div className="field">
            <label htmlFor="filial">Filial</label>
            <select
              id="filial"
              value={selectedFilial}
              onChange={(e) => {
                setSelectedFilial(e.target.value)
                setPaginaAtual(1)
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
          <label htmlFor="plataforma">Plataforma</label>
          <select
            id="plataforma"
            value={selectedPlataforma}
            onChange={(e) => {
              setSelectedPlataforma(e.target.value)
              setPaginaAtual(1)
            }}
          >
            <option value="">Linux e Windows</option>
            <option value="Linux">Linux</option>
            <option value="Windows">Windows</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="versao">Sistema / versão</label>
          <select
            id="versao"
            value={selectedVersao}
            onChange={(e) => {
              setSelectedVersao(e.target.value)
              setPaginaAtual(1)
            }}
          >
            <option value="">Todas as versões</option>
            {versoesDisponiveis.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="statusFilter">Status</label>
          <select
            id="statusFilter"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value)
              setPaginaAtual(1)
            }}
          >
            <option value="">Todos os status</option>
            <option value="OK">OK</option>
            <option value="UPGRADE_REQUIRED">Upgrade necessário</option>
            <option value="OUTRO">Outro</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="discoFilter">Uso de disco</label>
          <select
            id="discoFilter"
            value={selectedDisco}
            onChange={(e) => {
              setSelectedDisco(e.target.value)
              setPaginaAtual(1)
            }}
          >
            <option value="">Qualquer uso</option>
            <option value="ok">Normal (abaixo de 70%)</option>
            <option value="warn">Atenção (70% a 84%)</option>
            <option value="gt75">Acima de 75%</option>
            <option value="bad">Crítico (85% ou mais)</option>
            <option value="none">Sem dados</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="ordem">Ordenar por</label>
          <select
            id="ordem"
            value={ordem}
            onChange={(e) => {
              setOrdem(e.target.value)
              setSortDir(1)
              setPaginaAtual(1)
            }}
          >
            <option value="filial">Filial</option>
            <option value="hostname">Hostname</option>
            <option value="disco">Uso de disco (maior)</option>
            <option value="ip">IP</option>
            <option value="coleta">Última coleta (recente)</option>
          </select>
        </div>

        {totalAlertas > 0 && (
          <button
            className={`btn ${filtroAlerta ? 'btn-danger' : ''}`}
            onClick={() => {
              setFiltroAlerta((f) => !f)
              setPaginaAtual(1)
            }}
            style={filtroAlerta ? {} : { borderColor: '#ef4444', color: '#dc2626' }}
            title="Filtrar apenas máquinas com alertas de hardware / conflito de MAC"
          >
            ⚠️ {filtroAlerta ? 'Exibindo Alertas' : `Ver Alertas (${totalAlertas})`}
          </button>
        )}

        {inativasCount > 0 && (
          <button
            className={`btn ${filtroInativas ? 'btn-danger' : ''}`}
            onClick={() => {
              setFiltroInativas((f) => !f)
              setPaginaAtual(1)
            }}
            style={
              filtroInativas
                ? { background: '#ea580c', borderColor: '#ea580c', color: '#ffffff' }
                : { borderColor: '#ea580c', color: '#ea580c' }
            }
            title="Filtrar apenas máquinas inativas (sem coleta há mais de 48 horas)"
          >
            🔴 {filtroInativas ? 'Exibindo Inativas' : `Inativas (+48h) (${inativasCount})`}
          </button>
        )}

        <button className="btn" onClick={limparFiltros}>
          Limpar filtros
        </button>
      </div>

      {/* Table Toolbar */}
      <div className="toolbar">
        <div>
          {filtrados.length} de {inventario.length} máquinas
        </div>
        <div
          style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
        >
          <label htmlFor="porPagina">Por página</label>
          <select
            id="porPagina"
            style={{ width: 'auto' }}
            value={porPagina}
            onChange={(e) => {
              setPorPagina(+e.target.value)
              setPaginaAtual(1)
            }}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <button className="btn primary" onClick={exportarInventarioCSV}>
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th
                className="sortable"
                onClick={() => handleSort('filial')}
              >
                Filial
                {ordem === 'filial' && (
                  <span className="dir">
                    {sortDir > 0 ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th
                className="sortable"
                onClick={() => handleSort('hostname')}
              >
                Hostname
                {ordem === 'hostname' && (
                  <span className="dir">
                    {sortDir > 0 ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th
                className="sortable"
                onClick={() => handleSort('ip')}
              >
                IP
                {ordem === 'ip' && (
                  <span className="dir">
                    {sortDir > 0 ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th>MAC Address</th>
              <th
                className="sortable"
                onClick={() => handleSort('disco')}
              >
                Disco
                {ordem === 'disco' && (
                  <span className="dir">
                    {sortDir > 0 ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th>Sistema / Versão</th>
              <th>Status</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {loading && filtrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="loading">
                  Carregando inventário...
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="loading">
                  Nenhuma máquina encontrada. Ajuste ou limpe os filtros.
                </td>
              </tr>
            ) : (
              itensPagina.map((i: EnrichedMachine) => {
                const isExpanded = expandedDetails.has(i.hostname)
                const p = i._p
                const nv = nivelDisco(p)
                const statusCls =
                  i.status === 'OK'
                    ? 'status-ok'
                    : i.status === 'UPGRADE_REQUIRED'
                    ? 'status-upgrade'
                    : 'status-other'
                const statusTxt =
                  i.status === 'OK'
                    ? 'OK'
                    : i.status === 'UPGRADE_REQUIRED'
                    ? 'UPGRADE NECESSÁRIO'
                    : i.status || 'OUTRO'

                return (
                  <React.Fragment key={`${i.id ?? i.hostname}-${i.ip ?? ''}`}>
                    <tr className="row">
                      <td>
                        <span
                          className="filial"
                          style={
                            {
                              '--c': TIPOS[i._f.tipo] || '#94a3b8',
                            } as React.CSSProperties
                          }
                        >
                          {i._f.filial}
                        </span>
                      </td>

                      <td>
                        {(() => {
                          const conexao = obterStatusConexao(i.data_coleta)
                          return (
                            <>
                              <div className="copy-field">
                                <span
                                  className={`status-dot dot-${conexao.status}`}
                                  title={`Comunicação: ${conexao.texto} (Coleta: ${i.data_coleta || 'sem data'})`}
                                />
                                <strong>{i.hostname}</strong>
                                <button
                                  className="copy-button"
                                  onClick={() => copiarTexto(i.hostname)}
                                  title="Copiar hostname"
                                  aria-label="Copiar hostname"
                                >
                                  <IconCopy />
                                </button>
                              </div>
                              {(i.alerta_hardware ||
                                (i.history_count !== undefined && i.history_count > 0) ||
                                conexao.status === 'offline' ||
                                i.firewall_status === 'pendente') && (
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                                  {conexao.status === 'offline' && (
                                    <span
                                      className="badge-offline-hw"
                                      title={`Sem envio de inventário há mais de 48h (Última coleta: ${i.data_coleta || 'sem data'})`}
                                    >
                                      🔴 Inativa (+48h)
                                    </span>
                                  )}
                                  {i.alerta_hardware && (
                                    <span
                                      className="badge-alert-hw"
                                      title={i.alerta_hardware}
                                    >
                                      ⚠️ {i.alerta_hardware.includes('Conflito MAC') ? 'Conflito MAC' : 'Alerta HW'}
                                    </span>
                                  )}
                                  {i.firewall_status === 'pendente' && (
                                    <span
                                      className="badge-firewall-pending"
                                      title={`Máquina nova aguardando cadastro no Firewall. Solicitada por: ${i.firewall_solicitado_por || 'Operador'} ${i.patrimonio ? `(${i.patrimonio})` : ''}`}
                                    >
                                      🟡 Nova / Firewall
                                    </span>
                                  )}
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </td>

                      <td>
                        <div className="copy-field">
                          <span>{i.ip || '-'}</span>
                          {i.ip && (
                            <button
                              className="copy-button"
                              onClick={() => copiarTexto(i.ip!)}
                              title="Copiar IP"
                              aria-label="Copiar IP"
                            >
                              <IconCopy />
                            </button>
                          )}
                          {i._extras.length > 0 && (
                            <span
                              className="ipx"
                              title={`IPs adicionais: ${i._extras.join(', ')}`}
                            >
                              +{i._extras.length}
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="copy-field">
                          <span className="mono">{i.mac || '-'}</span>
                          {i.mac && (
                            <button
                              className="copy-button"
                              onClick={() => copiarTexto(i.mac!)}
                              title="Copiar MAC"
                              aria-label="Copiar MAC"
                            >
                              <IconCopy />
                            </button>
                          )}
                        </div>
                      </td>

                      <td>
                        {p !== null ? (
                          <div className={`disk ${nv}`}>
                            <div className="disk-top">
                              <span>
                                {p !== null
                                  ? `${Math.round(p)}%`
                                  : String(i.disco_percentual || i.porcentagem_disco || '')
                                      .replace(/%+$/, '') + '%'}
                              </span>
                            </div>
                            <div className="disk-bar">
                              <div
                                style={{
                                  width: `${Math.min(p, 100)}%`,
                                }}
                              />
                            </div>
                            {i.disco_usado && i.disco_total && (
                              <span className="disk-subtext">
                                {i.disco_usado} / {i.disco_total}
                              </span>
                            )}
                          </div>
                        ) : i.disco_usado || i.disco_total ? (
                          <span className="disk-subtext">
                            {i.disco_usado} / {i.disco_total}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td>
                        {i._so === 'Windows' ? <IcoWin /> : <IcoLnx />}
                        <span>{versaoCompleta(i) || '-'}</span>
                        {i.windows_release && (
                          <span
                            style={{
                              marginLeft: '6px',
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              verticalAlign: 'middle',
                            }}
                            title={`Versão de lançamento: ${i.windows_release}`}
                          >
                            {i.windows_release}
                          </span>
                        )}
                      </td>

                      <td>
                        <span className={`status ${statusCls}`}>
                          {statusTxt}
                        </span>
                      </td>

                      <td>
                        <button
                          className="details-button"
                          onClick={() => toggleDetails(i.hostname, i.id)}
                        >
                          {isExpanded ? 'Fechar' : 'Detalhes'}
                        </button>
                      </td>
                    </tr>

                    {/* Accordion Row */}
                    {isExpanded && (
                      <tr className="details-row visible">
                        <td colSpan={8}>
                          <div className="details-content">
                            {/* Alerta de Hardware / Conflito de MAC */}
                            {i.alerta_hardware && (
                              <div className="card-alerta-hardware">
                                <div className="alerta-conteudo">
                                  <div className="alerta-titulo">
                                    <span>⚠️</span>
                                    <span>Conflito de Identificação Detectado</span>
                                  </div>
                                  <div className="alerta-desc">
                                    {i.alerta_hardware}
                                    <br />
                                    <small style={{ opacity: 0.85 }}>
                                      Isto ocorre normalmente quando um SSD foi transferido para uma máquina diferente ou quando um novo hostname assumiu o mesmo endereço MAC.
                                    </small>
                                  </div>
                                </div>
                                {canManage && (
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button
                                      type="button"
                                      className="btn-resolve-alert"
                                      onClick={() => i.id && onClearAlert(i.id)}
                                      title="Marcar alerta como resolvido e legitimar este hardware atual"
                                    >
                                      ✓ Resolver Alerta
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-danger"
                                      style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '6px' }}
                                      onClick={() => onRequestDelete(i)}
                                      title="Excluir este registro se a máquina foi substituída definitivamente"
                                    >
                                      🗑️ Excluir Máquina
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="det-layout">
                              {/* Left Column: Specs, Network, Registration, History */}
                              <div>
                                <div className="detail-sec">Status</div>
                                <div className="details-grid">
                                  <div className="detail-item">
                                    <div className="detail-label">
                                      Status do dispositivo
                                    </div>
                                    <div className="detail-value">
                                      <span className={`status ${statusCls}`}>
                                        {statusTxt}
                                      </span>
                                      {i.motivo_upgrade && (
                                        <div
                                          style={{
                                            fontSize: '11px',
                                            color: '#b45309',
                                            marginTop: '4px',
                                          }}
                                        >
                                          {i.motivo_upgrade}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="detail-item">
                                    <div className="detail-label">
                                      Última sincronização
                                    </div>
                                    <div className="detail-value">
                                      {i.data_coleta || 'Não informado'}
                                      {(() => {
                                        const c = obterStatusConexao(i.data_coleta)
                                        return (
                                          <div
                                            style={{
                                              fontSize: '11px',
                                              color: c.cor,
                                              fontWeight: 600,
                                              marginTop: '2px',
                                            }}
                                          >
                                            ● {c.texto}
                                          </div>
                                        )
                                      })()}
                                    </div>
                                  </div>
                                </div>

                                <div className="detail-sec">Sistema</div>
                                <div className="details-grid">
                                  <div className="detail-item">
                                    <div className="detail-label">
                                      Sistema operacional
                                    </div>
                                    <div className="detail-value">
                                      {versaoCompleta(i) || '-'}
                                    </div>
                                  </div>
                                  <div className="detail-item">
                                    <div className="detail-label">
                                      Plataforma
                                    </div>
                                    <div className="detail-value">
                                      {i._so}
                                    </div>
                                  </div>
                                  {(i.build || i.windows_release) && (
                                    <div className="detail-item">
                                      <div className="detail-label">
                                        Build / Versão
                                      </div>
                                      <div
                                        className="detail-value"
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          flexWrap: 'wrap',
                                        }}
                                      >
                                        <span>{i.build || '-'}</span>
                                        {i.windows_release && (
                                          <span
                                            style={{
                                              fontSize: '11px',
                                              fontWeight: 700,
                                              padding: '1px 6px',
                                              borderRadius: '4px',
                                              background: '#eff6ff',
                                              color: '#2563eb',
                                              border: '1px solid #bfdbfe',
                                              display: 'inline-block',
                                              lineHeight: '1.4',
                                            }}
                                            title={`Versão de lançamento: ${i.windows_release}`}
                                          >
                                            {i.windows_release}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  {i.data_coleta && (
                                    <div className="detail-item">
                                      <div className="detail-label">
                                        Data Coleta
                                      </div>
                                      <div className="detail-value">
                                        {i.data_coleta}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="detail-sec">Hardware</div>
                                <div className="details-grid">
                                  <div className="detail-item">
                                    <div className="detail-label">
                                      Processador
                                    </div>
                                    <div className="detail-value">
                                      {i.processador || '-'}
                                    </div>
                                  </div>
                                  <div className="detail-item">
                                    <div className="detail-label">
                                      RAM total
                                    </div>
                                    <div
                                      className="detail-value"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        flexWrap: 'wrap',
                                      }}
                                    >
                                      <span>{i.ram_total || '-'}</span>
                                      {i.ram_tipo && (
                                        <span
                                          style={{
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            padding: '1px 6px',
                                            borderRadius: '4px',
                                            background: '#f1f5f9',
                                            color: '#334155',
                                            border: '1px solid #cbd5e1',
                                            display: 'inline-block',
                                            lineHeight: '1.4',
                                          }}
                                          title={`Tipo de memória: ${i.ram_tipo}`}
                                        >
                                          {i.ram_tipo}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {i.fabricante && (
                                    <div className="detail-item">
                                      <div className="detail-label">
                                        Fabricante
                                      </div>
                                      <div className="detail-value">
                                        {i.fabricante}
                                      </div>
                                    </div>
                                  )}
                                  {i.modelo && (
                                    <div className="detail-item">
                                      <div className="detail-label">
                                        Modelo
                                      </div>
                                      <div className="detail-value">
                                        {i.modelo}
                                      </div>
                                    </div>
                                  )}
                                  {i.serial && (
                                    <div className="detail-item">
                                      <div className="detail-label">
                                        Número de série
                                      </div>
                                      <div className="detail-value mono">
                                        {i.serial}
                                      </div>
                                    </div>
                                  )}
                                  {i.patrimonio && (
                                    <div className="detail-item">
                                      <div className="detail-label">
                                        Número de Patrimônio
                                      </div>
                                      <div
                                        className="detail-value mono"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                      >
                                        <span>{i.patrimonio}</span>
                                        <button
                                          type="button"
                                          className="copy-button"
                                          onClick={() => copiarTexto(i.patrimonio!)}
                                          title="Copiar Patrimônio"
                                          aria-label="Copiar Patrimônio"
                                        >
                                          <IconCopy />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="detail-sec">Rede & Acesso</div>
                                <div className="details-grid">
                                  <div className="detail-item">
                                    <div className="detail-label">
                                      IP Principal
                                    </div>
                                    <div
                                      className="detail-value mono"
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                    >
                                      <span>{i.ip || '-'}</span>
                                      {i.ip && (
                                        <button
                                          type="button"
                                          className="copy-button"
                                          onClick={() => copiarTexto(i.ip!)}
                                          title="Copiar IP"
                                          aria-label="Copiar IP"
                                        >
                                          <IconCopy />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="detail-item">
                                    <div className="detail-label">
                                      MAC Address
                                    </div>
                                    <div
                                      className="detail-value mono"
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                    >
                                      <span>{i.mac || '-'}</span>
                                      {i.mac && (
                                        <button
                                          type="button"
                                          className="copy-button"
                                          onClick={() => copiarTexto(i.mac!)}
                                          title="Copiar MAC"
                                          aria-label="Copiar MAC"
                                        >
                                          <IconCopy />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  {i._extras.length > 0 && (
                                    <div className="detail-item">
                                      <div className="detail-label">
                                        IPs Adicionais
                                      </div>
                                      <div className="detail-value mono">
                                        {i._extras.join(', ')}
                                      </div>
                                    </div>
                                  )}
                                  {i.rustdesk_id && (
                                    <div className="detail-item">
                                      <div className="detail-label">
                                        RustDesk ID
                                      </div>
                                      <div
                                        className="detail-value mono"
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                        }}
                                      >
                                        <span>{i.rustdesk_id}</span>
                                        <button
                                          type="button"
                                          className="copy-button"
                                          onClick={() => copiarTexto(i.rustdesk_id!)}
                                          title="Copiar ID do RustDesk"
                                          aria-label="Copiar ID do RustDesk"
                                        >
                                          <IconCopy />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  {i.dominio && (
                                    <div className="detail-item">
                                      <div className="detail-label">
                                        Domínio
                                      </div>
                                      <div className="detail-value">
                                        {i.dominio}
                                      </div>
                                    </div>
                                  )}
                                  {i.usuario && (
                                     <div className="detail-item">
                                       <div className="detail-label">
                                         Último usuário
                                       </div>
                                       <div className="detail-value">
                                         {i.usuario}
                                       </div>
                                     </div>
                                   )}
                                 </div>

                                 {/* Seção de Patrimônio & Homologação de Firewall */}
                                 <div
                                   className="detail-sec"
                                   style={{
                                     display: 'flex',
                                     alignItems: 'center',
                                     justifyContent: 'space-between',
                                     flexWrap: 'wrap',
                                     gap: '8px',
                                     marginTop: '16px',
                                   }}
                                 >
                                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                     <span>Patrimônio &amp; Homologação de Firewall</span>
                                     {i.firewall_status === 'pendente' && (
                                       <span className="badge-firewall-pending">🟡 Pendente de Firewall</span>
                                     )}
                                     {i.firewall_status === 'confirmado' && (
                                       <span className="badge-firewall-ok">🟢 Firewall Homologado</span>
                                     )}
                                   </div>
                                   <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
                                     Esteira de liberação de máquinas novas na matriz
                                   </small>
                                 </div>

                                 {(() => {
                                   const isLocked = i.firewall_status === 'confirmado' && !canManage
                                   const currentNum =
                                     patrimonioInputs[i.id!] !== undefined
                                       ? patrimonioInputs[i.id!]
                                       : i.patrimonio
                                       ? i.patrimonio.replace(/\D/g, '')
                                       : ''
                                   const isSavingPat = Boolean(salvandoPatrimonio[i.id!])
                                   const isSolicitando = Boolean(solicitandoFirewall[i.id!])
                                   const isConfirmando = Boolean(confirmandoFirewall[i.id!])

                                   return (
                                     <div className="firewall-homolog-card">
                                       <div className="firewall-card-grid">
                                         {/* Coluna 1: Input de Patrimônio */}
                                         <div className="firewall-field-box">
                                           <div className="detail-label" style={{ marginBottom: '6px' }}>
                                             {isLocked ? 'Patrimônio Homologado' : 'Número de Patrimônio'}
                                           </div>
                                           <div className="patrimonio-input-group">
                                             <span className="patrimonio-prefix">pat.</span>
                                             <input
                                               type="text"
                                               className={`patrimonio-input ${isLocked ? 'locked' : ''}`}
                                               placeholder="00000"
                                               maxLength={12}
                                               value={currentNum}
                                               disabled={isLocked || isSavingPat}
                                               onChange={(e) => {
                                                 const digits = e.target.value.replace(/\D/g, '')
                                                 setPatrimonioInputs((prev) => ({
                                                   ...prev,
                                                   [i.id!]: digits,
                                                 }))
                                               }}
                                               onKeyDown={(e) => {
                                                 if (e.key === 'Enter' && !isLocked) {
                                                   handleSalvarPatrimonio(i)
                                                 }
                                               }}
                                             />
                                             {!isLocked && (
                                               <button
                                                 type="button"
                                                 className="btn-save-pat"
                                                 onClick={() => handleSalvarPatrimonio(i)}
                                                 disabled={isSavingPat}
                                                 title="Salvar número de patrimônio"
                                               >
                                                 {isSavingPat ? '...' : 'Salvar'}
                                               </button>
                                             )}
                                              {Boolean(i.patrimonio || currentNum) && (
                                                <button
                                                  type="button"
                                                  className="copy-button"
                                                  style={{ height: '34px', width: '34px', padding: 0 }}
                                                  onClick={() =>
                                                    copiarTexto(
                                                      i.patrimonio || (currentNum ? `pat.${currentNum}` : '')
                                                    )
                                                  }
                                                  title="Copiar Patrimônio"
                                                  aria-label="Copiar Patrimônio"
                                                >
                                                  <IconCopy />
                                                </button>
                                              )}
                                           </div>
                                           {isLocked ? (
                                             <div className="patrimonio-lock-msg">
                                               🔒 Homologado pelo administrador. Edição bloqueada.
                                             </div>
                                           ) : (
                                             <div className="patrimonio-hint">
                                               Digite apenas os números. O prefixo <b>pat.</b> é fixo.
                                             </div>
                                           )}
                                         </div>

                                         {/* Coluna 2: Status e Ações do Firewall */}
                                         <div className="firewall-action-box">
                                           <div className="detail-label" style={{ marginBottom: '6px' }}>
                                             Status do Firewall &amp; Esteira
                                           </div>

                                           <div className="firewall-status-content">
                                             {i.firewall_status === 'pendente' ? (
                                               <div className="firewall-status-detail pending">
                                                 <div className="firewall-status-title">
                                                   🟡 Aguardando Cadastro no Firewall
                                                 </div>
                                                 <div className="firewall-meta">
                                                   {i.firewall_solicitado_por && (
                                                     <span>Solicitado por: <b>{i.firewall_solicitado_por}</b></span>
                                                   )}
                                                   {i.firewall_solicitado_em && (
                                                     <span> em {new Date(i.firewall_solicitado_em).toLocaleString('pt-BR')}</span>
                                                   )}
                                                 </div>
                                               </div>
                                             ) : i.firewall_status === 'confirmado' ? (
                                               <div className="firewall-status-detail confirmed">
                                                 <div className="firewall-status-title">
                                                   🟢 Liberado e Homologado no Firewall
                                                 </div>
                                                 <div className="firewall-meta">
                                                   {i.firewall_confirmado_por && (
                                                     <span>Confirmado por: <b>{i.firewall_confirmado_por}</b></span>
                                                   )}
                                                   {i.firewall_confirmado_em && (
                                                     <span> em {new Date(i.firewall_confirmado_em).toLocaleString('pt-BR')}</span>
                                                   )}
                                                 </div>
                                               </div>
                                             ) : (
                                               <div className="firewall-status-detail regular">
                                                 <div className="firewall-status-title">
                                                   ⚪ Máquina Operacional Regular
                                                 </div>
                                                 <div className="firewall-meta">
                                                   Se esta for uma nova máquina preparada na matriz, solicite a liberação no firewall.
                                                 </div>
                                               </div>
                                             )}

                                             <div className="firewall-btn-actions">
                                               {canRequestFirewall && i.firewall_status !== 'pendente' && (
                                                 <button
                                                   type="button"
                                                   className="btn-solicitar-firewall"
                                                   onClick={() => handleSolicitarFirewall(i)}
                                                   disabled={isSolicitando}
                                                   title="Marcar máquina como nova e enviar para homologação no firewall"
                                                 >
                                                   {isSolicitando ? 'Marcando...' : '🏷️ Marcar para Firewall (Nova)'}
                                                 </button>
                                               )}

                                               {canConfirmFirewall && i.firewall_status === 'pendente' && (
                                                 <button
                                                   type="button"
                                                   className="btn-confirmar-firewall"
                                                   onClick={() => handleConfirmarFirewall(i)}
                                                   disabled={isConfirmando}
                                                   title="Confirmar cadastro no firewall e travar patrimônio"
                                                 >
                                                   {isConfirmando ? 'Confirmando...' : '✓ Confirmar cadastro no Firewall'}
                                                 </button>
                                               )}
                                             </div>
                                           </div>
                                         </div>
                                       </div>
                                     </div>
                                   )
                                 })()}

                                 {/* Change History Timeline */}
                                 <div className="detail-sec">
                                  Histórico de Alterações / Linha do Tempo
                                  <small>Auditoria contínua de hardware, rede e sistema</small>
                                </div>
                                <div className="timeline-container">
                                  {loadingHistorico[i.id!] ? (
                                    <div className="timeline-loading">
                                      <span>Carregando histórico de alterações...</span>
                                    </div>
                                  ) : (() => {
                                    const hList = historicoMap[i.id!] || []
                                    if (hList.length === 0) {
                                      return (
                                        <div className="timeline-empty">
                                          Nenhuma alteração registrada até o momento nesta máquina.
                                        </div>
                                      )
                                    }

                                    return (
                                      <div className="timeline-list">
                                        {hList.map((h) => {
                                          const isAlert = h.campo.includes('ALERTA') || h.campo.includes('TROCA_MAC')
                                          const tagClass = isAlert
                                            ? 'tag-mac-alert'
                                            : h.campo.includes('RAM')
                                            ? 'tag-ram'
                                            : h.campo.includes('DISCO')
                                            ? 'tag-disk'
                                            : ''

                                          let campoLabel = h.campo
                                          if (campoLabel === 'ALERTA_CONFLITO_MAC') campoLabel = '🚨 CONFLITO DE MAC'
                                          else if (campoLabel === 'TROCA_MAC') campoLabel = '⚠️ TROCA DE MAC'
                                          else if (campoLabel === 'ALERTA_RESOLVIDO') campoLabel = '✅ ALERTA RESOLVIDO'
                                          else if (campoLabel === 'RAM_TOTAL') campoLabel = 'MEMÓRIA RAM'
                                          else if (campoLabel === 'RAM_TIPO') campoLabel = 'TIPO DE RAM'
                                          else if (campoLabel === 'CPU_MODELO') campoLabel = 'PROCESSADOR'
                                          else if (campoLabel === 'DISCO_MODELO') campoLabel = 'MODELO DO DISCO'
                                          else if (campoLabel === 'DISCO_TOTAL') campoLabel = 'CAPACIDADE DO DISCO'
                                          else if (campoLabel === 'PLACA_MAE') campoLabel = 'PLACA MÃE'
                                          else if (campoLabel === 'SISTEMA_OPERACIONAL') campoLabel = 'SISTEMA OPERACIONAL'
                                          else if (campoLabel === 'BUILD') campoLabel = 'BUILD DO SO'
                                          else if (campoLabel === 'IP') campoLabel = 'ENDEREÇO IP'
                                          else if (campoLabel === 'RUSTDESK_ID') campoLabel = 'RUSTDESK ID'
                                          else if (campoLabel === 'USUARIO') campoLabel = 'USUÁRIO'
                                          else if (campoLabel === 'DOMINIO') campoLabel = 'DOMÍNIO'

                                          return (
                                            <div
                                              key={h.id}
                                              className={`timeline-item ${isAlert ? 'alert-item' : ''}`}
                                            >
                                              <div className="timeline-item-header">
                                                <span className={`timeline-tag ${tagClass}`}>
                                                  {campoLabel}
                                                </span>
                                                <span className="timeline-date">{h.data_alteracao}</span>
                                              </div>
                                              <div className="timeline-diff">
                                                {h.valor_anterior && (
                                                  <>
                                                    <span className="old-val" title="Valor Anterior">
                                                      {h.valor_anterior}
                                                    </span>
                                                    <span className="arrow">➔</span>
                                                  </>
                                                )}
                                                <span className="new-val" title="Novo Valor Registrado">
                                                  {h.valor_novo}
                                                </span>
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )
                                  })()}
                                </div>
                              </div>

                              {/* Right Column: Disk breakdown & Apps */}
                              <div>
                                <div className="detail-sec">Uso de disco</div>
                                <div className={`cap ${nv}`}>
                                  <div className="cap-bar">
                                    <i
                                      style={{
                                        width: `${p !== null ? Math.min(p, 100) : 0}%`,
                                      }}
                                    />
                                  </div>
                                  <div className="cap-leg">
                                    <span>
                                      <b>{i.disco_usado || '-'}</b> usado
                                      {p !== null ? ` (${Math.round(p)}%)` : ''}
                                    </span>
                                    <span>
                                      <b>{i.disco_livre || '-'}</b> livre
                                    </span>
                                    <span>
                                      <b>{i.disco_total || '-'}</b> total
                                    </span>
                                  </div>
                                </div>

                                {/* Drives & Partitions / Disk Analysis */}
                                {(() => {
                                  const unidadesDisco: UnidadeDisco[] = (() => {
                                    if (!i.analise_disco) return []
                                    if (Array.isArray(i.analise_disco)) return i.analise_disco as UnidadeDisco[]
                                    if (
                                      typeof i.analise_disco === 'object' &&
                                      Array.isArray((i.analise_disco as any).unidades)
                                    ) {
                                      return (i.analise_disco as any).unidades as UnidadeDisco[]
                                    }
                                    return []
                                  })()

                                  const usuariosPastas: AnaliseUsuario[] = (() => {
                                    if (!i.analise_disco || Array.isArray(i.analise_disco)) return []
                                    const an = i.analise_disco as any
                                    if (Array.isArray(an.usuarios)) return an.usuarios as AnaliseUsuario[]
                                    if (Array.isArray(an.top_usuarios)) return an.top_usuarios as AnaliseUsuario[]
                                    return []
                                  })()

                                  const varLogItens: ItemVarLog[] = (() => {
                                    if (!i.analise_disco || Array.isArray(i.analise_disco)) return []
                                    const an = i.analise_disco as any
                                    if (Array.isArray(an.var_log)) return an.var_log as ItemVarLog[]
                                    if (an.var_log && Array.isArray(an.var_log.top_itens)) {
                                      return an.var_log.top_itens as ItemVarLog[]
                                    }
                                    return []
                                  })()

                                  const temAnalise =
                                    unidadesDisco.length > 0 ||
                                    usuariosPastas.length > 0 ||
                                    varLogItens.length > 0

                                  if (!temAnalise) {
                                    return (
                                      <div
                                        className="empty"
                                        style={{ padding: '14px 0', marginTop: '6px' }}
                                      >
                                        Análise de disco ainda não executada nesta máquina
                                      </div>
                                    )
                                  }

                                  return (
                                    <>
                                      {unidadesDisco.length > 0 && (
                                        <>
                                          <div className="detail-sec">Unidades de disco</div>
                                          <div className="details-grid">
                                            {unidadesDisco.map((u: UnidadeDisco, uIdx: number) => {
                                              const nome =
                                                u.ponto_montagem ||
                                                u.montagem ||
                                                u.letra ||
                                                u.device ||
                                                'Disco'
                                              const pctRaw = u.percentual ?? u.percentual_usado
                                              const pctStr =
                                                pctRaw !== undefined && pctRaw !== null
                                                  ? String(pctRaw).replace('%', '').trim()
                                                  : ''
                                              const pctNum = parseFloat(pctStr)

                                              return (
                                                <div key={uIdx} className="detail-item">
                                                  <div
                                                    className="detail-label"
                                                    style={{
                                                      display: 'flex',
                                                      justifyContent: 'space-between',
                                                      alignItems: 'center',
                                                    }}
                                                  >
                                                    <span>
                                                      {nome}
                                                      {u.tipo_fs ? ` (${u.tipo_fs})` : ''}
                                                      {u.rotulo ? ` [${u.rotulo}]` : ''}
                                                    </span>
                                                    {pctStr && (
                                                      <span style={{ fontWeight: 600 }}>
                                                        {pctStr}%
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div
                                                    className="detail-value"
                                                    style={{ fontSize: '12px', marginTop: '2px' }}
                                                  >
                                                    {u.usado
                                                      ? `${u.usado} usados de ${u.total || '-'}`
                                                      : u.total || '-'}
                                                    {u.livre ? ` • ${u.livre} livre` : ''}
                                                  </div>
                                                  {pctStr && !isNaN(pctNum) && (
                                                    <div
                                                      style={{
                                                        height: '4px',
                                                        background: '#e2e8f0',
                                                        borderRadius: '2px',
                                                        overflow: 'hidden',
                                                        marginTop: '6px',
                                                      }}
                                                    >
                                                      <div
                                                        style={{
                                                          width: `${Math.min(
                                                            100,
                                                            Math.max(0, pctNum)
                                                          )}%`,
                                                          height: '100%',
                                                          background:
                                                            pctNum > 90
                                                              ? 'var(--bad)'
                                                              : pctNum > 75
                                                              ? '#f59e0b'
                                                              : 'var(--ok)',
                                                        }}
                                                      />
                                                    </div>
                                                  )}
                                                </div>
                                              )
                                            })}
                                          </div>
                                        </>
                                      )}

                                      {usuariosPastas.length > 0 &&
                                        (() => {
                                          const somaUsuarios = usuariosPastas.reduce(
                                            (t: number, u: AnaliseUsuario) =>
                                              t + tamanhoMB(u.tamanho),
                                            0
                                          )
                                          const maxUsuario = Math.max(
                                            1,
                                            ...usuariosPastas.map(
                                              (u: AnaliseUsuario) =>
                                                tamanhoMB(u.tamanho)
                                            )
                                          )
                                          const discoUsadoMB = tamanhoMB(i.disco_usado)

                                          return (
                                            <>
                                              <div className="detail-sec">
                                                Pastas de usuários
                                                <small>
                                                  {usuariosPastas.length}{' '}
                                                  {usuariosPastas.length === 1
                                                    ? 'usuário soma'
                                                    : 'usuários somam'}{' '}
                                                  {fmtMB(somaUsuarios)}
                                                  {discoUsadoMB > 0
                                                    ? ` (${Math.round(
                                                        (somaUsuarios /
                                                          discoUsadoMB) *
                                                          100
                                                      )}% do disco usado)`
                                                    : ''}
                                                </small>
                                              </div>
                                              {usuariosPastas.map(
                                                (u: AnaliseUsuario, uIdx: number) => {
                                                  const sub = Array.isArray(u.subpastas)
                                                    ? u.subpastas
                                                    : Array.isArray(u.pastas)
                                                    ? u.pastas
                                                    : []
                                                  const maxSub = Math.max(
                                                    1,
                                                    ...sub.map((x: PastaUsuario) =>
                                                      tamanhoMB(x.tamanho)
                                                    )
                                                  )
                                                  const uMB = tamanhoMB(u.tamanho)
                                                  const uPct = Math.min(
                                                    100,
                                                    Math.max(
                                                      0,
                                                      (uMB / maxUsuario) * 100
                                                    )
                                                  )

                                                  return (
                                                    <details key={uIdx} className="usr">
                                                      <summary>
                                                        <span className="u-n">
                                                          {u.usuario}
                                                        </span>
                                                        <span className="u-bar">
                                                          <i
                                                            style={{
                                                              width: `${uPct}%`,
                                                            }}
                                                          />
                                                        </span>
                                                        <b>
                                                          {padronizarTamanho(
                                                            u.tamanho
                                                          )}
                                                        </b>
                                                      </summary>
                                                      {sub.length > 0 && (
                                                        <ul>
                                                          {sub.map(
                                                            (
                                                              x: PastaUsuario,
                                                              sIdx: number
                                                            ) => {
                                                              const xMB = tamanhoMB(
                                                                x.tamanho
                                                              )
                                                              const xPct = Math.min(
                                                                100,
                                                                Math.max(
                                                                  0,
                                                                  (xMB / maxSub) *
                                                                    100
                                                                )
                                                              )
                                                              return (
                                                                <li
                                                                  key={sIdx}
                                                                  title={
                                                                    x.caminho || ''
                                                                  }
                                                                >
                                                                  <span className="u-n">
                                                                    {x.pasta ||
                                                                      x.nome}
                                                                  </span>
                                                                  <span className="u-bar">
                                                                    <i
                                                                      style={{
                                                                        width: `${xPct}%`,
                                                                      }}
                                                                    />
                                                                  </span>
                                                                  <b>
                                                                    {padronizarTamanho(
                                                                      x.tamanho
                                                                    )}
                                                                  </b>
                                                                </li>
                                                              )
                                                            }
                                                          )}
                                                        </ul>
                                                      )}
                                                    </details>
                                                  )
                                                }
                                              )}
                                            </>
                                          )
                                        })()}

                                      {varLogItens.length > 0 &&
                                        (() => {
                                          const somaV = varLogItens.reduce(
                                            (t: number, x: ItemVarLog) =>
                                              t + tamanhoMB(x.tamanho),
                                            0
                                          )
                                          const maxV = Math.max(
                                            1,
                                            ...varLogItens.map((x: ItemVarLog) =>
                                              tamanhoMB(x.tamanho)
                                            )
                                          )
                                          return (
                                            <>
                                              <div className="detail-sec">
                                                Logs do sistema
                                                <small>
                                                  /var/log, maiores itens:{' '}
                                                  {fmtMB(somaV)}
                                                </small>
                                              </div>
                                              <details className="usr">
                                                <summary>
                                                  <span className="u-n">
                                                    Ver itens
                                                  </span>
                                                  <span className="u-bar">
                                                    <i style={{ width: '100%' }} />
                                                  </span>
                                                  <b>{fmtMB(somaV)}</b>
                                                </summary>
                                                <ul>
                                                  {varLogItens.map(
                                                    (x: ItemVarLog, vIdx: number) => {
                                                      const xMB = tamanhoMB(x.tamanho)
                                                      const xPct = Math.min(
                                                        100,
                                                        Math.max(
                                                          0,
                                                          (xMB / maxV) * 100
                                                        )
                                                      )
                                                      return (
                                                        <li
                                                          key={vIdx}
                                                          title={x.caminho || ''}
                                                        >
                                                          <span className="u-n">
                                                            {x.nome || x.pasta}
                                                          </span>
                                                          <span className="u-bar">
                                                            <i
                                                              style={{
                                                                width: `${xPct}%`,
                                                              }}
                                                            />
                                                          </span>
                                                          <b>
                                                            {padronizarTamanho(
                                                              x.tamanho
                                                            )}
                                                          </b>
                                                        </li>
                                                      )
                                                    }
                                                  )}
                                                </ul>
                                              </details>
                                            </>
                                          )
                                        })()}
                                    </>
                                  )
                                })()}

                                {/* Installed Applications */}
                                {(() => {
                                  const grupos = CATS.map(([c, cat]) => [
                                    cat,
                                    Array.isArray(i[c])
                                      ? (i[c] as AppItem[])
                                      : [],
                                  ] as const).filter(
                                    (g) => g[1].length > 0
                                  )

                                  if (grupos.length === 0) return null
                                  const totalApps = grupos.reduce(
                                    (t, g) => t + g[1].length,
                                    0
                                  )
                                  return (
                                    <>
                                      <div className="detail-sec">
                                        Aplicativos instalados
                                        <small>{totalApps} itens</small>
                                      </div>
                                      {grupos.map(([cat, l], gIdx) => (
                                        <details
                                          key={gIdx}
                                          className="usr"
                                        >
                                          <summary>
                                            <span className="u-n">
                                              {cat}s
                                            </span>
                                            <span className="u-bar" />
                                            <b>{l.length}</b>
                                          </summary>
                                          <ul className="app-list">
                                            {l.map((x: AppItem, aIdx: number) => (
                                              <li key={aIdx}>
                                                <span className="u-n">
                                                  {x.nome}
                                                </span>
                                                {x.versao && (
                                                  <span
                                                    style={{
                                                      color: '#64748b',
                                                      fontSize: '11px',
                                                    }}
                                                  >
                                                    {x.versao}
                                                  </span>
                                                )}
                                              </li>
                                            ))}
                                          </ul>
                                        </details>
                                      ))}
                                    </>
                                  )
                                })()}
                              </div>
                            </div>

                            {/* Rodapé da expansão / Canto inferior direito */}
                            {canManage && (
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'flex-end',
                                  marginTop: '16px',
                                  paddingTop: '12px',
                                  borderTop: '1px dashed var(--line, #e2e8f0)',
                                }}
                              >
                                <button
                                  type="button"
                                  className="btn-danger"
                                  style={{
                                    fontSize: '12px',
                                    padding: '7px 15px',
                                    borderRadius: '6px',
                                  }}
                                  onClick={() => onRequestDelete(i)}
                                  title="Excluir máquina do inventário permanentemente"
                                >
                                  🗑️ Excluir Máquina
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        {filtrados.length > 0 && (
          <div className="pagination-container">
            <div>
              Exibindo {inicio + 1}-{fim} de {filtrados.length} máquinas
            </div>

            <div className="pagination-controls">
              <button
                className="page-btn"
                disabled={paginaAtual <= 1}
                onClick={() =>
                  setPaginaAtual((p) => Math.max(1, p - 1))
                }
              >
                Anterior
              </button>

              {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                .filter((p) => {
                  if (p === 1 || p === totalPaginas) return true
                  if (p >= paginaAtual - 1 && p <= paginaAtual + 1)
                    return true
                  return false
                })
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1]
                  const hasEllipsis = prev && p - prev > 1
                  return (
                    <React.Fragment key={p}>
                      {hasEllipsis && (
                        <span style={{ padding: '0 4px' }}>...</span>
                      )}
                      <button
                        className={`page-btn ${
                          paginaAtual === p ? 'active' : ''
                        }`}
                        onClick={() => setPaginaAtual(p)}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  )
                })}

              <button
                className="page-btn"
                disabled={paginaAtual >= totalPaginas}
                onClick={() =>
                  setPaginaAtual((p) => Math.min(totalPaginas, p + 1))
                }
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
