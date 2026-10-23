import React, { useState } from 'react';
import {
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Eye,
  Globe,
  Layers,
  Building,
  CheckCircle,
} from 'lucide-react';
import { copyToClipboard } from '@/utils/clipboard';

export interface ConcluidoData {
  hostname: string;
  ip: string;
  mac: string;
  patrimonio: string;
  siteId?: number;
  siteName?: string;
  circuito?: string;
  vlanName?: string;
}

interface ApprovalFirewallEmailStepProps {
  concluido: ConcluidoData;
  operatorEmail: string;
  setOperatorEmail: (val: string) => void;
  senderEmail: string;
  setSenderEmail: (val: string) => void;
  circuito: string;
  setCircuito: (val: string) => void;
  vlanName: string;
  setVlanName: (val: string) => void;
  onSendEmail: () => Promise<void>;
  isSending: boolean;
  sendResult: { success: boolean; message: string } | null;
  onFinish: () => void;
}

export const ApprovalFirewallEmailStep: React.FC<ApprovalFirewallEmailStepProps> = ({
  concluido,
  operatorEmail,
  setOperatorEmail,
  senderEmail,
  setSenderEmail,
  circuito,
  setCircuito,
  vlanName,
  setVlanName,
  onSendEmail,
  isSending,
  sendResult,
  onFinish,
}) => {
  const [copiedPreview, setCopiedPreview] = useState(false);
  const [copiedField, setCopiedField] = useState<string>('');
  const [showPreview, setShowPreview] = useState(true);

  const cleanMac = (concluido.mac || '').toUpperCase();
  const cleanVlan = vlanName || concluido.vlanName || 'LAN';
  const cleanCircuito = circuito || concluido.circuito || 'Não informado';
  const cleanIp = concluido.ip;

  const emailBodyPreview = `Favor cadastrar o MAC na seguinte reserva de IP do circuito abaixo, caso ja exista um cadastro no IP, apenas substituir.

Circuito: ${cleanCircuito}
VLAN: ${cleanVlan}
IP: ${cleanIp || '(não definido)'}
MAC: ${cleanMac || '(sem MAC)'}`;

  const handleCopyText = (label: string, text: string) => {
    copyToClipboard(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const handleCopyPreview = () => {
    copyToClipboard(emailBodyPreview);
    setCopiedPreview(true);
    setTimeout(() => setCopiedPreview(false), 2000);
  };

  const isEmailSent = Boolean(sendResult && sendResult.success);

  return (
    <div className="py-2 space-y-5 animate-in fade-in duration-200">
      {/* 1. Banner de Sucesso da Homologação */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                Etapa 1 Concluída
              </span>
              <h3 className="text-sm font-bold text-fg">
                Equipamento Homologado com Sucesso!
              </h3>
            </div>
            <p className="text-xs text-gray-700 dark:text-slate-300 mt-0.5">
              O ativo <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">{concluido.hostname}</span> foi
              gravado no inventário com o IP definitivo.
            </p>
          </div>
        </div>

        {/* Resumo rápido do IP e MAC com cópia */}
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-emerald-500/30 bg-app px-3 py-1.5 flex items-center gap-2 text-xs">
            <Globe className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{cleanIp}</span>
            <button
              type="button"
              onClick={() => handleCopyText('IP', cleanIp)}
              title="Copiar IP"
              className="p-0.5 text-fg-secondary hover:text-fg transition-colors cursor-pointer"
            >
              {copiedField === 'IP' ? <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>

          <div className="rounded-lg border border-border-medium bg-app px-3 py-1.5 flex items-center gap-2 text-xs">
            <Layers className="h-3.5 w-3.5 text-fg-secondary" />
            <span className="font-mono text-fg">{cleanMac || 'SEM MAC'}</span>
            <button
              type="button"
              onClick={() => handleCopyText('MAC', cleanMac)}
              title="Copiar MAC"
              className="p-0.5 text-fg-secondary hover:text-fg transition-colors cursor-pointer"
            >
              {copiedField === 'MAC' ? <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Caixa de Automação de Envio de E-mail para Operadora */}
      <div className="rounded-xl border border-border-subtle bg-surface p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase">
                  Etapa Opcional
                </span>
                <h4 className="text-xs font-bold text-fg uppercase tracking-wider">
                  Solicitação de Reserva de IP/MAC no Firewall da Operadora
                </h4>
              </div>
              <p className="text-[11px] text-fg-secondary mt-0.5">
                Envie os dados técnicos diretamente para a operadora de telecomunicações solicitar a reserva estática no circuito.
              </p>
            </div>
          </div>

          {concluido.siteName && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-fg-secondary bg-elevated border border-border-medium px-2.5 py-1 rounded-lg">
              <Building className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>{concluido.siteName}</span>
            </div>
          )}
        </div>

        {/* Linha 1: Destinatário e Remetente */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              E-mail da Operadora (Destino)
            </label>
            <input
              type="email"
              value={operatorEmail}
              onChange={(e) => setOperatorEmail(e.target.value)}
              placeholder="Ex: noc.firewall@operadora.com.br"
              className="w-full rounded-lg border border-border-medium bg-elevated px-3 py-1.5 text-fg placeholder:text-fg-muted focus:border-amber-500 focus:outline-none transition-colors"
            />
            <span className="text-[10px] text-fg-muted mt-0.5 block">
              Configurado na aba Servidor SMTP (pode ser editado para este envio)
            </span>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-fg-secondary" />
              Seu E-mail (Remetente / Cópia)
            </label>
            <input
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="Ex: seu.email@giassi.com.br"
              className="w-full rounded-lg border border-border-medium bg-elevated px-3 py-1.5 text-fg placeholder:text-fg-muted focus:border-amber-500 focus:outline-none transition-colors"
            />
            <span className="text-[10px] text-fg-muted mt-0.5 block">
              Sincronizado do Active Directory (receberá cópia Cc para registro)
            </span>
          </div>
        </div>

        {/* Linha 2: Conferência dos Dados de Rede da Reserva */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Circuito da Loja
            </label>
            <input
              type="text"
              value={circuito}
              onChange={(e) => setCircuito(e.target.value)}
              placeholder="Ex: giassi-lj19"
              className="w-full rounded-lg border border-border-medium bg-elevated px-2.5 py-1.5 font-mono text-amber-700 dark:text-amber-300 font-semibold placeholder:text-fg-muted focus:border-amber-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Nome da VLAN
            </label>
            <input
              type="text"
              value={vlanName}
              onChange={(e) => setVlanName(e.target.value)}
              placeholder="Ex: LAN ou CAIXAS"
              className="w-full rounded-lg border border-border-medium bg-elevated px-2.5 py-1.5 text-fg placeholder:text-fg-muted focus:border-amber-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
              IP Definitivo
            </label>
            <div className="w-full rounded-lg border border-border-medium bg-app px-2.5 py-1.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 truncate">
              {cleanIp}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
              MAC da Estação
            </label>
            <div className="w-full rounded-lg border border-border-medium bg-app px-2.5 py-1.5 font-mono font-bold text-fg truncate">
              {cleanMac || '(sem MAC)'}
            </div>
          </div>
        </div>

        {/* Bloco de Prévia do E-mail */}
        <div className="rounded-lg border border-border-medium bg-app p-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              Prévia do E-mail a ser Disparado:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyPreview}
                className="inline-flex items-center gap-1 rounded bg-elevated border border-border-medium px-2 py-0.5 text-[10px] font-semibold text-gray-700 dark:text-slate-300 hover:text-fg transition-colors cursor-pointer"
              >
                {copiedPreview ? <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copiedPreview ? 'Copiado!' : 'Copiar Mensagem'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-[10px] text-fg-secondary hover:text-fg cursor-pointer"
              >
                {showPreview ? 'Ocultar' : 'Exibir'}
              </button>
            </div>
          </div>

          {showPreview && (
            <pre className="font-mono text-[11px] text-gray-700 dark:text-slate-300 bg-surface p-3 rounded-lg border border-border-subtle whitespace-pre-wrap leading-relaxed select-all">
              {emailBodyPreview}
            </pre>
          )}
        </div>

        {/* Feedback do Disparo */}
        {sendResult && (
          <div
            className={`rounded-lg border p-3 text-xs flex items-center gap-2.5 animate-in fade-in duration-150 ${
              sendResult.success
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
            }`}
          >
            {sendResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span className="leading-tight font-medium">{sendResult.message}</span>
          </div>
        )}
      </div>

      {/* 3. Botões de Ação na Base */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border-subtle">
        <div>
          {!isEmailSent && (
            <span className="text-xs text-fg-secondary">
              O envio de e-mail é opcional. Se não precisar solicitar reserva, pode concluir direto.
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* Botão de Concluir sem Enviar (caso não tenha enviado ainda) */}
          {!isEmailSent && (
            <button
              type="button"
              onClick={onFinish}
              disabled={isSending}
              className="rounded-xl border border-border-medium bg-elevated hover:bg-border-subtle px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:text-fg transition-colors cursor-pointer"
            >
              Concluir sem Enviar E-mail
            </button>
          )}

          {/* Botão de Disparo */}
          {!isEmailSent ? (
            <button
              type="button"
              onClick={onSendEmail}
              disabled={isSending || !operatorEmail.trim() || !circuito.trim()}
              className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2.5 text-xs font-bold text-black disabled:opacity-50 transition-all shadow-md cursor-pointer"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Enviando E-mail...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Disparar E-mail para Operadora</span>
                </>
              )}
            </button>
          ) : (
            /* Botão de Conclusão após envio com sucesso */
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSendEmail}
                disabled={isSending}
                className="rounded-xl border border-border-medium bg-elevated hover:bg-border-subtle px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:text-fg transition-colors cursor-pointer"
              >
                {isSending ? 'Reenviando...' : 'Reenviar E-mail'}
              </button>
              <button
                type="button"
                onClick={onFinish}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-2.5 text-xs font-bold text-white transition-colors shadow-md cursor-pointer"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Concluir e Retornar ao Inventário</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default ApprovalFirewallEmailStep;
