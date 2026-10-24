import { useEffect, useState } from 'react';
import {
  Mail,
  Server,
  Shield,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
} from 'lucide-react';
import { getSMTPConfig, saveSMTPConfig, testSMTPConnection } from '../../../services/smtpService';
import type { SMTPConfig } from '../../../types/smtp';

interface SMTPConfigTabProps {
  onShowToast: (text: string, type?: 'success' | 'error') => void;
  currentUserEmail?: string | null;
}

export default function SMTPConfigTab({ onShowToast, currentUserEmail }: SMTPConfigTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [config, setConfig] = useState<SMTPConfig>({
    smtp_host: '',
    smtp_port: 25,
    smtp_user: '',
    smtp_password: '',
    has_smtp_password: false,
    use_tls: false,
    use_ssl: false,
    default_operator_email: '',
    default_subject_prefix: 'Reserva de IP/MAC - Firewall',
  });

  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    let active = true;
    getSMTPConfig()
      .then((cfg) => {
        if (!active) return;
        setConfig(cfg);
        if (currentUserEmail && !testEmail) {
          setTestEmail(currentUserEmail);
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar configurações SMTP:', err);
        onShowToast('Falha ao obter configuração SMTP.', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [currentUserEmail]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.smtp_host.trim()) {
      onShowToast('O endereço do Host SMTP é obrigatório.', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await saveSMTPConfig(config);
      setConfig(res);
      onShowToast('Configurações de SMTP salvas com sucesso!', 'success');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Erro ao salvar configuração SMTP.';
      onShowToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    const target = (testEmail || currentUserEmail || '').trim();
    if (!target || !target.includes('@')) {
      onShowToast('Informe um endereço de e-mail válido para envio do teste.', 'error');
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await testSMTPConnection(target);
      setTestResult(res);
      onShowToast(res.message, 'success');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Falha ao testar conexão SMTP.';
      setTestResult({ success: false, message: msg });
      onShowToast(msg, 'error');
    } finally {
      setTesting(false);
    }
  };

  const setPreset = (type: 'relay25' | 'starttls587' | 'ssl465') => {
    if (type === 'relay25') {
      setConfig((prev) => ({
        ...prev,
        smtp_port: 25,
        use_tls: false,
        use_ssl: false,
      }));
    } else if (type === 'starttls587') {
      setConfig((prev) => ({
        ...prev,
        smtp_port: 587,
        use_tls: true,
        use_ssl: false,
      }));
    } else if (type === 'ssl465') {
      setConfig((prev) => ({
        ...prev,
        smtp_port: 465,
        use_tls: false,
        use_ssl: true,
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-border-subtle bg-surface p-12">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs text-gray-700 dark:text-slate-300">
      {/* Banner Informativo */}
      <div className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-surface to-surface p-5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-fg">
              Servidor SMTP &amp; E-mail Padrão da Operadora
            </h3>
            <p className="text-xs text-fg-secondary mt-0.5">
              Configure o relay de e-mail corporativo para automatizar o envio de reservas de IP/MAC no Firewall durante a homologação
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-mono text-[11px] font-bold text-amber-700 dark:text-amber-300">
          <Server className="h-3 w-3" />
          Relay de Firewall
        </span>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Bloco 1: Conexão e Credenciais */}
        <div className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div className="flex items-center gap-2 text-fg font-bold text-xs uppercase tracking-wider">
              <Server className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Parâmetros de Conexão SMTP
            </div>
            {/* Presets rápidos */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-fg-muted font-semibold mr-1">Presets:</span>
              <button
                type="button"
                onClick={() => setPreset('relay25')}
                className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer border ${
                  config.smtp_port === 25 && !config.use_tls && !config.use_ssl
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                    : 'bg-elevated text-fg-secondary border-border-medium hover:text-fg'
                }`}
              >
                Porta 25 (Relay)
              </button>
              <button
                type="button"
                onClick={() => setPreset('starttls587')}
                className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer border ${
                  config.smtp_port === 587 && config.use_tls
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                    : 'bg-elevated text-fg-secondary border-border-medium hover:text-fg'
                }`}
              >
                Porta 587 (TLS)
              </button>
              <button
                type="button"
                onClick={() => setPreset('ssl465')}
                className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer border ${
                  config.smtp_port === 465 && config.use_ssl
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                    : 'bg-elevated text-fg-secondary border-border-medium hover:text-fg'
                }`}
              >
                Porta 465 (SSL)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-3">
              <label className="block text-gray-700 dark:text-slate-300 font-semibold mb-1">
                Servidor Host SMTP <span className="text-amber-600 dark:text-amber-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: smtp.empresa.com.br ou 10.0.0.25"
                value={config.smtp_host}
                onChange={(e) => setConfig({ ...config, smtp_host: e.target.value })}
                required
                className="w-full rounded-lg border border-border-medium bg-elevated px-3 py-2 text-fg font-mono placeholder:text-fg-muted focus:border-amber-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-gray-700 dark:text-slate-300 font-semibold mb-1">
                Porta SMTP <span className="text-amber-600 dark:text-amber-400">*</span>
              </label>
              <input
                type="number"
                placeholder="25, 587 ou 465"
                value={config.smtp_port}
                onChange={(e) => setConfig({ ...config, smtp_port: parseInt(e.target.value, 10) || 25 })}
                required
                className="w-full rounded-lg border border-border-medium bg-elevated px-3 py-2 text-fg font-mono placeholder:text-fg-muted focus:border-amber-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 dark:text-slate-300 font-semibold mb-1">
                Usuário / Conta de Serviço (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: inventario@empresa.com.br (deixe vazio para relay anônimo)"
                value={config.smtp_user || ''}
                onChange={(e) => setConfig({ ...config, smtp_user: e.target.value })}
                className="w-full rounded-lg border border-border-medium bg-elevated px-3 py-2 text-fg placeholder:text-fg-muted focus:border-amber-500 focus:outline-none transition-colors"
              />
              <span className="text-[10px] text-fg-muted mt-0.5 block">
                Necessário apenas se o servidor SMTP exigir autenticação
              </span>
            </div>

            <div>
              <label className="block text-gray-700 dark:text-slate-300 font-semibold mb-1 flex items-center justify-between">
                <span>Senha de Autenticação (Opcional)</span>
                {config.has_smtp_password && (
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Senha cadastrada
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder={config.has_smtp_password ? '•••••••• (Preencha para alterar)' : 'Senha do usuário SMTP'}
                  value={config.smtp_password || ''}
                  onChange={(e) => setConfig({ ...config, smtp_password: e.target.value })}
                  className="w-full rounded-lg border border-border-medium bg-elevated pl-9 pr-3 py-2 text-fg placeholder:text-fg-muted focus:border-amber-500 focus:outline-none transition-colors"
                />
                <KeyRound className="h-4 w-4 text-fg-muted absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* Opções de Segurança / Criptografia */}
          <div className="pt-2 border-t border-border-subtle flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.use_tls}
                onChange={(e) => setConfig({ ...config, use_tls: e.target.checked, use_ssl: e.target.checked ? false : config.use_ssl })}
                className="h-4 w-4 rounded border-border-medium bg-elevated text-amber-500 focus:ring-amber-500 cursor-pointer"
              />
              <span className="text-fg font-medium">Habilitar STARTTLS (porta 587)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.use_ssl}
                onChange={(e) => setConfig({ ...config, use_ssl: e.target.checked, use_tls: e.target.checked ? false : config.use_tls })}
                className="h-4 w-4 rounded border-border-medium bg-elevated text-amber-500 focus:ring-amber-500 cursor-pointer"
              />
              <span className="text-fg font-medium">Habilitar SSL Direto (porta 465)</span>
            </label>
          </div>
        </div>

        {/* Bloco 2: E-mail Padrão da Operadora e Modelo */}
        <div className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-fg font-bold text-xs uppercase tracking-wider border-b border-border-subtle pb-3">
            <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            E-mail Padrão da Operadora &amp; Assunto do Chamado
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 dark:text-slate-300 font-semibold mb-1">
                E-mail Padrão da Operadora do Firewall <span className="text-amber-600 dark:text-amber-400">*</span>
              </label>
              <input
                type="email"
                placeholder="Ex: noc.firewall@operadora.com.br"
                value={config.default_operator_email}
                onChange={(e) => setConfig({ ...config, default_operator_email: e.target.value })}
                required
                className="w-full rounded-lg border border-border-medium bg-elevated px-3 py-2 text-fg placeholder:text-fg-muted focus:border-amber-500 focus:outline-none transition-colors"
              />
              <span className="text-[10px] text-fg-muted mt-1 block">
                Este e-mail virá pré-preenchido no modal de homologação ao solicitar reserva de IP/MAC
              </span>
            </div>

            <div>
              <label className="block text-gray-700 dark:text-slate-300 font-semibold mb-1">
                Prefixo do Assunto do E-mail
              </label>
              <input
                type="text"
                placeholder="Ex: Reserva de IP/MAC - Firewall"
                value={config.default_subject_prefix}
                onChange={(e) => setConfig({ ...config, default_subject_prefix: e.target.value })}
                className="w-full rounded-lg border border-border-medium bg-elevated px-3 py-2 text-fg placeholder:text-fg-muted focus:border-amber-500 focus:outline-none transition-colors"
              />
              <span className="text-[10px] text-fg-muted mt-1 block">
                O assunto final conterá: [Prefixo] - [Circuito da Loja] - [IP]
              </span>
            </div>
          </div>
        </div>

        {/* Bloco 3: Barra de Ações e Teste de Envio */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-2xl border border-border-subtle bg-surface p-5 shadow-sm">
          {/* Seção de Teste de Envio */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
            <div className="relative min-w-[240px] flex-1 max-w-sm">
              <input
                type="email"
                placeholder="E-mail destinatário para teste..."
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full rounded-lg border border-border-medium bg-elevated px-3 py-2 text-fg placeholder:text-fg-muted focus:border-amber-500 focus:outline-none transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !config.smtp_host}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {testing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Enviando Teste...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Testar Envio SMTP</span>
                </>
              )}
            </button>
          </div>

          {/* Botão de Salvar Principal */}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 px-6 py-2.5 font-bold text-white shadow-md shadow-orange-500/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Gravando Configurações...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4 text-white" />
                <span>Salvar Configurações SMTP</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Feedback do Teste */}
      {testResult && (
        <div
          className={`rounded-xl border p-4 flex items-start gap-3 transition-all animate-in fade-in duration-150 ${
            testResult.success
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <h5 className="font-bold">
              {testResult.success ? 'Conexão SMTP Estabelecida com Sucesso!' : 'Falha na Conexão SMTP'}
            </h5>
            <p className="text-[11px] leading-relaxed opacity-90">{testResult.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
