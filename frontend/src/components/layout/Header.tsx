import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { RefreshCw, Download } from 'lucide-react';
import { AgentInstallModal } from '@/pages/devices/components/AgentInstallModal';

export const Header: React.FC = () => {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Fecha o modal de instalação automaticamente ao trocar de tela / módulo
  useEffect(() => {
    setIsInstallModalOpen(false);
  }, [location.pathname]);

  // Auto-refresh silencioso a cada 5 minutos (300.000 ms) e ouvinte global para abrir modal de agente
  useEffect(() => {
    const interval = setInterval(() => {
      // Dispara evento de atualização silenciosa sem travar a interface nem exibir spinner de página
      window.dispatchEvent(
        new CustomEvent('app:refresh-data', {
          detail: { silent: true },
        })
      );
      setLastSync(new Date());
    }, 5 * 60 * 1000);

    const handleOpenAgentModal = () => {
      setIsInstallModalOpen(true);
    };
    window.addEventListener('app:open-install-agent', handleOpenAgentModal);

    return () => {
      clearInterval(interval);
      window.removeEventListener('app:open-install-agent', handleOpenAgentModal);
    };
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    window.dispatchEvent(
      new CustomEvent('app:refresh-data', {
        detail: { silent: false },
      })
    );
    setLastSync(new Date());
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleOpenInstallAgent = () => {
    setIsInstallModalOpen(true);
  };

  const formatHora = (d: Date) => {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[#1E2636] bg-[#0B0E14]/90 backdrop-blur-md px-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2.5">
          <span className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider">
            Easy Inventory
          </span>          
        </div>
      </div>

      {/* Canto direito: Monitoramento Ativo + Atualizar Manual + Instalar Agente (Admin) */}
      <div className="flex items-center gap-3">
        {/* Indicador de Monitoramento Ativo / Sincronização */}
        <div
          className="flex items-center gap-2 rounded-full border border-emerald-500/30 px-3 py-1 text-xs text-emerald-400 cursor-help"
          title={`Sincronização automática em background a cada 5 minutos.\nÚltima atualização: ${formatHora(lastSync)}`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          </span>
          <span className="font-semibold text-[11px] flex items-center gap-1">
            <span>Sincronização</span>
          </span>
          <span className="text-[10px] text-emerald-500/80 font-mono hidden sm:inline">
            &bull; {formatHora(lastSync)}
          </span>
        </div>

        {/* Botão de Atualizar Manual */}
        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          title="Atualizar dados agora"
          className="flex items-center gap-1.5 rounded-lg border border-[#263044] bg-[#181F2E] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#1E2636] hover:text-white hover:border-orange-500/40 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-400 ${isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>

        {/* Botão de Instalar Agente (exclusivo Admin) em Laranja Âmbar */}
        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenInstallAgent}
            title="Abrir instalador de agente (Windows / Linux)"
            className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 transition-all shadow-md shadow-orange-500/20 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Instalar Agente</span>
          </button>
        )}
      </div>

      {/* Modal Global de Instalação de Agentes (Acessível de qualquer tela) */}
      {isAdmin && (
        <AgentInstallModal
          isOpen={isInstallModalOpen}
          onClose={() => setIsInstallModalOpen(false)}
        />
      )}
    </header>
  );
};
