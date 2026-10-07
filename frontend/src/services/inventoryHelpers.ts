import type {
  AppItem,
  PacoteItem,
  RawInventoryItem,
} from './api'

export type FilialInfo = {
  tipo: 'Loja' | 'Combo' | 'Matriz'
  num: number
  filial: string
}

export type EnrichedMachine = RawInventoryItem & {
  _f: FilialInfo
  _p: number | null
  _so: 'Windows' | 'Linux'
  _extras: string[]
  _motivo?: string
}

export const TIPOS: Record<string, string> = {
  Loja: '#2563eb',
  Combo: '#7c3aed',
  Matriz: '#0f766e',
}

export const ORDEM_TIPO: Record<string, number> = {
  Loja: 0,
  Combo: 1,
  Matriz: 2,
}

export const CORES = [
  '#1d4ed8',
  '#7c3aed',
  '#0f766e',
  '#0ea5e9',
  '#f59e0b',
  '#db2777',
  '#94a3b8',
]

export const CATS: [keyof RawInventoryItem, string][] = [
  ['aplicativos', 'Aplicativo'],
  ['agentes', 'Agente'],
  ['runtimes', 'Runtime'],
  ['ferramentas', 'Ferramenta'],
]

export function classificar(hostname?: string | null): FilialInfo {
  const h = String(hostname || '').trim().toUpperCase()
  const mLoja = h.match(/^(?:LJ|L)(\d{1,2})[-_]/)
  if (mLoja && +mLoja[1] > 0) {
    return {
      tipo: 'Loja',
      num: +mLoja[1],
      filial: 'LOJA-' + mLoja[1].padStart(2, '0'),
    }
  }
  const mCombo = h.match(/^(?:CB|C)(\d{1,2})[-_]/)
  if (mCombo && +mCombo[1] > 0) {
    return {
      tipo: 'Combo',
      num: +mCombo[1],
      filial: 'COMBO-' + mCombo[1].padStart(2, '0'),
    }
  }
  return { tipo: 'Matriz', num: 0, filial: 'MATRIZ' }
}

export function pctDisco(i: RawInventoryItem): number | null {
  const v = parseFloat(
    String(i.disco_percentual || i.porcentagem_disco || '').replace(',', '.')
  )
  return isNaN(v) ? null : v
}

export function nivelDisco(p: number | null): 'none' | 'ok' | 'warn' | 'bad' {
  if (p === null) return 'none'
  if (p >= 85) return 'bad'
  if (p >= 70) return 'warn'
  return 'ok'
}

const NOMES_SISTEMA: [RegExp, string][] = [
  [/^k?ubuntu\b/i, 'Kubuntu'],
  [/^zorin(\s*os)?\b/i, 'Zorin OS'],
  [/^(linux\s*)?mint\b/i, 'Linux Mint'],
  [/^debian\b/i, 'Debian'],
  [/^fedora\b/i, 'Fedora'],
  [/^(rhel|red\s*hat)\b/i, 'Red Hat'],
  [/^centos\b/i, 'CentOS'],
  [/^rocky\b/i, 'Rocky Linux'],
  [/^opensuse\b/i, 'openSUSE'],
  [/^arch\b/i, 'Arch Linux'],
]

export function padronizarSistema(txt: string): string {
  txt = String(txt || '').trim().replace(/\s+/g, ' ')
  if (!txt) return ''
  for (const [re, nome] of NOMES_SISTEMA) {
    if (re.test(txt)) return (nome + ' ' + txt.replace(re, '').trim()).trim()
  }
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}

export function padronizarWindows(t: string): string {
  return String(t || '')
    .replace(/microsoft\s*/i, '')
    .replace(/\(r\)|®/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^windows/i, 'Windows')
}

export function versaoCompleta(i: RawInventoryItem): string {
  const w = /windows/i.test(i.versao || '')
    ? i.versao
    : /windows/i.test(i.sistema || '')
    ? i.sistema
    : ''
  return w
    ? padronizarWindows(w)
    : padronizarSistema([i.sistema, i.versao].filter(Boolean).join(' '))
}

