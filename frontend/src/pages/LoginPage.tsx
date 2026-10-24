import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Lock,
  User as UserIcon,
  AlertCircle,
  Loader2,
  Shield,
  Eye,
  EyeOff,
  ArrowLeft,
  Copy,
  Check,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react';
import { copyToClipboard } from '@/utils/clipboard';

type LoginStep = 'credentials' | 'challenge_2fa' | 'setup_2fa';
const LAST_USER_KEY = 'last_username';

export const LoginPage: React.FC = () => {
  const { login, verify2FA, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Credenciais
  const savedUser = localStorage.getItem(LAST_USER_KEY) || '';
  const [username, setUsername] = useState(savedUser);
  const [password, setPassword] = useState('');
  const [rememberUser, setRememberUser] = useState(Boolean(savedUser));
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);

  // Estados 2FA
  const [step, setStep] = useState<LoginStep>('credentials');
  const [tempToken, setTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs de foco
  const userInputRef = useRef<HTMLInputElement>(null);
  const passInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'credentials') {
      if (savedUser) {
        passInputRef.current?.focus();
      } else {
        userInputRef.current?.focus();
      }
    } else {
      codeInputRef.current?.focus();
    }
  }, [step, savedUser]);

  if (isAuthenticated) {
    return <Navigate to="/devices" replace />;
  }

  const handleKeyModifier = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockActive(e.getModifierState('CapsLock'));
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    if (!cleanUser || !password.trim()) {
      setError('Por favor, informe o usuário e a senha.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await login(cleanUser, password);

      // Salva ou remove o usuário das preferências locais
      if (rememberUser) {
        localStorage.setItem(LAST_USER_KEY, cleanUser);
      } else {
        localStorage.removeItem(LAST_USER_KEY);
      }

      // 1. Desafio 2FA: Usuário já possui TOTP configurado
      if (res.requires_2fa && res.temp_token) {
        setTempToken(res.temp_token);
        setTotpCode('');
        setStep('challenge_2fa');
        return;
      }

      // 2. Setup 2FA Obrigatório: Primeiro login
      if (res.setup_2fa_required && res.temp_token) {
        setTempToken(res.temp_token);
        setQrCodeUrl(res.qr_code || '');
        setSecretKey(res.secret || '');
        setTotpCode('');
        setStep('setup_2fa');
        return;
      }

      // 3. Login Direto (Caso 2FA não seja exigido para a conta)
      if (res.access_token) {
        navigate('/devices', { replace: true });
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Falha ao autenticar no servidor.');
      }
      setPassword('');
      passInputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = totpCode.trim().replace(/\s+/g, '');
    if (cleanCode.length !== 6) {
      setError('Digite o código de 6 dígitos gerado pelo seu autenticador.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await verify2FA(tempToken, cleanCode);
      navigate('/devices', { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Código de 2FA inválido ou expirado.');
      }
      setTotpCode('');
      codeInputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setTotpCode('');
    setError(null);
    setPassword('');
  };

  const handleCopySecret = async (e?: React.MouseEvent) => {
    if (!secretKey) return;
    await copyToClipboard(secretKey, 'Chave Secreta 2FA', e);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 1500);
  };

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const toggleTheme = () => {
    const next = !isDark;
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    setIsDark(next);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-app p-4 overflow-hidden">
      {/* Botão de Alternar Tema no topo direito */}
      <div className="absolute top-4 right-4 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          className="flex items-center justify-center rounded-xl border border-border-medium bg-surface/80 backdrop-blur-md p-2.5 text-fg-secondary hover:bg-elevated hover:text-orange-500 hover:border-orange-500/40 transition-colors shadow-sm cursor-pointer"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      {/* Brilho radial sutil âmbar de fundo */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(249,115,22,0.08),rgba(241,245,249,0.7)_60%,#F8FAFC_100%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(249,115,22,0.12),rgba(11,14,20,0.8)_60%,#080A0F_100%)]" />

      {/* Grid de padrão sutil no fundo */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#F97316 1px, transparent 1px), linear-gradient(90deg, #F97316 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border-subtle bg-surface p-8 shadow-2xl backdrop-blur-md">
        {/* Cabeçalho */}
        <div className="mb-6 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-500 font-extrabold text-2xl mb-3 shadow-lg shadow-orange-500/15">
            ZM
          </div>
          <h2 className="text-xl font-bold tracking-tight text-fg">
            Zenith<span className="text-orange-500">Map</span>
          </h2>
          <p className="mt-1 text-xs text-fg-secondary">
            {step === 'credentials' && 'Acesse com suas credenciais para gerenciar ativos de TI e parque computacional'}
            {step === 'challenge_2fa' && 'Confirmação de Segurança em Duas Etapas'}
            {step === 'setup_2fa' && 'Configuração Obrigatória do Autenticador (2FA)'}
          </p>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-elevated p-3 text-xs text-rose-600 dark:text-rose-400 shadow-sm animate-in fade-in duration-150">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* ETAPA 1: Usuário e Senha */}
        {/* ============================================================== */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Usuário / Rede
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-fg-muted">
                  <UserIcon className="h-4 w-4" />
                </span>
                <input
                  ref={userInputRef}
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: admin ou usuario.ad"
                  disabled={loading}
                  autoComplete="username"
                  required
                  className="w-full rounded-xl border border-border-medium bg-elevated py-2.5 pl-9 pr-3 text-xs font-medium text-fg placeholder-fg-muted focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Senha
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-fg-muted">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  ref={passInputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyModifier}
                  onKeyUp={handleKeyModifier}
                  placeholder="••••••••"
                  disabled={loading}
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-border-medium bg-elevated py-2.5 pl-9 pr-10 text-xs font-medium text-fg placeholder-fg-muted focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-fg-muted hover:text-fg transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {capsLockActive && (
                <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                  <span>⚠️</span> Caps Lock ativado
                </p>
              )}
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 text-xs text-fg-secondary cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-300 transition-colors">
                <input
                  type="checkbox"
                  checked={rememberUser}
                  onChange={(e) => setRememberUser(e.target.checked)}
                  disabled={loading}
                  className="rounded border-border-medium bg-elevated text-orange-500 focus:ring-orange-500"
                />
                Lembrar meu usuário neste navegador
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-xs font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600 disabled:bg-elevated disabled:text-fg-muted disabled:border disabled:border-border-medium disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{loading ? 'Autenticando...' : 'Entrar no Painel'}</span>
            </button>
          </form>
        )}

        {/* ============================================================== */}
        {/* ETAPA 2: Desafio 2FA (Código de 6 Dígitos) */}
        {/* ============================================================== */}
        {step === 'challenge_2fa' && (
          <form onSubmit={handle2FASubmit} className="space-y-4">
            <div className="rounded-xl border border-orange-500/20 bg-elevated p-3.5 text-xs text-gray-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5 font-bold text-orange-400 mb-1">
                <ShieldCheck className="h-4 w-4 text-orange-400" />
                Autenticador Requerido
              </div>
              Digite o código de 6 dígitos gerado no Google Authenticator ou Microsoft Authenticator para sua conta.
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Código de Verificação (6 dígitos)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-fg-muted">
                  <Shield className="h-4 w-4" />
                </span>
                <input
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  disabled={loading}
                  required
                  className="w-full text-center tracking-[0.4em] text-xl font-mono font-bold rounded-xl border border-border-medium bg-elevated py-3 pl-9 pr-3 text-fg placeholder-fg-muted focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || totpCode.length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-xs font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600 disabled:bg-elevated disabled:text-fg-muted disabled:border disabled:border-border-medium disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{loading ? 'Validando...' : 'Confirmar Acesso'}</span>
            </button>

            <button
              type="button"
              onClick={handleBackToCredentials}
              disabled={loading}
              className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-fg-secondary hover:text-fg transition-colors pt-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar para o login
            </button>
          </form>
        )}

        {/* ============================================================== */}
        {/* ETAPA 3: Ativação Inicial de 2FA (QR Code + Chave) */}
        {/* ============================================================== */}
        {step === 'setup_2fa' && (
          <form onSubmit={handle2FASubmit} className="space-y-4">
            <div className="rounded-xl border border-orange-500/20 bg-elevated p-3.5 text-xs text-gray-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5 font-bold text-orange-400 mb-1">
                <ShieldCheck className="h-4 w-4 text-orange-400" />
                Configuração Obrigatória
              </div>
              Escaneie o QR Code abaixo com seu app autenticador (Google Authenticator, Microsoft Authenticator, 1Password, etc.).
            </div>

            {/* QR Code */}
            {qrCodeUrl && (
              <div className="flex justify-center p-4 bg-white rounded-xl border border-border-subtle shadow-inner">
                <img
                  src={qrCodeUrl}
                  alt="QR Code de 2FA"
                  className="h-44 w-44 object-contain rounded"
                />
              </div>
            )}

            {/* Chave manual */}
            {secretKey && (
              <div className="rounded-xl border border-border-medium bg-elevated p-3 text-xs">
                <div className="text-fg-secondary mb-1 text-[11px]">Ou digite a chave manualmente:</div>
                <div className="flex items-center justify-between gap-2 font-mono font-bold text-fg">
                  <span className="truncate text-orange-400">{secretKey}</span>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface border border-border-medium text-gray-700 dark:text-slate-300 hover:bg-border-subtle hover:text-fg text-[11px] transition-colors"
                  >
                    {copiedSecret ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copiar
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Digite o código de 6 dígitos gerado:
              </label>
              <input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                disabled={loading}
                required
                className="w-full text-center tracking-[0.4em] text-xl font-mono font-bold rounded-xl border border-border-medium bg-elevated py-3 px-3 text-fg placeholder-fg-muted focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading || totpCode.length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-xs font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600 disabled:bg-elevated disabled:text-fg-muted disabled:border disabled:border-border-medium disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{loading ? 'Ativando...' : 'Concluir e Acessar'}</span>
            </button>

            <button
              type="button"
              onClick={handleBackToCredentials}
              disabled={loading}
              className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-fg-secondary hover:text-fg transition-colors pt-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Cancelar e voltar
            </button>
          </form>
        )}

        {/* Rodapé simples de segurança */}
        <div className="mt-6 border-t border-border-subtle pt-4 text-center text-[11px] text-fg-muted">
          Autenticação corporativa protegida com criptografia ponta a ponta
        </div>
      </div>
    </div>
  );
};

