import React, { useEffect, useMemo, useState } from 'react';
import { DeviceApprovalContextResponse, DeviceListItem, SiteVlanIpRange } from '@/types/device';
import { deviceService } from '@/services/deviceService';
import {
  X,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Copy,
  Check,
  Info,
  Globe,
  Monitor,
  Tag,
  Layers,
  Building,
  Sparkles,
  Network,
  Search,
} from 'lucide-react';
import { copyToClipboard } from '@/utils/clipboard';

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

  // Estados para VLANs e Seletores Inteligentes de IP (Lote 3)
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

        // Define o IP inicial sugerido
        const suggestedIp =
          data.network_context.ip_anterior_sugerido ||
          data.device.ip_definitivo ||
          (!data.device.is_rede_formatacao && data.device.ip ? data.device.ip : '');
        setIpDefinitivo(suggestedIp);

        // Seleção automática da VLAN se tiver 1 faixa ou faixa que contenha o IP sugerido
        if (initialRanges.length === 1) {
          setSelectedRangeId(initialRanges[0].id);
        } else if (initialRanges.length > 1) {
          if (suggestedIp) {
            const matchingRange = initialRanges.find((r) => isIpInRange(suggestedIp, r.ip_start, r.ip_end));
            setSelectedRangeId(matchingRange ? matchingRange.id : initialRanges[0].id);
          } else {
            setSelectedRangeId(initialRanges[0].id);
          }
        }

        if (data.device.patrimonio) {
          setPatrimonioAjustado(data.device.patrimonio);
        }
      } catch (err: unknown) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Falha ao carregar dados do equipamento.');
      } finally {
        if (active) setLoadingContext(false);
      }
    };

    fetchContext();
    return () => {
      active = false;
    };
  }, [device.id]);

  // Handler para troca de filial no Seletor 1
  const handleSiteChange = async (newSiteId: number | '') => {
    setSelectedSiteId(newSiteId);
    setIpDefinitivo('');
    setConfirmarSobrescrita(false);
    setSelectedRangeId('');
    setIpFilterText('');

    if (!newSiteId) {
      setVlanRanges([]);
      return;
    }

    try {
      setLoadingVlans(true);
      const res = await deviceService.getSiteVlanIps(Number(newSiteId), undefined, device.id);
      const ranges = res.ranges || [];
      setVlanRanges(ranges);

      if (ranges.length === 1) {
        setSelectedRangeId(ranges[0].id);
      } else if (ranges.length > 1) {
        setSelectedRangeId(ranges[0].id);
      }
    } catch (err) {
      console.error('Erro ao buscar VLANs da filial:', err);
    } finally {
      setLoadingVlans(false);
    }
  };

  const handleRangeChange = (rangeId: number | '') => {
    setSelectedRangeId(rangeId);
    setIpDefinitivo('');
    setConfirmarSobrescrita(reutilizarIpEstacao);
    setIpFilterText('');
  };

  const handleToggleReutilizar = (checked: boolean) => {
    setReutilizarIpEstacao(checked);
    setIpDefinitivo('');
    setIpFilterText('');
    setConfirmarSobrescrita(checked);
  };

  // Faixa atualmente selecionada no Seletor 2
  const currentRange = useMemo(() => {
    if (!selectedRangeId) return null;
    return vlanRanges.find((r) => r.id === selectedRangeId) || null;
  }, [vlanRanges, selectedRangeId]);

  // IPs livres filtrados para o Seletor 3
  const filteredFreeIps = useMemo(() => {
    if (!currentRange) return [];
    const list = currentRange.free_ips || [];
    if (!ipFilterText.trim()) return list;
    const term = ipFilterText.trim().toLowerCase();
    return list.filter((ip) => ip.toLowerCase().includes(term));
  }, [currentRange, ipFilterText]);

  // IPs de estações filtrados para o Seletor 3
  const filteredWorkstationIps = useMemo(() => {
    if (!currentRange) return [];
    const list = currentRange.workstation_used_ips || [];
    if (!ipFilterText.trim()) return list;
    const term = ipFilterText.trim().toLowerCase();
    return list.filter(
      (w) =>
        w.ip.toLowerCase().includes(term) ||
        (w.hostname && w.hostname.toLowerCase().includes(term)) ||
        (w.patrimonio && w.patrimonio.toLowerCase().includes(term))
    );
  }, [currentRange, ipFilterText]);

  // Estação selecionada quando em modo de reuso de IP
  const selectedWorkstation = useMemo(() => {
    if (!reutilizarIpEstacao || !currentRange || !ipDefinitivo) return null;
    return currentRange.workstation_used_ips.find((w) => w.ip === ipDefinitivo) || null;
  }, [reutilizarIpEstacao, currentRange, ipDefinitivo]);

  // Checa se o IP definitivo está ocupado
  const ipEmUso = useMemo(() => {
    if (!context || !ipDefinitivo.trim()) return false;
    const clean = ipDefinitivo.trim();
    return (context.network_context.ips_ocupados || []).includes(clean);
  }, [context, ipDefinitivo]);

  // Cópia para a área de transferência com feedback visual
  const handleCopy = async (campo: string, valor: string, label?: string, e?: React.MouseEvent) => {
    if (!valor) return;
    await copyToClipboard(valor, label || campo, e);
    setCopiadoCampo(campo);
    setTimeout(() => setCopiadoCampo(''), 1500);
  };

  // Submissão da Aprovação
  const handleAprovar = async () => {
    if (!selectedSiteId) {
      setError('Por favor, confirme ou selecione a Filial / Loja de destino.');
      return;
    }
    if (!ipDefinitivo.trim()) {
      setError('Por favor, informe o IP definitivo que será utilizado pela máquina.');
      return;
    }
    if (ipEmUso && !confirmarSobrescrita) {
      setError('O IP selecionado já está em uso na loja. Confirme a substituição ou escolha outro IP.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const existingDevId =
        vincularAtivo && context?.existing_asset
          ? (context.existing_asset.linked_device_id as number) ??
            (context.existing_asset.tipo_origem === 'device' ? (context.existing_asset.id as number) : null)
          : null;

      const existingNetId =
        vincularAtivo && context?.existing_asset
          ? (context.existing_asset.linked_network_asset_id as number) ??
            (context.existing_asset.tipo_origem === 'network_asset' ? (context.existing_asset.id as number) : null)
          : null;

      await deviceService.aprovarCadastro(device.id, {
        site_id: Number(selectedSiteId),
        ip_definitivo: ipDefinitivo.trim(),
        vincular_ativo_existente_id: existingDevId,
        vincular_network_asset_id: existingNetId,
        patrimonio: patrimonioAjustado.trim() || context?.device.patrimonio || null,
        observacao_admin: observacaoAdmin.trim() || null,
        confirmar_sobrescrita_ip: confirmarSobrescrita,
      });

      // Exibe a tela de conclusão e cópia rápida
      setConcluido({
        hostname: context?.device.hostname || device.hostname,
        ip: ipDefinitivo.trim(),
        mac: context?.device.mac || device.mac || '',
        patrimonio: patrimonioAjustado.trim() || context?.device.patrimonio || '',
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao homologar o cadastro da máquina.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submissão da Rejeição
  const handleRejeitar = async () => {
    if (!motivoRejeicao.trim()) {
      setError('Por favor, informe obrigatoriamente a justificativa para a rejeição.');
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
            /* ======================================================== */
            /* TELA DE SUCESSO E CÓPIA RÁPIDA                           */
            /* ======================================================== */
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
                  <div className="text-sm font-mono font-bold text-slate-800">
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
            /* ======================================================== */
            /* AS 4 SEÇÕES DE CONFRONTO ADMINISTRATIVO                  */
            /* ======================================================== */
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

              {/* ---------------------------------------------------- */}
              {/* SEÇÃO C: SELEÇÃO DO IP DEFINITIVO                    */}
              {/* ---------------------------------------------------- */}
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
                    {vlanRanges.length > 0 ? (
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
                {currentRange ? (
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
                              setIpDefinitivo(context.network_context.ip_anterior_sugerido);
                              const inWorkstation = currentRange.workstation_used_ips.some(
                                (w) => w.ip === context.network_context.ip_anterior_sugerido
                              );
                              if (inWorkstation) {
                                setReutilizarIpEstacao(true);
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

                {/* Patrimônio Físico Ajustado */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Patrimônio Físico Ajustado (se necessário)
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Confirme ou corrija a etiqueta física colada na máquina
                    </span>
                  </div>
                  <input
                    type="text"
                    value={patrimonioAjustado}
                    onChange={(e) => setPatrimonioAjustado(e.target.value)}
                    placeholder="Ex: pat.35192"
                    className="w-full sm:w-64 rounded-lg border border-slate-300 py-1.5 px-3 text-xs font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* ---------------------------------------------------- */}
              {/* SEÇÃO D: DECISÃO ADMINISTRATIVA                      */}
              {/* ---------------------------------------------------- */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase">
                    Seção D
                  </span>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Decisão Administrativa e Conclusão
                  </h4>
                </div>

                {!isRejecting ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Observação Administrativa (Opcional)
                      </label>
                      <input
                        type="text"
                        value={observacaoAdmin}
                        onChange={(e) => setObservacaoAdmin(e.target.value)}
                        placeholder="Ex: Homologado para bancada do setor comercial / Formatação validada"
                        className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsRejecting(true)}
                        disabled={submitting}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition-colors"
                      >
                        ✕ Rejeitar Solicitação...
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={onClose}
                          disabled={submitting}
                          className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleAprovar}
                          disabled={submitting || (ipEmUso && !confirmarSobrescrita)}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Gravando e Concluindo...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              <span>✓ Aprovar e Concluir Cadastro</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Painel de Rejeição */
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                      <ShieldAlert className="h-4 w-4 text-rose-600" />
                      Rejeitar Solicitação de Cadastro
                    </div>
                    <p className="text-[11px] text-rose-700">
                      Informe a justificativa obrigatória para a rejeição. O equipamento permanecerá com status
                      rejeitado e o motivo ficará registrado no histórico para visualização pelo operador.
                    </p>
                    <div>
                      <label className="block text-[11px] font-bold text-rose-800 mb-1">
                        Motivo da rejeição <span className="text-rose-600">*</span>
                      </label>
                      <textarea
                        value={motivoRejeicao}
                        onChange={(e) => setMotivoRejeicao(e.target.value)}
                        placeholder="Descreva o motivo (ex: patrimônio informado divergente da etiqueta física, faixa incorreta, etc.)..."
                        rows={3}
                        className="w-full rounded-lg border border-rose-300 py-2 px-3 text-xs focus:border-rose-500 focus:outline-none bg-white"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsRejecting(false)}
                        disabled={submitting}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Voltar à Aprovação
                      </button>
                      <button
                        type="button"
                        onClick={handleRejeitar}
                        disabled={submitting || !motivoRejeicao.trim()}
                        className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
                      >
                        {submitting ? 'Rejeitando...' : '✕ Confirmar Rejeição'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
