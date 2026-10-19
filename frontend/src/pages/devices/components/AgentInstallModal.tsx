import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, Terminal, Shield, Zap } from 'lucide-react';
import { copyToClipboard as robustCopy } from '@/utils/clipboard';

interface AgentInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgentInstallModal: React.FC<AgentInstallModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'linux' | 'windows'>('linux');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const agentBaseUrl =
    typeof window !== 'undefined'
      ? window.location.port === '5173'
        ? `http://${window.location.hostname}:8000`
        : window.location.origin
      : 'http://localhost:8000';

  const copyToClipboard = (text: string, key: string, label?: string, e?: React.MouseEvent) => {
    robustCopy(text, label || 'Comando', e);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const linuxCurl = `curl -sSLk ${agentBaseUrl}/api/v1/agent/linux | sudo bash`;
  const linuxCron = `echo "0 12 * * * root curl -sSLk ${agentBaseUrl}/api/v1/agent/linux | bash >/dev/null 2>&1" | sudo tee /etc/cron.d/device-inventory`;

  const winPowerShell = `[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}; iex (New-Object Net.WebClient).DownloadString('${agentBaseUrl}/api/v1/agent/windows')`;
  const winSchtasks = `schtasks /create /tn "DeviceInventory" /tr "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -Command \\"[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {\\$true}; iex (New-Object Net.WebClient).DownloadString('${agentBaseUrl}/api/v1/agent/windows')\\"" /sc daily /st 12:00 /ru "SYSTEM" /f`;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">
                Instalação de Agentes de Coleta
              </h3>
              <p className="text-xs text-slate-500">
                Comandos de execução imediata e agendamento automático diário
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-slate-200 bg-slate-100/60 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('linux')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === 'linux'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Terminal className="h-4 w-4" />
            Linux (Ubuntu, Zorin, Debian)
          </button>
          <button
            onClick={() => setActiveTab('windows')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === 'windows'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="h-4 w-4" />
            Windows 10 / 11 / Server
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {activeTab === 'linux' ? (
            <>
              {/* Passo 1 - Linux */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    1. Execução única / teste imediato (Bash / Terminal):
                  </span>
                  <button
                    onClick={() => copyToClipboard(linuxCurl, 'lnx-run')}
                    className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    {copiedKey === 'lnx-run' ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-700">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="rounded-lg bg-slate-950 p-3 font-mono text-xs text-slate-100 overflow-x-auto shadow-inner">
                  <code>{linuxCurl}</code>
                </div>
              </div>

              {/* Passo 2 - Linux */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    2. Agendamento diário automático (Cron em /etc/cron.d):
                  </span>
                  <button
                    onClick={() => copyToClipboard(linuxCron, 'lnx-cron')}
                    className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    {copiedKey === 'lnx-cron' ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-700">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="rounded-lg bg-slate-950 p-3 font-mono text-xs text-slate-100 overflow-x-auto shadow-inner">
                  <code>{linuxCron}</code>
                </div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-blue-900 leading-relaxed">
                💡 O agente Linux coleta hardware via DMI (placa-mãe, processador, RAM e slots),
                particionamento e uso de disco, usuário logado, periféricos conectados e softwares instalados via <code>apt-mark</code> com controle inteligente de cache.
              </div>
            </>
          ) : (
            <>
              {/* Passo 1 - Windows */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    1. Execução imediata no PowerShell (como Administrador):
                  </span>
                  <button
                    onClick={() => copyToClipboard(winPowerShell, 'win-run')}
                    className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    {copiedKey === 'win-run' ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-700">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="rounded-lg bg-slate-950 p-3 font-mono text-xs text-slate-100 overflow-x-auto shadow-inner">
                  <code>{winPowerShell}</code>
                </div>
              </div>

              {/* Passo 2 - Windows */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    2. Agendamento diário automático (Agendador de Tarefas / GPO):
                  </span>
                  <button
                    onClick={() => copyToClipboard(winSchtasks, 'win-schtasks')}
                    className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    {copiedKey === 'win-schtasks' ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-700">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="rounded-lg bg-slate-950 p-3 font-mono text-xs text-slate-100 overflow-x-auto shadow-inner">
                  <code>{winSchtasks}</code>
                </div>
              </div>

              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3.5 text-xs text-amber-900 leading-relaxed">
                💡 O agente Windows utiliza WMI e PowerShell para mapear Serials da máquina, processador, RAM, partições NTFS, ID do RustDesk e perfis de usuários locais em <code>C:\Users</code>.
              </div>
            </>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-end border-t border-slate-100 px-6 py-3 bg-slate-50/50">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-300 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
