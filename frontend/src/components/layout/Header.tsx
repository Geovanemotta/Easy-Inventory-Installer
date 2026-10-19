import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { RefreshCw, Download, Activity } from 'lucide-react';
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
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-xs px-6 shadow-2xs">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-bold tracking-tight text-slate-800 flex items-center gap-2">
          <span>Giassi Inventory</span>
          <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[10px] font-extrabold text-blue-700">
            V2
          </span>
        </h1>
      </div>

      {/* Canto direito: Monitoramento Ativo + Atualizar Manual + Instalar Agente (Admin) */}
      <div className="flex items-center gap-3">
        {/* Indicador de Monitoramento Ativo / Sincronização */}
        <div
          className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/70 px-3 py-1 text-xs text-emerald-800 cursor-help"
          title={`Sincronização automática em background a cada 5 minutos.\nÚltima atualização: ${formatHora(lastSync)}`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-semibold text-[11px] flex items-center gap-1">
            <Activity className="h-3 w-3 text-emerald-600" />
            <span>Monitoramento Ativo</span>
          </span>
          <span className="text-[10px] text-emerald-600/80 font-mono hidden sm:inline">
            &bull; {formatHora(lastSync)}
          </span>
        </div>

        {/* Botão de Atualizar Manual */}
        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          title="Atualizar dados agora"
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-2xs disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>

        {/* Botão de Instalar Agente (exclusivo Admin) */}
        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenInstallAgent}
            title="Abrir instalador de agente (Windows / Linux)"
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-xs"
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
