import React from 'react';
import {
  Layers,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Printer,
  Radio,
  Wifi,
} from 'lucide-react';
import { NetworkAssetKPIs } from '@/types/networkAsset';

interface NetworkAssetKpiStripProps {
  kpis: NetworkAssetKPIs | null;
  filtroStatus: 'todos' | 'online' | 'offline' | 'nao_testado';
  filtroGrupo: '' | 'impressora' | 'rede' | 'wifi';
  onSelectStatus: (status: 'todos' | 'online' | 'offline' | 'nao_testado') => void;
  onSelectGrupo: (grupo: '' | 'impressora' | 'rede' | 'wifi') => void;
}

export const NetworkAssetKpiStrip: React.FC<NetworkAssetKpiStripProps> = ({
  kpis,
  filtroStatus,
  filtroGrupo,
  onSelectStatus,
  onSelectGrupo,
}) => {
  const isTodosActive = filtroStatus === 'todos' && filtroGrupo === '';
  const isOnlineActive = filtroStatus === 'online';
  const isOfflineActive = filtroStatus === 'offline';
  const isNaoTestadoActive = filtroStatus === 'nao_testado';
  const isImpressorasActive = filtroGrupo === 'impressora';
  const isRedeActive = filtroGrupo === 'rede';
  const isWifiActive = filtroGrupo === 'wifi';

  const testados = (kpis?.online ?? 0) + (kpis?.offline ?? 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 select-none">
      {/* 1. Total de Ativos */}
      <button
        type="button"
        onClick={() => {
          onSelectStatus('todos');
          onSelectGrupo('');
        }}
        className={`group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all overflow-hidden cursor-pointer ${
          isTodosActive
            ? 'border-orange-500 ring-1 ring-orange-500/30 bg-elevated'
            : 'border-border-subtle bg-surface bg-gradient-to-b from-elevated/40 to-surface hover:border-border-medium hover:bg-elevated/70'
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#F97316]" />
        <div className="flex w-full items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">
            Total Ativos
          </span>
          <div className="p-1 rounded-md bg-elevated border border-border-subtle text-orange-400 group-hover:scale-105 transition-transform">
            <Layers className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="my-1.5 text-2xl font-extrabold font-mono tabular-nums tracking-tight text-fg group-hover:text-orange-400 transition-colors">
          {kpis?.total ?? 0}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-fg-secondary truncate">
          {testados > 0 ? `${testados} testados` : 'Cadastrados'}
        </div>
      </button>

      {/* 2. Online */}
      <button
        type="button"
        onClick={() => {
          if (isOnlineActive) {
            onSelectStatus('todos');
          } else {
            onSelectStatus('online');
            onSelectGrupo('');
          }
        }}
        className={`group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all overflow-hidden cursor-pointer ${
          isOnlineActive
            ? 'border-emerald-500 ring-1 ring-emerald-500/30 bg-elevated'
            : 'border-border-subtle bg-surface bg-gradient-to-b from-elevated/40 to-surface hover:border-border-medium hover:bg-elevated/70'
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#10B981]" />
        <div className="flex w-full items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/90 dark:text-emerald-400/90">
            Online
          </span>
          <div className="p-1 rounded-md bg-elevated border border-border-subtle text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="my-1.5 text-2xl font-extrabold font-mono tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
          {kpis?.online ?? 0}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-fg-secondary truncate">
          {testados > 0
            ? `${Math.round(((kpis?.online ?? 0) / testados) * 100)}% dos testados`
            : 'Respondendo ping'}
        </div>
      </button>

      {/* 3. Offline */}
      <button
        type="button"
        onClick={() => {
          if (isOfflineActive) {
            onSelectStatus('todos');
          } else {
            onSelectStatus('offline');
            onSelectGrupo('');
          }
        }}
        className={`group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all overflow-hidden cursor-pointer ${
          isOfflineActive
            ? 'border-rose-500 ring-1 ring-rose-500/30 bg-elevated'
            : 'border-border-subtle bg-surface bg-gradient-to-b from-elevated/40 to-surface hover:border-border-medium hover:bg-elevated/70'
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#F43F5E]" />
        <div className="flex w-full items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600/90 dark:text-rose-400/90">
            Offline
          </span>
          <div className="p-1 rounded-md bg-elevated border border-border-subtle text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
            <XCircle className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="my-1.5 text-2xl font-extrabold font-mono tabular-nums tracking-tight text-rose-600 dark:text-rose-400 group-hover:text-rose-700 dark:group-hover:text-rose-300 transition-colors">
          {kpis?.offline ?? 0}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-fg-secondary truncate">
          {testados > 0
            ? `${Math.round(((kpis?.offline ?? 0) / testados) * 100)}% dos testados`
            : 'Sem resposta'}
        </div>
      </button>

      {/* 4. Não Testados */}
      <button
        type="button"
        onClick={() => {
          if (isNaoTestadoActive) {
            onSelectStatus('todos');
          } else {
            onSelectStatus('nao_testado');
            onSelectGrupo('');
          }
        }}
        className={`group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all overflow-hidden cursor-pointer ${
          isNaoTestadoActive
            ? 'border-border-medium ring-1 ring-border-medium bg-elevated'
            : 'border-border-subtle bg-surface bg-gradient-to-b from-elevated/40 to-surface hover:border-border-medium hover:bg-elevated/70'
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#64748B]" />
        <div className="flex w-full items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">
            Não Testados
          </span>
          <div className="p-1 rounded-md bg-elevated border border-border-subtle text-fg-secondary group-hover:scale-105 transition-transform">
            <HelpCircle className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="my-1.5 text-2xl font-extrabold font-mono tabular-nums tracking-tight text-gray-700 dark:text-slate-300 group-hover:text-fg transition-colors">
          {kpis?.nao_testado ?? 0}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-fg-secondary truncate">
          Aguardando scan
        </div>
      </button>

      {/* 5. Impressoras */}
      <button
        type="button"
        onClick={() => {
          if (isImpressorasActive) {
            onSelectGrupo('');
          } else {
            onSelectGrupo('impressora');
            onSelectStatus('todos');
          }
        }}
        className={`group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all overflow-hidden cursor-pointer ${
          isImpressorasActive
            ? 'border-amber-500 ring-1 ring-amber-500/30 bg-elevated'
            : 'border-border-subtle bg-surface bg-gradient-to-b from-elevated/40 to-surface hover:border-border-medium hover:bg-elevated/70'
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#F59E0B]" />
        <div className="flex w-full items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600/90 dark:text-amber-400/90">
            Impressoras
          </span>
          <div className="p-1 rounded-md bg-elevated border border-border-subtle text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
            <Printer className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="my-1.5 text-2xl font-extrabold font-mono tabular-nums tracking-tight text-amber-600 dark:text-amber-400 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
          {kpis?.impressoras ?? 0}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-fg-secondary truncate">
          Térmicas / Laser
        </div>
      </button>

      {/* 6. Switches / Roteadores */}
      <button
        type="button"
        onClick={() => {
          if (isRedeActive) {
            onSelectGrupo('');
          } else {
            onSelectGrupo('rede');
            onSelectStatus('todos');
          }
        }}
        className={`group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all overflow-hidden cursor-pointer ${
          isRedeActive
            ? 'border-indigo-500 ring-1 ring-indigo-500/30 bg-elevated'
            : 'border-border-subtle bg-surface bg-gradient-to-b from-elevated/40 to-surface hover:border-border-medium hover:bg-elevated/70'
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#6366F1]" />
        <div className="flex w-full items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600/90 dark:text-indigo-400/90">
            Switches &amp; Rede
          </span>
          <div className="p-1 rounded-md bg-elevated border border-border-subtle text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
            <Radio className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="my-1.5 text-2xl font-extrabold font-mono tabular-nums tracking-tight text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
          {kpis?.switches ?? 0}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-fg-secondary truncate">
          Ativos L2 / L3
        </div>
      </button>

      {/* 7. Access Points / Wi-Fi */}
      <button
        type="button"
        onClick={() => {
          if (isWifiActive) {
            onSelectGrupo('');
          } else {
            onSelectGrupo('wifi');
            onSelectStatus('todos');
          }
        }}
        className={`group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all overflow-hidden cursor-pointer ${
          isWifiActive
            ? 'border-cyan-500 ring-1 ring-cyan-500/30 bg-elevated'
            : 'border-border-subtle bg-surface bg-gradient-to-b from-elevated/40 to-surface hover:border-border-medium hover:bg-elevated/70'
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#06B6D4]" />
        <div className="flex w-full items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600/90 dark:text-cyan-400/90">
            Access Points
          </span>
          <div className="p-1 rounded-md bg-elevated border border-border-subtle text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition-transform">
            <Wifi className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="my-1.5 text-2xl font-extrabold font-mono tabular-nums tracking-tight text-cyan-600 dark:text-cyan-400 group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors">
          {kpis?.aps ?? 0}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-fg-secondary truncate">
          Pontos Wi-Fi
        </div>
      </button>
    </div>
  );
};
