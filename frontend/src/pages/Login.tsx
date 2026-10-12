import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { login, verify2FA } from '../services/api'
import logoGiassi from '../assets/logo_giassi.png'
import '../styles/pages/login.css'

type LoginProps = {
  onLogin: (token: string) => void
  notice?: string
}

const USER_KEY = 'last_username'

function lerUsuarioSalvo(): string {
  try { return localStorage.getItem(USER_KEY) || '' } catch { return '' }
}

function gravarUsuario(valor: string | null) {
  try {
    if (valor) localStorage.setItem(USER_KEY, valor)
    else localStorage.removeItem(USER_KEY)
  } catch { }
}

function traduzirErro(err: unknown): string {
  const msg = err instanceof Error ? err.message : ''
  if (!msg) return 'Erro ao realizar login.'
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg)) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão.'
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
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  arrowLeft: 'M19 12H5 M12 19l-7-7 7-7',
  copy: 'M8 17.929H6c-1.105 0-2-.895-2-2V4c0-1.105.895-2 2-2h10c1.105 0 2 .895 2 2v2 M8 6h10c1.105 0 2 .895 2 2v12c0 1.105-.895 2-2 2H8c-1.105 0-2-.895-2-2V8c0-1.105.895-2 2-2z',
  check: 'M20 6L9 17l-5-5',
} as const

function Icon({ name, size = 18 }: { name: keyof typeof ICONS; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  )
}

type LoginStep = 'credentials' | 'challenge_2fa' | 'setup_2fa'

