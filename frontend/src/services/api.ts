const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.port === '5173'
    ? 'http://localhost:8000/api/v1'
    : '/api/v1')


type LoginResponse = {
  access_token: string
  token_type: string
}

export async function login(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      password,
    }),
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Usuário ou senha inválidos.')
    }

    throw new Error('Erro ao realizar login.')
  }

  return response.json()
}

type UserResponse = {
  id: number
  username: string
  email: string
  full_name: string
  company_id: number
  active: boolean
  is_superadmin: boolean
  roles?: string[]
}

export async function getCurrentUser(
  token: string,
): Promise<UserResponse> {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Sessão expirada.')
    }

    throw new Error('Erro ao buscar usuário autenticado.')
  }

  return response.json()
}

/* =========================================================
   INVENTORY (FULL DATA)
   ========================================================= */

export type TopPasta = {
  pasta: string
  caminho: string
  tamanho: string
}

export type TopUsuario = {
  usuario: string
  tamanho: string
  pastas?: TopPasta[]
}

export type UnidadeDisco = {
  ponto_montagem?: string
  montagem?: string
  letra?: string
  device?: string
  tipo_fs?: string
  rotulo?: string
  usado?: string
  total?: string
  livre?: string
  percentual?: string
  percentual_usado?: number | string
}

export type PastaUsuario = {
  pasta?: string
  nome?: string
  caminho?: string
  tamanho?: string
}

export type AnaliseUsuario = {
  usuario?: string
  tamanho?: string
  subpastas?: PastaUsuario[]
  pastas?: PastaUsuario[]
}

export type ItemVarLog = {
  nome?: string
  pasta?: string
  caminho?: string
  tamanho?: string
}

export type AnaliseDisco = {
  executada?: boolean
  unidades?: UnidadeDisco[]
  usuarios?: AnaliseUsuario[]
  top_usuarios?: TopUsuario[]
  var_log?: ItemVarLog[] | {
    tamanho_total?: string
    top_itens?: ItemVarLog[]
  }
}

export type PacoteItem = {
  pacote: string
  versao: string
}

export type AppItem = {
  id?: string
  nome?: string
  tipo?: string
  origem?: string
  versao?: string
  pacotes?: PacoteItem[]
}

export type RawInventoryItem = {
  id?: number
  hostname: string
  motivo_upgrade?: string | null
  loja?: string | null
  ip?: string | null
  ip2?: string | null
  ip_secundario?: string | null
  ip_extra?: string | null
  ips?: string | string[]
  mac?: string | null
  sistema?: string | null
  versao?: string | null
  status?: string | null
  processador?: string | null
  ram_total?: string | null
  disco_total?: string | null
  disco_usado?: string | null
  disco_livre?: string | null
  disco_percentual?: number | string | null
  porcentagem_disco?: string | null
  rustdesk_id?: string | null
  data_coleta?: string | null
  fabricante?: string | null
  modelo?: string | null
  serial?: string | null
  dominio?: string | null
  usuario?: string | null
  build?: string | null
  windows_release?: string | null
  ram_tipo?: string | null
  alerta_hardware?: string | null
  history_count?: number
  analise_disco?: AnaliseDisco | UnidadeDisco[] | any
  aplicativos?: AppItem[]
  agentes?: AppItem[]
  runtimes?: AppItem[]
  ferramentas?: AppItem[]
  patrimonio?: string | null
  firewall_status?: string | null
  firewall_solicitado_por?: string | null
  firewall_solicitado_em?: string | null
  firewall_confirmado_por?: string | null
  firewall_confirmado_em?: string | null
}

export type InventoryDataResponse = {
  items: RawInventoryItem[]
  total: number
  timestamp: string
}

export async function getInventoryData(
  token: string,
): Promise<InventoryDataResponse> {
  const response = await fetch(`${API_URL}/inventory/data`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Sessão expirada.')
    }
    throw new Error('Erro ao buscar dados do inventário.')
  }

  return response.json()
}

/* =========================================================
   DASHBOARD
   ========================================================= */

export type DashboardSummary = {
  devices: {
    total: number
    active: number
  }

  sites: {
    total: number
  }

  software: {
    total: number
  }

  devices_by_site: {
    site_id: number
    site_name: string
    total: number
  }[]

  devices_by_version: {
    versao: string
    total: number
  }[]

  devices_by_status: {
    status: string
    total: number
  }[]
}

export async function getDashboardSummary(
  token: string,
): Promise<DashboardSummary> {
  const response = await fetch(
    `${API_URL}/dashboard/summary`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Sessão expirada.')
    }

    throw new Error('Erro ao buscar resumo do dashboard.')
  }

  return response.json()
}

/* =========================================================
   DISPOSITIVOS
   ========================================================= */

export type Device = {
  id: number
  company_id: number
  site_id: number | null

  hostname: string
  loja: string | null

  ip: string | null
  mac: string | null

  sistema: string | null
  versao: string | null
  status: string | null

  processador: string | null
  ram_total: string | null

  disco_total: string | null
  disco_usado: string | null
  disco_livre: string | null
  disco_percentual: number | null

  rustdesk_id: string | null

  data_coleta: string | null

  active: boolean

  created_at: string
  updated_at: string
}

