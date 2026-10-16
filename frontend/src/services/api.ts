const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.port === '5173'
    ? 'http://localhost:8000/api/v1'
    : '/api/v1')


export type LoginResponse = {
  access_token?: string
  token_type?: string
  requires_2fa?: boolean
  setup_2fa_required?: boolean
  temp_token?: string
  secret?: string
  qr_code?: string
  otpauth_url?: string
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
    if (response.status === 429) {
      throw new Error('Muitas tentativas de login. Aguarde alguns instantes.')
    }

    throw new Error('Erro ao realizar login.')
  }

  return response.json()
}

export async function verify2FA(
  temp_token: string,
  code: string,
): Promise<{ access_token: string; token_type: string }> {
  const response = await fetch(`${API_URL}/auth/verify-2fa`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      temp_token,
      code,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Código de verificação 2FA inválido.')
  }

  return response.json()
}

export type UserResponse = {
  id: number
  username: string
  email: string
  full_name: string
  company_id: number
  active: boolean
  is_superadmin: boolean
  roles?: string[]
  has_ad_session?: boolean
  two_factor_enabled?: boolean
}

export type ManagedUser = {
  id: number
  username: string
  full_name: string
  email: string | null
  auth_source: string
  active: boolean
  is_superadmin: boolean
  two_factor_enabled: boolean
  roles: string[]
  created_at: string | null
}

export async function listUsers(token: string): Promise<ManagedUser[]> {
  const response = await fetch(`${API_URL}/auth/users`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Falha ao carregar lista de usuários.')
  }

  return response.json()
}

export async function resetUser2FA(
  token: string,
  userId: number,
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_URL}/auth/users/${userId}/reset-2fa`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Falha ao resetar o 2FA.')
  }

  return response.json()
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
  site_id?: number | null
  site_code?: string | null
  site_name?: string | null
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
  perifericos?: PerifericoItem[]
  patrimonio?: string | null
  serial_windows?: string | null
  serial_office?: string | null
  firewall_status?: string | null
  firewall_solicitado_por?: string | null
  firewall_solicitado_em?: string | null
  firewall_confirmado_por?: string | null
  firewall_confirmado_em?: string | null
}

export interface PerifericoItem {
  tipo: 'monitor' | 'smartphone' | 'teclado' | 'mouse' | 'armazenamento_usb' | 'impressora' | 'webcam' | 'audio' | 'outro' | string
  nome: string
  fabricante?: string
  serial?: string
  conexao?: string
  capacidade?: string
  detalhes?: string
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
  identifiers?: string[]
  devices_count?: number
  network_assets_count?: number
}

export type SiteCreatePayload = {
  name: string
  code: string
  active?: boolean
  identifiers: string[]
}

export type SiteUpdatePayload = {
  name?: string
  code?: string
  active?: boolean
  identifiers?: string[]
}

export type SiteSimulationResult = {
  matched: boolean
  site_id?: number | null
  site_name?: string | null
  site_code?: string | null
  matched_by?: string | null
  details: string
}

export type SiteReclassifyResult = {
  total_scanned: number
  total_reclassified: number
  changes: Array<{
    device_id: number
    hostname: string
    old_site?: string | null
    new_site: string
  }>
}

export async function getSites(
  token: string,
  includeInactive: boolean = false,
): Promise<Site[]> {
  const query = includeInactive ? '?include_inactive=true' : ''
  const response = await fetch(
    `${API_URL}/sites${query}`,
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

export async function createSite(
  token: string,
  payload: SiteCreatePayload,
): Promise<Site> {
  const response = await fetch(`${API_URL}/sites`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao cadastrar nova filial.')
  }

  return response.json()
}

export async function updateSite(
  token: string,
  siteId: number,
  payload: SiteUpdatePayload,
): Promise<Site> {
  const response = await fetch(`${API_URL}/sites/${siteId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao atualizar filial.')
  }

  return response.json()
}

export async function deleteSite(
  token: string,
  siteId: number,
): Promise<{ detail: string; deactivated?: boolean }> {
  const response = await fetch(`${API_URL}/sites/${siteId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao excluir filial.')
  }

  return response.json()
}

export async function simulateSiteMatch(
  token: string,
  hostname: string,
  loja?: string,
): Promise<SiteSimulationResult> {
  const response = await fetch(`${API_URL}/sites/simulate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      hostname,
      loja: loja || null,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao simular identificação da filial.')
  }

  return response.json()
}

