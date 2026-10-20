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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-[#121721] shadow-2xl border border-[#1E2636] overflow-hidden animate-in zoom-in-95 duration-150 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-[#1E2636] px-6 py-4 bg-[#121721]">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-orange-500/15 p-2 text-orange-400 border border-orange-500/20">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Instalação de Agentes de Coleta
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Comandos de execução imediata e agendamento automático diário
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-[#181F2E] hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-[#1E2636] bg-[#0B0E14] px-6 pt-2.5 gap-2">
          <button
            onClick={() => setActiveTab('linux')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === 'linux'
                ? 'border-b-2 border-orange-500 text-orange-400 bg-orange-500/10 rounded-t-lg'
                : 'border-b-2 border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#121721]/60'
            }`}
          >
            <Terminal className="h-4 w-4" />
            Linux (Ubuntu, Zorin, Debian)
          </button>
          <button
            onClick={() => setActiveTab('windows')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === 'windows'
                ? 'border-b-2 border-orange-500 text-orange-400 bg-orange-500/10 rounded-t-lg'
                : 'border-b-2 border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#121721]/60'
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
                  <span className="text-xs font-semibold text-slate-300 font-mono">
                    1. Execução única / teste imediato (Bash / Terminal):
                  </span>
                  <button
                    onClick={() => copyToClipboard(linuxCurl, 'lnx-run')}
                    className="flex items-center gap-1.5 rounded-lg border border-[#263044] bg-[#181F2E] px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-[#222B3D] hover:text-white transition-colors"
                  >
                    {copiedKey === 'lnx-run' ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="rounded-xl bg-[#0B0E14] border border-[#1E2636] p-3.5 font-mono text-xs text-slate-200 overflow-x-auto shadow-inner">
                  <code>{linuxCurl}</code>
                </div>
              </div>

              {/* Passo 2 - Linux */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 font-mono">
                    2. Agendamento diário automático (Cron em /etc/cron.d):
                  </span>
                  <button
                    onClick={() => copyToClipboard(linuxCron, 'lnx-cron')}
                    className="flex items-center gap-1.5 rounded-lg border border-[#263044] bg-[#181F2E] px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-[#222B3D] hover:text-white transition-colors"
                  >
                    {copiedKey === 'lnx-cron' ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="rounded-xl bg-[#0B0E14] border border-[#1E2636] p-3.5 font-mono text-xs text-slate-200 overflow-x-auto shadow-inner">
                  <code>{linuxCron}</code>
                </div>
              </div>

              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3.5 text-xs text-sky-200 leading-relaxed font-sans">
                💡 O agente Linux coleta hardware via DMI (placa-mãe, processador, RAM e slots),
                particionamento e uso de disco, usuário logado, periféricos conectados e softwares instalados via <code className="text-sky-300 font-mono">apt-mark</code> com controle inteligente de cache.
              </div>
            </>
          ) : (
            <>
              {/* Passo 1 - Windows */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 font-mono">
                    1. Execução imediata no PowerShell (como Administrador):
                  </span>
                  <button
                    onClick={() => copyToClipboard(winPowerShell, 'win-run')}
                    className="flex items-center gap-1.5 rounded-lg border border-[#263044] bg-[#181F2E] px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-[#222B3D] hover:text-white transition-colors"
                  >
                    {copiedKey === 'win-run' ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="rounded-xl bg-[#0B0E14] border border-[#1E2636] p-3.5 font-mono text-xs text-slate-200 overflow-x-auto shadow-inner">
                  <code>{winPowerShell}</code>
                </div>
              </div>

              {/* Passo 2 - Windows */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 font-mono">
                    2. Agendamento diário automático (Agendador de Tarefas / GPO):
                  </span>
                  <button
                    onClick={() => copyToClipboard(winSchtasks, 'win-schtasks')}
                    className="flex items-center gap-1.5 rounded-lg border border-[#263044] bg-[#181F2E] px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-[#222B3D] hover:text-white transition-colors"
                  >
                    {copiedKey === 'win-schtasks' ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="rounded-xl bg-[#0B0E14] border border-[#1E2636] p-3.5 font-mono text-xs text-slate-200 overflow-x-auto shadow-inner">
                  <code>{winSchtasks}</code>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200 leading-relaxed font-sans">
                💡 O agente Windows utiliza WMI e PowerShell para mapear Serials da máquina, processador, RAM, partições NTFS, ID do RustDesk e perfis de usuários locais em <code className="text-amber-300 font-mono">C:\Users</code>.
              </div>
            </>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-end border-t border-[#1E2636] px-6 py-3.5 bg-[#121721]">
          <button
            onClick={onClose}
            className="rounded-xl border border-[#263044] bg-[#181F2E] px-4 py-2 text-xs font-medium text-slate-300 hover:bg-[#222B3D] hover:text-white transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
