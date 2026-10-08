import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import type { EnrichedMachine } from '../services/inventoryHelpers'
import type { UserResponse } from '../services/api'

interface SshTerminalModalProps {
  device: EnrichedMachine
  token: string
  onClose: () => void
  standalone?: boolean
  currentUser?: UserResponse | null
}

export function abrirTerminalSshPopup(device: EnrichedMachine): boolean {
  try {
    localStorage.setItem(`terminal_device_${device.id}`, JSON.stringify(device))
  } catch {}

  const w = 1040
  const h = 680
  const left = Math.max(0, Math.round((window.screen.availWidth - w) / 2))
  const top = Math.max(0, Math.round((window.screen.availHeight - h) / 2))
  const features = `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=no,status=no,toolbar=no,menubar=no,location=no`

  const url = `${window.location.origin}${window.location.pathname}#terminal?id=${device.id}`
  const targetName = `ssh_term_${device.id}`

  const win = window.open(url, targetName, features)
  if (win) {
    win.focus()
    return true
  }
  return false
}

export default function SshTerminalModal({
  device,
  token,
  onClose,
  standalone = false,
  currentUser,
}: SshTerminalModalProps) {
  const effectiveUser = currentUser || (() => {
    try {
      const raw = localStorage.getItem('current_user')
      return raw ? (JSON.parse(raw) as UserResponse) : null
    } catch {
      return null
    }
  })()

  const defaultUser = effectiveUser?.username || 'suporte'
  const hasAdSession = Boolean(effectiveUser?.has_ad_session)

  const [username, setUsername] = useState(defaultUser)
  const [password, setPassword] = useState('')
  const [useSessionCred, setUseSessionCred] = useState(hasAdSession)
  const [port, setPort] = useState(22)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  useEffect(() => {
    if (standalone) {
      document.title = `Terminal SSH - ${device.hostname} (${device.ip || 'Sem IP'})`
    }
  }, [standalone, device.hostname, device.ip])

  const terminalRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const termInstanceRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  // Inicializa o xterm na montagem do modal
  useEffect(() => {
    if (!terminalRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.2,
      theme: {
        background: '#090d16',
        foreground: '#e2e8f0',
        cursor: '#38bdf8',
        selectionBackground: 'rgba(56, 189, 248, 0.3)',
        black: '#1e293b',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#d946ef',
        cyan: '#06b6d4',
        white: '#f8fafc',
        brightBlack: '#475569',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#e879f9',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff',
      },
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(terminalRef.current)

    // Pequeno timeout para dar tempo ao container renderizar antes de calcular tamanho
    setTimeout(() => {
      try {
        fitAddon.fit()
      } catch { }
    }, 100)

    termInstanceRef.current = term
    fitAddonRef.current = fitAddon

    term.writeln('\x1b[36m============================================================\x1b[0m')
    term.writeln(`\x1b[1;37mTERMINAL REMOTO SSH - ${device.hostname}\x1b[0m`)
    term.writeln(`\x1b[90mIP de Destino: ${device.ip || 'Sem IP'} | SO: ${device.sistema || 'Linux'}\x1b[0m`)
    term.writeln('\x1b[36m============================================================\x1b[0m')
    term.writeln('Informe os dados de acesso acima e clique em \x1b[32m[Conectar]\x1b[0m.\r\n')

    const onDataDisposable = term.onData((data) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(data)
      }
    })

    // Observador para redimensionar quando a janela mudar
    const handleResize = () => {
      if (fitAddonRef.current && termInstanceRef.current) {
        try {
          fitAddonRef.current.fit()
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                action: 'resize',
                cols: termInstanceRef.current.cols,
                rows: termInstanceRef.current.rows,
              })
            )
          }
        } catch { }
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      onDataDisposable.dispose()
      if (wsRef.current) {
        wsRef.current.close()
      }
      term.dispose()
    }
  }, [device.hostname, device.ip, device.sistema])

  // Trata redimensionamento ao maximizar/restaurar
  useEffect(() => {
    setTimeout(() => {
      if (fitAddonRef.current && termInstanceRef.current) {
        try {
          fitAddonRef.current.fit()
          termInstanceRef.current.focus()
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                action: 'resize',
                cols: termInstanceRef.current.cols,
                rows: termInstanceRef.current.rows,
              })
            )
          }
        } catch { }
      }
    }, 150)
  }, [isMaximized])

  const handleConnect = () => {
    if (!device.id || !device.ip) return
    const term = termInstanceRef.current
    if (!term) return

    setIsConnecting(true)
    setStatusMessage('Estabelecendo túnel...')

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${proto}//${host}/api/v1/terminal/ssh/${device.id}?token=${encodeURIComponent(token)}`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      const cols = term.cols || 80
      const rows = term.rows || 24

      // Envia payload de handshake inicial
      ws.send(
        JSON.stringify({
          action: 'connect',
          username,
          password: useSessionCred ? undefined : (password || undefined),
          use_session_cred: useSessionCred,
          port: Number(port) || 22,
          cols,
          rows,
        })
      )

      setIsConnected(true)
      setIsConnecting(false)
      setStatusMessage('Conectado')
      term.focus()
    }

    ws.onmessage = async (event) => {
      if (event.data instanceof Blob) {
        const text = await event.data.text()
        term.write(text)
      } else if (typeof event.data === 'string') {
        if (event.data.includes('"action":"pong"')) return
        term.write(event.data)
      }
    }

    ws.onerror = () => {
      term.writeln('\r\n\x1b[31;1m[ERRO DE CONEXÃO WEBSOCKET]\x1b[0m Não foi possível comunicar com o servidor.')
      setIsConnected(false)
      setIsConnecting(false)
      setStatusMessage('Erro')
    }

    ws.onclose = () => {
      term.writeln('\r\n\x1b[33m[Sessão SSH finalizada]\x1b[0m\r\n')
      setIsConnected(false)
      setIsConnecting(false)
      setStatusMessage('Desconectado')
    }
  }

  const handleDisconnect = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
    setIsConnecting(false)
    setStatusMessage('Desconectado')
  }

  const modalBody = (
    <div className={`ssh-modal-window ${standalone ? 'standalone' : ''} ${isMaximized ? 'maximized' : ''}`}>
      {/* Header da Janela */}
      <div className="ssh-modal-header">
        <div className="ssh-header-title">
          <span className="ssh-terminal-icon">🖥️</span>
          <b>SSH Terminal:</b>
          <span className="ssh-host-tag">{device.hostname}</span>
          <span className="ssh-ip-tag">{device.ip || 'Sem IP'}</span>
          {isConnected && <span className="ssh-badge-online">🟢 Ativo</span>}
          {isConnecting && <span className="ssh-badge-connecting">🟡 Conectando...</span>}
          {!isConnected && !isConnecting && statusMessage && (
            <span className="ssh-badge-offline">⚪ {statusMessage}</span>
          )}
        </div>

        <div className="ssh-header-actions">
          {!standalone && (
            <button
              type="button"
              className="ssh-btn-icon"
              onClick={() => {
                handleDisconnect()
                abrirTerminalSshPopup(device)
                onClose()
              }}
              title="Destacar para janela popup separada"
            >
              ↗
            </button>
          )}
          <button
            type="button"
            className="ssh-btn-icon"
            onClick={() => setIsMaximized((prev) => !prev)}
            title={isMaximized ? 'Restaurar tamanho' : 'Maximizar'}
          >
            {isMaximized ? '❐' : '□'}
          </button>
          <button
            type="button"
            className="ssh-btn-close"
            onClick={() => {
              handleDisconnect()
              onClose()
            }}
            title={standalone ? 'Fechar janela' : 'Fechar'}
          >
            ✕
          </button>
        </div>
      </div>

        {/* Barra de Conexão e Credenciais */}
        <div className="ssh-connection-bar">
          <div className="ssh-field-item">
            <label>Usuário:</label>
            <input
              type="text"
              value={username}
              disabled={isConnected || isConnecting}
              onChange={(e) => {
                setUsername(e.target.value)
                if (hasAdSession && e.target.value !== effectiveUser?.username) {
                  setUseSessionCred(false)
                }
              }}
              placeholder="ex: suporte"
            />
          </div>

          <div className="ssh-field-item">
            <label>Senha:</label>
            {useSessionCred ? (
              <input
                type="text"
                value="••••••••••••"
                disabled={true}
                title="Autenticando com a senha segura da sessão AD corporativa"
                style={{
                  color: '#34d399',
                  letterSpacing: '2px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderColor: 'rgba(16, 185, 129, 0.4)',
                  cursor: 'default',
                  fontWeight: 'bold',
                }}
              />
            ) : (
              <input
                type="password"
                value={password}
                disabled={isConnected || isConnecting}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha SSH (opcional se chave)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isConnected && !isConnecting) {
                    handleConnect()
                  }
                }}
              />
            )}
          </div>

          {hasAdSession && (
            <label
              className="ssh-ad-toggle"
              title="Conecta diretamente utilizando a mesma autenticação do Active Directory da sessão atual"
            >
              <input
                type="checkbox"
                checked={useSessionCred}
                disabled={isConnected || isConnecting}
                onChange={(e) => {
                  const check = e.target.checked
                  setUseSessionCred(check)
                  if (check && effectiveUser?.username) {
                    setUsername(effectiveUser.username)
                  }
                }}
              />
              <span>🔒 Sessão AD</span>
            </label>
          )}

          <div className="ssh-field-item port-field">
            <label>Porta:</label>
            <input
              type="number"
              value={port}
              disabled={isConnected || isConnecting}
              onChange={(e) => setPort(Number(e.target.value))}
            />
          </div>

          <div className="ssh-connect-actions">
            {!isConnected ? (
              <button
                type="button"
                className="btn-ssh-connect"
                onClick={handleConnect}
                disabled={isConnecting || !device.ip}
              >
                {isConnecting ? 'Conectando...' : '⚡ Conectar'}
              </button>
            ) : (
              <button
                type="button"
                className="btn-ssh-disconnect"
                onClick={handleDisconnect}
              >
                Encerrar Sessão
              </button>
            )}
          </div>
        </div>

        {/* Container do Terminal xterm.js */}
        <div
          className="ssh-terminal-body"
          ref={terminalRef}
          onClick={() => termInstanceRef.current?.focus()}
        />

        {/* Rodapé informativo */}
        <div className="ssh-modal-footer">
          <span>Dica: Use <code>su &lt;seu_usuario&gt;</code> para elevar privilégios após conectar.</span>
          <span>Pressione <code>Ctrl+C</code> ou digite <code>exit</code> para sair.</span>
        </div>
      </div>
  )

  if (standalone) {
    return modalBody
  }

  return (
    <div className="ssh-modal-overlay">
      {modalBody}
    </div>
  )
}