export function normalizarMac(m: string | null | undefined): string {
  const bruto = String(m || '').trim()
  const hex = bruto.toLowerCase().replace(/[^0-9a-f]/g, '')
  return hex.length === 12
    ? hex.match(/.{2}/g)?.join(':') ?? bruto
    : bruto.toLowerCase().replace(/-/g, ':')
}

export function listarIps(i: RawInventoryItem): string[] {
  const rawList: (string | null | undefined)[] = [
    i.ip,
    i.ip2,
    i.ip_secundario,
    i.ip_extra,
    Array.isArray(i.ips) ? i.ips.join(',') : i.ips,
  ]
  const bruto = rawList.filter(Boolean) as string[]
  return [...new Set(bruto.join(',').split(/[,;|\s]+/).filter(Boolean))]
}

export function tamanhoMB(t: string | null | undefined): number {
  const m = String(t || '').trim().replace(',', '.').match(/^([\d.]+)\s*([KMGT])?i?B?$/i)
  if (!m) return 0
  const mult: Record<string, number> = { K: 1 / 1024, M: 1, G: 1024, T: 1048576 }
  return parseFloat(m[1]) * (mult[(m[2] || 'M').toUpperCase()] ?? 1)
}

export function fmtMB(mb: number): string {
  return mb >= 1024 ? (mb / 1024).toFixed(1) + ' GB' : Math.round(mb) + ' MB'
}

export function padronizarTamanho(t: string | null | undefined): string {
  const m = String(t || '').trim().match(/^([\d.,]+)\s*([KMGT])i?B?$/i)
  return m ? `${m[1].replace(',', '.')} ${m[2].toUpperCase()}B` : String(t || '')
}

export function enriquecer(i: RawInventoryItem): EnrichedMachine {
  const ips = listarIps(i)
  const win = /windows/i.test((i.sistema || '') + ' ' + (i.versao || ''))
  const o: EnrichedMachine = {
    ...i,
    _f: classificar(i.hostname),
    _p: pctDisco(i),
    _so: win ? 'Windows' : 'Linux',
    mac: normalizarMac(i.mac),
    ip: ips[0] || '',
    _extras: ips.slice(1),
  }

  if (o.ram_total) o.ram_total = padronizarTamanho(o.ram_total)
  if (o.disco_total) o.disco_total = padronizarTamanho(o.disco_total)
  if (o.disco_usado) o.disco_usado = padronizarTamanho(o.disco_usado)
  if (o.disco_livre) o.disco_livre = padronizarTamanho(o.disco_livre)

  if (win && /windows\s*10\b/i.test(i.versao || i.sistema || '')) {
    o.status = 'UPGRADE_REQUIRED'
    o._motivo = 'Windows 10: migrar para Windows 11'
  }
  return o
}

export function isLinuxDevice(m?: { _so?: string; sistema?: string | null } | null): boolean {
  if (!m) return false
  if (m._so === 'Linux') return true
  const s = String(m.sistema || '').toLowerCase()
  return !s.includes('windows')
}

export type AppMapEntry = {
  key: string
  nome: string
  cat: string
  origens: Set<string>
  pks: Set<string>
  maq: Map<string, { m: EnrichedMachine; ver: string; pacotes: PacoteItem[] }>
}

export function construirAppsMap(inventario: EnrichedMachine[]) {
  const map = new Map<string, AppMapEntry>()
  const origens = new Set<string>()

  inventario.forEach((m) => {
    CATS.forEach(([campo, cat]) => {
      const itens = m[campo] as AppItem[] | undefined
      if (!Array.isArray(itens)) return
      itens.forEach((a) => {
        const key = cat + '|' + (a.id || a.nome || '')
        let e = map.get(key)
        if (!e) {
          e = {
            key,
            nome: a.nome || a.id || '',
            cat,
            origens: new Set(),
            pks: new Set(),
            maq: new Map(),
          }
          map.set(key, e)
        }
        if (a.origem) {
          e.origens.add(a.origem)
          origens.add(a.origem)
        }
        const pk = a.pacotes || []
        pk.forEach((p) => e!.pks.add(p.pacote))
        e.maq.set(m.hostname, {
          m,
          ver: (pk[0] && pk[0].versao) || '',
          pacotes: pk,
        })
      })
    })
  })

  return { appsMap: map, origens: [...origens].sort() }
}

