import React, { useState, useEffect, useMemo } from 'react'
import {
  getDeviceApprovalContext,
  aprovarCadastroDevice,
  rejeitarCadastroDevice,
  type DeviceApprovalContext,
} from '../services/api'
import { isSubnet88 } from '../services/inventoryHelpers'
import '../styles/components/device-review-modal.css'

interface DeviceReviewModalProps {
  deviceId: number
  token: string
  onClose: () => void
  onSuccess: (updated: {
    id: number
    ip: string
    ip_definitivo: string
    firewall_status: string
    patrimonio?: string
    loja?: string
    site_id?: number
  }) => void
  showToast?: (msg: string) => void
}

export const DeviceReviewModal: React.FC<DeviceReviewModalProps> = ({
  deviceId,
  token,
  onClose,
  onSuccess,
  showToast,
}) => {
  const [loading, setLoading] = useState<boolean>(true)
  const [context, setContext] = useState<DeviceApprovalContext | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')

  // Form states (Seção B, C, D)
  const [vincularAtivo, setVincularAtivo] = useState<boolean>(true)
  const [selectedSiteId, setSelectedSiteId] = useState<number | ''>('')
  const [ipDefinitivo, setIpDefinitivo] = useState<string>('')
  const [confirmarSobrescrita, setConfirmarSobrescrita] = useState<boolean>(false)
  const [observacaoAdmin, setObservacaoAdmin] = useState<string>('')
  
  // Rejection state
  const [modoRejeicao, setModoRejeicao] = useState<boolean>(false)
  const [motivoRejeicao, setMotivoRejeicao] = useState<string>('')

  // Execution states
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [concluido, setConcluido] = useState<{
    hostname: string
    ip: string
    mac: string
    patrimonio: string
  } | null>(null)

  const [copiadoCampo, setCopiadoCampo] = useState<string>('')

  // Load context on mount
  useEffect(() => {
    let active = true
    async function loadData() {
      setLoading(true)
      setErrorMsg('')
      try {
        const ctx = await getDeviceApprovalContext(token, deviceId)
        if (!active) return
        setContext(ctx)

        // Initialize store selection
        const initialSite =
          ctx.network_context.resolved_site_id ||
          ctx.device.site_id ||
          (ctx.network_context.sites.length > 0 ? ctx.network_context.sites[0].id : '')
        setSelectedSiteId(initialSite)

        // Initialize suggested IP
        const suggestedIp =
          ctx.network_context.ip_anterior_sugerido ||
          ctx.device.ip_definitivo ||
          (!isSubnet88(ctx.device.ip) ? ctx.device.ip : '')
        setIpDefinitivo(suggestedIp)
      } catch (err: unknown) {
        if (!active) return
        setErrorMsg(err instanceof Error ? err.message : 'Falha ao carregar dados do equipamento.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadData()
    return () => {
      active = false
    }
  }, [deviceId, token])

  // Recalculate occupied IPs for selected site
  const siteFaixas = useMemo(() => {
    if (!context || !selectedSiteId) return []
    return context.network_context.faixas
  }, [context, selectedSiteId])

  const ipEmUso = useMemo(() => {
    if (!context || !ipDefinitivo.trim()) return false
    const clean = ipDefinitivo.trim()
    return context.network_context.ips_ocupados.includes(clean)
  }, [context, ipDefinitivo])

  // Handle Copy
  const handleCopy = async (campo: string, valor: string) => {
    if (!valor) return
    try {
      await navigator.clipboard.writeText(valor)
      setCopiadoCampo(campo)
      showToast?.(`${campo} copiado para a área de transferência!`)
      setTimeout(() => setCopiadoCampo(''), 2500)
    } catch {
      // Fallback
    }
  }

  // Handle Approval
  const handleAprovar = async () => {
    if (!selectedSiteId) {
      alert('Por favor, confirme ou selecione a Filial / Loja de destino.')
      return
    }
    if (!ipDefinitivo.trim()) {
      alert('Por favor, informe o IP definitivo que será utilizado pela máquina.')
      return
    }
    if (ipEmUso && !confirmarSobrescrita) {
      alert('O IP selecionado já está em uso na loja. Marque a confirmação para sobrescrever ou escolha outro IP.')
      return
    }

    setSubmitting(true)
    try {
      const linkedDevId =
        vincularAtivo && context?.existing_asset
          ? context.existing_asset.linked_device_id ??
            (context.existing_asset.tipo_origem === 'device' ? context.existing_asset.id : null)
          : null

      const linkedNetId =
        vincularAtivo && context?.existing_asset
          ? context.existing_asset.linked_network_asset_id ??
            (context.existing_asset.tipo_origem === 'network_asset' ? context.existing_asset.id : null)
          : null

      const res = await aprovarCadastroDevice(token, deviceId, {
        site_id: Number(selectedSiteId),
        ip_definitivo: ipDefinitivo.trim(),
        vincular_ativo_existente_id: linkedDevId,
        vincular_network_asset_id: linkedNetId,
        patrimonio: context?.device.patrimonio || null,
        observacao_admin: observacaoAdmin.trim() || null,
        confirmar_sobrescrita_ip: confirmarSobrescrita,
      })

      showToast?.(res.message || 'Cadastro homologado e concluído com sucesso!')

      // Atualiza o estado da tabela pai
      onSuccess({
        id: res.device_id,
        ip: res.ip,
        ip_definitivo: res.ip_definitivo,
        firewall_status: res.firewall_status,
        patrimonio: res.patrimonio,
        loja: res.site_name,
        site_id: res.site_id,
      })

      // Exibe tela de sucesso com botões de cópia rápida
      setConcluido({
        hostname: res.hostname,
        ip: res.ip_definitivo,
        mac: res.mac,
        patrimonio: res.patrimonio || '',
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      alert(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Rejection
  const handleRejeitar = async () => {
    if (!motivoRejeicao.trim()) {
      alert('Por favor, informe obrigatoriamente o motivo da rejeição administrativa.')
      return
    }

    setSubmitting(true)
    try {
      const res = await rejeitarCadastroDevice(token, deviceId, motivoRejeicao.trim())
      showToast?.(res.message || 'Solicitação rejeitada com sucesso.')
      onSuccess({
        id: deviceId,
        ip: context?.device.ip || '',
        ip_definitivo: context?.device.ip_definitivo || '',
        firewall_status: 'rejeitado',
      })
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      alert(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="review-modal-backdrop" onClick={onClose}>
      <div className="review-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="review-modal-header">
          <div className="review-modal-title-box">
            <div className="review-modal-icon">📋</div>
            <div>
              <h2 className="review-modal-title">Revisar e concluir cadastro do equipamento</h2>
              <div className="review-modal-subtitle">
                Giassi Enterprise &bull; Homologação de Ativo Físico e Atribuição de IP
              </div>
            </div>
          </div>
          <button type="button" className="review-modal-close" onClick={onClose} title="Fechar modal">
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="review-modal-body">
          {loading ? (
            <div className="review-loading-box">
              <div className="review-spinner" />
              <span>Carregando dados completos de aprovação do ativo...</span>
            </div>
          ) : errorMsg ? (
            <div className="review-error-box">
              <p>⚠️ {errorMsg}</p>
              <button type="button" className="btn-save-pat" onClick={onClose}>
                Voltar
              </button>
            </div>
          ) : concluido ? (
            /* Tela de Conclusão e Cópia Rápida */
            <div className="review-success-screen">
              <div className="success-icon-badge">✅</div>
              <h3 className="success-title">Cadastro Homologado com Sucesso!</h3>
              <p className="success-desc">
                O equipamento <b>{concluido.hostname}</b> foi aprovado e seu IP definitivo foi registrado no
                inventário. Você pode copiar os dados abaixo para uso na rotina operacional:
              </p>

              <div className="copy-cards-grid">
                {/* IP Definitivo em Destaque */}
                <div className="copy-card featured">
                  <div className="copy-card-header">
                    <span className="copy-card-label">🌐 IP Definitivo na Loja</span>
                    <button
                      type="button"
                      className={`btn-quick-copy ${copiadoCampo === 'IP' ? 'copied' : ''}`}
                      onClick={() => handleCopy('IP', concluido.ip)}
                    >
                      {copiadoCampo === 'IP' ? '✓ Copiado!' : 'Copiar IP'}
                    </button>
                  </div>
                  <div className="copy-card-value ip-val">{concluido.ip}</div>
                </div>

                {/* Hostname */}
                <div className="copy-card">
                  <div className="copy-card-header">
                    <span className="copy-card-label">💻 Hostname</span>
                    <button
                      type="button"
                      className={`btn-quick-copy ${copiadoCampo === 'Hostname' ? 'copied' : ''}`}
                      onClick={() => handleCopy('Hostname', concluido.hostname)}
                    >
                      {copiadoCampo === 'Hostname' ? '✓ Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <div className="copy-card-value">{concluido.hostname}</div>
                </div>

                {/* MAC Address */}
                <div className="copy-card">
                  <div className="copy-card-header">
                    <span className="copy-card-label">🔌 Endereço MAC</span>
                    <button
                      type="button"
                      className={`btn-quick-copy ${copiadoCampo === 'MAC' ? 'copied' : ''}`}
                      onClick={() => handleCopy('MAC', concluido.mac)}
                    >
                      {copiadoCampo === 'MAC' ? '✓ Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <div className="copy-card-value font-mono">{concluido.mac || '(sem MAC)'}</div>
                </div>

                {/* Patrimônio */}
                <div className="copy-card">
                  <div className="copy-card-header">
                    <span className="copy-card-label">🏷️ Número de Patrimônio</span>
                    <button
                      type="button"
                      className={`btn-quick-copy ${copiadoCampo === 'Patrimônio' ? 'copied' : ''}`}
                      onClick={() => handleCopy('Patrimônio', concluido.patrimonio)}
                    >
                      {copiadoCampo === 'Patrimônio' ? '✓ Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <div className="copy-card-value">{concluido.patrimonio || '(sem patrimônio)'}</div>
                </div>
              </div>

              <div className="success-footer-actions">
                <button type="button" className="btn-concluir-modal" onClick={onClose}>
                  Concluir e Retornar ao Inventário
                </button>
              </div>
            </div>
          ) : context ? (
            /* Fluxo das 4 Seções A, B, C, D */
            <div className="review-sections-container">
              {/* SEÇÃO A — DADOS RECEBIDOS DA MÁQUINA */}
              <div className="review-section-card">
                <div className="review-section-header">
                  <span className="section-step-badge">Seção A</span>
                  <h3 className="section-step-title">Dados Recebidos do Equipamento (Bancada)</h3>
                  {context.device.is_rede_formatacao && (
                    <span className="badge-bench">🛠️ Bancada de Formatação (192.168.88.x)</span>
                  )}
                </div>

                <div className="review-grid-3">
                  <div className="review-field">
                    <span className="review-field-lbl">Patrimônio Informado</span>
                    <span className="review-field-val pat-highlight">
                      {context.device.patrimonio || 'Não informado'}
                    </span>
                  </div>

                  <div className="review-field">
                    <span className="review-field-lbl">Hostname Atual</span>
                    <span className="review-field-val font-semibold">{context.device.hostname}</span>
                  </div>

                  <div className="review-field">
                    <span className="review-field-lbl">IP Atual Reportado</span>
                    <span className="review-field-val font-mono">
                      {context.device.ip}
                      {context.device.is_rede_formatacao && (
                        <small className="ip-bench-tag">(IP Provisório)</small>
                      )}
                    </span>
                  </div>

                  <div className="review-field">
                    <span className="review-field-lbl">Endereço MAC</span>
                    <span className="review-field-val font-mono">{context.device.mac || '—'}</span>
                  </div>

                  <div className="review-field">
                    <span className="review-field-lbl">Sistema Operacional</span>
                    <span className="review-field-val">
                      {context.device.sistema} {context.device.versao}
                    </span>
                  </div>

                  <div className="review-field">
                    <span className="review-field-lbl">Filial / Loja Sugerida</span>
                    <span className="review-field-val">{context.device.loja || 'Não identificada'}</span>
                  </div>

                  <div className="review-field">
                    <span className="review-field-lbl">Operador Solicitante</span>
                    <span className="review-field-val">
                      {context.device.firewall_solicitado_por || 'Sistema'}
                    </span>
                  </div>

                  <div className="review-field">
                    <span className="review-field-lbl">Data da Solicitação</span>
                    <span className="review-field-val">
                      {context.device.firewall_solicitado_em
                        ? new Date(context.device.firewall_solicitado_em).toLocaleString('pt-BR')
                        : '—'}
                    </span>
                  </div>

                  <div className="review-field">
                    <span className="review-field-lbl">Necessidade de Licença Windows</span>
                    <span className="review-field-val">
                      {context.device.licenca_windows_solicitada ? (
                        <span className="badge-win-license">⭐ Nova Licença Solicitada</span>
                      ) : (
                        <span className="badge-regular">Não solicitada</span>
                      )}
                    </span>
                  </div>
                </div>

                {context.device.motivo_alteracao && (
                  <div className="review-alert-box info" style={{ marginTop: '12px' }}>
                    <b>Motivo declarado pelo operador:</b> {context.device.motivo_alteracao}
                  </div>
                )}
              </div>

              {/* SEÇÃO B — CORRESPONDÊNCIA COM ATIVO EXISTENTE */}
              <div className="review-section-card">
                <div className="review-section-header">
                  <span className="section-step-badge">Seção B</span>
                  <h3 className="section-step-title">Correspondência com Ativo Existente no Inventário</h3>
                </div>

                {context.tem_conflito && (
                  <div className="review-alert-box conflict" style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>⚠️</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#b45309', marginBottom: '4px' }}>
                          Inconsistência Cadastral: Múltiplos Ativos com o Mesmo Patrimônio
                        </div>
                        <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#92400e', lineHeight: 1.4 }}>
                          O patrimônio <b>{context.device.patrimonio}</b> foi localizado em mais de um registro no sistema.
                          O sistema não selecionou nenhum registro arbitrariamente. Analise as ocorrências abaixo:
                        </p>
                        <div className="conflict-list">
                          {context.conflitos?.map((c) => (
                            <div key={`${c.tipo_registro}-${c.id}`} className="conflict-item">
                              <span className="badge-conflict-type">{c.tipo_registro}</span>
                              <span className="conflict-host">{c.hostname}</span>
                              <span className="conflict-ip font-mono">{c.ip || 'Sem IP'}</span>
                              <span className="conflict-loja">{c.loja || 'Sem Loja'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {context.existing_asset ? (
                  <div>
                    <div className="review-alert-box warning">
                      ⚠️ <b>Patrimônio já cadastrado no inventário!</b> O número{' '}
                      <b>{context.device.patrimonio}</b> pertence ao{' '}
                      <b>
                        {context.existing_asset.tipo_origem === 'network_asset'
                          ? 'ativo de rede importado'
                          : 'equipamento'}
                      </b>{' '}
                      <b>{context.existing_asset.hostname}</b> da filial{' '}
                      <b>{context.existing_asset.loja || 'Não definida'}</b>
                      {context.existing_asset.tipo_origem === 'network_asset' && (
                        <span className="badge-origin-net" style={{ marginLeft: '8px' }}>
                          📦 Ativo Importado ({context.existing_asset.origem || 'Planilha'})
                        </span>
                      )}
                      .
                    </div>

                    {!context.network_context.ip_confiavel && (
                      <div className="review-alert-box info" style={{ marginTop: '8px' }}>
                        ℹ️ <b>Ativo sem IP anterior de rede:</b> O equipamento foi identificado pelo patrimônio, mas
                        não possui um IP de rede fixo registrado no banco. O IP definitivo deve ser definido na Seção C.
                      </div>
                    )}

                    {context.so_divergente && (
                      <div className="review-alert-box danger" style={{ marginTop: '8px' }}>
                        ⚡ <b>Mudança de Sistema Operacional Detectada:</b> O ativo anterior estava
                        registrado com <b>{context.existing_asset.sistema}</b> e a máquina atual
                        reporta <b>{context.device.sistema}</b>.
                      </div>
                    )}

                    {/* Tabela Comparativa Lado a Lado (com wrapper para rolagem responsiva) */}
                    <div className="compare-table-wrapper" style={{ marginTop: '14px' }}>
                      <table className="compare-table">
                        <thead>
                          <tr>
                            <th>Atributo</th>
                            <th>
                              Cadastro Existente{' '}
                              {context.existing_asset.tipo_origem === 'network_asset'
                                ? '(Ativo Importado)'
                                : '(Anterior)'}
                            </th>
                            <th>Nova Solicitação (Bancada)</th>
                            <th>Situação</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><b>Patrimônio</b></td>
                            <td>{context.existing_asset.patrimonio}</td>
                            <td>{context.device.patrimonio}</td>
                            <td><span className="badge-match">Identificador Físico</span></td>
                          </tr>
                          <tr>
                            <td><b>Hostname</b></td>
                            <td>{context.existing_asset.hostname}</td>
                            <td>{context.device.hostname}</td>
                            <td>
                              {context.existing_asset.hostname.toLowerCase() ===
                              context.device.hostname.toLowerCase() ? (
                                <span className="badge-match">Igual</span>
                              ) : (
                                <span className="badge-diff">Alterado</span>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td><b>Endereço MAC</b></td>
                            <td className="font-mono">{context.existing_asset.mac || '—'}</td>
                            <td className="font-mono">{context.device.mac || '—'}</td>
                            <td>
                              {context.existing_asset.mac?.toLowerCase() ===
                              context.device.mac?.toLowerCase() ? (
                                <span className="badge-match">Igual</span>
                              ) : (
                                <span className="badge-diff">Novo MAC (Troca)</span>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td><b>Sistema Operacional</b></td>
                            <td>{context.existing_asset.sistema || '—'} {context.existing_asset.versao || ''}</td>
                            <td>{context.device.sistema} {context.device.versao}</td>
                            <td>
                              {context.so_divergente ? (
                                <span className="badge-danger-diff">SO Modificado</span>
                              ) : (
                                <span className="badge-match">Compatível</span>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td><b>IP Cadastrado</b></td>
                            <td className="font-mono">{context.existing_asset.ip || '(não registrado)'}</td>
                            <td className="font-mono">{context.device.ip}</td>
                            <td>
                              {context.existing_asset.ip ? (
                                <span className="badge-match">IP Recuperado</span>
                              ) : (
                                <span className="badge-diff">Sem IP Prévio</span>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td><b>Filial / Loja</b></td>
                            <td>{context.existing_asset.loja || '—'}</td>
                            <td>{context.device.loja || '—'}</td>
                            <td>
                              {context.existing_asset.site_id === context.device.site_id ? (
                                <span className="badge-match">Mesma Loja</span>
                              ) : (
                                <span className="badge-diff">Transferência de Filial</span>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="link-option-box" style={{ marginTop: '12px' }}>
                      <label className="checkbox-container">
                        <input
                          type="checkbox"
                          checked={vincularAtivo}
                          onChange={(e) => setVincularAtivo(e.target.checked)}
                        />
                        <span>
                          <b>
                            Vincular esta solicitação ao ativo existente (
                            {context.existing_asset.tipo_origem === 'network_asset'
                              ? 'ativo importado de rede'
                              : 'estação cadastrada'}
                            )
                          </b>{' '}
                          &mdash; preserva a identidade física do ativo, atualiza o IP e MAC no inventário e
                          evita cadastros duplicados no sistema.
                        </span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="review-empty-match">
                    <span className="match-ok-icon">✨</span>
                    <div>
                      <b>Equipamento Novo:</b> Nenhum outro ativo cadastrado utiliza o patrimônio{' '}
                      <b>{context.device.patrimonio || '(não informado)'}</b>.
                      <p style={{ margin: '4px 0 0', color: 'var(--text-secondary, #64748b)' }}>
                        O fluxo prosseguirá como cadastro inicial de novo ativo físico.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* SEÇÃO C — SELEÇÃO DO IP DEFINITIVO */}
              <div className="review-section-card">
                <div className="review-section-header">
                  <span className="section-step-badge">Seção C</span>
                  <h3 className="section-step-title">Seleção do Endereço IP Definitivo na Loja</h3>
                </div>

                <p className="section-step-desc">
                  O IP atual ({context.device.ip}) pertence à bancada de formatação. Defina o endereço IP
                  fixo que a máquina utilizará ao retornar para sua loja de destino:
                </p>

                <div className="review-grid-2">
                  {/* Seletor de Loja */}
                  <div className="form-group-review">
                    <label className="form-lbl">Filial / Loja de Destino *</label>
                    <select
                      className="form-select-review"
                      value={selectedSiteId}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : ''
                        setSelectedSiteId(val)
                      }}
                    >
                      <option value="">-- Selecione a Loja / Filial --</option>
                      {context.network_context.sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code ? `[${s.code}] ` : ''}
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Input de IP Definitivo */}
                  <div className="form-group-review">
                    <label className="form-lbl">Endereço IP Definitivo *</label>
                    <div className="ip-input-wrap">
                      <input
                        type="text"
                        className={`form-input-review font-mono ${ipEmUso ? 'ip-conflict' : ''}`}
                        placeholder="Ex: 192.168.11.50"
                        value={ipDefinitivo}
                        onChange={(e) => setIpDefinitivo(e.target.value)}
                      />
                      {context.network_context.ip_anterior_sugerido && (
                        <button
                          type="button"
                          className="btn-suggest-ip"
                          onClick={() => setIpDefinitivo(context.network_context.ip_anterior_sugerido)}
                          title="Usar IP anterior da máquina"
                        >
                          Sugerir anterior: {context.network_context.ip_anterior_sugerido}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Alerta de Conflito de IP */}
                {ipEmUso && (
                  <div className="review-alert-box danger" style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span>⚠️</span>
                      <div>
                        <b>Conflito de IP detectado:</b> O endereço IP <code>{ipDefinitivo}</code> já
                        está registrado em outro equipamento da filial.
                        <div style={{ marginTop: '8px' }}>
                          <label className="checkbox-container">
                            <input
                              type="checkbox"
                              checked={confirmarSobrescrita}
                              onChange={(e) => setConfirmarSobrescrita(e.target.checked)}
                            />
                            <span>
                              Confirmar substituição e reatribuir este IP para este equipamento.
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Faixas Cadastradas da Loja */}
                {siteFaixas.length > 0 ? (
                  <div className="store-ranges-info">
                    <span className="store-ranges-title">Faixas de Rede da Filial:</span>
                    <div className="ranges-chips">
                      {siteFaixas.map((f) => (
                        <span key={f.id} className="range-chip" title={`Gateway: ${f.gateway || 'N/A'}`}>
                          <b>{f.nome}:</b> {f.ip_inicio} até {f.ip_fim}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="store-ranges-none">
                    ℹ️ Nenhuma faixa de rede configurada para esta filial. O IP pode ser digitado manualmente.
                  </div>
                )}
              </div>

              {/* SEÇÃO D — DECISÃO ADMINISTRATIVA */}
              <div className="review-section-card">
                <div className="review-section-header">
                  <span className="section-step-badge">Seção D</span>
                  <h3 className="section-step-title">Decisão Administrativa e Conclusão</h3>
                </div>

                {!modoRejeicao ? (
                  <div>
                    <div className="form-group-review">
                      <label className="form-lbl">Observação Administrativa (Opcional)</label>
                      <input
                        type="text"
                        className="form-input-review"
                        placeholder="Ex: Homologado para bancada do setor comercial / Formatação validada"
                        value={observacaoAdmin}
                        onChange={(e) => setObservacaoAdmin(e.target.value)}
                      />
                    </div>

                    <div className="review-actions-bar">
                      <button
                        type="button"
                        className="btn-review-reject"
                        onClick={() => setModoRejeicao(true)}
                        disabled={submitting}
                      >
                        ✕ Rejeitar Solicitação
                      </button>

                      <button
                        type="button"
                        className="btn-review-approve"
                        onClick={handleAprovar}
                        disabled={submitting || (ipEmUso && !confirmarSobrescrita)}
                      >
                        {submitting ? 'Gravando e Concluindo...' : '✓ Aprovar e Concluir Cadastro'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="reject-box-panel">
                    <div className="reject-box-header">
                      <div className="reject-box-icon">🛑</div>
                      <div>
                        <h4 className="reject-box-title">Rejeitar Solicitação de Cadastro</h4>
                        <p className="reject-box-desc">
                          Informe a justificativa obrigatória para a rejeição. O equipamento permanecerá com status
                          rejeitado e o motivo ficará registrado no histórico para visualização pelo operador.
                        </p>
                      </div>
                    </div>

                    <div className="reject-form-group">
                      <label className="reject-label">
                        Motivo da rejeição <span className="reject-required">*</span>
                      </label>
                      <textarea
                        className="reject-textarea"
                        placeholder="Descreva o motivo da rejeição (ex: patrimônio informado divergente da etiqueta física, faixa incorreta, etc.)..."
                        value={motivoRejeicao}
                        onChange={(e) => setMotivoRejeicao(e.target.value)}
                        rows={4}
                      />
                      {!motivoRejeicao.trim() && (
                        <span className="reject-validation-msg">
                          O preenchimento do motivo é obrigatório para confirmar a rejeição.
                        </span>
                      )}
                    </div>

                    <div className="review-actions-bar" style={{ marginTop: '16px' }}>
                      <button
                        type="button"
                        className="btn-review-cancel"
                        onClick={() => setModoRejeicao(false)}
                        disabled={submitting}
                      >
                        Voltar
                      </button>
                      <button
                        type="button"
                        className="btn-review-reject-confirm"
                        onClick={handleRejeitar}
                        disabled={submitting || !motivoRejeicao.trim()}
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
  )
}