export async function reclassifySites(
  token: string,
  onlyUnassigned: boolean = true,
  siteId?: number,
): Promise<SiteReclassifyResult> {
  const response = await fetch(`${API_URL}/sites/reclassify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      only_unassigned: onlyUnassigned,
      site_id: siteId || null,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao reclassificar computadores.')
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
  id: number | null
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
  origem: 'manual' | 'planilha' | 'estacao' | 'livre' | string
  device_id?: number | null
  faixa_nome?: string | null
  sistema_operacional?: string | null
  serial_windows?: string | null
  serial_office?: string | null
  created_at: string
  updated_at: string
}

export type SiteIpRange = {
  id: number
  company_id: number
  site_id: number
  site_nome: string | null
  site_codigo: string | null
  nome: string
  ip_inicio: string
  ip_fim: string
  gateway: string | null
  mascara: string | null
  observacoes: string | null
  total_ips: number
  ips_ocupados: number
  ips_livres: number
  created_at: string
  updated_at: string
}

export type SiteIpRangeInput = {
  site_id: number
  nome: string
  ip_inicio: string
  ip_fim: string
  gateway?: string | null
  mascara?: string | null
  observacoes?: string | null
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
  serial_windows?: string | null
  serial_office?: string | null
}

export type PingResult = {
  asset_id: number | null
  ip: string
  online: boolean
  tempo_resposta_ms: number | null
  timestamp: string
}

export type ImportStationConflict = {
  linha: number
  ip: string
  nome_planilha: string
  estacao_nome: string
  estacao_patrimonio?: string | null
  patrimonio_atualizado?: boolean
  patrimonio_novo?: string | null
  mensagem: string
}

export type ImportResult = {
  total_linhas: number
  criados: number
  atualizados: number
  ignorados: number
  erros: string[]
  conflitos_estacao?: ImportStationConflict[]
}

export async function getNetworkAssets(
  token: string,
  params?: {
    site_id?: number | null
    tipo?: string | null
    status_online?: boolean | null
    search?: string | null
    filtro_ocupacao?: string | null
    faixa_id?: number | null
  },
): Promise<NetworkAsset[]> {
  const q = new URLSearchParams()
  if (params?.site_id) q.set('site_id', String(params.site_id))
  if (params?.tipo && params.tipo !== 'todos') q.set('tipo', params.tipo)
  if (params?.status_online !== undefined && params.status_online !== null) {
    q.set('status_online', String(params.status_online))
  }
  if (params?.search && params.search.trim()) q.set('search', params.search.trim())
  if (params?.filtro_ocupacao && params.filtro_ocupacao !== 'todos') {
    q.set('filtro_ocupacao', params.filtro_ocupacao)
  }
  if (params?.faixa_id) q.set('faixa_id', String(params.faixa_id))

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
  params?: number | null | { asset_ids?: number[]; siteId?: number | null; ips?: string[] },
): Promise<PingResult[]> {
  let url = `${API_URL}/network-assets/scan-batch`
  let body: string | undefined = undefined

  if (typeof params === 'number') {
    url += `?site_id=${params}`
  } else if (params && typeof params === 'object') {
    if (params.siteId && !params.asset_ids && !params.ips) {
      url += `?site_id=${params.siteId}`
    }
    body = JSON.stringify({
      asset_ids: params.asset_ids || undefined,
      site_id: params.siteId || undefined,
      ips: params.ips || undefined,
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

export async function pingDirectIp(token: string, ip: string): Promise<PingResult> {
  const response = await fetch(`${API_URL}/network-assets/ping-ip?ip=${encodeURIComponent(ip)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Falha ao testar IP.')
  }
  return response.json()
}

export async function getSiteIpRanges(
  token: string,
  site_id?: number | null,
): Promise<SiteIpRange[]> {
  const q = new URLSearchParams()
  if (site_id) q.set('site_id', String(site_id))

  const url = `${API_URL}/network-assets/ranges${q.toString() ? `?${q.toString()}` : ''}`
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao carregar faixas de IP.')
  }
  return response.json()
}

export async function createSiteIpRange(
  token: string,
  data: SiteIpRangeInput,
): Promise<SiteIpRange> {
  const response = await fetch(`${API_URL}/network-assets/ranges`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao cadastrar faixa de IP.')
  }
  return response.json()
}

