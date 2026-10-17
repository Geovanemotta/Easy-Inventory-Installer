import React, { useEffect, useState } from 'react';
import { DeviceApprovalContextResponse, DeviceListItem } from '@/types/device';
import { deviceService } from '@/services/deviceService';
import { X, CheckCircle, AlertTriangle, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';

interface DeviceApprovalModalProps {
  device: DeviceListItem;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeviceApprovalModal: React.FC<DeviceApprovalModalProps> = ({
  device,
  onClose,
  onSuccess,
}) => {
  const [context, setContext] = useState<DeviceApprovalContextResponse | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);

  // Campos do Formulário de Decisão
  const [siteId, setSiteId] = useState<number>(device.site_id || 1);
  const [ipDefinitivo, setIpDefinitivo] = useState('');
  const [patrimonio, setPatrimonio] = useState(device.patrimonio || '');
  const [observacaoAdmin, setObservacaoAdmin] = useState('');
  const [confirmarSobrescrita, setConfirmarSobrescrita] = useState(false);

  // Estado de Rejeição
  const [isRejecting, setIsRejecting] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContext = async () => {
      try {
        setLoadingContext(true);
        const data = await deviceService.getApprovalContext(device.id);
        setContext(data);

        // Pré-preenche o IP sugerido se houver
        if (data.network_context.ip_anterior_sugerido) {
          setIpDefinitivo(data.network_context.ip_anterior_sugerido);
        } else if (device.ip && !device.ip.startsWith('192.168.88.')) {
          setIpDefinitivo(device.ip);
        }

        if (data.network_context.resolved_site_id) {
          setSiteId(data.network_context.resolved_site_id);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Falha ao obter contexto de aprovação.');
        }
      } finally {
        setLoadingContext(false);
      }
    };

    fetchContext();
  }, [device.id, device.ip]);

  const handleAprovar = async () => {
    if (!ipDefinitivo.trim()) {
      setError('O endereço IP definitivo é obrigatório.');
      return;
    }
    if (!siteId) {
      setError('Selecione uma filial para o equipamento.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const existingDevId = context?.existing_asset?.linked_device_id as number | undefined;
      const existingNetId = context?.existing_asset?.linked_network_asset_id as number | undefined;

      await deviceService.aprovarCadastro(device.id, {
        site_id: siteId,
        ip_definitivo: ipDefinitivo.trim(),
        vincular_ativo_existente_id: existingDevId || null,
        vincular_network_asset_id: existingNetId || null,
        patrimonio: patrimonio.trim() || null,
        observacao_admin: observacaoAdmin.trim() || null,
        confirmar_sobrescrita_ip: confirmarSobrescrita,
      });

      onSuccess();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Falha ao homologar o cadastro da máquina.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejeitar = async () => {
    if (!motivoRejeicao.trim()) {
      setError('Por favor, informe a justificativa da rejeição.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await deviceService.rejeitarCadastro(device.id, {
        motivo: motivoRejeicao.trim(),
      });
      onSuccess();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Falha ao rejeitar o cadastro.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const ipEmUso = context?.network_context.ips_ocupados.includes(ipDefinitivo.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Homologação e Ajuste Cadastral
            </h3>
            <p className="text-xs text-slate-500">
              Dispositivo: <span className="font-semibold">{device.hostname}</span> &bull; MAC: {device.mac || '---'}
            </p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-700">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loadingContext ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-xs font-medium">Carregando contexto de rede e histórico...</span>
            </div>
          ) : (
            <>
              {/* Seção A: Dados da Máquina Atual */}
              <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-3">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Seção A &bull; Dados Reportados pelo Agente
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Hostname:</span>
                    <strong className="text-slate-800">{context?.device.hostname}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">IP Atual:</span>
                    <strong className="text-slate-800">{context?.device.ip || '---'}</strong>
                    {context?.device.is_rede_formatacao && (
                      <span className="text-[10px] block text-orange-600 font-bold">(Bancada .88)</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block">MAC:</span>
                    <strong className="font-mono text-slate-800">{context?.device.mac || '---'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Sistema Operacional:</span>
                    <strong className="text-slate-800">{context?.device.sistema} {context?.device.versao}</strong>
                  </div>
                </div>

                {context?.device.licenca_windows_solicitada && (
                  <div className="rounded bg-blue-50 border border-blue-200 p-2 text-xs text-blue-800">
                    <strong>Solicitação de Licença Windows:</strong> O operador marcou que esta máquina requer uma nova licença.
                  </div>
                )}
              </div>

              {/* Seção B: Correspondência com Ativo Anterior e Divergências */}
              <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Seção B &bull; Ativo Existente Vinculado</span>
                  {context?.tem_conflito && (
                    <span className="text-red-600 font-bold flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Conflito de Patrimônio Detectado
                    </span>
                  )}
                </div>

                {context?.existing_asset ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-2.5 rounded">
                      <div>
                        <span className="text-slate-400 block">Ativo Anterior:</span>
                        <strong className="text-slate-800">{String(context.existing_asset.hostname || '---')}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Loja Anterior:</span>
                        <strong className="text-slate-800">{String(context.existing_asset.loja || '---')}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">IP Anterior:</span>
                        <strong className="text-slate-800">{String(context.existing_asset.ip || '---')}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Origem:</span>
                        <strong className="text-slate-800 uppercase text-[10px]">{String(context.existing_asset.tipo_origem || 'device')}</strong>
                      </div>
                    </div>

                    {/* Tabela de Divergências */}
                    {context.divergencias.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-slate-700">Divergências Identificadas:</span>
                        <div className="divide-y divide-slate-100 rounded border border-slate-200 text-xs">
                          {context.divergencias.map((div, i) => (
                            <div key={i} className="flex items-center justify-between p-2">
                              <span className="font-medium text-slate-700">{div.campo}:</span>
                              <div className="flex items-center gap-2">
                                <span className="line-through text-slate-400">{div.anterior}</span>
                                <span className="font-semibold text-blue-700">&rarr; {div.atual}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Nenhum ativo anterior encontrado com este patrimônio. Trata-se de um equipamento novo.
                  </p>
                )}
              </div>

              {/* Seção C: Ajuste de Filial, IP e Homologação */}
              <div className="rounded-lg border border-slate-200 p-4 space-y-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Seção C &bull; Atribuição de Filial e IP Definitivo
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Seleção de Filial */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Filial / Loja Definitiva
                    </label>
                    <select
                      value={siteId}
                      onChange={(e) => setSiteId(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      {context?.network_context.sites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.code} - {site.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* IP Definitivo */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      IP Definitivo na Filial
                    </label>
                    <input
                      type="text"
                      value={ipDefinitivo}
                      onChange={(e) => setIpDefinitivo(e.target.value)}
                      placeholder="Ex: 192.168.1.15"
                      className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Alerta de Conflito de IP */}
                {ipEmUso && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      Conflito de IP na Loja: O IP {ipDefinitivo} já está registrado em outro dispositivo.
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={confirmarSobrescrita}
                        onChange={(e) => setConfirmarSobrescrita(e.target.checked)}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span>Confirmar substituição e liberar sobrescrita deste endereço IP</span>
                    </label>
                  </div>
                )}

                {/* Patrimônio e Observação */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Patrimônio Ajustado
                    </label>
                    <input
                      type="text"
                      value={patrimonio}
                      onChange={(e) => setPatrimonio(e.target.value)}
                      placeholder="Ex: pat.35192"
                      className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Observação Administrativa
                    </label>
                    <input
                      type="text"
                      value={observacaoAdmin}
                      onChange={(e) => setObservacaoAdmin(e.target.value)}
                      placeholder="Ex: Máquina homologada no setor de frios"
                      className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Painel Condicional de Rejeição */}
              {isRejecting && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 space-y-2">
                  <div className="text-xs font-bold text-rose-800 flex items-center gap-1">
                    <ShieldAlert className="h-4 w-4" /> Motivo da Rejeição do Cadastro
                  </div>
                  <textarea
                    value={motivoRejeicao}
                    onChange={(e) => setMotivoRejeicao(e.target.value)}
                    placeholder="Descreva o motivo pelo qual a homologação foi negada..."
                    rows={2}
                    className="w-full rounded-lg border border-rose-300 py-2 px-3 text-sm focus:border-rose-500 focus:outline-none"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-between">
          <div>
            {!isRejecting ? (
              <button
                type="button"
                onClick={() => setIsRejecting(true)}
                disabled={loadingContext || submitting}
                className="text-xs font-medium text-rose-600 hover:text-rose-800 transition-colors"
              >
                Rejeitar Solicitação...
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsRejecting(false)}
                className="text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                Voltar à Aprovação
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>

            {isRejecting ? (
              <button
                type="button"
                onClick={handleRejeitar}
                disabled={submitting || !motivoRejeicao.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                <span>Confirmar Rejeição</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAprovar}
                disabled={loadingContext || submitting || (ipEmUso && !confirmarSobrescrita)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                <span>Aprovar e Homologar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