export type DevicesResponse = {
  items: Device[]

  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

export async function getDevices(
  token: string,
  page = 1,
  pageSize = 50,
  search = '',
  siteId?: number,
  status?: string,
  sistema?: string,
  versao?: string,
): Promise<DevicesResponse> {
  const params = new URLSearchParams()

  params.set('page', String(page))
  params.set('per_page', String(pageSize))

  if (search.trim()) {
    params.set('search', search.trim())
  }

  if (siteId !== undefined) {
    params.set('site_id', String(siteId))
  }

  if (status) {
    params.set('status', status)
  }

  if (sistema) {
  params.set('sistema', sistema)
}

if (versao) {
  params.set('versao', versao)
}

  const response = await fetch(
    `${API_URL}/devices/?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Sessão expirada.')
    }

    if (response.status === 403) {
      throw new Error(
        'Você não possui permissão para visualizar os dispositivos.',
      )
    }

    throw new Error(
      'Erro ao buscar dispositivos.',
    )
  }

  return response.json()
}

export type Site = {
  id: number
  company_id: number
  name: string
  code: string
  active: boolean
}

export async function getSites(
  token: string,
): Promise<Site[]> {
  const response = await fetch(
    `${API_URL}/sites/`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Sessão expirada.')
    }

    if (response.status === 403) {
      throw new Error(
        'Você não possui permissão para visualizar os sites.',
      )
    }

    throw new Error(
      'Erro ao buscar sites.',
    )
  }

  return response.json()
}

export type ADConfigData = {
  id?: number
  enabled: boolean
  server_host: string
  server_port: number
  use_ssl: boolean
  use_tls: boolean
  domain: string
  base_dn: string
  bind_user?: string
  bind_password?: string
  has_bind_password?: boolean
  user_search_filter: string
  superadmin_groups: string[]
  group_mappings: Record<string, { role?: string; sites?: string[] }>
  auto_sync_on_login: boolean
}

export async function getADConfig(token: string): Promise<ADConfigData> {
  const response = await fetch(`${API_URL}/ad/config`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) {
    throw new Error('Erro ao carregar configurações do Active Directory.')
  }
  return response.json()
}

export async function saveADConfig(token: string, data: ADConfigData): Promise<{ status: string; message: string }> {
  const response = await fetch(`${API_URL}/ad/config`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao salvar configurações do Active Directory.')
  }
  return response.json()
}

export async function testADConnection(token: string, data?: Partial<ADConfigData>): Promise<{
  success: boolean
  message: string
  latency_ms?: number
  diagnostic?: string
  suggestion?: string
  server_info?: any
}> {
  const response = await fetch(`${API_URL}/ad/test`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data || null),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Falha ao testar conexão com o servidor AD.')
  }
  return response.json()
}

export async function testADUser(token: string, username: string, password: string): Promise<{
  authenticated: boolean
  message: string
  display_name?: string
  email?: string
  groups?: string[]
  would_be_superadmin?: boolean
  mapped_sites?: string[]
  mapped_roles?: string[]
}> {
  const response = await fetch(`${API_URL}/ad/test-user`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Falha ao testar autenticação do usuário no AD.')
  }
  return response.json()
}

export type ADGroup = {
  name: string
  description?: string
  dn?: string
}

export async function getADGroups(
  token: string,
  search?: string,
): Promise<{ groups: ADGroup[]; total: number }> {
  const url = search
    ? `${API_URL}/ad/groups?search=${encodeURIComponent(search)}`
    : `${API_URL}/ad/groups`
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao consultar grupos do Active Directory.')
  }
  return response.json()
}

/* =========================================================
   DEVICE HISTORY & AUDIT & MANAGEMENT
   ========================================================= */

export type HistoryItem = {
  id: number
  campo: string
  valor_anterior: string | null
  valor_novo: string | null
  data_alteracao: string
}

export async function getDeviceHistory(
  token: string,
  deviceId: number,
): Promise<HistoryItem[]> {
  const response = await fetch(`${API_URL}/devices/${deviceId}/history`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao consultar histórico do dispositivo.')
  }
  return response.json()
}

export async function clearDeviceAlert(
  token: string,
  deviceId: number,
): Promise<{ status: string; message: string }> {
  const response = await fetch(`${API_URL}/devices/${deviceId}/clear-alert`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao limpar alerta do dispositivo.')
  }
  return response.json()
}

export async function deleteDevice(
  token: string,
  deviceId: number,
): Promise<{ status: string; message: string }> {
  const response = await fetch(`${API_URL}/devices/${deviceId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao excluir dispositivo do inventário.')
  }
  return response.json()
}

export async function updateDevicePatrimonio(
  token: string,
  deviceId: number,
  patrimonio: string,
): Promise<{ status: string; patrimonio: string; message: string }> {
  const response = await fetch(`${API_URL}/devices/${deviceId}/patrimonio`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ patrimonio }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao atualizar patrimônio do dispositivo.')
  }
  return response.json()
}

export async function solicitarDeviceFirewall(
  token: string,
  deviceId: number,
  patrimonio?: string,
): Promise<{ status: string; firewall_status: string; message: string }> {
  const response = await fetch(
    `${API_URL}/devices/${deviceId}/firewall-solicitar`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ patrimonio }),
    },
  )
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao solicitar liberação no firewall.')
  }
  return response.json()
}

