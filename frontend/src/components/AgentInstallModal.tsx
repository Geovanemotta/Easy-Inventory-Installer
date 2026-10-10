import { useState } from 'react'
import { IcoLnx, IcoWin } from './Icons'

type AgentInstallModalProps = {
  isOpen: boolean
  onClose: () => void
}

export default function AgentInstallModal({
  isOpen,
  onClose,
}: AgentInstallModalProps) {
  const [agentTab, setAgentTab] = useState<'linux' | 'windows'>('linux')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  if (!isOpen) return null

  function copiarComando(cmd: string, key: string) {
    navigator.clipboard.writeText(cmd)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const agentBaseUrl =
    typeof window !== 'undefined'
      ? window.location.port === '5173'
        ? `http://${window.location.hostname}:8000`
        : window.location.origin
      : 'http://localhost:8000'

  return (
    <div className="agent-modal-overlay" onClick={onClose}>
      <div className="agent-modal" onClick={(e) => e.stopPropagation()}>
        <div className="agent-modal-head">
          <h2>⚡ Instalação de Agentes de Coleta</h2>
          <button
            className="agent-modal-close"
            onClick={onClose}
            title="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="agent-modal-body">
          <div className="agent-modal-tabs">
            <button
              className={`agent-tab-btn ${agentTab === 'linux' ? 'active' : ''}`}
              onClick={() => setAgentTab('linux')}
            >
              <IcoLnx /> Linux
            </button>
            <button
              className={`agent-tab-btn ${agentTab === 'windows' ? 'active' : ''}`}
              onClick={() => setAgentTab('windows')}
            >
              <IcoWin /> Windows 10 / 11 / Server
            </button>
          </div>

          {agentTab === 'linux' && (
            <div>
              <div className="agent-step">
                <h4>1. Execução única / teste imediato:</h4>
                <div className="code-box">
                  <code>{`curl -sSLk ${agentBaseUrl}/api/v1/agent/linux | sudo bash`}</code>
                  <button
                    className={`code-copy-btn ${copiedKey === 'lnx-run' ? 'copied' : ''}`}
                    onClick={() =>
                      copiarComando(
                        `curl -sSLk ${agentBaseUrl}/api/v1/agent/linux | sudo bash`,
                        'lnx-run'
                      )
                    }
                  >
                    {copiedKey === 'lnx-run' ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div className="agent-step">
                <h4>2. Agendamento automático diário (Cron):</h4>
                <div className="code-box">
                  <code>{`echo "0 12 * * * root curl -sSLk ${agentBaseUrl}/api/v1/agent/linux | bash >/dev/null 2>&1" | sudo tee /etc/cron.d/device-inventory`}</code>
                  <button
                    className={`code-copy-btn ${copiedKey === 'lnx-cron' ? 'copied' : ''}`}
                    onClick={() =>
                      copiarComando(
                        `echo "0 12 * * * root curl -sSLk ${agentBaseUrl}/api/v1/agent/linux | bash >/dev/null 2>&1" | sudo tee /etc/cron.d/device-inventory`,
                        'lnx-cron'
                      )
                    }
                  >
                    {copiedKey === 'lnx-cron' ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>

              {/* <div className="agent-info-tip">
                <span>💡</span>
                <div>
                  O script Linux coleta informações completas de DMI (placa-mãe/fabricante), particionamento de discos, usuário logado, domínio AD, e descobre dinamicamente aplicativos, agentes, runtimes e ferramentas instaladas via <code>apt-mark</code>. Possui controle de cache inteligente (só envia se houver alteração).
                </div>
              </div> */}
            </div>
          )}

          {agentTab === 'windows' && (
            <div>
              <div className="agent-step">
                <h4>1. Execução imediata no PowerShell (Admin):</h4>
                <div className="code-box">
                  <code>{`[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}; iex (New-Object Net.WebClient).DownloadString('${agentBaseUrl}/api/v1/agent/windows')`}</code>
                  <button
                    className={`code-copy-btn ${copiedKey === 'win-run' ? 'copied' : ''}`}
                    onClick={() =>
                      copiarComando(
                        `[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}; iex (New-Object Net.WebClient).DownloadString('${agentBaseUrl}/api/v1/agent/windows')`,
                        'win-run'
                      )
                    }
                  >
                    {copiedKey === 'win-run' ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div className="agent-step">
                <h4>2. Agendamento automático diário (Agendador de Tarefas / GPO):</h4>
                <div className="code-box">
                  <code>{`schtasks /create /tn "DeviceInventory" /tr "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -Command \\"[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {\\$true}; iex (New-Object Net.WebClient).DownloadString('${agentBaseUrl}/api/v1/agent/windows')\\"" /sc daily /st 12:00 /ru "SYSTEM" /f`}</code>
                  <button
                    className={`code-copy-btn ${copiedKey === 'win-task' ? 'copied' : ''}`}
                    onClick={() =>
                      copiarComando(
                        `schtasks /create /tn "DeviceInventory" /tr "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -Command \\"[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {\\$true}; iex (New-Object Net.WebClient).DownloadString('${agentBaseUrl}/api/v1/agent/windows')\\"" /sc daily /st 12:00 /ru "SYSTEM" /f`,
                        'win-task'
                      )
                    }
                  >
                    {copiedKey === 'win-task' ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
