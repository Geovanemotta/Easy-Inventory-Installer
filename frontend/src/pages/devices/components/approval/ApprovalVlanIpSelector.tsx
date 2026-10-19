import React from 'react';
import { DeviceApprovalContextResponse, SiteVlanIpRange } from '@/types/device';
import {
  Building,
  Network,
  Globe,
  Loader2,
  Sparkles,
  AlertTriangle,
  Search,
} from 'lucide-react';

interface ApprovalVlanIpSelectorProps {
  context: DeviceApprovalContextResponse;
  selectedSiteId: number | '';
  handleSiteChange: (siteId: number | '') => void;
  vlanRanges: SiteVlanIpRange[];
  selectedRangeId: number | '';
  handleRangeChange: (rangeId: number | '') => void;
  loadingVlans: boolean;
  currentRange: SiteVlanIpRange | null;
  reutilizarIpEstacao: boolean;
  handleToggleReutilizar: (checked: boolean) => void;
  ipFilterText: string;
  setIpFilterText: (text: string) => void;
  ipDefinitivo: string;
  setIpDefinitivo: (ip: string) => void;
  setConfirmarSobrescrita: (val: boolean) => void;
  filteredFreeIps: string[];
  filteredWorkstationIps: any[];
  selectedWorkstation: any;
}

