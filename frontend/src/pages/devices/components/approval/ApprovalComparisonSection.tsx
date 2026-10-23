import React from 'react';
import { DeviceApprovalContextResponse } from '@/types/device';
import {
  AlertTriangle,
  Info,
  Sparkles,
} from 'lucide-react';

interface ApprovalComparisonSectionProps {
  context: DeviceApprovalContextResponse;
  vincularAtivo: boolean;
  setVincularAtivo: (val: boolean) => void;
}

export const ApprovalComparisonSection: React.FC<ApprovalComparisonSectionProps> = ({
  context,
  vincularAtivo,
  setVincularAtivo,
}) => {
  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------- */}
      {/* SEÇÃO A: DADOS RECEBIDOS DA MÁQUINA (BANCADA)        */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-xl border border-border-subtle bg-surface p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 text-[10px] font-bold text-orange-400 uppercase">
              Seção A
            </span>
            <h4 className="text-xs font-bold text-fg uppercase tracking-wider">
              Dados Recebidos do Equipamento (Bancada)
            </h4>
          </div>
          {context.device.is_rede_formatacao && (
            <span className="rounded-full bg-orange-500/15 px-2.5 py-0.5 text-[10px] font-bold text-orange-400 border border-orange-500/30 flex items-center gap-1 font-mono">
              🛠️ Bancada de Formatação (192.168.88.x)
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-app p-2.5 rounded-lg border border-border-subtle">
            <span className="text-fg-secondary block text-[10px] uppercase font-bold">Patrimônio</span>
            <strong className="text-orange-400 font-mono text-sm block mt-0.5">
              {context.device.patrimonio || 'Não informado'}
            </strong>
          </div>

          <div className="bg-app p-2.5 rounded-lg border border-border-subtle">
            <span className="text-fg-secondary block text-[10px] uppercase font-bold">Hostname</span>
            <strong className="text-fg text-sm truncate block mt-0.5 font-mono">{context.device.hostname}</strong>
          </div>

          <div className="bg-app p-2.5 rounded-lg border border-border-subtle">
            <span className="text-fg-secondary block text-[10px] uppercase font-bold">IP Atual</span>
            <strong className="text-fg font-mono text-sm block mt-0.5">
              {context.device.ip || '---'}
              {context.device.is_rede_formatacao && (
                <span className="text-[10px] text-orange-400 block font-normal">(IP Provisório)</span>
              )}
            </strong>
          </div>

          <div className="bg-app p-2.5 rounded-lg border border-border-subtle">
            <span className="text-fg-secondary block text-[10px] uppercase font-bold">Endereço MAC</span>
            <strong className="text-gray-700 dark:text-slate-300 font-mono text-xs block truncate mt-0.5">
              {context.device.mac || '---'}
            </strong>
          </div>

          <div className="bg-app p-2.5 rounded-lg border border-border-subtle">
            <span className="text-fg-secondary block text-[10px] uppercase font-bold">Sistema Operacional</span>
            <strong className="text-fg block truncate mt-0.5">
              {context.device.sistema}
            </strong>
          </div>

          <div className="bg-app p-2.5 rounded-lg border border-border-subtle">
            <span className="text-fg-secondary block text-[10px] uppercase font-bold">Filial Sugerida</span>
            <strong className="text-fg block truncate mt-0.5">
              {context.device.loja || 'Não identificada'}
            </strong>
          </div>

          <div className="bg-app p-2.5 rounded-lg border border-border-subtle">
            <span className="text-fg-secondary block text-[10px] uppercase font-bold">Operador Solicitante</span>
            <strong className="text-fg block truncate mt-0.5">
              {context.device.firewall_solicitado_por || 'Sistema'}
            </strong>
          </div>

          <div className="bg-app p-2.5 rounded-lg border border-border-subtle">
            <span className="text-fg-secondary block text-[10px] uppercase font-bold">Licença Windows</span>
            {context.device.licenca_windows_solicitada ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-400 bg-orange-500/15 px-1.5 py-0.5 rounded border border-orange-500/30 mt-0.5">
                ⭐ Nova Licença Solicitada
              </span>
            ) : (
              <span className="text-fg-secondary font-medium text-xs mt-0.5 block">Não solicitada</span>
            )}
          </div>
        </div>

        {context.device.motivo_alteracao && (
          <div className="rounded-lg border border-border-subtle bg-app p-2.5 text-xs text-gray-700 dark:text-slate-300 flex items-start gap-2">
            <Info className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-orange-400">Motivo declarado pelo operador:</strong> {context.device.motivo_alteracao}
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* SEÇÃO B: CORRESPONDÊNCIA COM ATIVO EXISTENTE         */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-xl border border-border-subtle bg-surface p-4 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 text-[10px] font-bold text-orange-400 uppercase">
              Seção B
            </span>
            <h4 className="text-xs font-bold text-fg uppercase tracking-wider">
              Correspondência com Ativo Existente no Inventário
            </h4>
          </div>
        </div>

        {/* Conflito de Patrimônio Múltiplo */}
        {context.tem_conflito && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2 text-xs text-amber-700 dark:text-amber-300">
            <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              Inconsistência Cadastral: Múltiplos Ativos com o Mesmo Patrimônio
            </div>
            <p className="text-[11px] text-amber-700/90 dark:text-amber-300/90 leading-relaxed">
              O patrimônio <strong>{context.device.patrimonio}</strong> foi localizado em mais
              de um registro no sistema. Analise as ocorrências abaixo:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {context.conflitos?.map((c, i) => (
                <div key={i} className="flex items-center justify-between bg-app p-2 rounded border border-border-subtle text-xs">
                  <span className="font-semibold text-fg font-mono">{c.hostname}</span>
                  <span className="font-mono text-fg-secondary">{c.ip || 'Sem IP'}</span>
                  <span className="text-fg-secondary">{c.loja || 'Sem Loja'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {context.existing_asset ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              ⚠️ <strong>Patrimônio já cadastrado no inventário!</strong> O número{' '}
              <strong className="text-amber-800 dark:text-amber-200">{context.device.patrimonio}</strong> pertence ao{' '}
              <strong>
                {context.existing_asset.tipo_origem === 'network_asset'
                  ? 'ativo de rede importado'
                  : 'equipamento'}
              </strong>{' '}
              <strong className="text-fg font-mono">{String(context.existing_asset.hostname || '---')}</strong> da filial{' '}
              <strong className="text-fg">{String(context.existing_asset.loja || 'Não definida')}</strong>.
            </div>

            {context.so_divergente && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Mudança de Sistema Operacional Detectada:</strong> O ativo anterior estava
                  registrado com <strong>{String(context.existing_asset.sistema || '---')}</strong> e a
                  máquina atual reporta <strong>{context.device.sistema}</strong>.
                </div>
              </div>
            )}

            {!context.network_context.ip_confiavel && (
              <div className="rounded-xl border border-border-medium bg-app p-3 text-xs text-gray-700 dark:text-slate-300 flex items-start gap-2">
                <Info className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-fg">Ativo sem IP anterior de rede:</strong> O equipamento foi identificado pelo patrimônio,
                  mas não possui um IP de rede fixo registrado. O IP definitivo deve ser definido na Seção C.
                </div>
              </div>
            )}

            {/* Tabela Comparativa Lado a Lado (Confronto Direto) */}
            <div className="overflow-x-auto rounded-xl border border-border-subtle bg-app shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle bg-elevated text-[11px] font-bold uppercase text-fg-secondary">
                    <th className="py-2.5 px-3">Atributo</th>
                    <th className="py-2.5 px-3">
                      Cadastro Existente{' '}
                      {context.existing_asset.tipo_origem === 'network_asset'
                        ? '(Ativo Importado)'
                        : '(Anterior)'}
                    </th>
                    <th className="py-2.5 px-3">Nova Solicitação (Bancada)</th>
                    <th className="py-2.5 px-3 text-right">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {/* Patrimônio */}
                  <tr className="hover:bg-elevated/40 transition-colors">
                    <td className="py-2 px-3 font-semibold text-gray-700 dark:text-slate-300">Patrimônio</td>
                    <td className="py-2 px-3 font-mono font-bold text-gray-700 dark:text-slate-300">
                      {String(context.existing_asset.patrimonio || '---')}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-orange-400">
                      {context.device.patrimonio || '---'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className="rounded bg-elevated border border-border-medium px-2 py-0.5 text-[10px] font-semibold text-fg-secondary">
                        Identificador Físico
                      </span>
                    </td>
                  </tr>

                  {/* Hostname */}
                  <tr className="hover:bg-elevated/40 transition-colors">
                    <td className="py-2 px-3 font-semibold text-gray-700 dark:text-slate-300">Hostname</td>
                    <td className="py-2 px-3 font-mono text-gray-700 dark:text-slate-300">
                      {String(context.existing_asset.hostname || '---')}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-fg">{context.device.hostname}</td>
                    <td className="py-2 px-3 text-right">
                      {String(context.existing_asset.hostname || '').toLowerCase() ===
                      context.device.hostname.toLowerCase() ? (
                        <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          Igual
                        </span>
                      ) : (
                        <span className="rounded bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 text-[10px] font-bold text-orange-400">
                          Alterado
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* MAC */}
                  <tr className="hover:bg-elevated/40 transition-colors">
                    <td className="py-2 px-3 font-semibold text-gray-700 dark:text-slate-300">Endereço MAC</td>
                    <td className="py-2 px-3 font-mono text-fg-secondary">
                      {String(context.existing_asset.mac || '---')}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-fg">
                      {context.device.mac || '---'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {String(context.existing_asset.mac || '').toLowerCase() ===
                      (context.device.mac || '').toLowerCase() ? (
                        <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          Igual
                        </span>
                      ) : (
                        <span className="rounded bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 text-[10px] font-bold text-orange-400">
                          Novo MAC (Troca)
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Sistema Operacional */}
                  <tr className="hover:bg-elevated/40 transition-colors">
                    <td className="py-2 px-3 font-semibold text-gray-700 dark:text-slate-300">Sistema Operacional</td>
                    <td className="py-2 px-3 text-gray-700 dark:text-slate-300">
                      {String(context.existing_asset.sistema || '---')}
                    </td>
                    <td className="py-2 px-3 font-semibold text-fg">
                      {context.device.sistema}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {context.so_divergente ? (
                        <span className="rounded bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                          SO Modificado
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          Compatível
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* IP Anterior */}
                  <tr className="hover:bg-elevated/40 transition-colors">
                    <td className="py-2 px-3 font-semibold text-gray-700 dark:text-slate-300">IP Cadastrado</td>
                    <td className="py-2 px-3 font-mono text-fg-secondary">
                      {String(context.existing_asset.ip || '(não registrado)')}
                    </td>
                    <td className="py-2 px-3 font-mono text-fg">{context.device.ip}</td>
                    <td className="py-2 px-3 text-right">
                      {context.existing_asset.ip ? (
                        <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          IP Recuperado
                        </span>
                      ) : (
                        <span className="rounded bg-elevated border border-border-medium px-2 py-0.5 text-[10px] font-medium text-fg-secondary">
                          Sem IP Prévio
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Filial */}
                  <tr className="hover:bg-elevated/40 transition-colors">
                    <td className="py-2 px-3 font-semibold text-gray-700 dark:text-slate-300">Filial / Loja</td>
                    <td className="py-2 px-3 text-gray-700 dark:text-slate-300">
                      {String(context.existing_asset.loja || '---')}
                    </td>
                    <td className="py-2 px-3 text-fg">{context.device.loja || '---'}</td>
                    <td className="py-2 px-3 text-right">
                      {context.existing_asset.site_id === context.device.site_id ? (
                        <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          Mesma Loja
                        </span>
                      ) : (
                        <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          Transferência de Filial
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Opção de Vínculo */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-gray-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={vincularAtivo}
                  onChange={(e) => setVincularAtivo(e.target.checked)}
                  className="mt-0.5 rounded border-border-medium bg-elevated text-orange-500 focus:ring-0"
                />
                <span>
                  <strong className="text-fg">
                    Vincular esta solicitação ao ativo existente (
                    {context.existing_asset.tipo_origem === 'network_asset'
                      ? 'ativo importado de rede'
                      : 'estação cadastrada'}
                    )
                  </strong>{' '}
                  &mdash; preserva a identidade física do ativo, atualiza o IP e MAC no inventário
                  e evita cadastros duplicados no sistema.
                </span>
              </label>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3 text-xs text-emerald-700 dark:text-emerald-300">
            <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-fg block text-sm">Equipamento Novo</strong>
              <p className="text-emerald-700/90 dark:text-emerald-300/90 mt-0.5">
                Nenhum outro ativo cadastrado utiliza o patrimônio{' '}
                <strong className="text-fg font-mono">{context.device.patrimonio || '(não informado)'}</strong>. O fluxo
                prosseguirá como cadastro inicial de novo ativo físico.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
