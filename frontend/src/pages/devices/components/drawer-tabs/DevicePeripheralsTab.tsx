import React from 'react';
import {
  Usb,
  Monitor,
  Smartphone,
  Printer,
  Keyboard,
  Mouse,
  Copy,
  Check,
  Star,
} from 'lucide-react';
import { PerifericoItem } from '@/types/device';

interface DevicePeripheralsTabProps {
  perifericos: PerifericoItem[];
  perifericosAgrupados?: any;
  copyToClipboard: (text: string, key: string, label?: string, e?: React.MouseEvent) => void;
  copiedKey: string | null;
}

export const DevicePeripheralsTab: React.FC<DevicePeripheralsTabProps> = ({
  perifericos,
  perifericosAgrupados,
  copyToClipboard,
  copiedKey,
}) => {
  return (
    <div className="space-y-4">
      {perifericos.length === 0 ? (
        <div className="text-center py-20 text-fg-muted text-xs">
          Nenhum periférico ou monitor registrado para este equipamento.
        </div>
      ) : (
        <>
          {perifericosAgrupados && (
            <div className="flex flex-wrap gap-2 text-[11px]">
              {perifericosAgrupados.monitores?.length > 0 && (
                <span className="rounded-lg bg-sky-500/10 border border-sky-500/30 px-2.5 py-1 text-sky-600 dark:text-sky-400 font-semibold font-mono">
                  Monitores: {perifericosAgrupados.monitores.length}
                </span>
              )}
              {perifericosAgrupados.armazenamento_usb?.length > 0 && (
                <span className="rounded-lg bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 text-cyan-600 dark:text-cyan-400 font-semibold font-mono">
                  USB Storage: {perifericosAgrupados.armazenamento_usb.length}
                </span>
              )}
              {perifericosAgrupados.smartphones?.length > 0 && (
                <span className="rounded-lg bg-purple-500/10 border border-purple-500/30 px-2.5 py-1 text-purple-600 dark:text-purple-400 font-semibold font-mono">
                  Celulares: {perifericosAgrupados.smartphones.length}
                </span>
              )}
              {perifericosAgrupados.impressoras?.length > 0 && (
                <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                  Impressoras: {perifericosAgrupados.impressoras.length}
                </span>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {perifericos.map((p, pIdx) => {
              const tipo = (p.tipo || 'outro').toLowerCase();
              let IconComp = Usb;
              let badgeColor = 'bg-elevated text-fg-secondary border-border-medium';
              let iconColor = 'text-fg-secondary';

              if (tipo === 'monitor') {
                IconComp = Monitor;
                badgeColor = 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30';
                iconColor = 'text-sky-600 dark:text-sky-400';
              } else if (tipo === 'smartphone') {
                IconComp = Smartphone;
                badgeColor = 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30';
                iconColor = 'text-purple-600 dark:text-purple-400';
              } else if (tipo === 'impressora') {
                IconComp = Printer;
                badgeColor = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
                iconColor = 'text-emerald-600 dark:text-emerald-400';
              } else if (tipo === 'teclado') {
                IconComp = Keyboard;
                badgeColor = 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
                iconColor = 'text-amber-600 dark:text-amber-400';
              } else if (tipo === 'mouse') {
                IconComp = Mouse;
                badgeColor = 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
                iconColor = 'text-amber-600 dark:text-amber-400';
              } else if (tipo === 'armazenamento_usb') {
                IconComp = Usb;
                badgeColor = 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30';
                iconColor = 'text-cyan-600 dark:text-cyan-400';
              }

              const isPadrao =
                (p as any).is_default ||
                (p as any).padrao ||
                (p.nome && (p.nome.toLowerCase().includes('(padrão)') || p.nome.toLowerCase().includes('default')));

              return (
                <div
                  key={pIdx}
                  className={`rounded-xl border bg-surface p-3.5 shadow-xs flex items-start gap-3 transition-colors ${
                    isPadrao
                      ? 'border-orange-500/40 bg-surface'
                      : 'border-border-subtle hover:border-border-medium'
                  }`}
                >
                  <div className={`rounded-lg bg-elevated border border-border-subtle p-2 shrink-0 ${iconColor}`}>
                    <IconComp className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-semibold text-fg truncate" title={p.nome}>
                        {p.nome}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {isPadrao && (
                          <span className="rounded bg-orange-500/20 border border-orange-500/40 px-1.5 py-0.2 text-[9px] font-bold text-orange-400 flex items-center gap-0.5">
                            <Star className="h-2.5 w-2.5 fill-orange-400" /> Padrão
                          </span>
                        )}
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${badgeColor}`}>
                          {p.tipo}
                        </span>
                      </div>
                    </div>
                    <div className="text-fg-secondary mt-1.5 space-y-0.5 text-[11px]">
                      {p.fabricante && <div><span className="text-fg-muted">Fabricante:</span> {p.fabricante}</div>}
                      {p.conexao && <div><span className="text-fg-muted">Conexão:</span> {p.conexao}</div>}
                      {p.capacidade && <div><span className="text-fg-muted">Capacidade:</span> {p.capacidade}</div>}
                      {p.serial && (
                        <div className="group font-mono text-gray-700 dark:text-slate-300 flex items-center gap-1.5 pt-0.5">
                          <span>S/N: {p.serial}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(p.serial!, `perif_${pIdx}`)}
                            className="opacity-0 group-hover:opacity-100 text-fg-secondary hover:text-fg transition-opacity cursor-pointer shrink-0"
                            title="Copiar Serial"
                          >
                            {copiedKey === `perif_${pIdx}` ? (
                              <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
