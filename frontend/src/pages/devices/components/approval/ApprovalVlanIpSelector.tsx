import React, { useMemo } from 'react';
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
import { SelectDropdown } from '@/components/ui/SelectDropdown';

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
  const siteOptions = useMemo(() => {
    return context.network_context.sites.map((s) => ({
      value: String(s.id),
      label: `${s.code ? `[${s.code}] ` : ''}${s.name}`,
    }));
  }, [context.network_context.sites]);

  const vlanOptions = useMemo(() => {
    return vlanRanges.map((r) => ({
      value: String(r.id),
      label: `${r.vlan_id ? `VLAN ${r.vlan_id} — ` : ''}${r.name} (${r.ip_start} a ${r.ip_end}) — ${r.free_count} livres`,
    }));
  }, [vlanRanges]);

  const freeIpOptions = useMemo(() => {
    const opts = filteredFreeIps.map((ip) => ({
      value: ip,
      label: ip,
    }));
    if (ipDefinitivo && !filteredFreeIps.includes(ipDefinitivo)) {
      opts.unshift({ value: ipDefinitivo, label: `${ipDefinitivo} (Atual / Selecionado)` });
    }
    return opts;
  }, [filteredFreeIps, ipDefinitivo]);

  const workstationOptions = useMemo(() => {
    const opts = filteredWorkstationIps.map((w) => ({
      value: w.ip,
      label: `${w.ip} — ${w.hostname}${w.patrimonio ? ` (${w.patrimonio})` : ''}${w.sistema ? ` [${w.sistema}]` : ''}`,
    }));
    if (ipDefinitivo && !filteredWorkstationIps.some((w) => w.ip === ipDefinitivo)) {
      opts.unshift({ value: ipDefinitivo, label: `${ipDefinitivo} (Selecionado)` });
    }
    return opts;
  }, [filteredWorkstationIps, ipDefinitivo]);

  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4 space-y-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 text-[10px] font-bold text-orange-400 uppercase">
            Seção C
          </span>
          <h4 className="text-xs font-bold text-fg uppercase tracking-wider">
            Seleção do Endereço IP Definitivo na Loja
          </h4>
        </div>
        {context.network_context.matched_by && (
          <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-1 w-fit font-mono">
            <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            Loja detectada por {context.network_context.matched_by}
          </span>
        )}
      </div>

      <p className="text-xs text-fg-secondary">
        O IP atual (<span className="font-mono font-medium text-fg">{context.device.ip}</span>) pertence à bancada de formatação.
        Selecione a Filial, a VLAN e o IP corporativo fixo para a estação:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Seletor 1 — Filial Destino */}
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Building className="h-3.5 w-3.5 text-orange-400" /> Seletor 1 — Filial Destino *
          </label>
          <SelectDropdown
            value={selectedSiteId ? String(selectedSiteId) : ''}
            onChange={(val) => handleSiteChange(val ? Number(val) : '')}
            options={siteOptions}
            placeholder="-- Selecione a Loja / Filial --"
            className="w-full"
          />
        </div>

        {/* Seletor 2 — VLAN / Faixa de Rede da Loja */}
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Network className="h-3.5 w-3.5 text-orange-400" /> Seletor 2 — VLAN / Faixa de Rede *
            </span>
            {loadingVlans && (
              <span className="text-[10px] text-orange-400 flex items-center gap-1 font-normal font-mono">
                <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
              </span>
            )}
          </label>
          {loadingVlans ? (
            <div className="w-full rounded-lg border border-orange-500/30 bg-elevated py-2 px-3 text-xs text-orange-600 dark:text-orange-300 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-400 shrink-0" />
              <span>Buscando VLANs da filial...</span>
            </div>
          ) : vlanRanges.length > 0 ? (
            <SelectDropdown
              value={selectedRangeId ? String(selectedRangeId) : ''}
              onChange={(val) => handleRangeChange(val ? Number(val) : '')}
              options={vlanOptions}
              placeholder="-- Selecione a VLAN / Faixa --"
              disabled={loadingVlans}
              className="w-full"
            />
          ) : (
            <div className="rounded-lg border border-border-subtle bg-app py-2 px-3 text-xs text-fg-secondary italic">
              {selectedSiteId
                ? 'Nenhuma faixa cadastrada nesta filial.'
                : 'Selecione uma filial para carregar as VLANs.'}
            </div>
          )}
        </div>
      </div>

      {/* Se há faixas cadastradas na filial */}
      {loadingVlans ? (
        <div className="rounded-xl border border-orange-500/30 bg-app p-6 flex flex-col items-center justify-center gap-2 text-xs text-orange-600 dark:text-orange-300 animate-pulse">
          <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
          <span className="font-semibold text-fg">Atualizando faixas de rede e endereços IP...</span>
          <span className="text-[11px] text-fg-secondary">Consultando faixas VLAN e disponibilidade de IPs da filial selecionada</span>
        </div>
      ) : currentRange ? (
        <div className="rounded-xl border border-border-subtle bg-app p-3.5 space-y-3">
          {/* Linha de Status da Faixa & Modo de Escolha */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border-subtle">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-gray-700 dark:text-slate-300">Resumo da Faixa:</span>
              <span className="rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[11px] font-bold font-mono">
                {currentRange.free_count} IPs Livres
              </span>
              <span className="rounded bg-sky-500/15 border border-sky-500/30 text-sky-700 dark:text-sky-300 px-2 py-0.5 text-[11px] font-bold font-mono">
                {currentRange.workstations_count} Estações
              </span>
              {currentRange.gateway && (
                <span className="text-fg-secondary text-[11px] font-mono">
                  Gateway: <code className="text-fg">{currentRange.gateway}</code>
                </span>
              )}
            </div>

            {/* Checkbox de Modo de Escolha */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-fg font-semibold bg-elevated px-2.5 py-1 rounded-lg border border-border-medium hover:bg-border-subtle transition-colors">
              <input
                type="checkbox"
                checked={reutilizarIpEstacao}
                onChange={(e) => handleToggleReutilizar(e.target.checked)}
                className="rounded border-border-medium bg-app text-orange-500 focus:ring-0 h-4 w-4"
              />
              <span>Reutilizar / Trocar IP de outra estação cadastrada</span>
            </label>
          </div>

          {/* Seletor 3 — Escolha do IP Definitivo */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-orange-400" />
                Seletor 3 — Escolha do IP Definitivo *
                {reutilizarIpEstacao ? (
                  <span className="text-[11px] font-normal text-amber-700 dark:text-amber-300 ml-1">
                    (Listando estações cadastradas nesta VLAN)
                  </span>
                ) : (
                  <span className="text-[11px] font-normal text-emerald-600 dark:text-emerald-400 ml-1">
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
                  className="text-[11px] font-semibold text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 cursor-pointer"
                  title="Preencher com IP sugerido do ativo anterior"
                >
                  IP Anterior: <span className="font-mono">{context.network_context.ip_anterior_sugerido}</span>
                </button>
              )}
            </div>

            {/* Input de filtro rápido quando houver muitos itens */}
            {(reutilizarIpEstacao ? currentRange.workstation_used_ips.length > 8 : currentRange.free_ips.length > 15) && (
              <div className="mb-2 relative">
                <Search className="h-3.5 w-3.5 text-fg-secondary absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={ipFilterText}
                  onChange={(e) => setIpFilterText(e.target.value)}
                  placeholder={reutilizarIpEstacao ? "Filtrar por IP, Hostname ou Patrimônio..." : "Filtrar IP (ex: .105 ou 192.168.10)..."}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border-medium bg-elevated text-fg placeholder:text-fg-muted focus:outline-none focus:border-orange-500"
                />
              </div>
            )}

            {!reutilizarIpEstacao ? (
              /* MODO PADRÃO: IPs LIVRES */
              currentRange.free_ips.length > 0 ? (
                <SelectDropdown
                  value={ipDefinitivo}
                  onChange={(val) => {
                    setIpDefinitivo(val);
                    setConfirmarSobrescrita(false);
                  }}
                  options={freeIpOptions}
                  placeholder={`-- Selecione um IP Livre (${filteredFreeIps.length} disponíveis) --`}
                  className="w-full font-mono"
                />
              ) : (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    Não há nenhum IP livre nesta faixa. Escolha outra VLAN ou marque a opção de reutilizar IP de outra estação.
                  </span>
                </div>
              )
            ) : (
              /* MODO REUTILIZAR: ESTAÇÕES DE TRABALHO */
              currentRange.workstation_used_ips.length > 0 ? (
                <SelectDropdown
                  value={ipDefinitivo}
                  onChange={(val) => {
                    setIpDefinitivo(val);
                    setConfirmarSobrescrita(true);
                  }}
                  options={workstationOptions}
                  placeholder={`-- Selecione a Estação para Reutilizar IP (${filteredWorkstationIps.length} cadastradas) --`}
                  className="w-full font-mono text-amber-700 dark:text-amber-300"
                />
              ) : (
                <div className="rounded-lg border border-border-subtle bg-app p-2.5 text-xs text-fg-secondary italic">
                  Nenhuma estação de trabalho cadastrada nesta faixa/VLAN.
                </div>
              )
            )}

            {/* Alerta de Substituição quando estiver reutilizando IP */}
            {reutilizarIpEstacao && selectedWorkstation && (
              <div className="mt-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  Transferência de IP Confirmada
                </div>
                <p className="text-amber-700/90 dark:text-amber-300/90 leading-relaxed">
                  O endereço <strong className="font-mono text-fg">{selectedWorkstation.ip}</strong> atualmente pertence à estação{' '}
                  <strong className="text-fg font-mono">{selectedWorkstation.hostname}</strong> ({selectedWorkstation.patrimonio || 'Sem patrimônio'}).
                  Ao homologar, o IP será assumido por este equipamento e liberado da estação anterior no inventário.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Fallback se a filial não tiver nenhuma faixa cadastrada */
        <div className="rounded-xl border border-border-subtle bg-app p-3.5 space-y-2 text-xs">
          <p className="text-fg-secondary">
            Nenhuma faixa de rede/VLAN configurada para esta filial. Informe o endereço IP manualmente:
          </p>
          <input
            type="text"
            value={ipDefinitivo}
            onChange={(e) => setIpDefinitivo(e.target.value)}
            placeholder="Ex: 192.168.10.50"
            className="w-full sm:w-64 rounded-lg border border-border-medium bg-elevated py-1.5 px-3 text-xs font-mono text-fg focus:border-orange-500 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
};
