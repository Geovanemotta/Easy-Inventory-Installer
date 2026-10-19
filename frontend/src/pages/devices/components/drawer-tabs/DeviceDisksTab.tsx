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
  return (
    <div className="space-y-4">
      {/* Resumo Geral de Capacidade */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <HardDrive className="h-4 w-4 text-blue-600" />
            Capacidade Geral do Disco
          </h4>
          <span
            className={`text-sm font-bold ${
              (device.disco_percentual || 0) >= 85
                ? 'text-rose-600'
                : (device.disco_percentual || 0) >= 70
                ? 'text-amber-600'
                : 'text-slate-700'
            }`}
          >
            {device.disco_percentual || 0}% Usado
          </span>
        </div>

        <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              (device.disco_percentual || 0) >= 85
                ? 'bg-rose-500'
                : (device.disco_percentual || 0) >= 70
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, device.disco_percentual || 0))}%` }}
          />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase">Usado</span>
            <strong className="text-slate-800 font-mono">
              {device.disco_usado_formatado || device.disco_usado || '---'}
            </strong>
          </div>
          <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase">Livre</span>
            <strong className="text-slate-800 font-mono">
              {device.disco_livre_formatado || device.disco_livre || '---'}
            </strong>
          </div>
          <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase">Total</span>
            <strong className="text-slate-800 font-mono">
              {device.disco_total_formatado || device.disco_total || '---'}
            </strong>
          </div>
        </div>
      </div>

      {/* Partições e Unidades de Disco (Acordeão) */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('unidades')}
          className="w-full flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100/60 transition-colors text-left"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-600" />
            Unidades &amp; Partições ({unidadesDisco.length})
          </span>
          {openSections.unidades ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>
        {openSections.unidades && (
          <div className="p-4 border-t border-slate-100 space-y-3">
            {unidadesDisco.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
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
                  <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs">
                    <div className="flex items-center justify-between font-semibold text-slate-800">
                      <span>
                        {u.ponto_montagem || u.montagem || u.letra || u.device || 'Unidade'}{' '}
                        {u.tipo_fs && <span className="text-slate-500 font-normal">({u.tipo_fs})</span>}
                        {u.rotulo && <span className="text-slate-400 font-normal"> [{u.rotulo}]</span>}
                      </span>
                      <span className={isHigh ? 'text-rose-600 font-bold' : isMed ? 'text-amber-600' : 'text-slate-700'}>
                        {Math.round(pct)}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Usado: <strong>{u.usado || '---'}</strong></span>
                      <span>Livre: <strong>{u.livre || '---'}</strong></span>
                      <span>Total: <strong>{u.total || '---'}</strong></span>
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
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection('usuarios')}
            className="w-full flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100/60 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Perfis de Usuários ({usuariosPastas.length})
              </span>
              {resumoUsuarios?.soma_tamanho_formatada && (
                <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
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
            <div className="p-4 border-t border-slate-100 space-y-2.5">
              {usuariosPastas.map((usr, uIdx) => {
                const sub = usr.pastas || usr.subpastas || [];
                const isExpanded = Boolean(expandedUsers[`usr_${uIdx}`]);
                return (
                  <div
                    key={uIdx}
                    className="rounded-lg border border-slate-200 bg-slate-50/70 overflow-hidden text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => toggleUser(`usr_${uIdx}`)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-100/80 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{usr.usuario}</span>
                        {sub.length > 0 && (
                          <span className="text-[10px] text-slate-400">
                            ({sub.length} pasta{sub.length > 1 ? 's' : ''})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-700">{usr.tamanho}</span>
                        {sub.length > 0 && (
                          isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && sub.length > 0 && (
                      <div className="px-3 pb-3 pt-1 border-t border-slate-200/60 bg-white space-y-1.5">
                        {sub.map((p, pIdx) => (
                          <div
                            key={pIdx}
                            className="flex items-center justify-between text-[11px] text-slate-600 py-0.5 border-b border-slate-100 last:border-none"
                            title={p.caminho || ''}
                          >
                            <span className="truncate max-w-xs">{p.pasta || p.nome}</span>
                            <span className="font-mono font-medium text-slate-800">{p.tamanho}</span>
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
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection('logs')}
            className="w-full flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100/60 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Logs do Sistema (/var/log)
              </span>
              {resumoVarLog?.tamanho_total && (
                <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-800 border border-indigo-200">
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
            <div className="p-4 border-t border-slate-100 space-y-1.5">
              {varLogItens.map((log, lIdx) => (
                <div
                  key={lIdx}
                  className="flex items-center justify-between text-xs text-slate-600 py-1.5 border-b border-slate-100 last:border-none"
                  title={log.caminho || ''}
                >
                  <span className="font-mono truncate max-w-md">{log.nome || log.pasta}</span>
                  <span className="font-mono font-medium text-slate-800">{log.tamanho}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