export type StatusConexao = 'online' | 'alerta' | 'offline'

export type InfoConexao = {
  status: StatusConexao
  cor: string
  texto: string
  label: string
  horas: number | null
}

export function obterStatusConexao(dataStr?: string | null): InfoConexao {
  if (!dataStr) {
    return {
      status: 'offline',
      cor: '#ef4444',
      texto: 'Sem comunicação (+48h)',
      label: 'Inativa (+48h)',
      horas: null,
    }
  }

  const cleanStr = String(dataStr).trim().replace(' ', 'T')
  const timestamp = new Date(cleanStr).getTime()
  if (isNaN(timestamp)) {
    return {
      status: 'offline',
      cor: '#ef4444',
      texto: 'Sem comunicação (+48h)',
      label: 'Inativa (+48h)',
      horas: null,
    }
  }

  const agora = Date.now()
  const diffMs = Math.max(0, agora - timestamp)
  const diffHoras = diffMs / (1000 * 60 * 60)

  if (diffHoras < 24) {
    const h = Math.floor(diffHoras)
    const m = Math.floor((diffHoras - h) * 60)
    const tempoStr = h === 0 ? `${m}m atrás` : `${h}h atrás`
    return {
      status: 'online',
      cor: '#10b981',
      texto: `Ativa (< 24h) - atualizada há ${tempoStr}`,
      label: 'Ativa (< 24h)',
      horas: diffHoras,
    }
  } else if (diffHoras < 48) {
    const h = Math.floor(diffHoras)
    return {
      status: 'alerta',
      cor: '#f59e0b',
      texto: `Atenção (24h-48h) - atualizada há ${h}h atrás`,
      label: 'Atenção (24h-48h)',
      horas: diffHoras,
    }
  } else {
    const dias = Math.floor(diffHoras / 24)
    return {
      status: 'offline',
      cor: '#ef4444',
      texto: `Inativa (+48h) - sem envio há ${dias} dia${dias > 1 ? 's' : ''}`,
      label: 'Inativa (+48h)',
      horas: diffHoras,
    }
  }
}

export function ipNum(ip: string | null | undefined): number {
  return (
    String(ip || '')
      .split('.')
      .reduce((t, n) => t * 256 + (+n || 0), 0) || Infinity
  )
}

export const CAMPOS: Record<
  string,
  [string, (i: EnrichedMachine) => string]
> = {
  processador: [
    'Processador',
    (i: EnrichedMachine) =>
      String(i.processador || '')
        .replace(/\((R|TM)\)/gi, '')
        .replace(/\bCPU\b/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
  ],
  modelo: [
    'Placa-mãe / modelo',
    (i: EnrichedMachine) => [i.fabricante, i.modelo].filter(Boolean).join(' '),
  ],
  ram: [
    'Memória RAM',
    (i: EnrichedMachine) =>
      i.ram_total ? Math.round(tamanhoMB(i.ram_total) / 1024) + ' GB' : '',
  ],
  disco: [
    'Tamanho do disco',
    (i: EnrichedMachine) =>
      i.disco_total
        ? '≈ ' +
          Math.round(tamanhoMB(i.disco_total) / 1024 / 10) * 10 +
          ' GB'
        : '',
  ],
  sistema: ['Sistema operacional', versaoCompleta],
  fabricante: ['Fabricante', (i: EnrichedMachine) => i.fabricante || ''],
  dominio: ['Domínio', (i: EnrichedMachine) => i.dominio || ''],
  filial: ['Filial', (i: EnrichedMachine) => i._f.filial],
  status: [
    'Status',
    (i: EnrichedMachine) =>
      i.status === 'OK'
        ? 'OK'
        : i.status === 'UPGRADE_REQUIRED'
        ? 'Upgrade necessário'
        : i.status || 'Outro',
  ],
  ram_tipo: [
    'Tipo de memória RAM',
    (i: EnrichedMachine) => i.ram_tipo || 'Não informado',
  ],
  windows_release: [
    'Versão Release Windows',
    (i: EnrichedMachine) =>
      i.windows_release
        ? `Windows ${i.windows_release}`
        : i._so === 'Windows'
        ? 'Versão anterior'
        : 'Linux',
  ],
}

