import React from 'react';
import { NetworkAsset } from '@/types/networkAsset';
import { Site } from '@/types/site';
import {
  Monitor,
  Radio,
  Clock,
  Copy,
  Check,
} from 'lucide-react';
import { formatarMac } from './NetworkAssetsTable';

interface NetworkAssetTelemetrySectionProps {
  asset: NetworkAsset;
  site?: Site;
  isEstacao: boolean;
  copiedKey: string | null;
  copyToClipboard: (text: string, label: string, e?: React.MouseEvent) => void;
  formatRelativeTime: (dateStr?: string | null) => string;
}

export const NetworkAssetTelemetrySection: React.FC<NetworkAssetTelemetrySectionProps> = ({
  asset,
  isEstacao,
  copiedKey,
  copyToClipboard,
  formatRelativeTime,
}) => {
  if (isEstacao) {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 shadow-2xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-2">
          <Monitor className="h-4 w-4 text-blue-600" />
          Sistema Operacional &amp; Conectividade
        </h3>

        {/* SO Badge */}
        <div className="p-3 rounded-lg bg-white border border-blue-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Sistema Operacional
            </span>
            <span className="text-sm font-bold text-slate-800">
              {asset.sistema_operacional || 'Sistema Integrado (Agente de Inventário)'}
            </span>
          </div>
          {asset.patrimonio && (
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Patrimônio
              </span>
              <span className="font-mono text-xs font-bold text-slate-700">
                {asset.patrimonio}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="p-2.5 rounded-lg bg-white border border-slate-200">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">
              Endereço IPv4
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-slate-800">
                {asset.ip || '—'}
              </span>
              {asset.ip && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(asset.ip!, 'ip')}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded"
                  title="Copiar IP"
                >
                  {copiedKey === 'ip' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-white border border-slate-200">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">
              Endereço MAC
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-semibold text-slate-800">
                {formatarMac(asset.mac)}
              </span>
              {asset.mac && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(formatarMac(asset.mac), 'mac')}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded"
                  title="Copiar MAC"
                >
                  {copiedKey === 'mac' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 text-xs">
          <span className="text-slate-500 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            Último Ping:
          </span>
          <span className="font-semibold text-slate-700">
            {formatRelativeTime(asset.ultimo_ping)}
          </span>
        </div>

        {asset.faixa_nome && (
          <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
            <span className="text-slate-400">VLAN / Sub-rede:</span>
            <span className="font-semibold text-slate-800">{asset.faixa_nome}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
        <Radio className="h-4 w-4 text-blue-600" />
        Conectividade &amp; Rede
      </h3>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">
            Endereço IPv4
          </span>
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-bold text-slate-800">
              {asset.ip || '—'}
            </span>
            {asset.ip && (
              <button
                type="button"
                onClick={() => copyToClipboard(asset.ip!, 'ip')}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
                title="Copiar IP"
              >
                {copiedKey === 'ip' ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">
            Endereço MAC
          </span>
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-semibold text-slate-800">
              {formatarMac(asset.mac)}
            </span>
            {asset.mac && (
              <button
                type="button"
                onClick={() => copyToClipboard(formatarMac(asset.mac), 'mac')}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
                title="Copiar MAC"
              >
                {copiedKey === 'mac' ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
        <span className="text-slate-500 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          Último Teste de Ping:
        </span>
        <span className="font-medium text-slate-700">
          {formatRelativeTime(asset.ultimo_ping)}
        </span>
      </div>

      {asset.faixa_nome && (
        <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
          <span className="text-slate-400">VLAN / Sub-rede:</span>
          <span className="font-semibold text-slate-800">{asset.faixa_nome}</span>
        </div>
      )}
    </div>
  );
};
