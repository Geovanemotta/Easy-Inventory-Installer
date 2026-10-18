import React from 'react';
import { DeviceKPIs, DeviceQueryParams } from '@/types/device';
import { AlertTriangle, Clock, HardDrive, ShieldAlert, Wrench } from 'lucide-react';
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

  return (
    <div className={`grid gap-3 ${isOperator ? 'grid-cols-2 sm:max-w-md' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-7'}`}>
      {/* 1. Linux */}
      <button
        type="button"
        onClick={() =>
          onFilterChange({
            plataforma: filters.plataforma === 'Linux' ? undefined : 'Linux',
            page: 1,
          })
        }
        className={`flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all ${
          filters.plataforma === 'Linux'
            ? 'border-blue-500 bg-blue-50/70 shadow-xs ring-1 ring-blue-500'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <div className="flex w-full items-center justify-between text-xs font-semibold text-slate-500">
          <span>Linux</span>
          <span className="text-[10px] font-bold text-blue-600 bg-blue-100/60 px-1.5 py-0.5 rounded">
            SO
          </span>
        </div>
        <div className="mt-2 text-2xl font-bold text-slate-800">{kpis.total_linux}</div>
        <div className="text-[11px] text-slate-400">Estações Linux</div>
      </button>

      {/* 2. Windows */}
      <button
        type="button"
        onClick={() =>
          onFilterChange({
            plataforma: filters.plataforma === 'Windows' ? undefined : 'Windows',
            page: 1,
          })
        }
        className={`flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all ${
          filters.plataforma === 'Windows'
            ? 'border-indigo-500 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-500'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <div className="flex w-full items-center justify-between text-xs font-semibold text-slate-500">
          <span>Windows</span>
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100/60 px-1.5 py-0.5 rounded">
            SO
          </span>
        </div>
        <div className="mt-2 text-2xl font-bold text-slate-800">{kpis.total_windows}</div>
        <div className="text-[11px] text-slate-400">Estações Windows</div>
      </button>

      {/* Cards adicionais exclusivos para Administrador e Operador Matriz */}
      {!isOperator && (
        <>
          {/* 3. Conflitos / Alertas HW */}
          <button
            type="button"
            onClick={() =>
              onFilterChange({
                alerta: filters.alerta ? undefined : true,
                page: 1,
              })
            }
            className={`flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all ${
              filters.alerta
                ? 'border-red-500 bg-red-50/70 shadow-xs ring-1 ring-red-500'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex w-full items-center justify-between text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1 text-red-600 font-bold">
                <AlertTriangle className="h-3.5 w-3.5" /> Alertas HW
              </span>
              {kpis.total_alertas > 0 && (
                <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                  Crítico
                </span>
              )}
            </div>
            <div className={`mt-2 text-2xl font-bold ${kpis.total_alertas > 0 ? 'text-red-600' : 'text-slate-800'}`}>
              {kpis.total_alertas}
            </div>
            <div className="text-[11px] text-slate-400">Conflito MAC / SSD</div>
          </button>

          {/* 4. Inativas (+48h) */}
          <button
            type="button"
            onClick={() =>
              onFilterChange({
                inativas: filters.inativas ? undefined : true,
                page: 1,
              })
            }
            className={`flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all ${
              filters.inativas
                ? 'border-amber-500 bg-amber-50/70 shadow-xs ring-1 ring-amber-500'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex w-full items-center justify-between text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1 text-amber-600 font-bold">
                <Clock className="h-3.5 w-3.5" /> Inativas
              </span>
              <span className="text-[10px] text-slate-500">+48h</span>
            </div>
            <div className={`mt-2 text-2xl font-bold ${kpis.total_inativas > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {kpis.total_inativas}
            </div>
            <div className="text-[11px] text-slate-400">Sem comunicação</div>
          </button>

          {/* 5. Disco Crítico (>=85%) */}
          <button
            type="button"
            onClick={() =>
              onFilterChange({
                disco_critico: filters.disco_critico ? undefined : true,
                page: 1,
              })
            }
            className={`flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all ${
              filters.disco_critico
                ? 'border-rose-500 bg-rose-50/70 shadow-xs ring-1 ring-rose-500'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex w-full items-center justify-between text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1 text-rose-600 font-bold">
                <HardDrive className="h-3.5 w-3.5" /> Disco &ge; 85%
              </span>
            </div>
            <div className={`mt-2 text-2xl font-bold ${kpis.total_critico_disco > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {kpis.total_critico_disco}
            </div>
            <div className="text-[11px] text-slate-400">Espaço crítico</div>
          </button>

          {/* 6. Novas / Firewall Pendente */}
          <button
            type="button"
            onClick={() =>
              onFilterChange({
                firewall_status: filters.firewall_status === 'pendente' ? undefined : 'pendente',
                page: 1,
              })
            }
            className={`flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all ${
              filters.firewall_status === 'pendente'
                ? 'border-amber-500 bg-amber-50/70 shadow-xs ring-1 ring-amber-500'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex w-full items-center justify-between text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1 text-amber-700 font-bold">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-600" /> Firewall
              </span>
              {kpis.total_firewall_pendente > 0 && (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                  Aprovar
                </span>
              )}
            </div>
            <div className={`mt-2 text-2xl font-bold ${kpis.total_firewall_pendente > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {kpis.total_firewall_pendente}
            </div>
            <div className="text-[11px] text-slate-400">Aguardando liberação</div>
          </button>

          {/* 7. Bancada (192.168.88.x) */}
          <button
            type="button"
            onClick={() =>
              onFilterChange({
                bancada: filters.bancada ? false : true,
                page: 1,
              })
            }
            className={`flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all ${
              filters.bancada === true
                ? 'border-blue-500 bg-blue-50/70 shadow-xs ring-1 ring-blue-500'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex w-full items-center justify-between text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1 text-blue-700 font-bold">
                <Wrench className="h-3.5 w-3.5 text-blue-600" /> Bancada
              </span>
              <span className="text-[10px] text-slate-500">.88.x</span>
            </div>
            <div className={`mt-2 text-2xl font-bold ${kpis.total_bancada_88 > 0 ? 'text-blue-600' : 'text-slate-800'}`}>
              {kpis.total_bancada_88}
            </div>
            <div className="text-[11px] text-slate-400">Em preparação</div>
          </button>
        </>
      )}
    </div>
  );
};
