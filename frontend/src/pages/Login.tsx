import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { login } from '../services/api'

type LoginProps = {
  onLogin: (token: string) => void
  /** Mensagem opcional exibida acima do formulário (ex.: "Sua sessão expirou. Entre novamente.") */
  notice?: string
}

const USER_KEY = 'last_username'

/* localStorage pode estar bloqueado (modo privado, políticas): nunca deixa a tela quebrar */
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
  monitor: 'M2 4h20v12H2z M8 21h8 M12 16v5',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  box: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4',
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

const FEATURES: { icon: keyof typeof ICONS; title: string; text: string }[] = [
  { icon: 'monitor', title: 'Inventário unificado', text: 'Máquinas Linux e Windows em um só painel.' },
  { icon: 'chart', title: 'Relatórios sob medida', text: 'Consulte por processador, placa-mãe, memória, disco e muito mais.' },
  { icon: 'box', title: 'Aplicativos e versões', text: 'Saiba onde cada programa está instalado e em qual versão.' },
  { icon: 'shield', title: 'Acesso por filial', text: 'Cada perfil vê apenas os computadores liberados para o seu grupo.' },
]

function Login({ onLogin, notice }: LoginProps) {
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

  // Foco no primeiro campo que falta preencher
  useEffect(() => {
    if (salvo) passRef.current?.focus()
    else userRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      // o campo está desabilitado durante o envio: foca só depois que ele voltar a ficar ativo
      setTimeout(() => passRef.current?.focus(), 50)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Painel institucional */}
      <aside className="login-hero">
        <div className="login-brand light">
          <div className="login-brand-icon">
            <Icon name="bolt" size={22} />
          </div>
          <div>
            <strong>Sistema de Inventário</strong>
          </div>
        </div>

        <div className="login-hero-body">
          <h2>Gestão inteligente de ativos &amp; TI</h2>
          <p>Acompanhe todas as estações da rede, o estado de cada máquina e o que está instalado nelas.</p>

          <ul className="login-features">
            {FEATURES.map((f) => (
              <li key={f.title}>
                <span className="login-feature-ico">
                  <Icon name={f.icon} size={18} />
                </span>
                <div>
                  <b>{f.title}</b>
                  <span>{f.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="login-hero-foot">© {new Date().getFullYear()} · Uso interno</div>
      </aside>

      {/* Formulário */}
      <main className="login-panel">
        <div className="login-card">
          <div className="login-brand mobile">
            <div className="login-brand-icon">
              <Icon name="bolt" size={20} />
            </div>
            <div>
              <strong>Sistema de</strong>
              <span>Inventário</span>
            </div>
          </div>

          <div className="login-header">
            <h1>Bem-vindo</h1>
            <p>Entre com suas credenciais para acessar o inventário.</p>
          </div>

          {notice && (
            <div className="login-notice" role="status">
              <Icon name="info" size={16} />
              <span>{notice}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="login-field">
              <label htmlFor="username">Usuário</label>
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
              <label htmlFor="password">Senha</label>
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
              Lembrar meu usuário neste computador
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
                  <span className="login-spinner" /> Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <div className="login-footer">Gestão Inteligente de Ativos &amp; TI</div>
        </div>
      </main>
    </div>
  )
}

export default Login