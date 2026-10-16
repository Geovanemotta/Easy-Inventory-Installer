import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  bulkDeleteNetworkAssets,
  createNetworkAsset,
  deleteNetworkAsset,
  downloadNetworkAssetTemplate,
  getNetworkAssets,
  getSiteIpRanges,
  getSites,
  importNetworkAssetsCSV,
  pingDirectIp,
  pingNetworkAsset,
  scanNetworkAssetsBatch,
  updateNetworkAsset,
  type ImportResult,
  type NetworkAsset,
  type NetworkAssetInput,
  type Site,
  type SiteIpRange,
} from '../services/api'
import SiteSelect from '../components/SiteSelect'

type NetworkAssetsPageProps = {
  token: string
  isSuperAdmin?: boolean
  userRoles?: string[]
  showToast: (msg: string) => void
}

export const TIPOS_PREDEFINIDOS = [
  'IMPRESSORA',
  'ACESS POINT',
  'SWITCH',
  'BALANÇA',
  'TERMINAL CONSULTA',
  'DESKTOP',
  'RELOGIO PONTO',
  'NOTEBOOK',
  'CENTRAL TELEFONICA',
  'LEITOR BIOMETRICO',
  'TOTEM',
  'COLETOR',
  'TABLET',
  'CELULAR',
  'SMARTPHONE',
  'SMART-BOX',
  'TELEFONE MOVEL',
  'ROTEADOR',
  'VOIP',
  'COFRE ELETRONICO',
  'PDV',
  'CANCELA ESTACIONAMENTO',
  'LEITOR FACIAL',
  'CLIMATIZAÇÃO',
  'FIREWALL',
  'DVR/CFTV',
  'TERMINAL',
  'ESTEIRA',
  'OUTRO',
]

/* ------------------------------------------------------------------ */
/* Tipos auxiliares                                                    */
/* ------------------------------------------------------------------ */
type StatusFiltro = 'todos' | 'online' | 'offline' | 'nao_testado'
type OcupacaoFiltro = 'todos' | 'ocupados' | 'livres' | 'estacoes' | 'ativos'
type Grupo = '' | 'impressora' | 'rede' | 'wifi'
type Ordem = 'padrao' | 'nome' | 'tipo' | 'filial' | 'ip' | 'status' | 'patrimonio'
type Cat =
  | 'printer' | 'switch' | 'router' | 'wifi' | 'cftv' | 'scale' | 'terminal' | 'pc' | 'clock'
  | 'phone' | 'bio' | 'mobile' | 'safe' | 'pdv' | 'barrier' | 'ac' | 'belt' | 'other'

const GRUPOS: Record<Exclude<Grupo, ''>, { label: string; test: (t: string) => boolean }> = {
  impressora: { label: 'Impressoras', test: (t) => t.includes('IMPRESSORA') },
  rede: { label: 'Switches / Roteadores', test: (t) => t.includes('SWITCH') || t.includes('ROTEADOR') },
  wifi: { label: 'Access Points', test: (t) => t.includes('POINT') || /\bAP\b/.test(t) || t.includes('WIFI') },
}

const ICONS = {
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3',
  plus: 'M12 5v14 M5 12h14',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5',
  bolt: 'M13 2L3 14h9l-1 8 10-12h-9z',
  edit: 'M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  trash: 'M3 6h18 M8 6V4h8v2 M19 6l-1 14H6L5 6 M10 11v6 M14 11v6',
  x: 'M18 6L6 18 M6 6l12 12',
  check: 'M20 6L9 17l-5-5',
  alert: 'M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z M12 9v4 M12 17h.01',
  external: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6 M15 3h6v6 M10 14L21 3',
  copy: 'M9 9h11v11H9z M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  pin: 'M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  store: 'M3 9l1-5h16l1 5 M3 9v11h18V9 M3 9h18 M9 20v-6h6v6',
  note: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z M14 3v6h6 M8 13h8 M8 17h6',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16v-4 M12 8h.01',
  chevL: 'M15 18l-6-6 6-6',
  chevR: 'M9 18l6-6-6-6',
  chevronDown: 'M6 9l6 6 6-6',
  chevronUp: 'M18 15l-6-6-6 6',
  sortAsc: 'M12 19V5 M5 12l7-7 7 7',
  sortDesc: 'M12 5v14 M19 12l-7 7-7-7',
  server: 'M2 2h20v8H2z M2 14h20v8H2z M6 6h.01 M6 18h.01',
  hardware: 'M4 4h16v16H4z M9 9h6v6H9z',
  // categorias de equipamento
  printer: 'M6 9V2h12v7 M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2 M6 14h12v8H6z',
  switch: 'M2 8h20v8H2z M6 12h.01 M10 12h.01 M14 12h.01 M18 12h.01',
  router: 'M4 15h16v5H4z M8 17.5h.01 M12 17.5h.01 M12 15V9 M8.5 6.5a5 5 0 0 1 7 0',
  wifi: 'M5 12.5a10 10 0 0 1 14 0 M8.5 16a5 5 0 0 1 7 0 M12 20h.01 M1.5 9a15 15 0 0 1 21 0',
  cftv: 'M23 7l-7 5 7 5z M1 5h15v14H1z',
  scale: 'M12 3v18 M5 21h14 M5 7h14 M5 7l-3 7a3 3 0 0 0 6 0z M19 7l-3 7a3 3 0 0 0 6 0z',
  terminal: 'M2 4h20v12H2z M8 21h8 M12 16v5',
  pc: 'M4 5h16v11H4z M2 20h20',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2',
  phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z',
  bio: 'M12 11v3a14 14 0 0 1-1.5 6 M8 14a4 4 0 0 1 8 0c0 2-.3 3.8-1 5.5 M5 14a7 7 0 0 1 14 0c0 1.5-.1 2.7-.4 4 M4 9a9 9 0 0 1 16 0',
  mobile: 'M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z M12 18h.01',
  safe: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4',
  pdv: 'M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 7H6 M9 21h.01 M18 21h.01',
  barrier: 'M2 14h20 M4 10h16v4H4z M6 14v6',
  ac: 'M12 2v20 M4.9 7l14.2 10 M4.9 17L19.1 7',
  belt: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.9 4.9l2.1 2.1 M17 17l2.1 2.1 M4.9 19.1L7 17 M17 7l2.1-2.1',
  other: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M2 12h20 M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20',
  windows: 'M3 5.5L10.5 4.5V11.5H3V5.5ZM11.5 4.3L21 3V11.5H11.5V4.3ZM3 12.5H10.5V19.5L3 18.5V12.5ZM11.5 12.5H21V21L11.5 19.7V12.5Z',
  linux: 'M12 2C9.5 2 8 4 8 6C8 7.5 7.5 9 6.5 10C5.5 11 5 12.5 5 14C5 17.5 8 21 12 21C16 21 19 17.5 19 14C19 12.5 18.5 11 17.5 10C16.5 9 16 7.5 16 6C16 4 14.5 2 12 2Z',
  lock: 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zm-12 0V7a5 5 0 0 1 10 0v4',
} as const

