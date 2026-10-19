import React, { useEffect, useMemo, useState } from 'react';
import { DeviceApprovalContextResponse, DeviceListItem, SiteVlanIpRange } from '@/types/device';
import { deviceService } from '@/services/deviceService';
import {
  X,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  Copy,
  Check,
  Globe,
  Monitor,
  Tag,
  Layers,
} from 'lucide-react';
import { copyToClipboard } from '@/utils/clipboard';

import { ApprovalComparisonSection } from './approval/ApprovalComparisonSection';
import { ApprovalVlanIpSelector } from './approval/ApprovalVlanIpSelector';
import { ApprovalPatrimonioSection } from './approval/ApprovalPatrimonioSection';

interface DeviceApprovalModalProps {
  device: DeviceListItem;
  onClose: () => void;
  onSuccess: () => void;
}

const isIpInRange = (ip: string, start: string, end: string): boolean => {
  try {
    const toInt = (s: string) =>
      s.split('.').reduce((acc, oct) => ((acc << 8) + parseInt(oct, 10)) >>> 0, 0);
    const ipInt = toInt(ip.trim());
    return ipInt >= toInt(start.trim()) && ipInt <= toInt(end.trim());
  } catch {
    return false;
  }
};

export const DeviceApprovalModal: React.FC<DeviceApprovalModalProps> = ({
  device,
  onClose,
  onSuccess,
}) => {
  const [context, setContext] = useState<DeviceApprovalContextResponse | null>(null);
  const [loadingContext, setLoadingContext] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Estados dos formulários (Seções B, C, D)
  const [vincularAtivo, setVincularAtivo] = useState<boolean>(true);
  const [selectedSiteId, setSelectedSiteId] = useState<number | ''>(device.site_id || '');
  const [ipDefinitivo, setIpDefinitivo] = useState<string>('');
  const [patrimonioAjustado, setPatrimonioAjustado] = useState<string>(device.patrimonio || '');
  const [confirmarSobrescrita, setConfirmarSobrescrita] = useState<boolean>(false);
  const [observacaoAdmin, setObservacaoAdmin] = useState<string>('');

  // Estados para VLANs e Seletores Inteligentes de IP
  const [vlanRanges, setVlanRanges] = useState<SiteVlanIpRange[]>([]);
  const [loadingVlans, setLoadingVlans] = useState<boolean>(false);
  const [selectedRangeId, setSelectedRangeId] = useState<number | ''>('');
  const [reutilizarIpEstacao, setReutilizarIpEstacao] = useState<boolean>(false);
  const [ipFilterText, setIpFilterText] = useState<string>('');

  // Modo de Rejeição
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState<string>('');

  // Execução e Sucesso pós-aprovação
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [concluido, setConcluido] = useState<{
    hostname: string;
    ip: string;
    mac: string;
    patrimonio: string;
  } | null>(null);
  const [copiadoCampo, setCopiadoCampo] = useState<string>('');

  // Carrega o contexto de aprovação no início
  useEffect(() => {
    let active = true;
    const fetchContext = async () => {
      try {
        setLoadingContext(true);
        setError(null);
        const data = await deviceService.getApprovalContext(device.id);
        if (!active) return;
        setContext(data);

        // Define a loja inicial sugerida automaticamente pelo Back-end
        const initialSite =
          data.network_context.suggested_site_id ||
          data.network_context.resolved_site_id ||
          data.device.site_id ||
          (data.network_context.sites.length > 0 ? data.network_context.sites[0].id : '');
        setSelectedSiteId(initialSite);

        // Faixas de VLAN já calculadas pelo Back-end para a filial sugerida
        const initialRanges = data.network_context.vlan_ranges || [];
        setVlanRanges(initialRanges);

        // Pré-seleciona a melhor faixa de rede (ou a primeira)
        let chosenRange = initialRanges[0] || null;
        if (data.network_context.ip_anterior_sugerido && initialRanges.length > 0) {
          const match = initialRanges.find((r) =>
            isIpInRange(data.network_context.ip_anterior_sugerido!, r.ip_start, r.ip_end)
          );
          if (match) chosenRange = match;
        } else if (data.device.ip && !data.device.is_rede_formatacao && initialRanges.length > 0) {
          const match = initialRanges.find((r) =>
            isIpInRange(data.device.ip, r.ip_start, r.ip_end)
          );
          if (match) chosenRange = match;
        }

        if (chosenRange) {
          setSelectedRangeId(chosenRange.id);
        }

        // Sugere o IP Definitivo inicial
        if (data.network_context.ip_anterior_sugerido) {
          setIpDefinitivo(data.network_context.ip_anterior_sugerido);
          if (
            chosenRange &&
            chosenRange.workstation_used_ips.some((w) => w.ip === data.network_context.ip_anterior_sugerido)
          ) {
            setReutilizarIpEstacao(true);
            setConfirmarSobrescrita(true);
          }
        } else if (
          data.device.ip &&
          !data.device.is_rede_formatacao &&
          chosenRange &&
          isIpInRange(data.device.ip, chosenRange.ip_start, chosenRange.ip_end)
        ) {
          setIpDefinitivo(data.device.ip);
        } else if (chosenRange && chosenRange.free_ips.length > 0) {
          setIpDefinitivo(chosenRange.free_ips[0]);
        }
      } catch (err: unknown) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Falha ao carregar contexto de aprovação.');
      } finally {
        if (active) setLoadingContext(false);
      }
    };

    fetchContext();
    return () => {
      active = false;
    };
  }, [device.id]);

  // Carrega as VLANs quando o usuário altera a filial selecionada
  const handleSiteChange = async (siteId: number | '') => {
    setSelectedSiteId(siteId);
    setIpFilterText('');

    if (!siteId) {
      setSelectedRangeId('');
      setIpDefinitivo('');
      setConfirmarSobrescrita(false);
      setVlanRanges([]);
      return;
    }

    try {
      setLoadingVlans(true);
      const res = await deviceService.getSiteVlanIps(siteId);
      const ranges = res.ranges || [];
      setVlanRanges(ranges);

      if (ranges.length > 0) {
        let first = ranges[0];
        const devIp = device.ip;
        if (devIp && !context?.device.is_rede_formatacao) {
          const matched = ranges.find((r) => isIpInRange(devIp, r.ip_start, r.ip_end));
          if (matched) first = matched;
        }

        setSelectedRangeId(first.id);
        if (reutilizarIpEstacao && first.workstation_used_ips.length > 0) {
          setIpDefinitivo(first.workstation_used_ips[0].ip);
          setConfirmarSobrescrita(true);
        } else if (
          devIp &&
          !context?.device.is_rede_formatacao &&
          isIpInRange(devIp, first.ip_start, first.ip_end)
        ) {
          setIpDefinitivo(devIp);
          setConfirmarSobrescrita(false);
        } else if (first.free_ips.length > 0) {
          setIpDefinitivo(first.free_ips[0]);
          setConfirmarSobrescrita(false);
        } else {
          setIpDefinitivo('');
          setConfirmarSobrescrita(false);
        }
      } else {
        setSelectedRangeId('');
        setIpDefinitivo('');
        setConfirmarSobrescrita(false);
      }
    } catch (err) {
      console.error('Erro ao buscar VLANs da filial:', err);
    } finally {
      setLoadingVlans(false);
    }
  };

  // Faixa de VLAN atualmente selecionada
  const currentRange = useMemo(() => {
    if (!selectedRangeId || vlanRanges.length === 0) return null;
    return vlanRanges.find((r) => r.id === selectedRangeId) || null;
  }, [selectedRangeId, vlanRanges]);

  // Altera a faixa selecionada e atualiza o IP inicial
  const handleRangeChange = (rangeId: number | '') => {
    setSelectedRangeId(rangeId);
    setIpDefinitivo('');
    setConfirmarSobrescrita(false);
    setIpFilterText('');

    if (!rangeId) return;
    const r = vlanRanges.find((item) => item.id === rangeId);
    if (r) {
      if (reutilizarIpEstacao && r.workstation_used_ips.length > 0) {
        setIpDefinitivo(r.workstation_used_ips[0].ip);
        setConfirmarSobrescrita(true);
      } else if (!reutilizarIpEstacao && r.free_ips.length > 0) {
        setIpDefinitivo(r.free_ips[0]);
      }
    }
  };

  // Alterna o modo de escolha de IP (Livres vs Estações)
  const handleToggleReutilizar = (checked: boolean) => {
    setReutilizarIpEstacao(checked);
    setIpFilterText('');
    if (!currentRange) return;

    if (checked) {
      if (currentRange.workstation_used_ips.length > 0) {
        setIpDefinitivo(currentRange.workstation_used_ips[0].ip);
        setConfirmarSobrescrita(true);
      } else {
        setIpDefinitivo('');
      }
    } else {
      if (currentRange.free_ips.length > 0) {
        setIpDefinitivo(currentRange.free_ips[0]);
        setConfirmarSobrescrita(false);
      } else {
        setIpDefinitivo('');
      }
    }
  };

  // Estação selecionada quando em modo reutilizar IP
  const selectedWorkstation = useMemo(() => {
    if (!reutilizarIpEstacao || !currentRange || !ipDefinitivo) return null;
    return currentRange.workstation_used_ips.find((w) => w.ip === ipDefinitivo) || null;
  }, [reutilizarIpEstacao, currentRange, ipDefinitivo]);

  // Validação: IP em uso por estação
  const ipEmUso = useMemo(() => {
    if (!currentRange || !ipDefinitivo) return false;
    return currentRange.workstation_used_ips.some((w) => w.ip === ipDefinitivo);
  }, [currentRange, ipDefinitivo]);

  // Filtros rápidos no select de IPs
  const filteredFreeIps = useMemo(() => {
    if (!currentRange) return [];
    if (!ipFilterText.trim()) return currentRange.free_ips;
    const t = ipFilterText.trim().toLowerCase();
    return currentRange.free_ips.filter((ip) => ip.toLowerCase().includes(t));
  }, [currentRange, ipFilterText]);

  const filteredWorkstationIps = useMemo(() => {
    if (!currentRange) return [];
    if (!ipFilterText.trim()) return currentRange.workstation_used_ips;
    const t = ipFilterText.trim().toLowerCase();
    return currentRange.workstation_used_ips.filter(
      (w) =>
        w.ip.toLowerCase().includes(t) ||
        (w.hostname && w.hostname.toLowerCase().includes(t)) ||
        (w.patrimonio && w.patrimonio.toLowerCase().includes(t))
    );
  }, [currentRange, ipFilterText]);

  const handleCopy = (campo: string, valor: string) => {
    copyToClipboard(valor);
    setCopiadoCampo(campo);
    setTimeout(() => setCopiadoCampo(''), 2000);
  };

  // Submissão da Homologação (Aprovação)
  const handleAprovar = async () => {
    if (!selectedSiteId) {
      setError('Selecione a Filial Destino para o equipamento.');
      return;
    }
    if (!ipDefinitivo.trim()) {
      setError('Selecione ou informe um Endereço IP definitivo válido.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        site_id: Number(selectedSiteId),
        ip_definitivo: ipDefinitivo.trim(),
        vincular_ativo_existente_id:
          vincularAtivo && context?.existing_asset?.tipo_origem === 'device'
            ? (context.existing_asset.id as number)
            : null,
        vincular_network_asset_id:
          vincularAtivo && context?.existing_asset?.tipo_origem === 'network_asset'
            ? (context.existing_asset.id as number)
            : null,
        patrimonio: patrimonioAjustado.trim() || null,
        observacao_admin: observacaoAdmin.trim() || null,
        confirmar_sobrescrita_ip: confirmarSobrescrita,
      };

      await deviceService.aprovarCadastro(device.id, payload);

      setConcluido({
        hostname: context?.device.hostname || device.hostname,
        ip: ipDefinitivo.trim(),
        mac: context?.device.mac || device.mac || '',
        patrimonio: patrimonioAjustado.trim() || context?.device.patrimonio || '',
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao homologar o cadastro do equipamento.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submissão da Rejeição
  const handleRejeitar = async () => {
    if (!motivoRejeicao.trim()) {
      setError('Informe o motivo da rejeição.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await deviceService.rejeitarCadastro(device.id, {
        motivo: motivoRejeicao.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao rejeitar o cadastro.');
    } finally {
      setSubmitting(false);
    }
  };

  const canApprove = Boolean(selectedSiteId && ipDefinitivo.trim() && (!ipEmUso || confirmarSobrescrita));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Revisar e Concluir Cadastro do Equipamento
              </h3>
              <p className="text-xs text-slate-500">
                Giassi Enterprise &bull; Homologação de Ativo Físico e Atribuição de IP Definitivo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            title="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo do Modal com Scroll */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-sm text-slate-700">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {loadingContext ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <span className="text-xs font-semibold text-slate-600">
                Carregando dados completos de aprovação e contexto de rede do ativo...
              </span>
            </div>
          ) : concluido ? (
            /* TELA DE SUCESSO E CÓPIA RÁPIDA */
            <div className="py-6 space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mb-1">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  Cadastro Homologado com Sucesso!
                </h3>
                <p className="text-xs text-slate-600 max-w-lg mx-auto">
                  O equipamento <strong className="text-slate-900">{concluido.hostname}</strong> foi
                  aprovado e seu IP definitivo foi registrado no inventário. Você pode copiar os dados
                  abaixo para configurar DHCP, Firewall ou monitoramento:
                </p>
              </div>

              {/* Grid dos Cards de Cópia Rápida */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-2xl mx-auto">
                {/* 1. IP Definitivo em Destaque */}
                <div className="sm:col-span-2 rounded-xl border-2 border-emerald-300 bg-emerald-50/60 p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <Globe className="h-4 w-4 text-emerald-600" /> IP Definitivo na Filial
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy('IP', concluido.ip)}
                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                        copiadoCampo === 'IP'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      }`}
                    >
                      {copiadoCampo === 'IP' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiadoCampo === 'IP' ? 'Copiado!' : 'Copiar IP'}</span>
                    </button>
                  </div>
                  <div className="text-2xl font-mono font-black text-emerald-950">
                    {concluido.ip}
                  </div>
                </div>

                {/* 2. Hostname */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                      <Monitor className="h-3.5 w-3.5 text-slate-400" /> Hostname
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy('Hostname', concluido.hostname)}
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold transition-all ${
                        copiadoCampo === 'Hostname'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {copiadoCampo === 'Hostname' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copiadoCampo === 'Hostname' ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                  <div className="text-sm font-bold text-slate-800 truncate">{concluido.hostname}</div>
                </div>

                {/* 3. MAC Address */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5 text-slate-400" /> Endereço MAC
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy('MAC', concluido.mac)}
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold transition-all ${
                        copiadoCampo === 'MAC'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {copiadoCampo === 'MAC' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copiadoCampo === 'MAC' ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                  <div className="text-sm font-mono font-bold text-slate-800 truncate">
                    {concluido.mac || '(sem MAC)'}
                  </div>
                </div>

                {/* 4. Patrimônio */}
                <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5 text-slate-400" /> Número de Patrimônio
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy('Patrimônio', concluido.patrimonio)}
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold transition-all ${
                        copiadoCampo === 'Patrimônio'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {copiadoCampo === 'Patrimônio' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copiadoCampo === 'Patrimônio' ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                  <div className="text-sm font-bold text-slate-800 font-mono">
                    {concluido.patrimonio || '(sem patrimônio)'}
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onSuccess();
                    onClose();
                  }}
                  className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-md transition-colors"
                >
                  Concluir e Retornar ao Inventário
                </button>
              </div>
            </div>
          ) : context ? (
            /* AS 4 SEÇÕES DE CONFRONTO ADMINISTRATIVO */
            <div className="space-y-6">
              <ApprovalComparisonSection
                context={context}
                vincularAtivo={vincularAtivo}
                setVincularAtivo={setVincularAtivo}
              />

              <ApprovalVlanIpSelector
                context={context}
                selectedSiteId={selectedSiteId}
                handleSiteChange={handleSiteChange}
                vlanRanges={vlanRanges}
                selectedRangeId={selectedRangeId}
                handleRangeChange={handleRangeChange}
                loadingVlans={loadingVlans}
                currentRange={currentRange}
                reutilizarIpEstacao={reutilizarIpEstacao}
                handleToggleReutilizar={handleToggleReutilizar}
                ipFilterText={ipFilterText}
                setIpFilterText={setIpFilterText}
                ipDefinitivo={ipDefinitivo}
                setIpDefinitivo={setIpDefinitivo}
                setConfirmarSobrescrita={setConfirmarSobrescrita}
                filteredFreeIps={filteredFreeIps}
                filteredWorkstationIps={filteredWorkstationIps}
                selectedWorkstation={selectedWorkstation}
              />

              <ApprovalPatrimonioSection
                patrimonioAjustado={patrimonioAjustado}
                setPatrimonioAjustado={setPatrimonioAjustado}
                observacaoAdmin={observacaoAdmin}
                setObservacaoAdmin={setObservacaoAdmin}
                isRejecting={isRejecting}
                setIsRejecting={setIsRejecting}
                motivoRejeicao={motivoRejeicao}
                setMotivoRejeicao={setMotivoRejeicao}
                submitting={submitting}
                onClose={onClose}
                onAprovar={handleAprovar}
                onRejeitar={handleRejeitar}
                canApprove={canApprove}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
export default DeviceApprovalModal;