export async function confirmarDeviceFirewall(
  token: string,
  deviceId: number,
): Promise<{ status: string; firewall_status: string; message: string }> {
  const response = await fetch(
    `${API_URL}/devices/${deviceId}/firewall-confirmar`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao confirmar cadastro no firewall.')
  }
  return response.json()
}

/* =========================================================
   NETWORK ASSETS & PERIPHERALS (DESCOBERTA ATIVA)
   ========================================================= */

export type NetworkAsset = {
  id: number
  company_id: number
  site_id: number | null
  site_nome: string | null
  site_codigo: string | null
  nome: string
  tipo: string
  ip: string | null
  mac: string | null
  patrimonio: string | null
  fabricante: string | null
  modelo: string | null
  numero_serie: string | null
  localizacao: string | null
  status_online: boolean | null
  ultimo_ping: string | null
  tempo_resposta_ms: number | null
  observacoes: string | null
  origem: string
  created_at: string
  updated_at: string
}

export type NetworkAssetInput = {
  nome: string
  tipo?: string
  site_id?: number | null
  ip?: string | null
  mac?: string | null
  patrimonio?: string | null
  fabricante?: string | null
  modelo?: string | null
  numero_serie?: string | null
  localizacao?: string | null
  observacoes?: string | null
}

export type PingResult = {
  asset_id: number
  ip: string
  online: boolean
  tempo_resposta_ms: number | null
  timestamp: string
}

export type ImportResult = {
  total_linhas: number
  criados: number
  atualizados: number
  ignorados: number
  erros: string[]
}

export async function getNetworkAssets(
  token: string,
  params?: {
    site_id?: number | null
    tipo?: string | null
    status_online?: boolean | null
    search?: string | null
  },
): Promise<NetworkAsset[]> {
  const q = new URLSearchParams()
  if (params?.site_id) q.set('site_id', String(params.site_id))
  if (params?.tipo && params.tipo !== 'todos') q.set('tipo', params.tipo)
  if (params?.status_online !== undefined && params.status_online !== null) {
    q.set('status_online', String(params.status_online))
  }
  if (params?.search && params.search.trim()) q.set('search', params.search.trim())

  const url = `${API_URL}/network-assets${q.toString() ? `?${q.toString()}` : ''}`
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao listar ativos de rede.')
  }
  return response.json()
}

export async function createNetworkAsset(
  token: string,
  data: NetworkAssetInput,
): Promise<NetworkAsset> {
  const response = await fetch(`${API_URL}/network-assets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao cadastrar ativo de rede.')
  }
  return response.json()
}

export async function updateNetworkAsset(
  token: string,
  id: number,
  data: Partial<NetworkAssetInput>,
): Promise<NetworkAsset> {
  const response = await fetch(`${API_URL}/network-assets/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao atualizar ativo de rede.')
  }
  return response.json()
}

export async function deleteNetworkAsset(
  token: string,
  id: number,
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_URL}/network-assets/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao excluir ativo de rede.')
  }
  return response.json()
}

export async function bulkDeleteNetworkAssets(
  token: string,
  ids: number[],
): Promise<{ success: boolean; removidos: number }> {
  const response = await fetch(`${API_URL}/network-assets/bulk-delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ids }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao excluir ativos de rede em massa.')
  }
  return response.json()
}

export async function pingNetworkAsset(
  token: string,
  id: number,
): Promise<PingResult> {
  const response = await fetch(`${API_URL}/network-assets/${id}/ping`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Falha ao testar conectividade do ativo.')
  }
  return response.json()
}

export async function scanNetworkAssetsBatch(
  token: string,
  params?: number | null | { asset_ids?: number[]; siteId?: number | null },
): Promise<PingResult[]> {
  let url = `${API_URL}/network-assets/scan-batch`
  let body: string | undefined = undefined

  if (typeof params === 'number') {
    url += `?site_id=${params}`
  } else if (params && typeof params === 'object') {
    if (params.siteId && !params.asset_ids) {
      url += `?site_id=${params.siteId}`
    }
    body = JSON.stringify({
      asset_ids: params.asset_ids || undefined,
      site_id: params.siteId || undefined,
    })
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body } : {}),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Falha ao executar varredura em lote.')
  }
  return response.json()
}

export async function importNetworkAssetsCSV(
  token: string,
  file: File,
): Promise<ImportResult> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_URL}/network-assets/import-csv`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao importar planilha CSV.')
  }
  return response.json()
}

export async function downloadNetworkAssetTemplate(token: string): Promise<void> {
  const response = await fetch(`${API_URL}/network-assets/template-csv`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) {
    throw new Error('Erro ao baixar modelo CSV.')
  }
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'modelo_ativos_rede.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

