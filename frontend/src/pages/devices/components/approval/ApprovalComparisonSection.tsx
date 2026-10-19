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
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
              Seção A
            </span>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Dados Recebidos do Equipamento (Bancada)
            </h4>
          </div>
          {context.device.is_rede_formatacao && (
            <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-bold text-orange-700 border border-orange-200 flex items-center gap-1">
              🛠️ Bancada de Formatação (192.168.88.x)
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-2.5 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Patrimônio</span>
            <strong className="text-blue-700 font-mono text-sm">
              {context.device.patrimonio || 'Não informado'}
            </strong>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Hostname</span>
            <strong className="text-slate-800 text-sm truncate block">{context.device.hostname}</strong>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">IP Atual</span>
            <strong className="text-slate-800 font-mono text-sm block">
              {context.device.ip || '---'}
              {context.device.is_rede_formatacao && (
                <span className="text-[10px] text-orange-600 block font-normal">(IP Provisório)</span>
              )}
            </strong>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Endereço MAC</span>
            <strong className="text-slate-800 font-mono text-xs block truncate">
              {context.device.mac || '---'}
            </strong>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Sistema Operacional</span>
            <strong className="text-slate-800 block truncate">
              {context.device.sistema} {context.device.versao}
            </strong>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Filial Sugerida</span>
            <strong className="text-slate-800 block truncate">
              {context.device.loja || 'Não identificada'}
            </strong>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Operador Solicitante</span>
            <strong className="text-slate-800 block truncate">
              {context.device.firewall_solicitado_por || 'Sistema'}
            </strong>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Licença Windows</span>
            {context.device.licenca_windows_solicitada ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 mt-0.5">
                ⭐ Nova Licença Solicitada
              </span>
            ) : (
              <span className="text-slate-500 font-medium text-xs">Não solicitada</span>
            )}
          </div>
        </div>

        {context.device.motivo_alteracao && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-900 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>Motivo declarado pelo operador:</strong> {context.device.motivo_alteracao}
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* SEÇÃO B: CORRESPONDÊNCIA COM ATIVO EXISTENTE         */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700 uppercase">
              Seção B
            </span>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Correspondência com Ativo Existente no Inventário
            </h4>
          </div>
        </div>

        {/* Conflito de Patrimônio Múltiplo */}
        {context.tem_conflito && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 space-y-2 text-xs text-amber-900">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              Inconsistência Cadastral: Múltiplos Ativos com o Mesmo Patrimônio
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              O patrimônio <strong>{context.device.patrimonio}</strong> foi localizado em mais
              de um registro no sistema. Analise as ocorrências abaixo:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {context.conflitos?.map((c, i) => (
                <div key={i} className="flex items-center justify-between bg-white/80 p-2 rounded border border-amber-200 text-xs">
                  <span className="font-semibold text-slate-800">{c.hostname}</span>
                  <span className="font-mono text-slate-600">{c.ip || 'Sem IP'}</span>
                  <span className="text-slate-500">{c.loja || 'Sem Loja'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {context.existing_asset ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
              ⚠️ <strong>Patrimônio já cadastrado no inventário!</strong> O número{' '}
              <strong>{context.device.patrimonio}</strong> pertence ao{' '}
              <strong>
                {context.existing_asset.tipo_origem === 'network_asset'
                  ? 'ativo de rede importado'
                  : 'equipamento'}
              </strong>{' '}
              <strong>{String(context.existing_asset.hostname || '---')}</strong> da filial{' '}
              <strong>{String(context.existing_asset.loja || 'Não definida')}</strong>.
            </div>

            {context.so_divergente && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Mudança de Sistema Operacional Detectada:</strong> O ativo anterior estava
                  registrado com <strong>{String(context.existing_asset.sistema || '---')}</strong> e a
                  máquina atual reporta <strong>{context.device.sistema}</strong>.
                </div>
              </div>
            )}

            {!context.network_context.ip_confiavel && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3 text-xs text-blue-900 flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Ativo sem IP anterior de rede:</strong> O equipamento foi identificado pelo patrimônio,
                  mas não possui um IP de rede fixo registrado. O IP definitivo deve ser definido na Seção C.
                </div>
              </div>
            )}

            {/* Tabela Comparativa Lado a Lado (Confronto Direto) */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
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
                <tbody className="divide-y divide-slate-100">
                  {/* Patrimônio */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-semibold text-slate-700">Patrimônio</td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-900">
                      {String(context.existing_asset.patrimonio || '---')}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-blue-700">
                      {context.device.patrimonio || '---'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                        Identificador Físico
                      </span>
                    </td>
                  </tr>

                  {/* Hostname */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-semibold text-slate-700">Hostname</td>
                    <td className="py-2 px-3 font-medium text-slate-800">
                      {String(context.existing_asset.hostname || '---')}
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-900">{context.device.hostname}</td>
                    <td className="py-2 px-3 text-right">
                      {String(context.existing_asset.hostname || '').toLowerCase() ===
                      context.device.hostname.toLowerCase() ? (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          Igual
                        </span>
                      ) : (
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                          Alterado
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* MAC */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-semibold text-slate-700">Endereço MAC</td>
                    <td className="py-2 px-3 font-mono text-slate-600">
                      {String(context.existing_asset.mac || '---')}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-900">
                      {context.device.mac || '---'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {String(context.existing_asset.mac || '').toLowerCase() ===
                      (context.device.mac || '').toLowerCase() ? (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          Igual
                        </span>
                      ) : (
                        <span className="rounded bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800">
                          Novo MAC (Troca)
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Sistema Operacional */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-semibold text-slate-700">Sistema Operacional</td>
                    <td className="py-2 px-3 text-slate-700">
                      {String(context.existing_asset.sistema || '---')}{' '}
                      {String(context.existing_asset.versao || '')}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900">
                      {context.device.sistema} {context.device.versao}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {context.so_divergente ? (
                        <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                          SO Modificado
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          Compatível
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* IP Anterior */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-semibold text-slate-700">IP Cadastrado</td>
                    <td className="py-2 px-3 font-mono text-slate-600">
                      {String(context.existing_asset.ip || '(não registrado)')}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-900">{context.device.ip}</td>
                    <td className="py-2 px-3 text-right">
                      {context.existing_asset.ip ? (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          IP Recuperado
                        </span>
                      ) : (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          Sem IP Prévio
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Filial */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-semibold text-slate-700">Filial / Loja</td>
                    <td className="py-2 px-3 text-slate-700">
                      {String(context.existing_asset.loja || '---')}
                    </td>
                    <td className="py-2 px-3 text-slate-900">{context.device.loja || '---'}</td>
                    <td className="py-2 px-3 text-right">
                      {context.existing_asset.site_id === context.device.site_id ? (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          Mesma Loja
                        </span>
                      ) : (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
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
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={vincularAtivo}
                  onChange={(e) => setVincularAtivo(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                />
                <span>
                  <strong>
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
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 flex items-start gap-3 text-xs">
            <Sparkles className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-emerald-900 block text-sm">Equipamento Novo</strong>
              <p className="text-emerald-800 mt-0.5">
                Nenhum outro ativo cadastrado utiliza o patrimônio{' '}
                <strong>{context.device.patrimonio || '(não informado)'}</strong>. O fluxo
                prosseguirá como cadastro inicial de novo ativo físico.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