export const ApprovalVlanIpSelector: React.FC<ApprovalVlanIpSelectorProps> = ({
  context,
  selectedSiteId,
  handleSiteChange,
  vlanRanges,
  selectedRangeId,
  handleRangeChange,
  loadingVlans,
  currentRange,
  reutilizarIpEstacao,
  handleToggleReutilizar,
  ipFilterText,
  setIpFilterText,
  ipDefinitivo,
  setIpDefinitivo,
  setConfirmarSobrescrita,
  filteredFreeIps,
  filteredWorkstationIps,
  selectedWorkstation,
}) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
            Seção C
          </span>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Seleção do Endereço IP Definitivo na Loja
          </h4>
        </div>
        {context.network_context.matched_by && (
          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-medium text-emerald-800 flex items-center gap-1 w-fit">
            <Sparkles className="h-3 w-3 text-emerald-600" />
            Loja detectada por {context.network_context.matched_by}
          </span>
        )}
      </div>

      <p className="text-xs text-slate-500">
        O IP atual (<span className="font-mono font-medium text-slate-700">{context.device.ip}</span>) pertence à bancada de formatação.
        Selecione a Filial, a VLAN e o IP corporativo fixo para a estação:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Seletor 1 — Filial Destino */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
            <Building className="h-3.5 w-3.5 text-blue-600" /> Seletor 1 — Filial Destino *
          </label>
          <select
            value={selectedSiteId}
            onChange={(e) => handleSiteChange(e.target.value ? Number(e.target.value) : '')}
            className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs font-medium focus:border-blue-500 focus:outline-none bg-white"
          >
            <option value="">-- Selecione a Loja / Filial --</option>
            {context.network_context.sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code ? `[${s.code}] ` : ''}{s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Seletor 2 — VLAN / Faixa de Rede da Loja */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Network className="h-3.5 w-3.5 text-purple-600" /> Seletor 2 — VLAN / Faixa de Rede *
            </span>
            {loadingVlans && (
              <span className="text-[10px] text-purple-600 flex items-center gap-1 font-normal">
                <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
              </span>
            )}
          </label>
          {loadingVlans ? (
            <div className="w-full rounded-lg border border-purple-200 bg-purple-50/50 py-2 px-3 text-xs text-purple-700 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600 shrink-0" />
              <span>Buscando VLANs da filial...</span>
            </div>
          ) : vlanRanges.length > 0 ? (
            <select
              value={selectedRangeId}
              onChange={(e) => handleRangeChange(e.target.value ? Number(e.target.value) : '')}
              disabled={loadingVlans}
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs font-medium focus:border-purple-500 focus:outline-none bg-white"
            >
              <option value="">-- Selecione a VLAN / Faixa --</option>
              {vlanRanges.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.vlan_id ? `VLAN ${r.vlan_id} — ` : ''}{r.name} ({r.ip_start} a {r.ip_end}) &mdash; {r.free_count} livres
                </option>
              ))}
            </select>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-500 italic">
              {selectedSiteId
                ? 'Nenhuma faixa cadastrada nesta filial.'
                : 'Selecione uma filial para carregar as VLANs.'}
            </div>
          )}
        </div>
      </div>

      {/* Se há faixas cadastradas na filial */}
      {loadingVlans ? (
        <div className="rounded-xl border border-purple-200 bg-purple-50/30 p-6 flex flex-col items-center justify-center gap-2 text-xs text-purple-700 animate-pulse">
          <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
          <span className="font-semibold text-slate-700">Atualizando faixas de rede e endereços IP...</span>
          <span className="text-[11px] text-slate-400">Consultando faixas VLAN e disponibilidade de IPs da filial selecionada</span>
        </div>
      ) : currentRange ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
          {/* Linha de Status da Faixa & Modo de Escolha */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-700">Resumo da Faixa:</span>
              <span className="rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[11px] font-bold">
                {currentRange.free_count} IPs Livres
              </span>
              <span className="rounded bg-blue-100 text-blue-800 px-2 py-0.5 text-[11px] font-bold">
                {currentRange.workstations_count} Estações
              </span>
              {currentRange.gateway && (
                <span className="text-slate-500 text-[11px]">
                  Gateway: <code className="font-mono">{currentRange.gateway}</code>
                </span>
              )}
            </div>

            {/* Checkbox de Modo de Escolha */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-800 font-semibold bg-white px-2.5 py-1 rounded-lg border border-slate-300 shadow-2xs hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={reutilizarIpEstacao}
                onChange={(e) => handleToggleReutilizar(e.target.checked)}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
              />
              <span>Reutilizar / Trocar IP de outra estação cadastrada</span>
            </label>
          </div>

          {/* Seletor 3 — Escolha do IP Definitivo */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 text-blue-600" />
                Seletor 3 — Escolha do IP Definitivo *
                {reutilizarIpEstacao ? (
                  <span className="text-[11px] font-normal text-amber-700 ml-1">
                    (Listando estações cadastradas nesta VLAN)
                  </span>
                ) : (
                  <span className="text-[11px] font-normal text-emerald-700 ml-1">
                    (Listando apenas IPs 100% livres)
                  </span>
                )}
              </label>

              {context.network_context.ip_anterior_sugerido && (
                <button
                  type="button"
                  onClick={() => {
                    setIpDefinitivo(context.network_context.ip_anterior_sugerido!);
                    const inWorkstation = currentRange.workstation_used_ips.some(
                      (w) => w.ip === context.network_context.ip_anterior_sugerido
                    );
                    if (inWorkstation) {
                      handleToggleReutilizar(true);
                      setConfirmarSobrescrita(true);
                    }
                  }}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                  title="Preencher com IP sugerido do ativo anterior"
                >
                  IP Anterior: <span className="font-mono">{context.network_context.ip_anterior_sugerido}</span>
                </button>
              )}
            </div>

            {/* Input de filtro rápido quando houver muitos itens */}
            {(reutilizarIpEstacao ? currentRange.workstation_used_ips.length > 8 : currentRange.free_ips.length > 15) && (
              <div className="mb-2 relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={ipFilterText}
                  onChange={(e) => setIpFilterText(e.target.value)}
                  placeholder={reutilizarIpEstacao ? "Filtrar por IP, Hostname ou Patrimônio..." : "Filtrar IP (ex: .105 ou 192.168.10)..."}
                  className="w-full pl-8 pr-3 py-1 text-xs rounded border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-blue-400"
                />
              </div>
            )}

            {!reutilizarIpEstacao ? (
              /* MODO PADRÃO: IPs LIVRES */
              currentRange.free_ips.length > 0 ? (
                <select
                  value={ipDefinitivo}
                  onChange={(e) => {
                    setIpDefinitivo(e.target.value);
                    setConfirmarSobrescrita(false);
                  }}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs font-mono focus:border-blue-500 focus:outline-none bg-white"
                >
                  <option value="">-- Selecione um IP Livre ({filteredFreeIps.length} disponíveis) --</option>
                  {ipDefinitivo && !filteredFreeIps.includes(ipDefinitivo) && (
                    <option key={ipDefinitivo} value={ipDefinitivo}>
                      {ipDefinitivo} (Atual / Selecionado)
                    </option>
                  )}
                  {filteredFreeIps.map((ip) => (
                    <option key={ip} value={ip}>
                      {ip}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    Não há nenhum IP livre nesta faixa. Escolha outra VLAN ou marque a opção de reutilizar IP de outra estação.
                  </span>
                </div>
              )
            ) : (
              /* MODO REUTILIZAR: ESTAÇÕES DE TRABALHO */
              currentRange.workstation_used_ips.length > 0 ? (
                <select
                  value={ipDefinitivo}
                  onChange={(e) => {
                    setIpDefinitivo(e.target.value);
                    setConfirmarSobrescrita(true);
                  }}
                  className="w-full rounded-lg border border-amber-300 bg-amber-50/40 py-2 px-3 text-xs font-mono focus:border-amber-500 focus:outline-none"
                >
                  <option value="">
                    -- Selecione a Estação para Reutilizar IP ({filteredWorkstationIps.length} cadastradas) --
                  </option>
                  {ipDefinitivo && !filteredWorkstationIps.some((w) => w.ip === ipDefinitivo) && (
                    <option key={ipDefinitivo} value={ipDefinitivo}>
                      {ipDefinitivo} (Selecionado)
                    </option>
                  )}
                  {filteredWorkstationIps.map((w) => (
                    <option key={w.ip} value={w.ip}>
                      {w.ip} &mdash; {w.hostname} {w.patrimonio ? `(${w.patrimonio})` : ''} {w.sistema ? `[${w.sistema}]` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-500 italic">
                  Nenhuma estação de trabalho cadastrada nesta faixa/VLAN.
                </div>
              )
            )}

            {/* Alerta de Substituição quando estiver reutilizando IP */}
            {reutilizarIpEstacao && selectedWorkstation && (
              <div className="mt-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  Transferência de IP Confirmada
                </div>
                <p className="text-amber-800">
                  O endereço <strong className="font-mono">{selectedWorkstation.ip}</strong> atualmente pertence à estação{' '}
                  <strong>{selectedWorkstation.hostname}</strong> ({selectedWorkstation.patrimonio || 'Sem patrimônio'}).
                  Ao homologar, o IP será assumido por este equipamento e liberado da estação anterior no inventário.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Fallback se a filial não tiver nenhuma faixa cadastrada */
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-xs">
          <p className="text-slate-600">
            Nenhuma faixa de rede/VLAN configurada para esta filial. Informe o endereço IP manualmente:
          </p>
          <input
            type="text"
            value={ipDefinitivo}
            onChange={(e) => setIpDefinitivo(e.target.value)}
            placeholder="Ex: 192.168.10.50"
            className="w-full sm:w-64 rounded-lg border border-slate-300 py-1.5 px-3 text-xs font-mono focus:border-blue-500 focus:outline-none bg-white"
          />
        </div>
      )}
    </div>
  );
};