export async function updateSiteIpRange(
  token: string,
  rangeId: number,
  data: Partial<SiteIpRangeInput>,
): Promise<SiteIpRange> {
  const response = await fetch(`${API_URL}/network-assets/ranges/${rangeId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao atualizar faixa de IP.')
  }
  return response.json()
}

export async function deleteSiteIpRange(
  token: string,
  rangeId: number,
): Promise<void> {
  const response = await fetch(`${API_URL}/network-assets/ranges/${rangeId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao excluir faixa de IP.')
  }
}

export type RemoteAccessConfig = {
  enabled: boolean
  mesh_port: number
  mesh_url: string
  server_host: string
  features: {
    desktop_sharing: boolean
    file_transfer: boolean
    uac_support: boolean
    unlimited_concurrent: boolean
  }
  user: {
    username: string
    full_name: string
    is_admin: boolean
  }
}

export async function getRemoteAccessConfig(token: string): Promise<RemoteAccessConfig> {
  const response = await fetch(`${API_URL}/remote-access/config`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao obter configurações de acesso remoto.')
  }
  return response.json()
}

/* =========================================================
   CONTROLE DE LICENÇAS E SERIAIS (WINDOWS / OFFICE)
   ========================================================= */

export type License = {
  id: number
  company_id: number
  site_id?: number | null
  site_nome?: string | null
  site_codigo?: string | null
  categoria: 'windows' | 'office' | 'outro' | string
  software_nome: string
  chave: string
  tipo_licenca?: string | null
  nota_fiscal?: string | null
  quantidade_total: number
  quantidade_em_uso: number
  quantidade_disponivel: number
  esgotada: boolean
  observacoes?: string | null
  data_aquisicao?: string | null
  created_at: string
  updated_at: string
}

export type LicenseInput = {
  site_id?: number | null
  categoria: string
  software_nome: string
  chave: string
  tipo_licenca?: string | null
  nota_fiscal?: string | null
  quantidade_total: number
  observacoes?: string | null
  data_aquisicao?: string | null
}

export type LicenseAvailable = {
  id: number
  chave: string
  software_nome: string
  categoria: string
  tipo_licenca?: string | null
  nota_fiscal?: string | null
  site_id?: number | null
  site_nome?: string | null
  quantidade_total: number
  quantidade_em_uso: number
  quantidade_disponivel: number
  esgotada: boolean
}

export type LicenseDeviceItem = {
  id: number
  hostname: string
  tipo: string
  ip?: string | null
  site_nome?: string | null
  site_codigo?: string | null
  patrimonio?: string | null
  slot: 'windows' | 'office'
  origem: 'estacao' | 'ativo'
  data_coleta?: string | null
}

export type LicenseStats = {
  total_licencas: number
  total_em_uso: number
  total_disponiveis: number
  total_esgotadas: number
  por_categoria: Record<string, { total: number; em_uso: number; disponivel: number; esgotadas: number }>
  por_filial: Array<{ filial: string; total: number; em_uso: number; disponivel: number }>
}

export type LicenseAssignInput = {
  device_id?: number | null
  network_asset_id?: number | null
  slot: 'windows' | 'office'
  chave?: string | null
}

export async function getLicenses(
  token: string,
  params?: {
    site_id?: number | null
    categoria?: string | null
    status?: string | null
    search?: string | null
    software_nome?: string | null
  },
): Promise<License[]> {
  const q = new URLSearchParams()
  if (params?.site_id !== undefined && params?.site_id !== null) q.set('site_id', String(params.site_id))
  if (params?.categoria && params.categoria !== 'todos') q.set('categoria', params.categoria)
  if (params?.status && params.status !== 'todas') q.set('status', params.status)
  if (params?.search && params.search.trim()) q.set('search', params.search.trim())
  if (params?.software_nome && params.software_nome !== 'todos') q.set('software_nome', params.software_nome)

  const url = `${API_URL}/licenses${q.toString() ? `?${q.toString()}` : ''}`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao carregar licenças.')
  }
  return response.json()
}

export async function getLicenseStats(
  token: string,
  site_id?: number | null,
): Promise<LicenseStats> {
  const q = new URLSearchParams()
  if (site_id !== undefined && site_id !== null) q.set('site_id', String(site_id))

  const url = `${API_URL}/licenses/stats${q.toString() ? `?${q.toString()}` : ''}`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao carregar estatísticas de licenças.')
  }
  return response.json()
}

export async function getAvailableLicenses(
  token: string,
  params?: {
    categoria?: string | null
    site_id?: number | null
    chave_atual?: string | null
  },
): Promise<LicenseAvailable[]> {
  const q = new URLSearchParams()
  if (params?.categoria) q.set('categoria', params.categoria)
  if (params?.site_id !== undefined && params?.site_id !== null) q.set('site_id', String(params.site_id))
  if (params?.chave_atual) q.set('chave_atual', params.chave_atual)

  const url = `${API_URL}/licenses/available${q.toString() ? `?${q.toString()}` : ''}`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao buscar licenças disponíveis.')
  }
  return response.json()
}

export async function getLicenseDevices(
  token: string,
  license_id: number,
): Promise<LicenseDeviceItem[]> {
  const response = await fetch(`${API_URL}/licenses/${license_id}/devices`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao carregar computadores vinculados.')
  }
  return response.json()
}

export async function createLicense(
  token: string,
  data: LicenseInput,
): Promise<License> {
  const response = await fetch(`${API_URL}/licenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao cadastrar licença.')
  }
  return response.json()
}

export async function updateLicense(
  token: string,
  id: number,
  data: Partial<LicenseInput>,
): Promise<License> {
  const response = await fetch(`${API_URL}/licenses/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao atualizar licença.')
  }
  return response.json()
}

export async function deleteLicense(
  token: string,
  id: number,
): Promise<{ success: boolean; message: string; em_uso_no_momento: number }> {
  const response = await fetch(`${API_URL}/licenses/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao excluir licença.')
  }
  return response.json()
}

export async function assignLicense(
  token: string,
  data: LicenseAssignInput,
): Promise<{ success: boolean; slot: string; chave: string | null; message: string }> {
  const response = await fetch(`${API_URL}/licenses/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Erro ao atribuir licença.')
  }
  return response.json()
}

