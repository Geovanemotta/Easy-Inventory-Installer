import React, { useEffect, useMemo, useState } from 'react';
import { DeviceApprovalContextResponse, DeviceListItem, SiteVlanIpRange } from '@/types/device';
import { deviceService } from '@/services/deviceService';
import {
  X,
  AlertTriangle,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

import { ApprovalComparisonSection } from './approval/ApprovalComparisonSection';
import { ApprovalVlanIpSelector } from './approval/ApprovalVlanIpSelector';
import { ApprovalPatrimonioSection } from './approval/ApprovalPatrimonioSection';
import { ApprovalFirewallEmailStep, ConcluidoData } from './approval/ApprovalFirewallEmailStep';

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

  // Estados para Automação de E-mail para Operadora (Firewall - Etapa 2)
  const [operatorEmail, setOperatorEmail] = useState<string>('');
  const [senderEmail, setSenderEmail] = useState<string>('');
  const [firewallCircuito, setFirewallCircuito] = useState<string>('');
  const [firewallVlanName, setFirewallVlanName] = useState<string>('LAN');
  const [isDirectSending, setIsDirectSending] = useState<boolean>(false);
  const [directSendResult, setDirectSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // Modo de Rejeição
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState<string>('');

  // Execução e Sucesso pós-aprovação (Etapa 2)
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [concluido, setConcluido] = useState<ConcluidoData | null>(null);

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

        // Dados SMTP reativos da filial e operadora
        setOperatorEmail(data.default_operator_email || '');
        setSenderEmail(data.sender_email || '');
        const initialSiteObj = data.network_context.sites.find((s) => s.id === initialSite);
        setFirewallCircuito(initialSiteObj?.circuito || data.device.circuito || '');

        if (chosenRange) {
          setSelectedRangeId(chosenRange.id);
          setFirewallVlanName(chosenRange.name);
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

      const siteObj = context?.network_context.sites.find((s) => s.id === siteId);
      if (siteObj?.circuito) {
        setFirewallCircuito(siteObj.circuito);
      }

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
      setFirewallVlanName(r.name);
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

  // Submissão da Homologação (Aprovação e Continuação para Envio de E-mail Opcional)
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
        send_operator_email: false,
      };

      await deviceService.aprovarCadastro(device.id, payload);

      const siteObj = context?.network_context.sites.find((s) => s.id === Number(selectedSiteId));

      setConcluido({
        hostname: context?.device.hostname || device.hostname,
        ip: ipDefinitivo.trim(),
        mac: context?.device.mac || device.mac || '',
        patrimonio: patrimonioAjustado.trim() || context?.device.patrimonio || '',
        siteId: Number(selectedSiteId),
        siteName: siteObj?.name || '',
        circuito: firewallCircuito.trim() || siteObj?.circuito || '',
        vlanName: firewallVlanName.trim() || 'LAN',
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao homologar o cadastro do equipamento.');
    } finally {
      setSubmitting(false);
    }
  };

  // Disparo de e-mail de reserva para a operadora (na tela da 2ª etapa)
  const handleSendEmailDirectly = async () => {
    const currentIp = concluido?.ip || ipDefinitivo.trim();
    const currentMac = (concluido?.mac || context?.device.mac || device.mac || '').toUpperCase();
    const currentCircuito = firewallCircuito.trim() || concluido?.circuito || '';

    if (!operatorEmail.trim() || !currentCircuito || !currentIp) {
      setDirectSendResult({
        success: false,
        message: 'Informe o e-mail da operadora, circuito e o IP definitivo para enviar.',
      });
      return;
    }
    setIsDirectSending(true);
    setDirectSendResult(null);
    try {
      const res = await deviceService.sendFirewallEmail(device.id, {
        operator_email: operatorEmail.trim(),
        sender_email: senderEmail.trim(),
        circuito: currentCircuito,
        vlan_name: firewallVlanName.trim() || concluido?.vlanName || 'LAN',
        ip_address: currentIp,
        mac_address: currentMac,
      });
      setDirectSendResult({ success: true, message: res.message });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao disparar e-mail para a operadora.';
      setDirectSendResult({ success: false, message: msg });
    } finally {
      setIsDirectSending(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-border-subtle bg-surface text-fg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4 bg-elevated/70">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-fg tracking-tight">
                {concluido ? 'Reserva no Firewall da Operadora' : 'Revisar e Homologar Equipamento'}
              </h3>
              <p className="text-xs text-fg-secondary">
                {concluido
                  ? 'Easy Inventory • Disparo opcional de solicitação técnica para a operadora do circuito'
                  : 'Easy Inventory • Homologação de Ativo Físico e Atribuição de IP Definitivo'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (concluido) onSuccess();
              onClose();
            }}
            className="rounded-lg p-1.5 text-fg-secondary hover:bg-elevated hover:text-fg transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo do Modal com Scroll */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-sm text-gray-700 dark:text-slate-300 bg-app">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {loadingContext ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-fg-secondary">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                Carregando dados completos de aprovação e contexto de rede do ativo...
              </span>
            </div>
          ) : concluido ? (
            /* TELA DA SEGUNDA ETAPA: ENVIO DE E-MAIL PARA A OPERADORA (OPCIONAL) */
            <ApprovalFirewallEmailStep
              concluido={concluido}
              operatorEmail={operatorEmail}
              setOperatorEmail={setOperatorEmail}
              senderEmail={senderEmail}
              setSenderEmail={setSenderEmail}
              circuito={firewallCircuito}
              setCircuito={setFirewallCircuito}
              vlanName={firewallVlanName}
              setVlanName={setFirewallVlanName}
              onSendEmail={handleSendEmailDirectly}
              isSending={isDirectSending}
              sendResult={directSendResult}
              onFinish={() => {
                onSuccess();
                onClose();
              }}
            />
          ) : context ? (
            /* AS 3 SEÇÕES INICIAIS DE HOMOLOGAÇÃO */
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
