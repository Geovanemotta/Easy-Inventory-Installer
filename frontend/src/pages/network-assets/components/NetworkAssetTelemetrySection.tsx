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
      <div className="rounded-xl border border-border-subtle bg-surface p-4 shadow-xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400/90 flex items-center gap-2">
          <Monitor className="h-4 w-4 text-orange-400" />
          Sistema Operacional &amp; Conectividade
        </h3>

        {/* SO Badge */}
        <div className="p-3 rounded-lg bg-elevated border border-border-medium flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-fg-secondary uppercase tracking-wider block">
              Sistema Operacional
            </span>
            <span className="text-sm font-bold text-fg">
              {asset.sistema_operacional || 'Sistema Integrado (Agente de Inventário)'}
            </span>
          </div>
          {asset.patrimonio && (
            <div className="text-right">
              <span className="text-[10px] font-bold text-fg-secondary uppercase tracking-wider block">
                Patrimônio
              </span>
              <span className="font-mono tabular-nums text-xs font-bold text-orange-400">
                {asset.patrimonio}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="group p-2.5 rounded-lg bg-elevated border border-border-medium">
            <span className="text-[11px] font-medium text-fg-secondary block mb-1">
              Endereço IPv4
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono tabular-nums text-sm font-bold text-fg">
                {asset.ip || '—'}
              </span>
              {asset.ip && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(asset.ip!, 'ip')}
                  className="opacity-0 group-hover:opacity-100 text-fg-secondary hover:text-fg transition-opacity p-1 rounded cursor-pointer shrink-0"
                  title="Copiar IP"
                >
                  {copiedKey === 'ip' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="group p-2.5 rounded-lg bg-elevated border border-border-medium">
            <span className="text-[11px] font-medium text-fg-secondary block mb-1">
              Endereço MAC
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono tabular-nums text-sm font-semibold text-fg">
                {formatarMac(asset.mac)}
              </span>
              {asset.mac && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(formatarMac(asset.mac), 'mac')}
                  className="opacity-0 group-hover:opacity-100 text-fg-secondary hover:text-fg transition-opacity p-1 rounded cursor-pointer shrink-0"
                  title="Copiar MAC"
                >
                  {copiedKey === 'mac' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-lg bg-elevated border border-border-medium text-xs">
          <span className="text-fg-secondary flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-orange-400" />
            Último Ping:
          </span>
          <span className="font-semibold text-fg">
            {formatRelativeTime(asset.ultimo_ping)}
          </span>
        </div>

        {asset.faixa_nome && (
          <div className="text-[11px] text-gray-700 dark:text-slate-300 bg-elevated p-2.5 rounded-lg border border-border-medium flex items-center justify-between">
            <span className="text-fg-secondary">VLAN / Sub-rede:</span>
            <span className="font-semibold text-fg">{asset.faixa_nome}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4 shadow-xs space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400/90 flex items-center gap-2">
        <Radio className="h-4 w-4 text-orange-400" />
        Conectividade &amp; Rede
      </h3>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="group p-2.5 rounded-lg bg-elevated border border-border-medium">
          <span className="text-[11px] font-medium text-fg-secondary block mb-1">
            Endereço IPv4
          </span>
          <div className="flex items-center justify-between">
            <span className="font-mono tabular-nums text-sm font-bold text-fg">
              {asset.ip || '—'}
            </span>
            {asset.ip && (
              <button
                type="button"
                onClick={() => copyToClipboard(asset.ip!, 'ip')}
                className="opacity-0 group-hover:opacity-100 text-fg-secondary hover:text-fg transition-opacity p-1 rounded cursor-pointer shrink-0"
                title="Copiar IP"
              >
                {copiedKey === 'ip' ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        <div className="group p-2.5 rounded-lg bg-elevated border border-border-medium">
          <span className="text-[11px] font-medium text-fg-secondary block mb-1">
            Endereço MAC
          </span>
          <div className="flex items-center justify-between">
            <span className="font-mono tabular-nums text-sm font-semibold text-fg">
              {formatarMac(asset.mac)}
            </span>
            {asset.mac && (
              <button
                type="button"
                onClick={() => copyToClipboard(formatarMac(asset.mac), 'mac')}
                className="opacity-0 group-hover:opacity-100 text-fg-secondary hover:text-fg transition-opacity p-1 rounded cursor-pointer shrink-0"
                title="Copiar MAC"
              >
                {copiedKey === 'mac' ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-2.5 rounded-lg bg-elevated border border-border-medium text-xs">
        <span className="text-fg-secondary flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-orange-400" />
          Último Teste de Ping:
        </span>
        <span className="font-medium text-fg">
          {formatRelativeTime(asset.ultimo_ping)}
        </span>
      </div>

      {asset.faixa_nome && (
        <div className="text-[11px] text-gray-700 dark:text-slate-300 bg-elevated p-2.5 rounded-lg border border-border-medium flex items-center justify-between">
          <span className="text-fg-secondary">VLAN / Sub-rede:</span>
          <span className="font-semibold text-fg">{asset.faixa_nome}</span>
        </div>
      )}
    </div>
  );
};
