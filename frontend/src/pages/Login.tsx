import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { login } from '../services/api'

type LoginProps = {
  onLogin: (token: string) => void
  /** Mensagem opcional exibida acima do formulário (ex.: "Sua sessão expirou. Entre novamente.") */
  notice?: string
}

const USER_KEY = 'last_username'

function lerUsuarioSalvo(): string {
  try {
    return localStorage.getItem(USER_KEY) || ''
  } catch {
    return ''
  }
}

function gravarUsuario(valor: string | null) {
  try {
    if (valor) localStorage.setItem(USER_KEY, valor)
    else localStorage.removeItem(USER_KEY)
  } catch {
    /* ignora */
  }
}

function traduzirErro(err: unknown): string {
  const msg = err instanceof Error ? err.message : ''
  if (!msg) return 'Erro ao realizar login.'
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg)) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
  }
  return msg
}

const ICONS = {
  bolt: 'M13 2L3 14h9l-1 8 10-12h-9z',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  lock: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff: 'M17.9 17.9A10.9 10.9 0 0 1 12 20C5 20 1 12 1 12a18.5 18.5 0 0 1 5.1-5.9 M9.9 4.2A10.7 10.7 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2 M14.1 14.1a3 3 0 1 1-4.2-4.2 M1 1l22 22',
  alert: 'M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z M12 9v4 M12 17h.01',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16v-4 M12 8h.01',
} as const

function Icon({ name, size = 18 }: { name: keyof typeof ICONS; size?: number }) {
  return (
    <svg
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

export default function Login({ onLogin, notice }: LoginProps) {
  const salvo = lerUsuarioSalvo()
  const [username, setUsername] = useState(salvo)
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(!!salvo)
  const [showPassword, setShowPassword] = useState(false)
  const [capsOn, setCapsOn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const userRef = useRef<HTMLInputElement>(null)
  const passRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (salvo) passRef.current?.focus()
    else userRef.current?.focus()
  }, [salvo])

  function atualizarCaps(event: KeyboardEvent<HTMLInputElement>) {
    setCapsOn(event.getModifierState('CapsLock'))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return

    const user = username.trim()
    if (!user || !password) {
      setError('Informe o usuário e a senha para continuar.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const response = await login(user, password)
      localStorage.setItem('access_token', response.access_token)
      gravarUsuario(remember ? user : null)
      onLogin(response.access_token)
    } catch (err) {
      setError(traduzirErro(err))
      setPassword('')
      setTimeout(() => passRef.current?.focus(), 50)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page-centered">
      <div className="login-card-box">
        {/* Logo & Header */}
        <div className="login-card-head">
          <div className="login-card-icon">
            <Icon name="bolt" size={24} />
          </div>
          <div className="login-brand-meta">
            <span className="login-pill-badge">SISTEMA CORPORATIVO</span>
            <h2>INVENTÁRIO TI</h2>
            <p>Acesso e gestão de ativos de TI &amp; Active Directory</p>
          </div>
        </div>

        {notice && (
          <div className="login-notice" role="status">
            <Icon name="info" size={16} />
            <span>{notice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="login-form">
          <div className="login-field">
            <label htmlFor="username">Usuário (Active Directory)</label>
            <div className="login-input">
              <span className="ic"><Icon name="user" size={16} /></span>
              <input
                ref={userRef}
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="nome.sobrenome"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                disabled={loading}
                aria-invalid={!!error}
                required
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="password">Senha de Rede</label>
            <div className="login-input">
              <span className="ic"><Icon name="lock" size={16} /></span>
              <input
                ref={passRef}
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={atualizarCaps}
                onKeyUp={atualizarCaps}
                onBlur={() => setCapsOn(false)}
                placeholder="Digite sua senha"
                autoComplete="current-password"
                disabled={loading}
                aria-invalid={!!error}
                required
              />
              <button
                type="button"
                className="login-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
                tabIndex={-1}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} size={16} />
              </button>
            </div>

            {capsOn && (
              <div className="login-caps" role="status">
                <Icon name="alert" size={13} /> Caps Lock está ativado
              </div>
            )}
          </div>

          <label className="login-remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              disabled={loading}
            />
            <span>Lembrar meu usuário neste computador</span>
          </label>

          <div aria-live="assertive">
            {error && (
              <div className="login-error" role="alert">
                <Icon name="alert" size={16} />
                <span>{error}</span>
              </div>
            )}
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? (
              <>
                <span className="login-spinner" />
                <span>Autenticando no servidor...</span>
              </>
            ) : (
              <span>Entrar no Sistema</span>
            )}
          </button>
        </form>

        <div className="login-foot-status">
          <span className="login-dot-live" />
          <span>Conexão Segura Criptografada SSL/TLS · Active Directory Sync</span>
        </div>
      </div>
    </div>
  )
}