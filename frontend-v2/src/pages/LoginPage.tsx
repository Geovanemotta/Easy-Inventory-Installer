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
} from 'lucide-react';

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

  const handleCopySecret = async () => {
    if (!secretKey) return;
    try {
      await navigator.clipboard.writeText(secretKey);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {/* Cabeçalho */}
        <div className="mb-6 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-xl mb-3 shadow-sm">
            GI
          </div>
          <h2 className="text-xl font-bold text-slate-800">Giassi Inventory V2</h2>
          <p className="mt-1 text-sm text-slate-500">
            {step === 'credentials' && 'Acesse com suas credenciais para gerenciar o inventário'}
            {step === 'challenge_2fa' && 'Confirmação de Segurança em Duas Etapas'}
            {step === 'setup_2fa' && 'Configuração Obrigatória do Autenticador (2FA)'}
          </p>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* ETAPA 1: Usuário e Senha */}
        {/* ============================================================== */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Usuário
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
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
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Senha
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
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
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {capsLockActive && (
                <p className="mt-1 text-xs text-amber-600 font-medium">
                  ⚠️ Caps Lock ativado
                </p>
              )}
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberUser}
                  onChange={(e) => setRememberUser(e.target.checked)}
                  disabled={loading}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Lembrar meu usuário neste navegador
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-blue-400"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Autenticando...' : 'Avançar'}
            </button>
          </form>
        )}

        {/* ============================================================== */}
        {/* ETAPA 2: Desafio 2FA (Código de 6 Dígitos) */}
        {/* ============================================================== */}
        {step === 'challenge_2fa' && (
          <form onSubmit={handle2FASubmit} className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1">
                <Shield className="h-3.5 w-3.5 text-blue-600" />
                Autenticador Requerido
              </div>
              Digite o código de 6 dígitos gerado no Google Authenticator ou Microsoft Authenticator para sua conta.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Código de Verificação (6 dígitos)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
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
                  className="w-full text-center tracking-widest text-lg font-mono rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || totpCode.length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Validando...' : 'Confirmar Acesso'}
            </button>

            <button
              type="button"
              onClick={handleBackToCredentials}
              disabled={loading}
              className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors pt-1"
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
            <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800 border border-blue-200">
              <div className="flex items-center gap-1.5 font-semibold mb-1">
                <Shield className="h-3.5 w-3.5 text-blue-600" />
                Configuração Obrigatória
              </div>
              Escaneie o QR Code abaixo com seu app autenticador (Google Authenticator, Microsoft Authenticator, 1Password, etc.).
            </div>

            {/* QR Code */}
            {qrCodeUrl && (
              <div className="flex justify-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                <img
                  src={qrCodeUrl}
                  alt="QR Code de 2FA"
                  className="h-44 w-44 object-contain rounded border border-slate-300 bg-white p-1"
                />
              </div>
            )}

            {/* Chave manual */}
            {secretKey && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs">
                <div className="text-slate-500 mb-1">Ou digite o código manualmente:</div>
                <div className="flex items-center justify-between gap-2 font-mono font-bold text-slate-800">
                  <span className="truncate">{secretKey}</span>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 text-[11px]"
                  >
                    {copiedSecret ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" /> Copiado
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
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
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
                className="w-full text-center tracking-widest text-lg font-mono rounded-lg border border-slate-300 py-2.5 px-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading || totpCode.length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Ativando...' : 'Concluir e Acessar'}
            </button>

            <button
              type="button"
              onClick={handleBackToCredentials}
              disabled={loading}
              className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors pt-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Cancelar e voltar
            </button>
          </form>
        )}

        {/* Rodapé simples de segurança */}
        <div className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
          Autenticação corporativa protegida com criptografia ponta a ponta
        </div>
      </div>
    </div>
  );
};
