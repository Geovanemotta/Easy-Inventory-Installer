import React from 'react';
import {
  HardDrive,
  Database,
  Folder,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  DeviceDetailResponse,
  UnidadeDisco,
  AnaliseUsuario,
  ItemVarLog,
} from '@/types/device';

interface DeviceDisksTabProps {
  device: DeviceDetailResponse;
  unidadesDisco: UnidadeDisco[];
  usuariosPastas: AnaliseUsuario[];
  varLogItens: ItemVarLog[];
  resumoUsuarios?: any;
  resumoVarLog?: any;
  openSections: Record<string, boolean>;
  toggleSection: (key: string) => void;
  expandedUsers: Record<string, boolean>;
  toggleUser: (userKey: string) => void;
}

export const DeviceDisksTab: React.FC<DeviceDisksTabProps> = ({
  device,
  unidadesDisco,
  usuariosPastas,
  varLogItens,
  resumoUsuarios,
  resumoVarLog,
  openSections,
  toggleSection,
  expandedUsers,
  toggleUser,
}) => {
  const percentualGeral = device.disco_percentual || 0;
  const isHighGeral = percentualGeral >= 85;
  const isMedGeral = percentualGeral >= 70;

  return (
    <div className="space-y-4">
      {/* Resumo Geral de Capacidade */}
      <div className="rounded-xl border border-[#1E2636] bg-[#121721] p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400/90 flex items-center gap-1.5">
              <HardDrive className="h-4 w-4 text-orange-400" />
              Capacidade Geral do Armazenamento
            </h4>
            {device.disco_tipo && (
              <span className="rounded bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-orange-400 uppercase">
                {device.disco_tipo}
              </span>
            )}
          </div>
          <span
            className={`text-sm font-bold font-mono tabular-nums ${
              isHighGeral
                ? 'text-rose-400'
                : isMedGeral
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          >
            {percentualGeral}% Usado
          </span>
        </div>

        {/* Barra de ocupação encorpada */}
        <div className="h-3 w-full rounded-full bg-[#0B0E14] border border-[#1E2636] p-0.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isHighGeral
                ? 'bg-rose-500'
                : isMedGeral
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, percentualGeral))}%` }}
          />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2.5 text-center text-xs">
          <div className="rounded-lg bg-[#0B0E14] p-2.5 border border-[#1E2636]">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Espaço Usado</span>
            <strong className="text-slate-100 font-mono text-sm tabular-nums mt-0.5 block">
              {device.disco_usado_formatado || device.disco_usado || '---'}
            </strong>
          </div>
          <div className="rounded-lg bg-[#0B0E14] p-2.5 border border-[#1E2636]">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Espaço Livre</span>
            <strong className="text-slate-100 font-mono text-sm tabular-nums mt-0.5 block">
              {device.disco_livre_formatado || device.disco_livre || '---'}
            </strong>
          </div>
          <div className="rounded-lg bg-[#0B0E14] p-2.5 border border-[#1E2636]">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Capacidade Total</span>
            <strong className="text-slate-100 font-mono text-sm tabular-nums mt-0.5 block">
              {device.disco_total_formatado || device.disco_total || '---'}
            </strong>
          </div>
        </div>
      </div>

      {/* Partições e Unidades de Disco (Acordeão) */}
      <div className="rounded-xl border border-[#1E2636] bg-[#121721] overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('unidades')}
          className="w-full flex items-center justify-between p-4 bg-[#181F2E]/70 hover:bg-[#181F2E] transition-colors text-left cursor-pointer"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-orange-400/90 flex items-center gap-2">
            <Database className="h-4 w-4 text-orange-400" />
            Unidades &amp; Partições ({unidadesDisco.length})
          </span>
          {openSections.unidades ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>
        {openSections.unidades && (
          <div className="p-4 border-t border-[#1E2636] space-y-3">
            {unidadesDisco.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                Nenhuma informação detalhada de unidades disponível.
              </div>
            ) : (
              unidadesDisco.map((u, idx) => {
                const pct =
                  typeof u.percentual === 'number'
                    ? u.percentual
                    : parseFloat(String(u.percentual || u.percentual_usado || '0'));
                const isHigh = pct >= 85;
                const isMed = pct >= 70;

                return (
                  <div key={idx} className="rounded-lg border border-[#1E2636] bg-[#0B0E14] p-3 text-xs">
                    <div className="flex items-center justify-between font-semibold text-slate-100">
                      <span className="flex items-center gap-1.5 font-mono">
                        <span className="text-white font-bold">
                          {u.ponto_montagem || u.montagem || u.letra || u.device || 'Unidade'}
                        </span>
                        {u.tipo_fs && <span className="text-slate-400 font-normal">({u.tipo_fs})</span>}
                        {u.rotulo && <span className="text-orange-400/80 font-normal"> [{u.rotulo}]</span>}
                      </span>
                      <span className={`font-mono font-bold tabular-nums ${isHigh ? 'text-rose-400' : isMed ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {Math.round(pct)}%
                      </span>
                    </div>
                    <div className="mt-2 h-2.5 w-full rounded-full bg-[#121721] border border-[#1E2636] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
                      <span>Usado: <strong className="text-slate-200">{u.usado || '---'}</strong></span>
                      <span>Livre: <strong className="text-slate-200">{u.livre || '---'}</strong></span>
                      <span>Total: <strong className="text-slate-200">{u.total || '---'}</strong></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Perfis de Usuários e Pastas (Acordeão Expansível) */}
      {usuariosPastas.length > 0 && (
        <div className="rounded-xl border border-[#1E2636] bg-[#121721] overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection('usuarios')}
            className="w-full flex items-center justify-between p-4 bg-[#181F2E]/70 hover:bg-[#181F2E] transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-orange-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400/90">
                Perfis de Usuários ({usuariosPastas.length})
              </span>
              {resumoUsuarios?.soma_tamanho_formatada && (
                <span className="rounded bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-orange-400">
                  Total: {resumoUsuarios.soma_tamanho_formatada}
                </span>
              )}
            </div>
            {openSections.usuarios ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>
          {openSections.usuarios && (
            <div className="p-4 border-t border-[#1E2636] space-y-2.5">
              {usuariosPastas.map((usr, uIdx) => {
                const sub = usr.pastas || usr.subpastas || [];
                const isExpanded = Boolean(expandedUsers[`usr_${uIdx}`]);
                return (
                  <div
                    key={uIdx}
                    className="rounded-lg border border-[#1E2636] bg-[#0B0E14] overflow-hidden text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => toggleUser(`usr_${uIdx}`)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-[#181F2E]/60 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100">{usr.usuario}</span>
                        {sub.length > 0 && (
                          <span className="text-[10px] text-slate-400">
                            ({sub.length} pasta{sub.length > 1 ? 's' : ''})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-orange-400 tabular-nums">{usr.tamanho}</span>
                        {sub.length > 0 && (
                          isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && sub.length > 0 && (
                      <div className="px-3.5 pb-3 pt-1 border-t border-[#1E2636] bg-[#121721] space-y-1.5">
                        {sub.map((p, pIdx) => (
                          <div
                            key={pIdx}
                            className="flex items-center justify-between text-[11px] text-slate-300 py-1 border-b border-[#1E2636]/60 last:border-none"
                            title={p.caminho || ''}
                          >
                            <span className="truncate max-w-xs text-slate-300">{p.pasta || p.nome}</span>
                            <span className="font-mono font-medium text-slate-100 tabular-nums">{p.tamanho}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Logs do Sistema (/var/log no Linux) */}
      {varLogItens.length > 0 && (
        <div className="rounded-xl border border-[#1E2636] bg-[#121721] overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection('logs')}
            className="w-full flex items-center justify-between p-4 bg-[#181F2E]/70 hover:bg-[#181F2E] transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-orange-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400/90">
                Logs do Sistema (/var/log)
              </span>
              {resumoVarLog?.tamanho_total && (
                <span className="rounded bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-orange-400">
                  Total: {resumoVarLog.tamanho_total}
                </span>
              )}
            </div>
            {openSections.logs ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>
          {openSections.logs && (
            <div className="p-4 border-t border-[#1E2636] space-y-1.5">
              {varLogItens.map((log, lIdx) => (
                <div
                  key={lIdx}
                  className="flex items-center justify-between text-xs text-slate-300 py-1.5 border-b border-[#1E2636]/60 last:border-none"
                  title={log.caminho || ''}
                >
                  <span className="font-mono truncate max-w-md text-slate-300">{log.nome || log.pasta}</span>
                  <span className="font-mono font-medium text-slate-100 tabular-nums">{log.tamanho}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
