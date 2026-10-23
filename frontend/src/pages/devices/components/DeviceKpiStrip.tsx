import React from 'react';
import { DeviceKPIs, DeviceQueryParams } from '@/types/device';
import { AlertTriangle, Clock, HardDrive, ShieldAlert, Wrench, Monitor } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface DeviceKpiStripProps {
  kpis?: DeviceKPIs;
  filters: DeviceQueryParams;
  onFilterChange: (updates: Partial<DeviceQueryParams>) => void;
}

export const DeviceKpiStrip: React.FC<DeviceKpiStripProps> = ({
  kpis,
  filters,
  onFilterChange,
}) => {
  const { isAdmin, isMatrizOperator } = useAuth();
  const isOperator = !isAdmin && !isMatrizOperator;

  if (!kpis) return null;

  const totalEstacoes = (kpis.total_linux || 0) + (kpis.total_windows || 0);

  const isTotalActive =
    !filters.plataforma &&
    !filters.alerta &&
    !filters.inativas &&
    !filters.disco_critico &&
    !filters.firewall_status &&
    filters.bancada === undefined &&
    !filters.status_conexao &&
    !filters.status;

  return (
    <div className={`grid gap-3.5 ${isOperator ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'}`}>
      {/* 1. Total de Estações - Acento Laranja Âmbar */}
      <button
        type="button"
        onClick={() =>
          onFilterChange({
            plataforma: undefined,
            alerta: undefined,
            inativas: undefined,
            disco_critico: undefined,
            firewall_status: undefined,
            bancada: undefined,
            status_conexao: undefined,
            status: undefined,
            page: 1,
          })
        }
        className={`group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all overflow-hidden cursor-pointer ${
          isTotalActive
            ? 'border-orange-500 ring-1 ring-orange-500/30 bg-elevated'
            : 'border-border-subtle bg-surface bg-gradient-to-b from-elevated/40 to-surface hover:border-border-medium hover:bg-elevated/70'
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#F97316]" />
        <div className="flex w-full items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">
            Total
          </span>
          <div className="p-1 rounded-md bg-elevated border border-border-subtle text-orange-400 group-hover:scale-105 transition-transform">
            <Monitor className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="my-1.5 text-2xl font-extrabold font-mono tabular-nums tracking-tight text-fg group-hover:text-orange-400 transition-colors">
          {totalEstacoes}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-fg-secondary truncate">
          <span className="h-1.5 w-1.5 rounded-full bg-[#F97316] shrink-0 shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
          <span className="truncate">Parque Completo</span>
        </div>
      </button>

      {/* 2. Alertas HW - Acento Vermelho Crítico */}
      <button
        type="button"
        onClick={() =>
          onFilterChange({
            alerta: filters.alerta ? undefined : true,
            page: 1,
          })
        }
        className={`group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all overflow-hidden cursor-pointer ${
          filters.alerta
            ? 'border-orange-500 ring-1 ring-orange-500/30 bg-elevated'
            : 'border-border-subtle bg-surface bg-gradient-to-b from-elevated/40 to-surface hover:border-border-medium hover:bg-elevated/70'
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#EF4444]" />
        <div className="flex w-full items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            Alertas HW
          </span>
          <div className="p-1 rounded-md bg-elevated border border-border-subtle text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className={`my-1.5 text-2xl font-extrabold font-mono tabular-nums tracking-tight ${kpis.total_alertas > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-fg'} group-hover:text-rose-700 dark:group-hover:text-rose-300 transition-colors`}>
          {kpis.total_alertas}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-fg-secondary truncate">
          <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444] shrink-0 shadow-[0_0_6px_rgba(239,68,68,0.7)]" />
          <span className="truncate">Conflito MAC / SSD</span>
        </div>
      </button>

      {/* 3. Inativas (+48h) - Acento Amarelo Âmbar */}
      <button
        type="button"
        onClick={() =>
          onFilterChange({
            inativas: (filters.inativas || filters.status_conexao === 'offline') ? undefined : true,
            status_conexao: undefined,
            page: 1,
          })
        }
        className={`group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all overflow-hidden cursor-pointer ${
          filters.inativas || filters.status_conexao === 'offline'
            ? 'border-orange-500 ring-1 ring-orange-500/30 bg-elevated'
            : 'border-border-subtle bg-surface bg-gradient-to-b from-elevated/40 to-surface hover:border-border-medium hover:bg-elevated/70'
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#F59E0B]" />
        <div className="flex w-full items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Inativas
          </span>
          <div className="p-1 rounded-md bg-elevated border border-border-subtle text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
            <Clock className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className={`my-1.5 text-2xl font-extrabold font-mono tabular-nums tracking-tight ${kpis.total_inativas > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-fg'} group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors`}>
          {kpis.total_inativas}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-fg-secondary truncate">
          <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] shrink-0 shadow-[0_0_6px_rgba(245,158,11,0.7)]" />
          <span className="truncate">Sem Comunicação (+48h)</span>
        </div>
      </button>

      {/* 4. Disco Crítico (>=85%) - Acento Rosa / Vermelho */}
      <button
        type="button"
        onClick={() =>
          onFilterChange({
            disco_critico: filters.disco_critico ? undefined : true,
            page: 1,
          })
        }
        className={`group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all overflow-hidden cursor-pointer ${
          filters.disco_critico
            ? 'border-orange-500 ring-1 ring-orange-500/30 bg-elevated'
            : 'border-border-subtle bg-surface bg-gradient-to-b from-elevated/40 to-surface hover:border-border-medium hover:bg-elevated/70'
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#F43F5E]" />
        <div className="flex w-full items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            Disco &ge; 85%
          </span>
          <div className="p-1 rounded-md bg-elevated border border-border-subtle text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
            <HardDrive className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className={`my-1.5 text-2xl font-extrabold font-mono tabular-nums tracking-tight ${kpis.total_critico_disco > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-fg'} group-hover:text-rose-700 dark:group-hover:text-rose-300 transition-colors`}>
          {kpis.total_critico_disco}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-fg-secondary truncate">
          <span className="h-1.5 w-1.5 rounded-full bg-[#F43F5E] shrink-0 shadow-[0_0_6px_rgba(244,63,94,0.7)]" />
          <span className="truncate">Espaço Crítico</span>
        </div>
      </button>

      {/* Cards adicionais para Administrador e Operador Matriz */}
      {!isOperator ? (
        <>
          {/* 5. Firewall Pendente - Acento Amarelo Âmbar */}
          <button
            type="button"
            onClick={() =>
              onFilterChange({
                firewall_status: filters.firewall_status === 'pendente' ? undefined : 'pendente',
                page: 1,
              })
            }
            className={`group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all overflow-hidden cursor-pointer ${
              filters.firewall_status === 'pendente'
                ? 'border-orange-500 ring-1 ring-orange-500/30 bg-elevated'
                : 'border-border-subtle bg-surface bg-gradient-to-b from-elevated/40 to-surface hover:border-border-medium hover:bg-elevated/70'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#F59E0B]" />
            <div className="flex w-full items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Firewall
              </span>
              <div className="p-1 rounded-md bg-elevated border border-border-subtle text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                <ShieldAlert className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className={`my-1.5 text-2xl font-extrabold font-mono tabular-nums tracking-tight ${kpis.total_firewall_pendente > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-fg'} group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors`}>
              {kpis.total_firewall_pendente}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-fg-secondary truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] shrink-0 shadow-[0_0_6px_rgba(245,158,11,0.7)]" />
              <span className="truncate">Aguardando Liberação</span>
            </div>
          </button>

          {/* 6. Bancada (.88.x) - Acento Amarelo Âmbar */}
          <button
            type="button"
            onClick={() =>
              onFilterChange({
                bancada: filters.bancada ? false : true,
                page: 1,
              })
            }
            className={`group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all overflow-hidden cursor-pointer ${
              filters.bancada === true
                ? 'border-orange-500 ring-1 ring-orange-500/30 bg-elevated'
                : 'border-border-subtle bg-surface bg-gradient-to-b from-elevated/40 to-surface hover:border-border-medium hover:bg-elevated/70'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#F59E0B]" />
            <div className="flex w-full items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Bancada
              </span>
              <div className="p-1 rounded-md bg-elevated border border-border-subtle text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                <Wrench className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className={`my-1.5 text-2xl font-extrabold font-mono tabular-nums tracking-tight ${kpis.total_bancada_88 > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-fg'} group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors`}>
              {kpis.total_bancada_88}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-fg-secondary truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] shrink-0 shadow-[0_0_6px_rgba(245,158,11,0.7)]" />
              <span className="truncate">Em Preparação (.88)</span>
            </div>
          </button>
        </>
      ) : null}
    </div>
  );
};
