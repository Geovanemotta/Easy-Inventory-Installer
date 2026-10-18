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
      {/* 1. Todos os Ativos */}
      <button
        type="button"
        onClick={() => {
          onSelectStatus('todos');
          onSelectGrupo('');
        }}
        className={`flex flex-col justify-between p-3 rounded-xl border text-left transition-all ${
          isTodosActive
            ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
        }`}
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] font-bold text-slate-600">Total Ativos</span>
          <Layers className="h-4 w-4 text-blue-600" />
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold font-mono text-slate-800">
            {kpis?.total ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            {testados > 0 ? `${testados} testados` : 'Cadastrados'}
          </span>
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
        className={`flex flex-col justify-between p-3 rounded-xl border text-left transition-all ${
          isOnlineActive
            ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
        }`}
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] font-bold text-slate-600">Online</span>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold font-mono text-emerald-700">
            {kpis?.online ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            {testados > 0
              ? `${Math.round(((kpis?.online ?? 0) / testados) * 100)}% dos testados`
              : 'Respondendo ping'}
          </span>
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
        className={`flex flex-col justify-between p-3 rounded-xl border text-left transition-all ${
          isOfflineActive
            ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-500/20 shadow-xs'
            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
        }`}
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] font-bold text-slate-600">Offline</span>
          <XCircle className="h-4 w-4 text-rose-600" />
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold font-mono text-rose-700">
            {kpis?.offline ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            {testados > 0
              ? `${Math.round(((kpis?.offline ?? 0) / testados) * 100)}% dos testados`
              : 'Sem resposta'}
          </span>
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
        className={`flex flex-col justify-between p-3 rounded-xl border text-left transition-all ${
          isNaoTestadoActive
            ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-400/20 shadow-xs'
            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
        }`}
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] font-bold text-slate-600">Não Testados</span>
          <HelpCircle className="h-4 w-4 text-slate-400" />
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold font-mono text-slate-700">
            {kpis?.nao_testado ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Aguardando scan</span>
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
        className={`flex flex-col justify-between p-3 rounded-xl border text-left transition-all ${
          isImpressorasActive
            ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-500/20 shadow-xs'
            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
        }`}
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] font-bold text-slate-600">Impressoras</span>
          <Printer className="h-4 w-4 text-amber-600" />
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold font-mono text-amber-700">
            {kpis?.impressoras ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Térmicas / Laser</span>
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
        className={`flex flex-col justify-between p-3 rounded-xl border text-left transition-all ${
          isRedeActive
            ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
        }`}
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] font-bold text-slate-600">Switches &amp; Rede</span>
          <Radio className="h-4 w-4 text-indigo-600" />
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold font-mono text-indigo-700">
            {kpis?.switches ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Ativos L2 / L3</span>
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
        className={`flex flex-col justify-between p-3 rounded-xl border text-left transition-all ${
          isWifiActive
            ? 'bg-cyan-50/80 border-cyan-400 ring-2 ring-cyan-500/20 shadow-xs'
            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
        }`}
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] font-bold text-slate-600">Access Points</span>
          <Wifi className="h-4 w-4 text-cyan-600" />
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold font-mono text-cyan-700">
            {kpis?.aps ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Pontos Wi-Fi</span>
        </div>
      </button>
    </div>
  );
};