function Icon({ name, size = 16, className = '' }: { name: keyof typeof ICONS; size?: number; className?: string }) {
  return (
    <svg
      className={`na-ico ${className}`}
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

/* Mesma regra de reconhecimento por palavra-chave que já existia, agora reutilizada em todo o arquivo */
function categoriaDoTipo(tipo: string): Cat {
  const t = (tipo || '').toUpperCase().trim()
  if (t.includes('IMPRESSORA')) return 'printer'
  if (t.includes('SWITCH')) return 'switch'
  if (t.includes('ROTEADOR') || t.includes('FIREWALL')) return 'router'
  if (GRUPOS.wifi.test(t)) return 'wifi'
  if (t.includes('CFTV') || t.includes('DVR') || t.includes('CAMERA')) return 'cftv'
  if (t.includes('BALAN')) return 'scale'
  if (t.includes('TERMINAL') || t.includes('TOTEM')) return 'terminal'
  if (t.includes('DESKTOP') || t.includes('NOTEBOOK')) return 'pc'
  if (t.includes('PONTO')) return 'clock'
  if (t.includes('TELEFON') || t.includes('VOIP')) return 'phone'
  if (t.includes('BIOMETRIC') || t.includes('FACIAL')) return 'bio'
  if (t.includes('COLETOR') || t.includes('TABLET') || t.includes('CELULAR') || t.includes('SMART')) return 'mobile'
  if (t.includes('COFRE')) return 'safe'
  if (t.includes('PDV')) return 'pdv'
  if (t.includes('CANCELA')) return 'barrier'
  if (t.includes('CLIMATIZA')) return 'ac'
  if (t.includes('ESTEIRA')) return 'belt'
  return 'other'
}

function TipoPill({ tipo }: { tipo: string }) {
  const cat = categoriaDoTipo(tipo)
  return (
    <span className={`na-tipo t-${cat}`}>
      <Icon name={cat} size={13} />
      <span>{tipo || '—'}</span>
    </span>
  )
}

/* Filial: C* = combo, MATRIZ/OUTROS = demais, resto = loja (mesma regra da tela de AD) */
type SiteKind = 'loja' | 'combo' | 'outros'
function siteKind(code: string): SiteKind {
  const c = (code || '').toUpperCase()
  if (c === 'MATRIZ' || c === 'OUTROS') return 'outros'
  if (c.startsWith('C')) return 'combo'
  return 'loja'
}

function ipNum(ip?: string | null): number {
  if (!ip) return Infinity
  const parts = ip.trim().split('.')
  if (parts.length !== 4) return Infinity
  let num = 0
  for (const p of parts) {
    const v = parseInt(p, 10)
    if (isNaN(v) || v < 0 || v > 255) return Infinity
    num = (num * 256) + v
  }
  return num
}

function tempoRelativo(valor?: string | null): string {
  if (!valor) return ''
  const d = new Date(valor)
  if (isNaN(d.getTime())) return ''
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'agora'
  const m = Math.floor(s / 60)
  if (m < 60) return `há ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h} h`
  return `há ${Math.floor(h / 24)} d`
}

const ipValido = (v: string) => {
  const p = v.trim().split('.')
  return p.length === 4 && p.every((x) => /^\d{1,3}$/.test(x) && +x <= 255)
}
const macHex = (v: string) => v.toLowerCase().replace(/[^0-9a-f]/g, '')

function Modal({ onClose, size = 'md', children }: { onClose: () => void; size?: 'sm' | 'md'; children: React.ReactNode }) {
  return (
    <div
      className="na-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={`na-modal ${size}`} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  )
}

export function formatarMac(m: string | null | undefined): string {
  if (!m) return ''
  const hex = m.toLowerCase().replace(/[^0-9a-f]/g, '')
  if (hex.length === 12) {
    return hex.match(/.{2}/g)!.join(':')
  }
  return m.replace(/-/g, ':')
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */
export default function NetworkAssetsPage({
  token,
  isSuperAdmin,
  userRoles,
  showToast,
}: NetworkAssetsPageProps) {
  const canManage = Boolean(isSuperAdmin || userRoles?.includes('admin'))

  const [assets, setAssets] = useState<NetworkAsset[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [pingingIp, setPingingIp] = useState<string | null>(null)

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroSite, setFiltroSite] = useState<string>('todos')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>('todos')
  const [filtroGrupo, setFiltroGrupo] = useState<Grupo>('')
  const [filtroOcupacao, setFiltroOcupacao] = useState<OcupacaoFiltro>('todos')
  const [filtroFaixa, setFiltroFaixa] = useState<string>('todas')

  // Faixas de IP (carregadas para consulta e filtros)
  const [faixas, setFaixas] = useState<SiteIpRange[]>([])

  // Linha expandida para detalhes do ativo
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filtros de busca integrada por coluna da tabela
  const [colSearchOpen, setColSearchOpen] = useState<{ [key: string]: boolean }>({})
  const [colBuscaIp, setColBuscaIp] = useState('')
  const [colBuscaNome, setColBuscaNome] = useState('')
  const [colBuscaFilial, setColBuscaFilial] = useState('')
  const [colBuscaTipo, setColBuscaTipo] = useState('')
  const [colBuscaPatrimonio, setColBuscaPatrimonio] = useState('')
  const [colBuscaMac, setColBuscaMac] = useState('')

  // Exibição dos cards detalhados de KPI
  const [showKpiCards, setShowKpiCards] = useState(false)

  function toggleColSearch(col: string) {
    setColSearchOpen((prev) => ({ ...prev, [col]: !prev[col] }))
  }

  function limparBuscasColunas() {
    setColBuscaIp('')
    setColBuscaNome('')
    setColBuscaFilial('')
    setColBuscaTipo('')
    setColBuscaPatrimonio('')
    setColBuscaMac('')
    setColSearchOpen({})
  }

  const temBuscaColunaAtiva = Boolean(
    colBuscaIp || colBuscaNome || colBuscaFilial || colBuscaTipo || colBuscaPatrimonio || colBuscaMac
  )

  // Ordenação e paginação
  const [ordem, setOrdem] = useState<Ordem>('padrao')
  const [dirAsc, setDirAsc] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(50)

  // Modais
  const [modalFormAberto, setModalFormAberto] = useState(false)
  const [assetEditando, setAssetEditando] = useState<NetworkAsset | null>(null)
  const [origemIpLivre, setOrigemIpLivre] = useState(false)
  const [formFaixaOrigem, setFormFaixaOrigem] = useState<string | null>(null)
  const [formSalvarCarregando, setFormSalvarCarregando] = useState(false)

  // Modal Confirmação Varredura em Lote
  const [modalConfirmarScan, setModalConfirmarScan] = useState(false)
  const [scanAlvoCount, setScanAlvoCount] = useState(0)

  // Form State
  const [formNome, setFormNome] = useState('')
  const [formTipo, setFormTipo] = useState('IMPRESSORA')
  const [formSiteId, setFormSiteId] = useState<string>('')
  const [formIp, setFormIp] = useState('')
  const [formMac, setFormMac] = useState('')
  const [formPatrimonio, setFormPatrimonio] = useState('')
  const [formLocalizacao, setFormLocalizacao] = useState('')
  const [formFabricante, setFormFabricante] = useState('')
  const [formModelo, setFormModelo] = useState('')
  const [formNumeroSerie, setFormNumeroSerie] = useState('')
  const [formObservacoes, setFormObservacoes] = useState('')

  // Modal Importação CSV
  const [modalImportAberto, setModalImportAberto] = useState(false)
  const [arquivoCsv, setArquivoCsv] = useState<File | null>(null)
  const [importandoCsv, setImportandoCsv] = useState(false)
  const [resultadoImport, setResultadoImport] = useState<ImportResult | null>(null)
  const [arrastando, setArrastando] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Modal Exclusão Individual
  const [assetParaExcluir, setAssetParaExcluir] = useState<NetworkAsset | null>(null)
  const [excluindoAsset, setExcluindoAsset] = useState(false)

  // Seleção Múltipla & Exclusão em Massa
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set())
  const [modalConfirmarExclusaoLote, setModalConfirmarExclusaoLote] = useState(false)
  const [excluindoLote, setExcluindoLote] = useState(false)
  const checkAllRef = useRef<HTMLInputElement | null>(null)

  // Duplicação Inline
  type InlineDraft = {
    parentId: number
    nome: string
    tipo: string
    site_id: string
    localizacao: string
    ip: string
    mac: string
    patrimonio: string
    fabricante: string
    modelo: string
    numero_serie: string
    observacoes: string
  }
  const [inlineDraft, setInlineDraft] = useState<InlineDraft | null>(null)
  const [salvandoInline, setSalvandoInline] = useState(false)

  // Carregamento inicial de lojas
  useEffect(() => {
    carregarSites()
    carregarFaixas()
  }, [])

  // Sincroniza ativos e faixas de IP quando a filial ou faixa filtrada mudar
  useEffect(() => {
    carregarAtivos()
  }, [filtroSite, filtroFaixa])

  // Reseta seleção de faixa caso ela não pertença à nova filial selecionada
  useEffect(() => {
    if (filtroSite !== 'todos' && filtroSite !== 'sem' && filtroFaixa !== 'todas') {
      const existeNaLoja = faixas.some((f) => String(f.site_id) === filtroSite && String(f.id) === filtroFaixa)
      if (!existeNaLoja) setFiltroFaixa('todas')
    }
  }, [filtroSite, faixas, filtroFaixa])

  // Volta para a primeira página sempre que o resultado muda
  useEffect(() => {
    setPagina(1)
  }, [busca, filtroSite, filtroTipo, filtroStatus, filtroGrupo, filtroOcupacao, filtroFaixa, ordem, dirAsc, porPagina])

  // ESC fecha modal, recolhe detalhes ou cancela rascunho inline
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (inlineDraft && !salvandoInline) setInlineDraft(null)
      else if (modalConfirmarExclusaoLote && !excluindoLote) setModalConfirmarExclusaoLote(false)
      else if (assetParaExcluir && !excluindoAsset) setAssetParaExcluir(null)
      else if (modalConfirmarScan) setModalConfirmarScan(false)
      else if (modalFormAberto && !formSalvarCarregando) setModalFormAberto(false)
      else if (modalImportAberto && !importandoCsv) setModalImportAberto(false)
      else if (expandedId) setExpandedId(null)
      else if (Object.values(colSearchOpen).some(Boolean)) setColSearchOpen({})
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [inlineDraft, salvandoInline, modalConfirmarExclusaoLote, excluindoLote, assetParaExcluir, excluindoAsset, modalConfirmarScan, modalFormAberto, formSalvarCarregando, modalImportAberto, importandoCsv, expandedId, colSearchOpen])

  async function carregarSites() {
    try {
      const data = await getSites(token)
      setSites(data || [])
    } catch (err) {
      console.warn('Falha ao carregar lojas:', err)
    }
  }

  async function carregarAtivos() {
    setLoading(true)
    try {
      const siteIdParam = filtroSite !== 'todos' && filtroSite !== 'sem' ? Number(filtroSite) : undefined
      const faixaIdParam = filtroFaixa !== 'todas' ? Number(filtroFaixa) : undefined
      const data = await getNetworkAssets(token, {
        site_id: siteIdParam,
        faixa_id: faixaIdParam,
      })
      setAssets(data || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      showToast(`Erro ao carregar ativos: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  async function carregarFaixas() {
    try {
      const data = await getSiteIpRanges(token)
      setFaixas(data || [])
    } catch (err) {
      console.warn('Falha ao carregar faixas de IP:', err)
    }
  }

  const faixasDisponiveis = useMemo(() => {
    if (filtroSite === 'sem') return []
    if (filtroSite === 'todos') return faixas
    return faixas.filter((f) => String(f.site_id) === filtroSite)
  }, [faixas, filtroSite])

  /* ---------------- Filtros ---------------- */
  const tipoDe = (a: NetworkAsset) => (a.tipo || '').toUpperCase().trim() || 'SEM TIPO'

  type IgnorarFiltros = {
    status?: boolean
    tipo?: boolean
    site?: boolean
    grupo?: boolean
    ocupacao?: boolean
    faixa?: boolean
  }

  function passa(a: NetworkAsset, ignorar?: IgnorarFiltros): boolean {
    if (!ignorar?.site) {
      if (filtroSite === 'sem') {
        if (a.site_id) return false
      } else if (filtroSite !== 'todos' && String(a.site_id) !== filtroSite) {
        return false
      }
    }
    if (!ignorar?.ocupacao) {
      if (filtroOcupacao === 'ocupados' && a.origem === 'livre') return false
      if (filtroOcupacao === 'livres' && a.origem !== 'livre') return false
      if (filtroOcupacao === 'estacoes' && a.origem !== 'estacao') return false
      if (filtroOcupacao === 'ativos' && a.origem !== 'manual' && a.origem !== 'planilha') return false
    }

    if (!ignorar?.faixa && filtroFaixa !== 'todas') {
      const fObj = faixas.find((f) => String(f.id) === filtroFaixa)
      if (fObj) {
        if (a.faixa_nome && a.faixa_nome !== fObj.nome) return false
        if (!a.faixa_nome && a.ip) {
          const n = ipNum(a.ip)
          const s = ipNum(fObj.ip_inicio)
          const e = ipNum(fObj.ip_fim)
          if (n < s || n > e) return false
        }
      }
    }

    if (!ignorar?.tipo) {
      if (filtroTipo !== 'todos' && tipoDe(a) !== filtroTipo.toUpperCase().trim()) return false
    }
    if (!ignorar?.grupo) {
      if (filtroGrupo && !GRUPOS[filtroGrupo].test((a.tipo || '').toUpperCase())) return false
    }
    if (!ignorar?.status) {
      if (filtroStatus === 'online' && a.status_online !== true) return false
      if (filtroStatus === 'offline' && a.status_online !== false) return false
      if (filtroStatus === 'nao_testado' && a.status_online !== null) return false
    }
    if (busca.trim()) {
      const s = busca.toLowerCase().trim()
      const campos = [a.nome, a.ip, a.mac, a.patrimonio, a.localizacao, a.site_nome, a.site_codigo, a.tipo, a.fabricante, a.modelo, a.numero_serie, a.faixa_nome]
      if (!campos.some((c) => (c || '').toLowerCase().includes(s))) return false
    }

    // Filtros por coluna da tabela
    if (colBuscaIp.trim()) {
      const q = colBuscaIp.toLowerCase().trim()
      if (!((a.ip || '').toLowerCase().includes(q))) return false
    }
    if (colBuscaNome.trim()) {
      const q = colBuscaNome.toLowerCase().trim()
      if (!((a.nome || '').toLowerCase().includes(q))) return false
    }
    if (colBuscaFilial.trim()) {
      const q = colBuscaFilial.toLowerCase().trim()
      const match = [a.site_codigo, a.site_nome, a.localizacao].some((c) => (c || '').toLowerCase().includes(q))
      if (!match) return false
    }
    if (colBuscaTipo.trim()) {
      const q = colBuscaTipo.toLowerCase().trim()
      if (!((a.tipo || '').toLowerCase().includes(q))) return false
    }
    if (colBuscaPatrimonio.trim()) {
      const q = colBuscaPatrimonio.toLowerCase().trim()
      if (!((a.patrimonio || '').toLowerCase().includes(q))) return false
    }
    if (colBuscaMac.trim()) {
      const q = colBuscaMac.toLowerCase().trim().replace(/[^0-9a-f]/g, '')
      const aMacHex = (a.mac || '').toLowerCase().replace(/[^0-9a-f]/g, '')
      if (q && !aMacHex.includes(q)) return false
    }

    return true
  }

  const ativosFiltrados = useMemo(() => {
    const lista = assets.filter((a) => passa(a))
    if (ordem === 'padrao') return lista
    const txt = (x?: string | null, y?: string | null) =>
      (x || '').localeCompare(y || '', 'pt-BR', { numeric: true, sensitivity: 'base' })
    const peso = (a: NetworkAsset) => (a.status_online === true ? 0 : a.status_online === false ? 1 : 2)
    const cmp = (a: NetworkAsset, b: NetworkAsset) => {
      switch (ordem) {
        case 'nome': return txt(a.nome, b.nome)
        case 'tipo': return txt(a.tipo, b.tipo) || txt(a.nome, b.nome)
        case 'filial': return txt(a.site_codigo || a.site_nome, b.site_codigo || b.site_nome) || ipNum(a.ip) - ipNum(b.ip) || 0
        case 'ip': return ipNum(a.ip) === ipNum(b.ip) ? 0 : ipNum(a.ip) < ipNum(b.ip) ? -1 : 1
        case 'status': return peso(a) - peso(b) || (a.tempo_resposta_ms ?? 1e9) - (b.tempo_resposta_ms ?? 1e9)
        case 'patrimonio': return txt(a.patrimonio, b.patrimonio)
        default: return 0
      }
    }
    return [...lista].sort((a, b) => (dirAsc ? 1 : -1) * cmp(a, b))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, filtroSite, filtroTipo, filtroStatus, filtroGrupo, filtroOcupacao, filtroFaixa, faixas, busca, colBuscaIp, colBuscaNome, colBuscaFilial, colBuscaTipo, colBuscaPatrimonio, colBuscaMac, ordem, dirAsc])

  // Contagem por status considerando os demais filtros (para os botões de status)
  const statusCounts = useMemo(() => {
    const base = assets.filter((a) => passa(a, { status: true }))
    return {
      todos: base.length,
      online: base.filter((a) => a.status_online === true).length,
      offline: base.filter((a) => a.status_online === false).length,
      nao_testado: base.filter((a) => a.status_online === null).length,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, filtroSite, filtroTipo, filtroGrupo, busca])

  // Contagem dinâmica por tipo respeitando os demais filtros aplicados (loja selecionada, busca, status)
  const tipoOpcoes = useMemo(() => {
    const base = assets.filter((a) => passa(a, { tipo: true }))
    const m = new Map<string, number>()
    base.forEach((a) => m.set(tipoDe(a), (m.get(tipoDe(a)) || 0) + 1))
    if (filtroTipo !== 'todos' && !m.has(filtroTipo.toUpperCase().trim())) {
      m.set(filtroTipo.toUpperCase().trim(), 0)
    }
    return [...m.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0], 'pt-BR'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, filtroSite, filtroStatus, filtroGrupo, busca, filtroTipo])

  const totalTiposFiltrados = useMemo(() => {
    return assets.filter((a) => passa(a, { tipo: true })).length
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, filtroSite, filtroStatus, filtroGrupo, busca])

  const siteOpcoes = useMemo(() => {
    const base = assets.filter((a) => passa(a, { site: true }))
    const cont = new Map<number, number>()
    let semFilial = 0
    base.forEach((a) => (a.site_id ? cont.set(a.site_id, (cont.get(a.site_id) || 0) + 1) : semFilial++))
    const grupos: Record<SiteKind, { s: Site; n: number }[]> = { loja: [], combo: [], outros: [] }
    sites.forEach((s) => grupos[siteKind(s.code)].push({ s, n: cont.get(s.id) || 0 }))
    return { grupos, semFilial, totalBase: base.length }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, sites, filtroTipo, filtroStatus, filtroGrupo, busca])

  // KPIs
  const kpis = useMemo(() => {
    const t = (a: NetworkAsset) => (a.tipo || '').toUpperCase()
    const online = assets.filter((a) => a.status_online === true).length
    const offline = assets.filter((a) => a.status_online === false).length
    const ultimos = assets.map((a) => (a.ultimo_ping ? new Date(a.ultimo_ping).getTime() : 0)).filter((n) => n > 0)
    return {
      total: assets.length,
      impressoras: assets.filter((a) => GRUPOS.impressora.test(t(a))).length,
      switches: assets.filter((a) => GRUPOS.rede.test(t(a))).length,
      aps: assets.filter((a) => GRUPOS.wifi.test(t(a))).length,
      online,
      offline,
      testados: online + offline,
      ultimoTeste: ultimos.length ? new Date(Math.max(...ultimos)) : null,
    }
  }, [assets])

  const nomeLojaFiltrada = useMemo(() => {
    if (filtroSite === 'todos') return 'Todas as Lojas'
    if (filtroSite === 'sem') return 'Sem filial vinculada'
    const s = sites.find((x) => String(x.id) === filtroSite)
    return s ? `${s.code} - ${s.name}` : `Loja #${filtroSite}`
  }, [filtroSite, sites])

  const filtrosAtivos =
    !!busca.trim() ||
    filtroSite !== 'todos' ||
    filtroTipo !== 'todos' ||
    filtroStatus !== 'todos' ||
    !!filtroGrupo ||
    filtroOcupacao !== 'todos' ||
    filtroFaixa !== 'todas' ||
    temBuscaColunaAtiva

  const ocupacaoCounts = useMemo(() => {
    return {
      todos: assets.length,
      ocupados: assets.filter((a) => a.origem !== 'livre').length,
      livres: assets.filter((a) => a.origem === 'livre').length,
      estacoes: assets.filter((a) => a.origem === 'estacao').length,
      ativos: assets.filter((a) => a.origem === 'manual' || a.origem === 'planilha').length,
    }
  }, [assets])

  function limparFiltros() {
    setBusca('')
    setFiltroSite('todos')
    setFiltroTipo('todos')
    setFiltroStatus('todos')
    setFiltroGrupo('')
    setFiltroOcupacao('todos')
    setFiltroFaixa('todas')
    limparBuscasColunas()
  }

  /* KPI clicável: filtra pelo indicador; clicar de novo limpa */
  function aplicarKpi(k: 'total' | 'impressora' | 'rede' | 'wifi' | 'online' | 'offline') {
    const jaAtivo =
      (k === 'impressora' && filtroGrupo === 'impressora') ||
      (k === 'rede' && filtroGrupo === 'rede') ||
      (k === 'wifi' && filtroGrupo === 'wifi') ||
      (k === 'online' && filtroStatus === 'online') ||
      (k === 'offline' && filtroStatus === 'offline')
    limparFiltros()
    if (k === 'total' || jaAtivo) return
    if (k === 'online' || k === 'offline') setFiltroStatus(k)
    else setFiltroGrupo(k)
  }

  async function copiarTexto(texto: string, rotulo = 'Copiado!') {
    try {
      await navigator.clipboard.writeText(texto)
      showToast(rotulo)
    } catch {
      showToast('Não foi possível copiar. Copie manualmente.')
    }
  }

  function alternarOrdem(chave: Ordem) {
    if (ordem === chave) setDirAsc((d) => !d)
    else {
      setOrdem(chave)
      setDirAsc(true)
    }
  }

  /* ---------------- Formulário Ativo ---------------- */
  function abrirModalCriar() {
    setAssetEditando(null)
    setOrigemIpLivre(false)
    setFormFaixaOrigem(null)
    setFormNome('')
    setFormTipo('IMPRESSORA')
    setFormSiteId(filtroSite !== 'todos' && filtroSite !== 'sem' ? filtroSite : sites.length > 0 ? String(sites[0].id) : '')
    setFormIp('')
    setFormMac('')
    setFormPatrimonio('')
    setFormLocalizacao('')
    setFormFabricante('')
    setFormModelo('')
    setFormNumeroSerie('')
    setFormObservacoes('')
    setModalFormAberto(true)
  }

  function abrirModalCriarComIp(ip: string, siteId?: number | null, faixaNome?: string | null, localizacaoSugestao?: string | null) {
    abrirModalCriar()
    setFormIp(ip)
    if (siteId) setFormSiteId(String(siteId))
    setOrigemIpLivre(true)
    if (faixaNome) setFormFaixaOrigem(faixaNome)
    if (localizacaoSugestao) setFormLocalizacao(localizacaoSugestao)
  }

  function abrirModalEditar(a: NetworkAsset) {
    setAssetEditando(a)
    setOrigemIpLivre(false)
    setFormFaixaOrigem(null)
    setFormNome(a.nome)
    setFormTipo(a.tipo || 'IMPRESSORA')
    setFormSiteId(a.site_id ? String(a.site_id) : '')
    setFormIp(a.ip || '')
    setFormMac(a.mac || '')
    setFormPatrimonio(a.patrimonio || '')
    setFormLocalizacao(a.localizacao || '')
    setFormFabricante(a.fabricante || '')
    setFormModelo(a.modelo || '')
    setFormNumeroSerie(a.numero_serie || '')
    setFormObservacoes(a.observacoes || '')
    setModalFormAberto(true)
  }

  // Avisos não bloqueantes no formulário
  const ipDigitado = formIp.trim()
  const ipFormatoSuspeito = ipDigitado !== '' && !ipValido(ipDigitado)
  const ipDuplicado = ipDigitado
    ? assets.find((x) => x.origem !== 'livre' && x.origem !== 'estacao' && x.ip === ipDigitado && x.id !== assetEditando?.id)
    : undefined
  const estacaoConflitante = ipDigitado
    ? assets.find((x) => x.origem === 'estacao' && x.ip === ipDigitado)
    : undefined
  const macDigitado = formMac.trim()
  const macFormatoSuspeito = macDigitado !== '' && macHex(macDigitado).length !== 12

  // Se o MAC tiver 12 dígitos hexadecimais, padroniza para aa:bb:cc:dd:ee:ff
  function padronizarMacDoForm() {
    const hex = macHex(formMac)
    if (hex.length === 12) setFormMac(hex.match(/.{2}/g)!.join(':'))
  }

  async function handleSalvarForm(e: React.FormEvent) {
    e.preventDefault()
    if (!formNome.trim()) {
      showToast('O nome do equipamento é obrigatório.')
      return
    }

    setFormSalvarCarregando(true)
    const payload: NetworkAssetInput = {
      nome: formNome.trim(),
      tipo: formTipo,
      site_id: formSiteId ? Number(formSiteId) : null,
      ip: formIp.trim() || null,
      mac: formMac.trim() || null,
      patrimonio: formPatrimonio.trim() || null,
      localizacao: formLocalizacao.trim() || null,
      fabricante: formFabricante.trim() || null,
      modelo: formModelo.trim() || null,
      numero_serie: formNumeroSerie.trim() || null,
      observacoes: formObservacoes.trim() || null,
    }

    try {
      if (assetEditando) {
        const atualizado = await updateNetworkAsset(token, assetEditando.id!, payload)
        setAssets((prev) => prev.map((item) => (item.id === atualizado.id ? atualizado : item)))
        showToast('Ativo de rede atualizado com sucesso!')
      } else {
        const novo = await createNetworkAsset(token, payload)
        // Substitui imediatamente o registro livre pelo novo ativo na tabela
        setAssets((prev) => [
          novo,
          ...prev.filter((item) => !(item.origem === 'livre' && item.ip === novo.ip)),
        ])
        showToast('Ativo cadastrado com sucesso!')
      }
      setModalFormAberto(false)
      await Promise.all([carregarAtivos(), carregarFaixas()])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      showToast(`Falha ao salvar: ${msg}`)
    } finally {
      setFormSalvarCarregando(false)
    }
  }

  async function handleConfirmarExclusao() {
    if (!assetParaExcluir || !assetParaExcluir.id) return
    setExcluindoAsset(true)
    try {
      await deleteNetworkAsset(token, assetParaExcluir.id)
      const exNome = assetParaExcluir.nome
      const exIp = assetParaExcluir.ip?.trim()

      setAssets((prev) =>
        prev
          .map((a) => {
            if (a.id === assetParaExcluir.id) {
              if (exIp) {
                // Limpa os dados do ativo e deixa a linha como endereço IP livre/disponível
                return {
                  ...a,
                  id: null,
                  nome: '—',
                  tipo: '—',
                  mac: null,
                  patrimonio: null,
                  fabricante: null,
                  modelo: null,
                  numero_serie: null,
                  observacoes: null,
                  status_online: null,
                  tempo_resposta_ms: null,
                  origem: 'livre',
                }
              }
              return null
            }
            return a
          })
          .filter(Boolean) as NetworkAsset[]
      )

      setSelecionados((prev) => {
        const next = new Set(prev)
        next.delete(assetParaExcluir.id!)
        return next
      })
      if (inlineDraft?.parentId === assetParaExcluir.id) {
        setInlineDraft(null)
      }
      if (exIp) {
        showToast(`Ativo "${exNome}" excluído. O endereço IP ${exIp} agora está disponível.`)
      } else {
        showToast(`Ativo "${exNome}" excluído com sucesso.`)
      }
      setAssetParaExcluir(null)
      carregarFaixas()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      showToast(`Erro ao excluir: ${msg}`)
    } finally {
      setExcluindoAsset(false)
    }
  }



  /* ---------------- Ping ---------------- */
  async function handlePingIndividual(a: NetworkAsset) {
    if (!a.ip || !a.ip.trim()) {
      showToast('Este equipamento não possui IP configurado.')
      return
    }
    const cleanIp = a.ip.trim()
    setPingingIp(cleanIp)
    try {
      const res = a.id ? await pingNetworkAsset(token, a.id) : await pingDirectIp(token, cleanIp)
      setAssets((prev) =>
        prev.map((item) => {
          const matches = (item.id && a.id && item.id === a.id) || (item.ip && item.ip.trim() === cleanIp)
          return matches
            ? { ...item, status_online: res.online, tempo_resposta_ms: res.tempo_resposta_ms, ultimo_ping: res.timestamp }
            : item
        })
      )
      if (res.online) {
        if (a.origem === 'livre') {
          showToast(`⚠️ IP livre ${cleanIp} respondeu ao ping (${res.tempo_resposta_ms ?? 0}ms)! Pode haver equipamento não cadastrado em uso.`)
        } else {
          showToast(`✓ ${a.nome} (${cleanIp}) respondeu em ${res.tempo_resposta_ms}ms`)
        }
      } else {
        if (a.origem === 'livre') {
          showToast(`✓ IP ${cleanIp} livre e sem resposta (disponível para uso).`)
        } else {
          showToast(`✕ ${a.nome} (${cleanIp}) está inacessível.`)
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      showToast(`Erro no teste: ${msg}`)
    } finally {
      setPingingIp(null)
    }
  }

  function abrirConfirmacaoScan() {
    const comIp = ativosFiltrados.filter((a) => a.ip && a.ip.trim() && ipValido(a.ip.trim()))
    if (comIp.length === 0) {
      showToast('Nenhum equipamento com endereço IP válido para testar.')
      return
    }
    setScanAlvoCount(comIp.length)
    setModalConfirmarScan(true)
  }

  async function executarScanLote() {
    setModalConfirmarScan(false)
    const alvosComIp = ativosFiltrados.filter((a) => a.ip && a.ip.trim() && ipValido(a.ip.trim()))
    const targetIps = Array.from(new Set(alvosComIp.map((a) => a.ip!.trim())))
    const targetAssetIds = alvosComIp
      .filter((a): a is NetworkAsset & { id: number } => typeof a.id === 'number')
      .map((a) => a.id)
    const siteIdParam = filtroSite !== 'todos' && filtroSite !== 'sem' ? Number(filtroSite) : undefined

    if (targetIps.length === 0) {
      showToast('Nenhum equipamento com endereço IP válido para testar.')
      return
    }

    setScanning(true)
    showToast(`Testando conectividade de ${targetIps.length} endereços IP...`)
    try {
      const results = await scanNetworkAssetsBatch(token, {
        ips: targetIps,
        asset_ids: targetAssetIds.length > 0 ? targetAssetIds : undefined,
        siteId: siteIdParam,
      })
      const resByIp = new Map(results.map((r) => [r.ip, r]))
      const resById = new Map(results.filter((r) => r.asset_id).map((r) => [r.asset_id!, r]))

      setAssets((prev) =>
        prev.map((item) => {
          const cleanIp = item.ip?.trim()
          const r = (cleanIp ? resByIp.get(cleanIp) : undefined) || (item.id ? resById.get(item.id) : undefined)
          return r
            ? { ...item, status_online: r.online, tempo_resposta_ms: r.tempo_resposta_ms, ultimo_ping: r.timestamp }
            : item
        })
      )

      const onlineCount = results.filter((r) => r.online).length
      showToast(`Varredura concluída! ${onlineCount} de ${results.length} endereços responderam ao ping.`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      showToast(`Falha na varredura: ${msg}`)
    } finally {
      setScanning(false)
    }
  }

  /* ---------------- CSV ---------------- */
  async function handleBaixarModelo() {
    try {
      await downloadNetworkAssetTemplate(token)
      showToast('Modelo CSV baixado com sucesso!')
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : String(err))
    }
  }

  function escolherArquivo(f: File | undefined | null) {
    if (!f) return
    if (!/\.(csv|txt)$/i.test(f.name) && !f.type.includes('csv') && !f.type.includes('text')) {
      showToast('Selecione um arquivo .csv.')
      return
    }
    setArquivoCsv(f)
    setResultadoImport(null)
  }

  async function handleImportarCsvSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!arquivoCsv) {
      showToast('Selecione um arquivo CSV para importar.')
      return
    }
    setImportandoCsv(true)
    setResultadoImport(null)
    try {
      const res = await importNetworkAssetsCSV(token, arquivoCsv)
      setResultadoImport(res)
      await carregarAtivos()
      showToast(`Importação concluída: ${res.criados} criados, ${res.atualizados} atualizados.`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      showToast(`Erro na importação: ${msg}`)
    } finally {
      setImportandoCsv(false)
    }
  }

  function handleExportarCsvFiltrados() {
    if (ativosFiltrados.length === 0) {
      showToast('Nenhum ativo para exportar.')
      return
    }

    const headers = ['LOCALIZACAO', 'IP', 'TIPO', 'NOME', 'PATRIMONIO', 'MAC', 'FILIAL_SISTEMA', 'STATUS_ONLINE', 'LATENCIA_MS', 'ULTIMO_PING', 'OBSERVACOES']

    const rows = ativosFiltrados.map((a) => [
      `"${(a.localizacao || '').replace(/"/g, '""')}"`,
      `"${a.ip || ''}"`,
      `"${(a.tipo || '').replace(/"/g, '""')}"`,
      `"${(a.nome || '').replace(/"/g, '""')}"`,
      `"${a.patrimonio || ''}"`,
      `"${a.mac || ''}"`,
      `"${(a.site_codigo || a.site_nome || '').replace(/"/g, '""')}"`,
      a.status_online === true ? 'Online' : a.status_online === false ? 'Offline' : 'NaoTestado',
      a.tempo_resposta_ms !== null ? String(a.tempo_resposta_ms) : '',
      a.ultimo_ping ? new Date(a.ultimo_ping).toLocaleString('pt-BR') : '',
      `"${(a.observacoes || '').replace(/"/g, '""')}"`,
    ])

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ativos_de_rede_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    showToast('CSV exportado com sucesso!')
  }

  function abrirImportacao() {
    setResultadoImport(null)
    setArquivoCsv(null)
    setModalImportAberto(true)
  }

  /* ---------------- Paginação ---------------- */
  const totalPaginas = Math.max(1, Math.ceil(ativosFiltrados.length / porPagina))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const inicio = (paginaAtual - 1) * porPagina
  const itensPagina = ativosFiltrados.slice(inicio, inicio + porPagina)

  /* ---------------- Seleção Múltipla & Lote ---------------- */
  const itensPaginaSelecionaveis = itensPagina.filter(
    (a): a is NetworkAsset & { id: number } =>
      typeof a.id === 'number' && a.origem !== 'estacao' && a.origem !== 'livre'
  )
  const todosDaPaginaSelecionados =
    itensPaginaSelecionaveis.length > 0 &&
    itensPaginaSelecionaveis.every((a) => selecionados.has(a.id))
  const algumDaPaginaSelecionado =
    itensPaginaSelecionaveis.some((a) => selecionados.has(a.id))

  useEffect(() => {
    if (checkAllRef.current) {
      checkAllRef.current.indeterminate = algumDaPaginaSelecionado && !todosDaPaginaSelecionados
    }
  }, [algumDaPaginaSelecionado, todosDaPaginaSelecionados])

  function toggleSelecionarTodosPagina() {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (todosDaPaginaSelecionados) {
        itensPaginaSelecionaveis.forEach((a) => next.delete(a.id))
      } else {
        itensPaginaSelecionaveis.forEach((a) => next.add(a.id))
      }
      return next
    })
  }

  function toggleSelecionado(id: number) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function desmarcarTodos() {
    setSelecionados(new Set())
  }

  async function handleConfirmarExclusaoLote() {
    if (selecionados.size === 0) return
    setExcluindoLote(true)
    const ids = Array.from(selecionados)
    try {
      const res = await bulkDeleteNetworkAssets(token, ids)
      const idsSet = new Set(ids)
      setAssets((prev) =>
        prev
          .map((a) => {
            if (a.id && idsSet.has(a.id)) {
              if (a.ip && a.ip.trim()) {
                // Limpa os dados dos ativos e deixa as linhas como IPs livres/disponíveis
                return {
                  ...a,
                  id: null,
                  nome: '—',
                  tipo: '—',
                  mac: null,
                  patrimonio: null,
                  fabricante: null,
                  modelo: null,
                  numero_serie: null,
                  observacoes: null,
                  status_online: null,
                  tempo_resposta_ms: null,
                  origem: 'livre',
                }
              }
              return null
            }
            return a
          })
          .filter(Boolean) as NetworkAsset[]
      )
      setSelecionados(new Set())
      if (inlineDraft && idsSet.has(inlineDraft.parentId)) {
        setInlineDraft(null)
      }
      setModalConfirmarExclusaoLote(false)
      showToast(`${res.removidos || ids.length} ativos excluídos. Os endereços IP foram liberados.`)
      carregarFaixas()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      showToast(`Erro ao excluir em massa: ${msg}`)
    } finally {
      setExcluindoLote(false)
    }
  }

  /* ---------------- Duplicação Inline ---------------- */
  function duplicarInline(origem: NetworkAsset) {
    if (!origem.id) return
    setInlineDraft({
      parentId: origem.id,
      nome: `${origem.nome} (Cópia)`,
      tipo: origem.tipo || 'IMPRESSORA',
      site_id: origem.site_id ? String(origem.site_id) : '',
      localizacao: origem.localizacao || '',
      ip: origem.ip || '',
      mac: origem.mac || '',
      patrimonio: origem.patrimonio || '',
      fabricante: origem.fabricante || '',
      modelo: origem.modelo || '',
      numero_serie: '',
      observacoes: origem.observacoes || '',
    })
  }

  async function handleSalvarInline() {
    if (!inlineDraft) return
    if (!inlineDraft.nome.trim()) {
      showToast('O nome do equipamento é obrigatório.')
      return
    }

    setSalvandoInline(true)
    const payload: NetworkAssetInput = {
      nome: inlineDraft.nome.trim(),
      tipo: inlineDraft.tipo.trim(),
      site_id: inlineDraft.site_id ? Number(inlineDraft.site_id) : null,
      ip: inlineDraft.ip.trim() || null,
      mac: inlineDraft.mac.trim() || null,
      patrimonio: inlineDraft.patrimonio.trim() || null,
      localizacao: inlineDraft.localizacao.trim() || null,
      fabricante: inlineDraft.fabricante.trim() || null,
      modelo: inlineDraft.modelo.trim() || null,
      numero_serie: inlineDraft.numero_serie.trim() || null,
      observacoes: inlineDraft.observacoes.trim() || null,
    }

    try {
      const novo = await createNetworkAsset(token, payload)
      setAssets((prev) => {
        const idx = prev.findIndex((item) => item.id === inlineDraft.parentId)
        if (idx !== -1) {
          const next = [...prev]
          next.splice(idx + 1, 0, novo)
          return next
        }
        return [novo, ...prev]
      })
      setInlineDraft(null)
      showToast(`Ativo "${novo.nome}" duplicado e salvo com sucesso!`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      showToast(`Falha ao salvar ativo duplicado: ${msg}`)
    } finally {
      setSalvandoInline(false)
    }
  }

  const kpiCards: {
    id: 'total' | 'impressora' | 'rede' | 'wifi' | 'online' | 'offline'
    label: string
    value: number
    sub?: string
    icon: keyof typeof ICONS
    tone: string
    ativo: boolean
  }[] = [
      { id: 'total', label: 'Total de ativos', value: kpis.total, sub: `${kpis.testados} já testados`, icon: 'other', tone: 'total', ativo: !filtrosAtivos },
      { id: 'impressora', label: 'Impressoras', value: kpis.impressoras, icon: 'printer', tone: 'printer', ativo: filtroGrupo === 'impressora' },
      { id: 'rede', label: 'Switches / Roteadores', value: kpis.switches, icon: 'switch', tone: 'switch', ativo: filtroGrupo === 'rede' },
      { id: 'wifi', label: 'Access Points (Wi-Fi)', value: kpis.aps, icon: 'wifi', tone: 'wifi', ativo: filtroGrupo === 'wifi' },
      {
        id: 'online',
        label: 'Online agora',
        value: kpis.online,
        sub: kpis.testados ? `${Math.round((kpis.online / kpis.testados) * 100)}% dos testados` : 'nenhum teste ainda',
        icon: 'check',
        tone: 'online',
        ativo: filtroStatus === 'online' && !filtroGrupo,
      },
      {
        id: 'offline',
        label: 'Inacessíveis / Offline',
        value: kpis.offline,
        sub: kpis.testados ? `${Math.round((kpis.offline / kpis.testados) * 100)}% dos testados` : undefined,
        icon: 'x',
        tone: 'offline',
        ativo: filtroStatus === 'offline' && !filtroGrupo,
      },
    ]

  const renderTh = (
    chave: Ordem | null,
    rotulo: string,
    colKey?: 'ip' | 'nome' | 'filial' | 'tipo' | 'patrimonio' | 'mac',
    style?: React.CSSProperties,
  ) => {
    const isSortable = Boolean(chave)
    const hasSearch = Boolean(colKey)
    const isSearchOpen = colKey ? Boolean(colSearchOpen[colKey]) : false
    const searchVal =
      colKey === 'ip' ? colBuscaIp :
      colKey === 'nome' ? colBuscaNome :
      colKey === 'filial' ? colBuscaFilial :
      colKey === 'tipo' ? colBuscaTipo :
      colKey === 'patrimonio' ? colBuscaPatrimonio :
      colKey === 'mac' ? colBuscaMac : ''

    const setSearchVal = (val: string) => {
      if (colKey === 'ip') setColBuscaIp(val)
      else if (colKey === 'nome') setColBuscaNome(val)
      else if (colKey === 'filial') setColBuscaFilial(val)
      else if (colKey === 'tipo') setColBuscaTipo(val)
      else if (colKey === 'patrimonio') setColBuscaPatrimonio(val)
      else if (colKey === 'mac') setColBuscaMac(val)
    }

    return (
      <th style={style} className={`na-th-col ${isSortable ? 'sortable' : ''}`}>
        <div className="na-th-content">
          <div
            className="na-th-title"
            onClick={isSortable && chave ? () => alternarOrdem(chave) : undefined}
            title={isSortable ? `Ordenar por ${rotulo}` : undefined}
          >
            <span>{rotulo}</span>
            {isSortable && chave && ordem === chave && (
              <Icon name={dirAsc ? 'sortAsc' : 'sortDesc'} size={12} className="na-sort" />
            )}
          </div>
          {hasSearch && colKey && (
            <button
              type="button"
              className={`na-th-search-btn ${searchVal ? 'has-filter' : ''} ${isSearchOpen ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                toggleColSearch(colKey)
              }}
              title={searchVal ? `Filtro ativo: "${searchVal}". Clique para ajustar` : `Filtrar coluna ${rotulo}`}
              aria-label={`Filtrar coluna ${rotulo}`}
            >
              <Icon name="search" size={12} />
            </button>
          )}
        </div>
        {hasSearch && colKey && isSearchOpen && (
          <div className="na-th-search-box" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              autoFocus
              placeholder={`Filtrar ${rotulo.toLowerCase()}...`}
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
            />
            {searchVal && (
              <button
                type="button"
                className="na-th-search-clear"
                onClick={() => setSearchVal('')}
                title="Limpar filtro"
              >
                <Icon name="x" size={11} />
              </button>
            )}
          </div>
        )}
      </th>
    )
  }

  return (
    <div className="na-page">
      {/* BARRA SUPERIOR DE AÇÕES E MÉTRICAS */}
      <div className="na-toolbar">
        <div className="na-toolbar-left">
          <div className="na-summary-strip">
            <button
              type="button"
              className={`na-sum-pill total ${filtroStatus === 'todos' && filtroOcupacao === 'todos' ? 'active' : ''}`}
              onClick={() => {
                setFiltroStatus('todos')
                setFiltroOcupacao('todos')
              }}
              title="Exibir todos os ativos"
            >
              <b>{statusCounts.todos}</b> Total
            </button>
            <button
              type="button"
              className={`na-sum-pill online ${filtroStatus === 'online' ? 'active' : ''}`}
              onClick={() => setFiltroStatus((s) => (s === 'online' ? 'todos' : 'online'))}
              title="Filtrar equipamentos online"
            >
              <i className="dot green" /> <b>{statusCounts.online}</b> Online
            </button>
            <button
              type="button"
              className={`na-sum-pill offline ${filtroStatus === 'offline' ? 'active' : ''}`}
              onClick={() => setFiltroStatus((s) => (s === 'offline' ? 'todos' : 'offline'))}
              title="Filtrar equipamentos offline"
            >
              <i className="dot red" /> <b>{statusCounts.offline}</b> Offline
            </button>
            <button
              type="button"
              className={`na-sum-pill livres ${filtroOcupacao === 'livres' ? 'active' : ''}`}
              onClick={() => setFiltroOcupacao((o) => (o === 'livres' ? 'todos' : 'livres'))}
              title="Filtrar endereços IP livres"
            >
              <i className="dot blue" /> <b>{ocupacaoCounts.livres}</b> Livres
            </button>
            <button
              type="button"
              className={`na-sum-pill estacoes ${filtroOcupacao === 'estacoes' ? 'active' : ''}`}
              onClick={() => setFiltroOcupacao((o) => (o === 'estacoes' ? 'todos' : 'estacoes'))}
              title="Filtrar estações de trabalho"
            >
              <b>{ocupacaoCounts.estacoes}</b> Estações
            </button>
            {kpis.ultimoTeste && (
              <span className="na-last-test" title="Última verificação de conectividade">
                Último teste: {kpis.ultimoTeste.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          <button
            type="button"
            className="na-toggle-kpis-btn"
            onClick={() => setShowKpiCards((v) => !v)}
            title="Expandir ou recolher os cards detalhados por categoria"
          >
            {showKpiCards ? 'Ocultar cards' : 'Cards detalhados'}
            <Icon name={showKpiCards ? 'chevronUp' : 'chevronDown'} size={12} />
          </button>
        </div>

        <div className="na-toolbar-actions">
          {selecionados.size > 0 && canManage && (
            <button className="btn danger" onClick={() => setModalConfirmarExclusaoLote(true)} title="Excluir ativos selecionados">
              <Icon name="trash" /> Excluir ({selecionados.size})
            </button>
          )}
          <button className="btn" onClick={handleBaixarModelo} title="Baixar modelo de planilha pronto para preenchimento">
            <Icon name="download" /> Modelo CSV
          </button>
          {canManage && (
            <button className="btn" onClick={abrirImportacao} title="Importar lista de equipamentos via planilha CSV">
              <Icon name="upload" /> Importar
            </button>
          )}
          <button className="btn" onClick={handleExportarCsvFiltrados} title="Exportar a listagem atual (com filtros) para CSV">
            <Icon name="file" /> Exportar
          </button>
          {canManage && (
            <button className="btn accent" onClick={abrirConfirmacaoScan} disabled={scanning} title="Testa conectividade e latência dos equipamentos filtrados">
              <Icon name="bolt" className={scanning ? 'na-spin' : ''} /> {scanning ? 'Verificando...' : 'Testar conexões'}
            </button>
          )}
          {canManage && (
            <button className="btn primary" onClick={abrirModalCriar} title="Adicionar novo ativo de rede">
              <Icon name="plus" /> Novo ativo
            </button>
          )}
        </div>
      </div>

      {/* CARDS DETALHADOS COLAPSÁVEIS */}
      {showKpiCards && (
        <div className="na-kpis animate-down">
          {kpiCards.map((k) => (
            <button key={k.id} type="button" className={`na-kpi tone-${k.tone} ${k.ativo ? 'on' : ''}`} onClick={() => aplicarKpi(k.id)} aria-pressed={k.ativo} title="Clique para filtrar">
              <span className="na-kpi-ico">
                <Icon name={k.icon} size={18} />
              </span>
              <span className="na-kpi-txt">
                <span className="na-kpi-label">{k.label}</span>
                <b>{k.value}</b>
                {k.sub && <small>{k.sub}</small>}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* FILTROS UNIFICADOS */}
      <section className="na-filters">
        <div className="na-filters-row">
          <div className="na-ocupacao-tabs" style={{ marginBottom: 0 }}>
            {([
              { id: 'todos', label: 'Todos os IPs', desc: 'Ativos, estações e livres' },
              { id: 'ocupados', label: 'Ocupados', desc: 'Com equipamento vinculado' },
              { id: 'livres', label: 'Livres', desc: 'Disponíveis nas faixas' },
              { id: 'estacoes', label: 'Estações', desc: 'Inventário de computadores' },
              { id: 'ativos', label: 'Ativos de Rede', desc: 'Impressoras, switches, etc.' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`na-ocup-btn ${filtroOcupacao === tab.id ? 'active' : ''}`}
                onClick={() => setFiltroOcupacao(tab.id)}
                title={tab.desc}
              >
                {tab.label}
                <span className="na-ocup-count">
                  {tab.id === 'todos' ? ocupacaoCounts.todos :
                   tab.id === 'ocupados' ? ocupacaoCounts.ocupados :
                   tab.id === 'livres' ? ocupacaoCounts.livres :
                   tab.id === 'estacoes' ? ocupacaoCounts.estacoes :
                   ocupacaoCounts.ativos}
                </span>
              </button>
            ))}
          </div>

          <select value={filtroSite} onChange={(e) => setFiltroSite(e.target.value)} aria-label="Filial">
            <option value="todos">Todas as filiais</option>
            {siteOpcoes.grupos.loja.length > 0 && (
              <optgroup label="Lojas">
                {siteOpcoes.grupos.loja.map(({ s, n }) => (
                  <option key={s.id} value={s.id}>{s.code} - {s.name} ({n})</option>
                ))}
              </optgroup>
            )}
            {siteOpcoes.grupos.combo.length > 0 && (
              <optgroup label="Combos">
                {siteOpcoes.grupos.combo.map(({ s, n }) => (
                  <option key={s.id} value={s.id}>{s.code} - {s.name} ({n})</option>
                ))}
              </optgroup>
            )}
            {siteOpcoes.grupos.outros.length > 0 && (
              <optgroup label="Matriz / Outros">
                {siteOpcoes.grupos.outros.map(({ s, n }) => (
                  <option key={s.id} value={s.id}>{s.code} - {s.name} ({n})</option>
                ))}
              </optgroup>
            )}
            {siteOpcoes.semFilial > 0 && <option value="sem">Sem filial vinculada ({siteOpcoes.semFilial})</option>}
          </select>

          {faixasDisponiveis.length > 0 && (
            <select value={filtroFaixa} onChange={(e) => setFiltroFaixa(e.target.value)} aria-label="Faixa de IP / VLAN">
              <option value="todas">Todas as faixas de IP ({faixasDisponiveis.length})</option>
              {faixasDisponiveis.map((f) => (
                <option key={f.id} value={f.id}>
                  {filtroSite === 'todos' && (f.site_codigo || f.site_nome) ? `[${f.site_codigo || f.site_nome}] ` : ''}
                  {f.nome} ({f.ip_inicio} - {f.ip_fim}) • {f.ips_livres} livres
                </option>
              ))}
            </select>
          )}

          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} aria-label="Tipo de equipamento">
            <option value="todos">Todos os tipos ({totalTiposFiltrados})</option>
            {tipoOpcoes.map(([t, n]) => (
              <option key={t} value={t}>{t} ({n})</option>
            ))}
          </select>

          <div className="na-sortbox">
            <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} aria-label="Ordenar por">
              <option value="padrao">Ordem de cadastro</option>
              <option value="nome">Nome</option>
              <option value="tipo">Tipo</option>
              <option value="filial">Filial</option>
              <option value="ip">IP</option>
              <option value="status">Conexão</option>
              <option value="patrimonio">Patrimônio</option>
            </select>
            <button
              type="button"
              className="btn icon"
              onClick={() => setDirAsc((d) => !d)}
              disabled={ordem === 'padrao'}
              title={dirAsc ? 'Crescente' : 'Decrescente'}
              aria-label="Inverter ordem"
            >
              <Icon name={dirAsc ? 'sortAsc' : 'sortDesc'} size={15} />
            </button>
          </div>
        </div>

        <div className="na-filters-row na-row2">

          <div className="na-chips">
            {filtroGrupo && (
              <span className="na-fchip">{GRUPOS[filtroGrupo].label}<button onClick={() => setFiltroGrupo('')} aria-label="Remover filtro"><Icon name="x" size={11} /></button></span>
            )}
            {filtroSite !== 'todos' && (
              <span className="na-fchip">{nomeLojaFiltrada}<button onClick={() => setFiltroSite('todos')} aria-label="Remover filtro"><Icon name="x" size={11} /></button></span>
            )}
            {filtroFaixa !== 'todas' && (
              <span className="na-fchip">Faixa selecionada<button onClick={() => setFiltroFaixa('todas')} aria-label="Remover filtro"><Icon name="x" size={11} /></button></span>
            )}
            {filtroOcupacao !== 'todos' && (
              <span className="na-fchip">Filtro: {filtroOcupacao}<button onClick={() => setFiltroOcupacao('todos')} aria-label="Remover filtro"><Icon name="x" size={11} /></button></span>
            )}
            {filtroTipo !== 'todos' && (
              <span className="na-fchip">{filtroTipo}<button onClick={() => setFiltroTipo('todos')} aria-label="Remover filtro"><Icon name="x" size={11} /></button></span>
            )}
            {colBuscaIp && (
              <span className="na-fchip">IP: {colBuscaIp}<button onClick={() => setColBuscaIp('')} aria-label="Limpar filtro de IP"><Icon name="x" size={11} /></button></span>
            )}
            {colBuscaNome && (
              <span className="na-fchip">Nome: {colBuscaNome}<button onClick={() => setColBuscaNome('')} aria-label="Limpar filtro de Nome"><Icon name="x" size={11} /></button></span>
            )}
            {colBuscaFilial && (
              <span className="na-fchip">Filial: {colBuscaFilial}<button onClick={() => setColBuscaFilial('')} aria-label="Limpar filtro de Filial"><Icon name="x" size={11} /></button></span>
            )}
            {colBuscaTipo && (
              <span className="na-fchip">Tipo: {colBuscaTipo}<button onClick={() => setColBuscaTipo('')} aria-label="Limpar filtro de Tipo"><Icon name="x" size={11} /></button></span>
            )}
            {colBuscaPatrimonio && (
              <span className="na-fchip">Patrimônio: {colBuscaPatrimonio}<button onClick={() => setColBuscaPatrimonio('')} aria-label="Limpar filtro de Patrimônio"><Icon name="x" size={11} /></button></span>
            )}
            {colBuscaMac && (
              <span className="na-fchip">MAC: {colBuscaMac}<button onClick={() => setColBuscaMac('')} aria-label="Limpar filtro de MAC"><Icon name="x" size={11} /></button></span>
            )}
            {filtrosAtivos && (
              <button type="button" className="na-link" onClick={limparFiltros}>Limpar filtros</button>
            )}
          </div>
        </div>
      </section>

      {/* TABELA */}
      <section className="na-table-card">
        {loading ? (
          <div className="na-loading">
            <span className="na-spinner" />
            Carregando ativos de rede...
          </div>
        ) : ativosFiltrados.length === 0 ? (
          <div className="na-empty">
            <span className="na-empty-ico"><Icon name="other" size={24} /></span>
            <h3>Nenhum ativo de rede encontrado</h3>
            <p>
              {filtrosAtivos
                ? 'Nenhum equipamento corresponde aos filtros selecionados. Tente ajustar a busca ou limpar os filtros.'
                : 'Cadastre seu primeiro equipamento manualmente ou importe uma planilha CSV existente.'}
            </p>
            <div className="na-empty-actions">
              {filtrosAtivos && <button className="btn" onClick={limparFiltros}>Limpar filtros</button>}
              {canManage && (
                <>
                  <button className="btn primary" onClick={abrirModalCriar}><Icon name="plus" /> Cadastrar ativo</button>
                  <button className="btn" onClick={abrirImportacao}><Icon name="upload" /> Importar planilha CSV</button>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            {canManage && selecionados.size > 0 && (
              <div className="na-bulk-bar">
                <div className="na-bulk-info">
                  <span className="na-bulk-count">
                    <b>{selecionados.size}</b> {selecionados.size === 1 ? 'ativo selecionado' : 'ativos selecionados'}
                  </span>
                  {selecionados.size < ativosFiltrados.length && (
                    <button
                      type="button"
                      className="na-link"
                      onClick={() => setSelecionados(new Set(ativosFiltrados.map((a) => a.id).filter((id): id is number => id !== null)))}
                    >
                      Selecionar todos os ativos filtrados
                    </button>
                  )}
                </div>
                <div className="na-bulk-actions">
                  <button type="button" className="btn" onClick={desmarcarTodos} title="Desmarcar todos os itens">
                    <Icon name="x" size={13} /> Desmarcar
                  </button>
                  <button
                    type="button"
                    className="btn danger solid"
                    onClick={() => setModalConfirmarExclusaoLote(true)}
                    title="Excluir todos os ativos selecionados"
                  >
                    <Icon name="trash" size={14} /> Excluir selecionados ({selecionados.size})
                  </button>
                </div>
              </div>
            )}

            {/* BARRA SUPERIOR DA TABELA / PAGINAÇÃO RÁPIDA */}
            <div className="na-top-bar">
              <div className="na-top-info">
                Exibindo <b>{ativosFiltrados.length > 0 ? inicio + 1 : 0}-{Math.min(inicio + porPagina, ativosFiltrados.length)}</b> de <b>{ativosFiltrados.length}</b> equipamentos/IPs
                {filtroSite === 'todos' && <span className="na-filiais-badge">Todas as Filiais</span>}
              </div>
              <div className="na-pager">
                <label>
                  Por página:
                  <select value={porPagina} onChange={(e) => setPorPagina(+e.target.value)}>
                    {[25, 50, 100, 200].map((n) => <option key={n}>{n}</option>)}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn icon"
                  onClick={() => setPagina(paginaAtual - 1)}
                  disabled={paginaAtual <= 1}
                  title="Página anterior"
                  aria-label="Página anterior"
                >
                  <Icon name="chevL" size={14} />
                </button>
                <span className="na-page-n">{paginaAtual} / {totalPaginas}</span>
                <button
                  type="button"
                  className="btn icon"
                  onClick={() => setPagina(paginaAtual + 1)}
                  disabled={paginaAtual >= totalPaginas}
                  title="Próxima página"
                  aria-label="Próxima página"
                >
                  <Icon name="chevR" size={14} />
                </button>
              </div>
            </div>

            <div className="na-scroll">
              <table className="na-table">
                <thead>
                  <tr>
                    {canManage && (
                      <th className="na-th-check">
                        <input
                          ref={checkAllRef}
                          type="checkbox"
                          className="na-checkbox"
                          checked={todosDaPaginaSelecionados}
                          onChange={toggleSelecionarTodosPagina}
                          title={todosDaPaginaSelecionados ? 'Desmarcar todos desta página' : 'Selecionar todos desta página'}
                          aria-label="Selecionar todos desta página"
                        />
                      </th>
                    )}
                    {renderTh('status', 'Conexão', undefined, { width: 130 })}
                    {renderTh('ip', 'Endereço IP', 'ip', { width: 155 })}
                    {renderTh('tipo', 'Tipo', 'tipo', { width: 130 })}
                    {renderTh('nome', 'Equipamento', 'nome')}
                    {renderTh('filial', 'Localização / Filial', 'filial')}
                    {renderTh('patrimonio', 'Patrimônio', 'patrimonio', { width: 130 })}
                    {renderTh(null, 'MAC', 'mac', { width: 155 })}
                    {renderTh(null, 'Faixa / VLAN', undefined, { width: 140 })}
                    {canManage && <th style={{ width: 100, textAlign: 'right' }}>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {itensPagina.map((a, idx) => {
                    const isPinging = pingingIp === a.ip
                    const isSelected = a.id ? selecionados.has(a.id) : false
                    const isDraftOpen = a.id ? inlineDraft?.parentId === a.id : false
                    const quando = tempoRelativo(a.ultimo_ping)
                    const sub = [a.fabricante, a.modelo].filter(Boolean).join(' ')
                    const isEstacao = a.origem === 'estacao'
                    const isLivre = a.origem === 'livre'
                    const rowKey = a.id ? `asset-${a.id}` : `ip-${a.ip}-${idx}`
                    const isExpanded = expandedId === rowKey
                    const macFormatado = formatarMac(a.mac)

                    return (
                      <React.Fragment key={rowKey}>
                        <tr
                          className={`na-row ${isSelected ? 'selected' : ''} ${isLivre ? 'na-row-livre' : ''} ${isExpanded ? 'expanded' : ''}`}
                          onClick={() => !isLivre && setExpandedId(isExpanded ? null : rowKey)}
                          style={{ cursor: isLivre ? 'default' : 'pointer' }}
                        >
                          {canManage && (
                            <td className="na-td-check" onClick={(e) => e.stopPropagation()}>
                              {a.id ? (
                                <input
                                  type="checkbox"
                                  className="na-checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelecionado(a.id!)}
                                  aria-label={`Selecionar ${a.nome}`}
                                />
                              ) : (
                                <span className="na-muted" title={isEstacao ? 'Estação integrada' : 'IP livre'}>—</span>
                              )}
                            </td>
                          )}

                          <td className="na-td-conn">
                            <div className="na-conn">
                              {isLivre ? (
                                a.status_online === true ? (
                                  <span className="na-st ping-ativo" title={`IP respondeu ao teste de ping (${a.tempo_resposta_ms ?? 0}ms), mas ainda não possui cadastro/vínculo`}>
                                    <i className="dot orange" /> IP Ativo na Rede
                                  </span>
                                ) : (
                                  <span className="na-st livre" title="IP livre e disponível na faixa de rede">
                                    <i className="dot blue" /> Livre
                                  </span>
                                )
                              ) : a.status_online === true ? (
                                <span className="na-st online" title={`Online. Latência: ${a.tempo_resposta_ms ?? 0}ms`}>
                                  <i className="dot green" />{a.tempo_resposta_ms ? `${a.tempo_resposta_ms} ms` : 'Online'}
                                </span>
                              ) : a.status_online === false ? (
                                <span className="na-st offline" title="Sem resposta ao teste">
                                  <i className="dot red" />Offline
                                </span>
                              ) : (
                                <span className="na-st untested" title="Ainda não testado">
                                  <i className="dot gray" />Não testado
                                </span>
                              )}
                              {a.ip && (
                                <button
                                  type="button"
                                  className="na-ping"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handlePingIndividual(a)
                                  }}
                                  disabled={isPinging || scanning}
                                  title={isLivre ? 'Testar se este IP livre responde na rede' : 'Testar conectividade deste equipamento agora'}
                                  aria-label={`Testar ${a.nome}`}
                                >
                                  <Icon name="bolt" size={13} className={isPinging ? 'na-spin' : ''} />
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="na-td-ip">
                            {a.ip ? (
                              <div className="na-copywrap">
                                <button
                                  type="button"
                                  className="na-copy mono"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    copiarTexto(a.ip!, 'IP copiado!')
                                  }}
                                  title="Clique para copiar o IP"
                                >
                                  {a.ip}<Icon name="copy" size={11} />
                                </button>
                                {!isLivre && (
                                  <a
                                    href={`http://${a.ip}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="na-ext"
                                    title="Abrir painel web (porta 80)"
                                    aria-label="Abrir painel web"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Icon name="external" size={12} />
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="na-muted">—</span>
                            )}
                          </td>

                          <td className="na-td-tipo">
                            {isLivre ? (
                              <span className="na-muted">—</span>
                            ) : (
                              <TipoPill tipo={a.tipo} />
                            )}
                          </td>

                          <td className="na-td-name">
                            <div className="na-name-single">
                              {!isLivre && (
                                <button
                                  type="button"
                                  className={`na-expand-btn ${isExpanded ? 'open' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setExpandedId(isExpanded ? null : rowKey)
                                  }}
                                  title={isExpanded ? 'Recolher detalhes' : 'Clique para ver detalhes e licenças'}
                                  aria-label="Expandir detalhes"
                                >
                                  <Icon name={isExpanded ? 'chevronUp' : 'chevronDown'} size={12} />
                                </button>
                              )}
                              {isLivre ? (
                                <span className="na-muted">—</span>
                              ) : (
                                <strong className="na-title-text" title={a.nome}>{a.nome}</strong>
                              )}
                              {isEstacao && (
                                <span className="na-badge-estacao" title="Estação integrada ao inventário">
                                  Estação
                                </span>
                              )}
                              {a.observacoes && !isLivre && (
                                <span className="na-has-obs" title={`Observações: ${a.observacoes}`}>
                                  <Icon name="note" size={11} />
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="na-td-local">
                            <div className="na-local-single">
                              {a.site_codigo || a.site_nome ? (
                                <span className={`na-filial-pill k-${siteKind(a.site_codigo || '')}`} title={a.localizacao ? `${a.site_codigo} - ${a.site_nome} (${a.localizacao})` : `${a.site_codigo} - ${a.site_nome}`}>
                                  <Icon name="store" size={11} />
                                  <span className="na-filial-txt">{a.site_codigo ? `${a.site_codigo} - ` : ''}{a.site_nome || ''}</span>
                                </span>
                              ) : a.localizacao && !isLivre ? (
                                <span className="na-loc-text" title={a.localizacao}>
                                  <Icon name="pin" size={11} /> {a.localizacao}
                                </span>
                              ) : (
                                <span className="na-muted">—</span>
                              )}
                            </div>
                          </td>

                          <td className="na-td-patrimonio">
                            {a.patrimonio ? (
                              <button
                                type="button"
                                className="na-copy"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  copiarTexto(a.patrimonio!, 'Patrimônio copiado!')
                                }}
                                title="Clique para copiar"
                              >
                                {a.patrimonio}<Icon name="copy" size={11} />
                              </button>
                            ) : (
                              <span className="na-muted">—</span>
                            )}
                          </td>

                          <td className="na-td-mac">
                            {macFormatado ? (
                              <button
                                type="button"
                                className="na-copy mono"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  copiarTexto(macFormatado, 'MAC copiado!')
                                }}
                                title="Clique para copiar o MAC"
                              >
                                {macFormatado}<Icon name="copy" size={11} />
                              </button>
                            ) : (
                              <span className="na-muted">—</span>
                            )}
                          </td>

                          <td className="na-td-vlan">
                            {a.faixa_nome ? (
                              <span className="na-tag-vlan" title={`Faixa de IP / VLAN: ${a.faixa_nome}`}>
                                <Icon name="switch" size={11} /> {a.faixa_nome}
                              </span>
                            ) : (
                              <span className="na-muted">—</span>
                            )}
                          </td>

                          {canManage && (
                            <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                              {isLivre ? (
                                <button
                                  type="button"
                                  className="btn sm primary na-use-ip-btn"
                                  onClick={() => abrirModalCriarComIp(a.ip!, a.site_id, a.faixa_nome, a.site_codigo ? `${a.site_codigo} - ${a.site_nome || ''}` : a.localizacao)}
                                  title="Cadastrar ativo de rede usando este endereço IP"
                                >
                                  + Usar IP
                                </button>
                              ) : isEstacao ? (
                                <span className="na-readonly-text" title="Estação integrada ao inventário (somente leitura)">
                                  Estação
                                </span>
                              ) : (
                                <div className="na-row-actions">
                                  <button
                                    type="button"
                                    className="na-icon-btn"
                                    onClick={() => duplicarInline(a)}
                                    disabled={Boolean(inlineDraft)}
                                    title="Duplicar ativo (cria cópia abaixo para edição direta)"
                                    aria-label={`Duplicar ${a.nome}`}
                                  >
                                    <Icon name="copy" size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    className="na-icon-btn"
                                    onClick={() => abrirModalEditar(a)}
                                    title="Editar informações do ativo"
                                    aria-label={`Editar ${a.nome}`}
                                  >
                                    <Icon name="edit" size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    className="na-icon-btn danger"
                                    onClick={() => setAssetParaExcluir(a)}
                                    title="Excluir ativo do inventário"
                                    aria-label={`Excluir ${a.nome}`}
                                  >
                                    <Icon name="trash" size={14} />
                                  </button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>

                        {/* DRAWER COLAPSÁVEL DE DETALHES */}
                        {isExpanded && !isLivre && (
                          <tr className="na-row-detail">
                            <td colSpan={canManage ? 10 : 9}>
                              <div className="na-detail-card">
                                <div className="na-detail-grid">
                                  {/* Seção 1: Sistema & Licenciamento */}
                                  <div className="na-detail-section highlight">
                                    <h5><Icon name="windows" size={13} /> Sistema &amp; Licenças</h5>
                                    <div className="na-detail-fields">
                                      <div className="na-dfield">
                                        <span className="lbl">Sistema Operacional:</span>
                                        <span className="val bold">
                                          {a.sistema_operacional ? (
                                            <>
                                              <Icon name={/windows/i.test(a.sistema_operacional) ? 'windows' : /linux/i.test(a.sistema_operacional) ? 'linux' : 'server'} size={13} />
                                              {a.sistema_operacional}
                                            </>
                                          ) : (
                                            'Não identificado'
                                          )}
                                        </span>
                                      </div>
                                      {isEstacao && (
                                        <>
                                          <div className="na-dfield">
                                            <span className="lbl">Serial Windows:</span>
                                            <span className="val">
                                              {a.serial_windows ? (
                                                <span className="na-serial-badge has-key" title="Chave do Windows">{a.serial_windows}</span>
                                              ) : (
                                                <span className="na-serial-badge empty" title="Serial de Windows ainda não importado">— Não registrado —</span>
                                              )}
                                            </span>
                                          </div>
                                          <div className="na-dfield">
                                            <span className="lbl">Serial Office:</span>
                                            <span className="val">
                                              {a.serial_office ? (
                                                <span className="na-serial-badge has-key" title="Chave do Pacote Office">{a.serial_office}</span>
                                              ) : (
                                                <span className="na-serial-badge empty" title="Serial de Office ainda não importado">— Não registrado —</span>
                                              )}
                                            </span>
                                          </div>
                                        </>
                                      )}
                                      <div className="na-dfield">
                                        <span className="lbl">Origem do cadastro:</span>
                                        <span className="val">{isEstacao ? 'Estação integrada (Mesh / Inventário)' : 'Ativo manual / CSV'}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Seção 2: Hardware & Especificações */}
                                  <div className="na-detail-section">
                                    <h5><Icon name="hardware" size={13} /> Especificações &amp; Local</h5>
                                    <div className="na-detail-fields">
                                      <div className="na-dfield">
                                        <span className="lbl">Fabricante / Modelo:</span>
                                        <span className="val">{sub || 'Não informado'}</span>
                                      </div>
                                      <div className="na-dfield">
                                        <span className="lbl">Localização:</span>
                                        <span className="val">{a.localizacao || 'Não especificada'}</span>
                                      </div>
                                      <div className="na-dfield">
                                        <span className="lbl">Filial / Loja:</span>
                                        <span className="val">{a.site_codigo ? `${a.site_codigo} - ${a.site_nome}` : (a.site_nome || 'Sem filial')}</span>
                                      </div>
                                      <div className="na-dfield">
                                        <span className="lbl">VLAN / Faixa:</span>
                                        <span className="val">{a.faixa_nome || 'Nenhuma faixa vinculada'}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Seção 3: Rede & Observações */}
                                  <div className="na-detail-section">
                                    <h5><Icon name="bolt" size={13} /> Rede &amp; Observações</h5>
                                    <div className="na-detail-fields">
                                      <div className="na-dfield">
                                        <span className="lbl">Endereço IP:</span>
                                        <span className="val mono">{a.ip || '—'}</span>
                                      </div>
                                      <div className="na-dfield">
                                        <span className="lbl">Endereço MAC:</span>
                                        <span className="val mono">{macFormatado || '—'}</span>
                                      </div>
                                      <div className="na-dfield">
                                        <span className="lbl">Último Ping:</span>
                                        <span className="val">{a.ultimo_ping ? `${new Date(a.ultimo_ping).toLocaleString('pt-BR')} (${quando})` : 'Nunca testado'}</span>
                                      </div>
                                      {a.tempo_resposta_ms !== undefined && a.tempo_resposta_ms !== null && (
                                        <div className="na-dfield">
                                          <span className="lbl">Tempo de resposta:</span>
                                          <span className="val">{a.tempo_resposta_ms} ms</span>
                                        </div>
                                      )}
                                    </div>
                                    {a.observacoes && (
                                      <div className="na-dfield full" style={{ marginTop: 6 }}>
                                        <span className="lbl">Observações:</span>
                                        <div className="na-detail-obs">{a.observacoes}</div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                        {canManage && isDraftOpen && inlineDraft && (
                          <tr className="na-row-inline">
                            <td className="na-td-check">
                              <span className="na-draft-badge" title="Rascunho duplicado (não salvo)">
                                <Icon name="copy" size={13} />
                              </span>
                            </td>

                            <td>
                              <span className="na-st draft" title="Rascunho pendente de confirmação">
                                <i className="dot gray" /> Rascunho
                              </span>
                            </td>

                            <td>
                              <input
                                type="text"
                                className="na-inline-input mono"
                                placeholder="192.168.x.x"
                                value={inlineDraft.ip}
                                onChange={(e) => setInlineDraft({ ...inlineDraft, ip: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSalvarInline()
                                  if (e.key === 'Escape') setInlineDraft(null)
                                }}
                              />
                            </td>

                            <td>
                              <select
                                className="na-inline-select"
                                value={inlineDraft.tipo}
                                onChange={(e) => setInlineDraft({ ...inlineDraft, tipo: e.target.value })}
                              >
                                {TIPOS_PREDEFINIDOS.map((t) => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            </td>

                            <td>
                              <div className="na-inline-field">
                                <input
                                  type="text"
                                  autoFocus
                                  className="na-inline-input"
                                  placeholder="Nome do equipamento *"
                                  value={inlineDraft.nome}
                                  onChange={(e) => setInlineDraft({ ...inlineDraft, nome: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSalvarInline()
                                    if (e.key === 'Escape') setInlineDraft(null)
                                  }}
                                />
                              </div>
                            </td>

                            <td>
                              <div className="na-inline-loc">
                                <select
                                  className="na-inline-select"
                                  value={inlineDraft.site_id}
                                  onChange={(e) => setInlineDraft({ ...inlineDraft, site_id: e.target.value })}
                                  title="Filial"
                                >
                                  <option value="">(Sem filial vinculada)</option>
                                  {sites.map((s) => (
                                    <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  className="na-inline-input"
                                  placeholder="Local (LJ01, CPD...)"
                                  value={inlineDraft.localizacao}
                                  onChange={(e) => setInlineDraft({ ...inlineDraft, localizacao: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSalvarInline()
                                    if (e.key === 'Escape') setInlineDraft(null)
                                  }}
                                />
                              </div>
                            </td>

                            <td>
                              <input
                                type="text"
                                className="na-inline-input"
                                placeholder="Nº Patrimônio"
                                value={inlineDraft.patrimonio}
                                onChange={(e) => setInlineDraft({ ...inlineDraft, patrimonio: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSalvarInline()
                                  if (e.key === 'Escape') setInlineDraft(null)
                                }}
                              />
                            </td>

                            <td>
                              <input
                                type="text"
                                className="na-inline-input mono"
                                placeholder="Endereço MAC"
                                value={inlineDraft.mac}
                                onChange={(e) => setInlineDraft({ ...inlineDraft, mac: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSalvarInline()
                                  if (e.key === 'Escape') setInlineDraft(null)
                                }}
                              />
                            </td>

                            <td>
                              <span className="na-muted">—</span>
                            </td>

                            <td style={{ textAlign: 'right' }}>
                              <div className="na-inline-actions">
                                <button
                                  type="button"
                                  className="na-icon-btn save"
                                  onClick={handleSalvarInline}
                                  disabled={salvandoInline}
                                  title="Confirmar e salvar ativo no banco de dados (Enter)"
                                  aria-label="Confirmar novo ativo"
                                >
                                  <Icon name="check" size={15} />
                                </button>
                                <button
                                  type="button"
                                  className="na-icon-btn cancel"
                                  onClick={() => setInlineDraft(null)}
                                  disabled={salvandoInline}
                                  title="Cancelar e descartar rascunho (Esc)"
                                  aria-label="Cancelar rascunho"
                                >
                                  <Icon name="x" size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* RODAPÉ / PAGINAÇÃO */}
        <div className="na-foot">
          <span>
            {ativosFiltrados.length > 0
              ? <>Exibindo <b>{inicio + 1}-{Math.min(inicio + porPagina, ativosFiltrados.length)}</b> de <b>{ativosFiltrados.length}</b>{ativosFiltrados.length !== assets.length && <> (total cadastrado: {assets.length})</>}</>
              : <>Nenhum ativo exibido de {assets.length} cadastrados</>}
          </span>
          <div className="na-pager">
            <label>
              Por página
              <select value={porPagina} onChange={(e) => setPorPagina(+e.target.value)}>
                {[25, 50, 100, 200].map((n) => <option key={n}>{n}</option>)}
              </select>
            </label>
            <button className="btn icon" onClick={() => setPagina(paginaAtual - 1)} disabled={paginaAtual <= 1} aria-label="Página anterior"><Icon name="chevL" size={15} /></button>
            <span className="na-page-n">{paginaAtual} / {totalPaginas}</span>
            <button className="btn icon" onClick={() => setPagina(paginaAtual + 1)} disabled={paginaAtual >= totalPaginas} aria-label="Próxima página"><Icon name="chevR" size={15} /></button>
          </div>
        </div>
      </section>

      {/* =========== MODAL: CONFIRMAR VARREDURA EM LOTE =========== */}
      {modalConfirmarScan && (
        <Modal size="sm" onClose={() => setModalConfirmarScan(false)}>
          <div className="na-confirm">
            <span className="na-confirm-ico accent"><Icon name="bolt" size={22} /></span>
            <h3>Testar conectividade em lote?</h3>
            <p>
              Será disparado um teste de conectividade (ping) para <b>{scanAlvoCount} equipamentos</b> com endereço IP cadastrado.
            </p>

            <div className="na-note">
              <Icon name="bolt" size={14} />
              <span>
                Alvo do teste: <b>{scanAlvoCount} equipamentos</b> visíveis nos filtros atuais
                {filtroSite !== 'todos' ? ` (${nomeLojaFiltrada})` : ''}
                {filtroTipo !== 'todos' ? ` • Tipo: ${filtroTipo}` : ''}
                {busca.trim() ? ` • Busca: "${busca.trim()}"` : ''}
              </span>
            </div>

            {scanAlvoCount >= 10 && !filtrosAtivos && (
              <p className="na-hint">Para evitar tráfego de rede desnecessário, selecione uma filial ou tipo específico no filtro antes de iniciar o teste.</p>
            )}

            <div className="na-confirm-actions">
              <button className="btn" onClick={() => setModalConfirmarScan(false)}>Cancelar</button>
              <button className="btn primary" onClick={executarScanLote}><Icon name="bolt" /> Iniciar teste ({scanAlvoCount})</button>
            </div>
          </div>
        </Modal>
      )}

      {/* =========== MODAL: CADASTRAR / EDITAR =========== */}
      {modalFormAberto && (
        <Modal onClose={() => !formSalvarCarregando && setModalFormAberto(false)}>
          <div className="na-modal-head">
            <h2>{assetEditando ? 'Editar ativo de rede' : origemIpLivre ? 'Cadastrar ativo no IP reservado' : 'Novo ativo de rede'}</h2>
            <button className="na-icon-btn" onClick={() => setModalFormAberto(false)} aria-label="Fechar"><Icon name="x" /></button>
          </div>

          {origemIpLivre && (
            <div className="na-modal-badge-livre">
              <Icon name="check" size={14} />
              <span>Atribuindo IP livre: <b>{formIp}</b>{formFaixaOrigem ? ` • Faixa: ${formFaixaOrigem}` : ''}</span>
            </div>
          )}

          <form onSubmit={handleSalvarForm} className="na-form">
            <fieldset>
              <legend>Identificação</legend>
              <div className="na-grid g2">
                <div className="field span2">
                  <label>Nome do equipamento / identificador <span className="req">*</span></label>
                  <input type="text" required autoFocus placeholder="Ex: L02-PROMO-35192, Impressora Caixa 01, Switch CPD..." value={formNome} onChange={(e) => setFormNome(e.target.value)} />
                </div>
                <div className="field">
                  <label>Tipo de equipamento</label>
                  <select value={formTipo} onChange={(e) => setFormTipo(e.target.value)}>
                    {!TIPOS_PREDEFINIDOS.includes(formTipo) && formTipo && <option value={formTipo}>{formTipo}</option>}
                    {TIPOS_PREDEFINIDOS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Nº de patrimônio / tombamento</label>
                  <input type="text" placeholder="Ex: pat.35192" value={formPatrimonio} onChange={(e) => setFormPatrimonio(e.target.value)} />
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend>Localização</legend>
              <div className="na-grid g2">
                <div className="field">
                  <label>Loja / filial vinculada</label>
                  <SiteSelect
                    value={formSiteId}
                    onChange={(val) => setFormSiteId(val)}
                    sites={sites}
                    allowWithoutSite
                    emptyLabel="(Sem filial vinculada)"
                    disabled={origemIpLivre}
                    fullWidth
                    ariaLabel="Loja / filial vinculada"
                  />
                  {origemIpLivre && (
                    <small className="na-fhint locked"><Icon name="lock" size={12} /> Filial vinculada à faixa da rede.</small>
                  )}
                </div>
                <div className="field">
                  <label>Localização / código (ex: LJ01, CPD)</label>
                  <input
                    type="text"
                    placeholder="Ex: LJ01, Caixa 01, CPD..."
                    value={formLocalizacao}
                    onChange={(e) => setFormLocalizacao(e.target.value)}
                    readOnly={origemIpLivre}
                    className={origemIpLivre ? 'na-input-locked' : ''}
                  />
                  {origemIpLivre && (
                    <small className="na-fhint locked"><Icon name="lock" size={12} /> Localização fixada pela loja da faixa.</small>
                  )}
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend>Rede</legend>
              <div className="na-grid g2">
                <div className="field">
                  <label>Endereço IPv4</label>
                  <input
                    type="text"
                    className={`mono ${origemIpLivre ? 'na-input-locked' : ''}`}
                    placeholder="Ex: 192.168.4.5"
                    value={formIp}
                    onChange={(e) => setFormIp(e.target.value)}
                    readOnly={origemIpLivre}
                  />
                  {origemIpLivre && (
                    <small className="na-fhint locked"><Icon name="lock" size={12} /> IP reservado e fixado a partir da faixa.</small>
                  )}
                  {ipFormatoSuspeito && <small className="na-fhint warn"><Icon name="alert" size={12} /> Formato de IP incomum. Confira antes de salvar.</small>}
                  {ipDuplicado && <small className="na-fhint warn"><Icon name="alert" size={12} /> Este IP já está em uso por “{ipDuplicado.nome}”.</small>}
                  {estacaoConflitante && (
                    <small className="na-fhint warn">
                      <Icon name="alert" size={12} /> Atenção: Este IP está atribuído à estação de trabalho “{estacaoConflitante.nome}”. Verifique para evitar duplicidades na rede.
                    </small>
                  )}
                </div>
                <div className="field">
                  <label>Endereço MAC</label>
                  <input type="text" className="mono" placeholder="Ex: b4:2e:99:f2:a1:68" value={formMac} onChange={(e) => setFormMac(e.target.value)} onBlur={padronizarMacDoForm} />
                  {macFormatoSuspeito && <small className="na-fhint warn"><Icon name="alert" size={12} /> O MAC deve ter 12 dígitos hexadecimais.</small>}
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend>Equipamento</legend>
              <div className="na-grid g3">
                <div className="field">
                  <label>Fabricante</label>
                  <input type="text" placeholder="Ex: HP, Zebra, Intelbras" value={formFabricante} onChange={(e) => setFormFabricante(e.target.value)} />
                </div>
                <div className="field">
                  <label>Modelo</label>
                  <input type="text" placeholder="Ex: M404dn" value={formModelo} onChange={(e) => setFormModelo(e.target.value)} />
                </div>
                <div className="field">
                  <label>Nº de série</label>
                  <input type="text" className="mono" value={formNumeroSerie} onChange={(e) => setFormNumeroSerie(e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label>Observações / anotações de rede</label>
                <textarea rows={2} placeholder="Anotações de VLAN, porta de switch, setor..." value={formObservacoes} onChange={(e) => setFormObservacoes(e.target.value)} />
              </div>
            </fieldset>

            <div className="na-modal-foot">
              <button type="button" className="btn" onClick={() => setModalFormAberto(false)}>Cancelar</button>
              <button type="submit" className="btn primary" disabled={formSalvarCarregando}>
                {formSalvarCarregando ? 'Salvando...' : assetEditando ? 'Salvar alterações' : 'Cadastrar ativo'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* =========== MODAL: IMPORTAR CSV =========== */}
      {modalImportAberto && (
        <Modal onClose={() => !importandoCsv && setModalImportAberto(false)}>
          <div className="na-modal-head">
            <h2>Importar planilha de ativos</h2>
            <button className="na-icon-btn" onClick={() => setModalImportAberto(false)} aria-label="Fechar"><Icon name="x" /></button>
          </div>

          <form onSubmit={handleImportarCsvSubmit} className="na-form">
            <div className="na-import-info">
              <b><Icon name="info" size={14} /> Padrão de colunas aceito</b>
              <div className="na-cols">
                <code>LOCALIZAÇAO</code><code>IP</code><code>TIPO</code><code>NOME</code><code>PATRIMONIO</code><code>MAC</code>
              </div>
              <ul>
                <li>Compatível com cópia do <b>Google Planilhas</b> e arquivos <b>.CSV do Excel</b>.</li>
                <li>A coluna <code>LOCALIZAÇAO</code> com valores como <code>LJXX</code> ou <code>CBXX</code> associa a filial automaticamente.</li>
                <li><b>Proteção ativa &amp; Sincronização de Patrimônio:</b> se algum IP ou nome no CSV pertencer a uma estação de trabalho cadastrada, a estação é mantida protegida e seu <b>número de patrimônio</b> é sincronizado automaticamente se informado na planilha.</li>
              </ul>
            </div>

            <div
              className={`na-drop ${arrastando ? 'over' : ''} ${arquivoCsv ? 'has' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setArrastando(true) }}
              onDragLeave={() => setArrastando(false)}
              onDrop={(e) => { e.preventDefault(); setArrastando(false); escolherArquivo(e.dataTransfer.files?.[0]) }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() } }}
            >
              <input ref={fileInputRef} type="file" accept=".csv,text/csv,text/plain" style={{ display: 'none' }} onChange={(e) => escolherArquivo(e.target.files?.[0])} />
              <span className="na-drop-ico"><Icon name="file" size={26} /></span>
              {arquivoCsv ? (
                <div className="na-drop-file">
                  <b>{arquivoCsv.name}</b>
                  <span>{(arquivoCsv.size / 1024).toFixed(1)} KB</span>
                  <button type="button" className="na-link" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}>Trocar arquivo</button>
                </div>
              ) : (
                <div>
                  <p><b>Clique aqui</b> ou arraste sua planilha CSV</p>
                  <span>Formato .csv (delimitado por ponto e vírgula, tabulação ou vírgula)</span>
                </div>
              )}
            </div>

            {resultadoImport && (
              <div className="na-result">
                <b>Resultado do processamento</b>
                <div className="na-result-stats">
                  <span className="ok"><Icon name="check" size={12} /> {resultadoImport.criados} criados</span>
                  <span className="info">{resultadoImport.atualizados} atualizados</span>
                  <span className="muted">{resultadoImport.ignorados} ignorados</span>
                </div>

                {resultadoImport.conflitos_estacao && resultadoImport.conflitos_estacao.length > 0 && (
                  <div className="na-import-conflict-box">
                    <div className="na-conflict-header">
                      <Icon name="alert" size={18} />
                      <span>{resultadoImport.conflitos_estacao.length} estação(ões) de trabalho identificada(s)</span>
                    </div>
                    <p>
                      As seguintes máquinas pertencem ao inventário de computadores. Elas foram mantidas e tiveram seu patrimônio atualizado quando informado:
                    </p>
                    <div className="na-conflict-list">
                      {resultadoImport.conflitos_estacao.map((c, idx) => (
                        <div key={idx} className="na-conflict-item">
                          <span className="na-conflict-ip">{c.ip || '—'}</span>
                          <span className="na-conflict-detail">
                            Linha {c.linha}: <b>{c.nome_planilha}</b> (Estação <b>{c.estacao_nome}</b>)
                            {c.patrimonio_atualizado ? (
                              <span className="na-conflict-pat-updated">
                                <Icon name="check" size={11} /> Patrimônio atualizado: <b>{c.patrimonio_novo}</b>
                              </span>
                            ) : c.estacao_patrimonio ? (
                              <span className="na-conflict-pat-unchanged">
                                Patrimônio mantido: <b>{c.estacao_patrimonio}</b>
                              </span>
                            ) : (
                              <span className="na-conflict-pat-unchanged">
                                Sem patrimônio no CSV
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {resultadoImport.erros.length > 0 && (
                  <div className="na-result-errors">
                    <b>Avisos / erros ({resultadoImport.erros.length})</b>
                    <ul>
                      {resultadoImport.erros.map((err, idx) => <li key={idx}>{err}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="na-modal-foot">
              <button type="button" className="btn" onClick={handleBaixarModelo}><Icon name="download" /> Baixar modelo CSV</button>
              <button type="submit" className="btn primary" disabled={!arquivoCsv || importandoCsv}>
                {importandoCsv ? 'Importando...' : 'Processar importação'}
              </button>
            </div>
          </form>
        </Modal>
      )}



      {/* =========== MODAL: CONFIRMAR EXCLUSÃO =========== */}
      {assetParaExcluir && (
        <Modal size="sm" onClose={() => !excluindoAsset && setAssetParaExcluir(null)}>
          <div className="na-confirm">
            <span className="na-confirm-ico danger"><Icon name="trash" size={22} /></span>
            <h3>Excluir ativo de rede?</h3>
            <p>
              Tem certeza que deseja excluir <b>{assetParaExcluir.nome}</b> ({assetParaExcluir.ip || 'sem IP'})? Esta ação não pode ser desfeita.
            </p>
            <div className="na-confirm-actions">
              <button className="btn" onClick={() => setAssetParaExcluir(null)} disabled={excluindoAsset}>Cancelar</button>
              <button className="btn danger solid" onClick={handleConfirmarExclusao} disabled={excluindoAsset}>
                {excluindoAsset ? 'Excluindo...' : 'Confirmar exclusão'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* =========== MODAL: CONFIRMAR EXCLUSÃO EM MASSA =========== */}
      {modalConfirmarExclusaoLote && (
        <Modal size="sm" onClose={() => !excluindoLote && setModalConfirmarExclusaoLote(false)}>
          <div className="na-confirm">
            <span className="na-confirm-ico danger"><Icon name="trash" size={22} /></span>
            <h3>Excluir {selecionados.size} {selecionados.size === 1 ? 'ativo' : 'ativos'}?</h3>
            <p>
              Você está prestes a remover permanentemente <b>{selecionados.size} {selecionados.size === 1 ? 'equipamento selecionado' : 'equipamentos selecionados'}</b> do inventário.
            </p>
            <div className="na-bulk-preview">
              {assets
                .filter((a) => a.id && selecionados.has(a.id))
                .slice(0, 5)
                .map((a) => (
                  <div key={a.id} className="na-bulk-preview-item">
                    <strong>{a.nome}</strong>
                    <span>{a.ip || 'sem IP'} • {a.tipo}</span>
                  </div>
                ))}
              {selecionados.size > 5 && (
                <small className="na-muted">...e outros {selecionados.size - 5} equipamentos selecionados.</small>
              )}
            </div>
            <div className="na-note warn">
              <Icon name="alert" size={14} /> <span>Esta ação não poderá ser desfeita.</span>
            </div>
            <div className="na-confirm-actions">
              <button className="btn" onClick={() => setModalConfirmarExclusaoLote(false)} disabled={excluindoLote}>
                Cancelar
              </button>
              <button className="btn danger solid" onClick={handleConfirmarExclusaoLote} disabled={excluindoLote}>
                {excluindoLote ? 'Excluindo...' : `Confirmar exclusão (${selecionados.size})`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}