export default function Login({ onLogin, notice }: LoginProps) {
  const salvo = lerUsuarioSalvo()
  const [username, setUsername] = useState(salvo)
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(!!salvo)
  const [showPassword, setShowPassword] = useState(false)
  const [capsOn, setCapsOn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Estados do fluxo de 2FA
  const [step, setStep] = useState<LoginStep>('credentials')
  const [tempToken, setTempToken] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [copiedSecret, setCopiedSecret] = useState(false)

  const userRef = useRef<HTMLInputElement>(null)
  const passRef = useRef<HTMLInputElement>(null)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === 'credentials') {
      if (salvo) passRef.current?.focus()
      else userRef.current?.focus()
    } else {
      setTimeout(() => codeRef.current?.focus(), 80)
    }
  }, [salvo, step])

  function atualizarCaps(event: KeyboardEvent<HTMLInputElement>) {
    setCapsOn(event.getModifierState('CapsLock'))
  }

  async function handleSubmitCredentials(event: FormEvent<HTMLFormElement>) {
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

      // 1. Desafio 2FA (Usuário já tem 2FA configurado)
      if (response.requires_2fa && response.temp_token) {
        setTempToken(response.temp_token)
        setTotpCode('')
        setStep('challenge_2fa')
        return
      }

      // 2. Primeiro Login com 2FA Obrigatório
      if (response.setup_2fa_required && response.temp_token) {
        setTempToken(response.temp_token)
        setQrCodeUrl(response.qr_code || '')
        setSecretKey(response.secret || '')
        setTotpCode('')
        setStep('setup_2fa')
        return
      }

      // 3. Login Direto (Caso 2FA não seja exigido)
      if (response.access_token) {
        localStorage.setItem('access_token', response.access_token)
        gravarUsuario(remember ? user : null)
        onLogin(response.access_token)
      }
    } catch (err) {
      setError(traduzirErro(err))
      setPassword('')
      setTimeout(() => passRef.current?.focus(), 50)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit2FA(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading || !tempToken) return

    const cleanCode = totpCode.trim().replace(/\s+/g, '')
    if (cleanCode.length !== 6) {
      setError('Digite o código de 6 dígitos do aplicativo autenticador.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const res = await verify2FA(tempToken, cleanCode)
      localStorage.setItem('access_token', res.access_token)
      gravarUsuario(remember ? username.trim() : null)
      onLogin(res.access_token)
    } catch (err) {
      setError(traduzirErro(err))
      setTotpCode('')
      setTimeout(() => codeRef.current?.focus(), 50)
    } finally {
      setLoading(false)
    }
  }

  function handleBackToCredentials() {
    setStep('credentials')
    setTotpCode('')
    setError('')
    setPassword('')
  }

  function handleCopySecret() {
    if (!secretKey) return
    navigator.clipboard.writeText(secretKey).then(() => {
      setCopiedSecret(true)
      setTimeout(() => setCopiedSecret(false), 2000)
    }).catch(() => {})
  }

  return (
    <div className="login-container">
      <div className="login-card">

        {/* Coluna da Esquerda: Formulário */}
        <div className="login-form-section">

          {step === 'credentials' && (
            <>
              <div className="login-header">
                <span className="login-badge">Grupo Giassi</span>
                <h2>Inventário e Ativos de Rede</h2>
                <p>Insira suas credenciais corporativas abaixo para acessar o sistema.</p>
              </div>

              {notice && (
                <div className="login-notice" role="status">
                  <Icon name="info" size={16} />
                  <span>{notice}</span>
                </div>
              )}

              <form onSubmit={handleSubmitCredentials} noValidate className="login-form">
                <div className="login-field">
                  <label htmlFor="username">Usuário</label>
                  <div className="login-input-wrapper">
                    <span className="input-icon"><Icon name="user" size={16} /></span>
                    <input
                      ref={userRef}
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      disabled={loading}
                      aria-invalid={!!error}
                      required
                    />
                  </div>
                </div>

                <div className="login-field">
                  <label htmlFor="password">Senha</label>
                  <div className="login-input-wrapper">
                    <span className="input-icon"><Icon name="lock" size={16} /></span>
                    <input
                      ref={passRef}
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={atualizarCaps}
                      onKeyUp={atualizarCaps}
                      onBlur={() => setCapsOn(false)}
                      autoComplete="current-password"
                      disabled={loading}
                      aria-invalid={!!error}
                      required
                    />
                    <button
                      type="button"
                      className="btn-eye"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      <Icon name={showPassword ? 'eyeOff' : 'eye'} size={16} />
                    </button>
                  </div>
                  {capsOn && (
                    <div className="login-caps"><Icon name="alert" size={13} /> Caps Lock ativado</div>
                  )}
                </div>

                <label className="login-remember">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    disabled={loading}
                  />
                  <span>Lembrar meu usuário neste computador</span>
                </label>

                {error && (
                  <div className="login-error" role="alert">
                    <Icon name="alert" size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <button type="submit" className="login-button" disabled={loading}>
                  {loading ? (
                    <><span className="spinner" /> Autenticando...</>
                  ) : (
                    'Entrar no Sistema'
                  )}
                </button>
              </form>
            </>
          )}

          {step === 'challenge_2fa' && (
            <div className="two-factor-screen">
              <div className="login-header">
                <span className="login-badge"><Icon name="shield" size={12} /> Segurança Corporativa</span>
                <h2>Verificação em 2 Etapas</h2>
                <p>Abra o <strong>Google Authenticator</strong> ou <strong>Microsoft Authenticator</strong> e digite o código de 6 dígitos gerado para a sua conta.</p>
              </div>

              <form onSubmit={handleSubmit2FA} noValidate className="login-form">
                <div className="login-field">
                  <label htmlFor="totp-code">Código de Verificação (6 dígitos)</label>
                  <div className="login-input-wrapper">
                    <span className="input-icon"><Icon name="shield" size={16} /></span>
                    <input
                      ref={codeRef}
                      id="totp-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="000000"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                      disabled={loading}
                      className="input-code-2fa"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="login-error" role="alert">
                    <Icon name="alert" size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <button type="submit" className="login-button" disabled={loading || totpCode.length !== 6}>
                  {loading ? (
                    <><span className="spinner" /> Validando código...</>
                  ) : (
                    'Confirmar Acesso'
                  )}
                </button>

                <button
                  type="button"
                  className="btn-back-login"
                  onClick={handleBackToCredentials}
                  disabled={loading}
                >
                  <Icon name="arrowLeft" size={14} /> Voltar para o login
                </button>
              </form>
            </div>
          )}

          {step === 'setup_2fa' && (
            <div className="two-factor-screen">
              <div className="login-header">
                <span className="login-badge"><Icon name="shield" size={12} /> Configuração Obrigatória</span>
                <h2>Ativação do 2FA</h2>
                <p>A autenticação em 2 etapas é <strong>obrigatória</strong>. Escaneie o QR Code abaixo com seu aplicativo autenticador:</p>
              </div>

              <div className="two-factor-setup-box">
                {qrCodeUrl && (
                  <div className="two-factor-qr-wrapper">
                    <img src={qrCodeUrl} alt="QR Code 2FA" className="two-factor-qr-img" />
                  </div>
                )}

                {secretKey && (
                  <div className="two-factor-secret-key">
                    <span className="secret-label">Ou insira a chave manualmente:</span>
                    <div className="secret-code-wrapper">
                      <code>{secretKey}</code>
                      <button
                        type="button"
                        className="btn-copy-secret"
                        onClick={handleCopySecret}
                        title="Copiar chave"
                      >
                        <Icon name={copiedSecret ? 'check' : 'copy'} size={14} />
                        {copiedSecret ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit2FA} noValidate className="login-form">
                <div className="login-field">
                  <label htmlFor="setup-totp-code">Digite o código gerado pelo aplicativo:</label>
                  <div className="login-input-wrapper">
                    <span className="input-icon"><Icon name="shield" size={16} /></span>
                    <input
                      ref={codeRef}
                      id="setup-totp-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="000000"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                      disabled={loading}
                      className="input-code-2fa"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="login-error" role="alert">
                    <Icon name="alert" size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <button type="submit" className="login-button" disabled={loading || totpCode.length !== 6}>
                  {loading ? (
                    <><span className="spinner" /> Verificando e ativando...</>
                  ) : (
                    'Concluir e Acessar'
                  )}
                </button>

                <button
                  type="button"
                  className="btn-back-login"
                  onClick={handleBackToCredentials}
                  disabled={loading}
                >
                  <Icon name="arrowLeft" size={14} /> Cancelar e voltar
                </button>
              </form>
            </div>
          )}

          <div className="login-footer">
            <span className="dot-live" />
            <span>Conexão Segura Criptografada SSL/TLS</span>
          </div>
        </div>

        {/* Coluna da Direita: Identidade Visual / Imagem */}
        <div className="login-image-section">
          <div className="brand-logo-container">
            <img src={logoGiassi} alt="Giassi Supermercados" className="brand-logo-img" />
          </div>
        </div>

      </div>
    </div>
  )
}