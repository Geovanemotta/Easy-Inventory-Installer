import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import AgentInstallModal from './components/AgentInstallModal'
import DeleteDeviceModal from './components/DeleteDeviceModal'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ActiveDirectoryPage from './pages/ActiveDirectoryPage'
import AppsPage from './pages/AppsPage'
import InventoryPage from './pages/InventoryPage'
import Login from './pages/Login'
import NetworkAssetsPage from './pages/NetworkAssetsPage'
import ReportsPage from './pages/ReportsPage'
import {
  clearDeviceAlert,
  deleteDevice,
  getCurrentUser,
  getDeviceHistory,
  getInventoryData,
  type HistoryItem,
  type RawInventoryItem,
} from './services/api'
import {
  enriquecer,
  ORDEM_TIPO,
  type EnrichedMachine,
} from './services/inventoryHelpers'

export default function App() {
  const [loggedIn, setLoggedIn] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('access_token'))
  })
  const [currentUser, setCurrentUser] = useState<{
    id: number
    username: string
    email: string
    full_name: string
    company_id: number
    active: boolean
    is_superadmin: boolean
    roles?: string[]
  } | null>(() => {
    try {
      const saved = localStorage.getItem('current_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [rawInventory, setRawInventory] = useState<RawInventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string>('-')
  const [view, setView] = useState<'inv' | 'rel' | 'apps' | 'ad' | 'net'>('inv')
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Target machine para navegação vinda de relatórios ou apps
  const [inventoryTarget, setInventoryTarget] = useState<string | null>(null)

  // Histórico de alterações e auditoria de hardware drift
  const [historicoMap, setHistoricoMap] = useState<Record<number, HistoryItem[]>>({})
  const [loadingHistorico, setLoadingHistorico] = useState<Record<number, boolean>>({})

  // Modais globais
  const [showAgentModal, setShowAgentModal] = useState<boolean>(false)
  const [deviceParaExcluir, setDeviceParaExcluir] = useState<EnrichedMachine | null>(null)
  const [excluindoDevice, setExcluindoDevice] = useState<boolean>(false)

  const showToast = useCallback((msg: string, duration = 2400) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
    }
    setToast(msg)
    toastTimerRef.current = setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, duration)
  }, [])

  async function copiarTexto(texto: string) {
    try {
      await navigator.clipboard.writeText(texto)
      showToast('Copiado!', 1500)
    } catch {
      showToast('Erro ao copiar')
    }
  }

  function irPara(v: 'inv' | 'rel' | 'apps' | 'ad' | 'net') {
    setView(v)
    window.location.hash = v
  }

  function abrirMaquinaNoInventario(hostname: string) {
    setInventoryTarget(hostname)
    irPara('inv')
  }

  async function carregarHistorico(deviceId: number) {
    const token = localStorage.getItem('access_token')
    if (!token) return
    setLoadingHistorico((prev) => ({ ...prev, [deviceId]: true }))
    try {
      const data = await getDeviceHistory(token, deviceId)
      setHistoricoMap((prev) => ({ ...prev, [deviceId]: data }))
    } catch (err: unknown) {
      console.error('Erro ao carregar histórico:', err)
      showToast('Erro ao carregar histórico')
    } finally {
      setLoadingHistorico((prev) => ({ ...prev, [deviceId]: false }))
    }
  }

  async function handleLimparAlerta(deviceId: number) {
    const token = localStorage.getItem('access_token')
    if (!token) return
    try {
      await clearDeviceAlert(token, deviceId)
      setRawInventory((prev) =>
        prev.map((d) => (d.id === deviceId ? { ...d, alerta_hardware: null } : d))
      )
      await carregarHistorico(deviceId)
      showToast('Alerta resolvido com sucesso!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      alert(msg)
    }
  }

  async function handleConfirmarExclusao() {
    if (!deviceParaExcluir || !deviceParaExcluir.id) return
    const token = localStorage.getItem('access_token')
    if (!token) return
    setExcluindoDevice(true)
    try {
      const devId = deviceParaExcluir.id
      const host = deviceParaExcluir.hostname
      await deleteDevice(token, devId)
      setRawInventory((prev) => prev.filter((d) => d.id !== devId))
      setDeviceParaExcluir(null)
      showToast(`Máquina ${host} excluída com sucesso!`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      alert(`Falha ao excluir: ${msg}`)
    } finally {
      setExcluindoDevice(false)
    }
  }

  function handleUpdateDeviceLocal(updated: Partial<RawInventoryItem> & { id: number }) {
    setRawInventory((prev) =>
      prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d))
    )
  }

  const inventario: EnrichedMachine[] = useMemo(() => {
    const seen = new Set<string>()
    const unique: RawInventoryItem[] = []
    for (const item of rawInventory) {
      const key = (item.hostname || '').toUpperCase().trim()
      if (key && seen.has(key)) {
        continue
      }
      if (key) seen.add(key)
      unique.push(item)
    }
    return unique.map(enriquecer)
  }, [rawInventory])

  const filiaisOpcoes = useMemo(() => {
    const fm = new Map<
      string,
      { filial: string; tipo: string; num: number; n: number }
    >()
    inventario.forEach((i: EnrichedMachine) => {
      const cur = fm.get(i._f.filial) || {
        filial: i._f.filial,
        tipo: i._f.tipo,
        num: i._f.num,
        n: 0,
      }
      cur.n++
      fm.set(i._f.filial, cur)
    })
    return [...fm.values()].sort(
      (a, b) =>
        (ORDEM_TIPO[a.tipo] ?? 99) - (ORDEM_TIPO[b.tipo] ?? 99) ||
        a.num - b.num
    )
  }, [inventario])

  async function handleLogin(token: string) {
    try {
      localStorage.setItem('access_token', token)
      setLoggedIn(true)
      const user = await getCurrentUser(token)
      setCurrentUser(user)
      localStorage.setItem('current_user', JSON.stringify(user))
      await carregarDados(token)
    } catch (err) {
      console.error('Erro ao obter dados do usuário:', err)
      await carregarDados(token)
    }
  }

  function handleLogout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('current_user')
    setCurrentUser(null)
    setLoggedIn(false)
    setRawInventory([])
  }

  async function carregarDados(tokenParam?: string) {
    const token =
      (typeof tokenParam === 'string' && tokenParam.trim() ? tokenParam.trim() : undefined) ||
      localStorage.getItem('access_token')
    if (!token) {
      console.warn('Sem token de acesso.')
      return
    }

    try {
      setLoading(true)
      const data = await getInventoryData(token)
      setRawInventory(data.items || [])
      setLastUpdate(new Date().toLocaleTimeString('pt-BR'))
    } catch (err: unknown) {
      console.error('Erro ao carregar inventário:', err)
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Sessão expirada') || msg.includes('401')) {
        handleLogout()
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setLoggedIn(false)
      return
    }

    // Carrega dados imediatamente se o token existir
    carregarDados(token)

    // Valida credenciais e permissões com /auth/me
    getCurrentUser(token)
      .then((user) => {
        setCurrentUser(user)
        localStorage.setItem('current_user', JSON.stringify(user))
        setLoggedIn(true)
      })
      .catch((err: unknown) => {
        console.warn('Validação de sessão em background:', err)
        const msg = err instanceof Error ? err.message : String(err)
        // Só desloga se o token foi explicitamente rejeitado pelo servidor com 401
        // Se a requisição foi abortada por F5 ou erro de rede transitório, preserva o token!
        if (msg.includes('Sessão expirada') || msg.includes('401') || msg.includes('Usuário ou senha inválidos')) {
          handleLogout()
        }
      })
  }, [])

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (['rel', 'apps', 'ad', 'net'].includes(hash)) {
      setView(hash as 'inv' | 'rel' | 'apps' | 'ad' | 'net')
    } else {
      setView('inv')
    }

    const onHashChange = () => {
      const h = window.location.hash.replace('#', '')
      if (['rel', 'apps', 'ad', 'net'].includes(h)) {
        setView(h as 'inv' | 'rel' | 'apps' | 'ad' | 'net')
      } else {
        setView('inv')
      }
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Restrição de perfis: apenas administradores têm acesso a apps e ad
  useEffect(() => {
    const isAdmin = Boolean(currentUser?.is_superadmin || currentUser?.roles?.includes('admin'))
    if (currentUser && !isAdmin && (view === 'apps' || view === 'ad')) {
      irPara('inv')
    }
  }, [currentUser, view])

  // Atualização periódica em background (5 minutos)
  useEffect(() => {
    if (!loggedIn) return
    const timer = setInterval(() => {
      const t = localStorage.getItem('access_token')
      if (t) carregarDados(t)
    }, 300000)
    return () => clearInterval(timer)
  }, [loggedIn])

  if (!loggedIn) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="app">
      {/* Sidebar de Navegação */}
      <Sidebar
        view={view}
        irPara={irPara}
        inventarioCount={inventario.length}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Área Principal de Conteúdo */}
      <main>
        <Header
          view={view}
          lastUpdate={lastUpdate}
          loading={loading}
          isSuperAdmin={Boolean(currentUser?.is_superadmin)}
          onRefresh={() => carregarDados()}
          onOpenAgentModal={() => setShowAgentModal(true)}
        />

        <div className="container">
          {view === 'inv' && (
            <InventoryPage
              inventario={inventario}
              filiaisOpcoes={filiaisOpcoes}
              isSuperAdmin={Boolean(currentUser?.is_superadmin)}
              userRoles={currentUser?.roles || []}
              loading={loading}
              historicoMap={historicoMap}
              loadingHistorico={loadingHistorico}
              onLoadHistorico={carregarHistorico}
              onClearAlert={handleLimparAlerta}
              onRequestDelete={(device) => setDeviceParaExcluir(device)}
              copiarTexto={copiarTexto}
              inventoryTarget={inventoryTarget}
              onClearTarget={() => setInventoryTarget(null)}
              onUpdateDevice={handleUpdateDeviceLocal}
              showToast={showToast}
            />
          )}

          {view === 'rel' && (
            <ReportsPage
              inventario={inventario}
              filiaisOpcoes={filiaisOpcoes}
              isSuperAdmin={Boolean(currentUser?.is_superadmin)}
              abrirMaquinaNoInventario={abrirMaquinaNoInventario}
            />
          )}

          {view === 'net' && (
            <NetworkAssetsPage
              token={localStorage.getItem('access_token') || ''}
              isSuperAdmin={Boolean(currentUser?.is_superadmin)}
              userRoles={currentUser?.roles || []}
              showToast={showToast}
            />
          )}

          {view === 'apps' && (
            <AppsPage
              inventario={inventario}
              abrirMaquinaNoInventario={abrirMaquinaNoInventario}
            />
          )}

          {view === 'ad' && (
            <ActiveDirectoryPage showToast={showToast} />
          )}
        </div>
      </main>

      {/* Modal de Instalação dos Agentes */}
      <AgentInstallModal
        isOpen={showAgentModal}
        onClose={() => setShowAgentModal(false)}
      />

      {/* Modal de Confirmação de Exclusão de Máquina */}
      <DeleteDeviceModal
        device={deviceParaExcluir}
        isDeleting={excluindoDevice}
        onConfirm={handleConfirmarExclusao}
        onCancel={() => setDeviceParaExcluir(null)}
      />

      {/* Notificação Toast Flutuante */}
      {toast && (
        <div
          className={`toast ${
            toast.toLowerCase().includes('erro') || toast.toLowerCase().includes('falha')
              ? 'toast-error'
              : 'toast-success'
          }`}
          role="status"
          aria-live="polite"
        >
          <span className="toast-icon">
            {toast.toLowerCase().includes('erro') || toast.toLowerCase().includes('falha') ? '⚠️' : '✓'}
          </span>
          <span className="toast-text">{toast}</span>
        </div>
      )}
    </div>
  )
}

