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
        <div className="text-center py-20 text-slate-400 text-xs">
          Nenhum periférico ou monitor registrado para este dispositivo.
        </div>
      ) : (
        <>
          {perifericosAgrupados && (
            <div className="flex flex-wrap gap-2 text-[11px]">
              {perifericosAgrupados.monitores?.length > 0 && (
                <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-blue-700 font-semibold border border-blue-200">
                  Monitores: {perifericosAgrupados.monitores.length}
                </span>
              )}
              {perifericosAgrupados.armazenamento_usb?.length > 0 && (
                <span className="rounded-lg bg-cyan-50 px-2.5 py-1 text-cyan-700 font-semibold border border-cyan-200">
                  USB Storage: {perifericosAgrupados.armazenamento_usb.length}
                </span>
              )}
              {perifericosAgrupados.smartphones?.length > 0 && (
                <span className="rounded-lg bg-purple-50 px-2.5 py-1 text-purple-700 font-semibold border border-purple-200">
                  Celulares: {perifericosAgrupados.smartphones.length}
                </span>
              )}
              {perifericosAgrupados.impressoras?.length > 0 && (
                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-700 font-semibold border border-emerald-200">
                  Impressoras: {perifericosAgrupados.impressoras.length}
                </span>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {perifericos.map((p, pIdx) => {
              const tipo = (p.tipo || 'outro').toLowerCase();
              let IconComp = Usb;
              let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';

              if (tipo === 'monitor') {
                IconComp = Monitor;
                badgeColor = 'bg-blue-100 text-blue-700 border-blue-200';
              } else if (tipo === 'smartphone') {
                IconComp = Smartphone;
                badgeColor = 'bg-purple-100 text-purple-700 border-purple-200';
              } else if (tipo === 'impressora') {
                IconComp = Printer;
                badgeColor = 'bg-emerald-100 text-emerald-700 border-emerald-200';
              } else if (tipo === 'teclado') {
                IconComp = Keyboard;
                badgeColor = 'bg-amber-100 text-amber-700 border-amber-200';
              } else if (tipo === 'mouse') {
                IconComp = Mouse;
                badgeColor = 'bg-amber-100 text-amber-700 border-amber-200';
              } else if (tipo === 'armazenamento_usb') {
                IconComp = Usb;
                badgeColor = 'bg-cyan-100 text-cyan-700 border-cyan-200';
              }

              return (
                <div
                  key={pIdx}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex items-start gap-3 hover:border-slate-300 transition-colors"
                >
                  <div className="rounded-lg bg-slate-100 p-2 text-slate-600 shrink-0">
                    <IconComp className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-slate-800 truncate" title={p.nome}>
                        {p.nome}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${badgeColor}`}>
                        {p.tipo}
                      </span>
                    </div>
                    <div className="text-slate-500 mt-1 space-y-0.5 text-[11px]">
                      {p.fabricante && <div>Fabricante: {p.fabricante}</div>}
                      {p.conexao && <div>Conexão: {p.conexao}</div>}
                      {p.capacidade && <div>Capacidade: {p.capacidade}</div>}
                      {p.serial && (
                        <div className="font-mono text-slate-700 flex items-center gap-1">
                          <span>S/N: {p.serial}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(p.serial!, `perif_${pIdx}`)}
                            className="text-slate-400 hover:text-slate-600"
                            title="Copiar Serial"
                          >
                            {copiedKey === `perif_${pIdx}` ? (
                              <Check className="h-3 w-3 text-emerald-600" />
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
