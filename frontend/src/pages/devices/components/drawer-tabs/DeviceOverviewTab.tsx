import React from 'react';
import {
  Network,
  Cpu,
  Monitor,
  Shield,
  Tag,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { DeviceDetailResponse, DeviceListItem } from '@/types/device';

interface DeviceOverviewTabProps {
  device: DeviceDetailResponse;
  isAdmin: boolean;
  onOpenPatrimonio: (device: DeviceListItem) => void;
  onOpenApproval: (device: DeviceListItem) => void;
  openSections: Record<string, boolean>;
  toggleSection: (key: string) => void;
  copyToClipboard: (text: string, key: string, label?: string, e?: React.MouseEvent) => void;
  copiedKey: string | null;
  onOpenLicenseModal?: (slot: 'windows' | 'office') => void;
  onUnbindLicense?: (slot: 'windows' | 'office') => void;
  unbindingSlot?: 'windows' | 'office' | null;
}

export const DeviceOverviewTab: React.FC<DeviceOverviewTabProps> = ({
  device,
  isAdmin,
  onOpenPatrimonio,
  onOpenApproval,
  openSections,
  toggleSection,
  copyToClipboard,
  copiedKey,
  onOpenLicenseModal,
  onUnbindLicense,
  unbindingSlot,
}) => {
  return (
    <div className="space-y-4">
      {/* Bloco 1: Rede & Conectividade (Acordeão) */}
      <div className="rounded-xl border border-[#1E2636] bg-[#121721] overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('rede')}
          className="w-full flex items-center justify-between p-4 bg-[#181F2E]/70 hover:bg-[#181F2E] transition-colors text-left cursor-pointer"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-orange-400/90 flex items-center gap-2">
            <Network className="h-4 w-4 text-orange-400" />
            Rede &amp; Acesso Remoto
          </span>
          {openSections.rede ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>
        {openSections.rede && (
          <div className="p-4 border-t border-[#1E2636] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-medium">IP Principal:</span>
              <div className="group font-mono font-semibold text-slate-100 mt-1 flex items-center gap-1.5">
                <span className={device.is_rede_formatacao ? 'text-amber-400 font-bold' : ''}>
                  {device.ip || '---'}
                </span>
                {device.ip && (
                  <button
                    onClick={() => copyToClipboard(device.ip!, 'ip')}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white transition-opacity cursor-pointer shrink-0"
                    title="Copiar IP Principal"
                  >
                    {copiedKey === 'ip' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
                {device.is_rede_formatacao && (
                  <span className="rounded bg-orange-500/15 border border-orange-500/30 px-1 py-0.2 text-[10px] font-bold text-orange-400">
                    .88
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-medium">Endereço MAC:</span>
              <div className="group font-mono font-semibold text-slate-100 mt-1 flex items-center gap-1.5">
                <span>{device.mac || '---'}</span>
                {device.mac && (
                  <button
                    onClick={() => copyToClipboard(device.mac!, 'mac')}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white transition-opacity cursor-pointer shrink-0"
                    title="Copiar MAC"
                  >
                    {copiedKey === 'mac' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* IPs Extras / Secundários Tratados - Grid de 5 por linha */}
            {device.ips_extras && device.ips_extras.length > 0 && (
              <div className="col-span-full rounded-lg bg-[#0B0E14] border border-[#1E2636] p-3">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400/90 flex items-center gap-1.5">
                    <Network className="h-3.5 w-3.5 text-orange-400" />
                    IPs Secundários / Adicionais ({device.ips_extras.length})
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {device.ips_extras.map((extraIp, idx) => (
                    <div
                      key={idx}
                      className="group flex items-center justify-between gap-1 rounded-lg bg-[#181F2E] px-2 py-1.5 text-[11px] font-mono tracking-tight font-medium text-slate-200 border border-[#263044] hover:border-orange-500/40 transition-colors whitespace-nowrap"
                    >
                      <span>{extraIp}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(extraIp, `extra_ip_${idx}`)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white transition-opacity cursor-pointer shrink-0"
                        title="Copiar IP adicional"
                      >
                        {copiedKey === `extra_ip_${idx}` ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="text-slate-400 font-medium">RustDesk ID:</span>
              <div className="group font-mono font-semibold text-slate-100 mt-1 flex items-center gap-1.5">
                <span>{device.rustdesk_id || 'Não informado'}</span>
                {device.rustdesk_id && (
                  <button
                    onClick={() => copyToClipboard(device.rustdesk_id!, 'rustdesk')}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white transition-opacity cursor-pointer shrink-0"
                    title="Copiar RustDesk ID"
                  >
                    {copiedKey === 'rustdesk' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-medium">Domínio / Usuário:</span>
              <div className="font-semibold text-slate-100 mt-1">
                {[device.dominio, device.usuario].filter(Boolean).join(' \\ ') || '---'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bloco 2: Hardware & Arquitetura (Acordeão) */}
      <div className="rounded-xl border border-[#1E2636] bg-[#121721] overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('hardware')}
          className="w-full flex items-center justify-between p-4 bg-[#181F2E]/70 hover:bg-[#181F2E] transition-colors text-left cursor-pointer"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-orange-400/90 flex items-center gap-2">
            <Cpu className="h-4 w-4 text-orange-400" />
            Hardware &amp; Arquitetura
          </span>
          {openSections.hardware ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>
        {openSections.hardware && (
          <div className="p-4 border-t border-[#1E2636] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-medium">Processador:</span>
              <div className="font-semibold text-slate-100 mt-1">
                {device.processador_formatado || device.processador || 'Não informado'}
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-medium">Memória RAM:</span>
              <div className="font-semibold text-slate-100 mt-1 flex items-center gap-2">
                <span>{device.ram_total_formatada || device.ram_total || 'Não informado'}</span>
                {device.ram_tipo && (
                  <span className="rounded bg-[#181F2E] px-1.5 py-0.5 text-[10px] font-bold text-slate-300 border border-[#263044] font-mono">
                    {device.ram_tipo}
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-medium">Placa-Mãe / Modelo:</span>
              <div className="font-semibold text-slate-100 mt-1">
                {device.modelo_formatado || [device.fabricante_limpo, device.modelo_limpo].filter(Boolean).join(' ') || 'Não informado'}
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-medium">Número de Série (Chassi):</span>
              <div className="group font-mono font-semibold text-slate-100 mt-1 flex items-center gap-1.5">
                <span>{device.serial_limpo || device.serial || '---'}</span>
                {(device.serial_limpo || device.serial) && (
                  <button
                    onClick={() => copyToClipboard(device.serial_limpo || device.serial!, 'serial')}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white transition-opacity cursor-pointer shrink-0"
                    title="Copiar Serial"
                  >
                    {copiedKey === 'serial' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {device.fabricante_limpo && (
              <div>
                <span className="text-slate-400 font-medium">Fabricante:</span>
                <div className="font-semibold text-slate-100 mt-1">
                  {device.fabricante_limpo}
                </div>
              </div>
            )}

            {device.modelo_limpo && (
              <div>
                <span className="text-slate-400 font-medium">Modelo Específico:</span>
                <div className="font-semibold text-slate-100 mt-1">
                  {device.modelo_limpo}
                </div>
              </div>
            )}

            {/* Slot Windows */}
            <div className="sm:col-span-2 p-3.5 rounded-xl bg-[#181F2E] border border-[#263044] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Serial Windows (OEM/BIOS)</span>
                {isAdmin && (
                  <div className="flex items-center gap-1.5">
                    {device.serial_windows && onUnbindLicense && (
                      <button
                        type="button"
                        onClick={() => onUnbindLicense('windows')}
                        disabled={unbindingSlot === 'windows'}
                        className="px-2 py-0.5 rounded text-[11px] font-semibold text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Desvincular chave"
                      >
                        {unbindingSlot === 'windows' ? 'Removendo...' : '✕ Remover'}
                      </button>
                    )}
                    {onOpenLicenseModal && (
                      <button
                        type="button"
                        onClick={() => onOpenLicenseModal('windows')}
                        className="px-2.5 py-0.5 rounded text-[11px] font-semibold text-orange-400 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 transition-colors cursor-pointer"
                      >
                        {device.serial_windows ? 'Alterar' : '+ Atribuir'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="group flex items-center justify-between p-2.5 rounded-lg bg-[#0B0E14] border border-[#1E2636]">
                {isAdmin ? (
                  device.serial_windows ? (
                    <span className="font-mono text-xs font-bold text-slate-100 tracking-wider select-all">
                      {device.serial_windows}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 italic">
                      — Nenhum serial de Windows vinculado —
                    </span>
                  )
                ) : (
                  device.serial_windows ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      Licenciado / Possui chave
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#181F2E] text-slate-400 border border-[#263044]">
                      Sem chave
                    </span>
                  )
                )}

                {device.serial_windows && isAdmin && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(device.serial_windows!, 'win_key')}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white transition-opacity p-1 rounded cursor-pointer"
                    title="Copiar serial Windows"
                  >
                    {copiedKey === 'win_key' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Slot Office */}
            <div className="sm:col-span-2 p-3.5 rounded-xl bg-[#181F2E] border border-[#263044] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Serial Office</span>
                {isAdmin && (
                  <div className="flex items-center gap-1.5">
                    {device.serial_office && onUnbindLicense && (
                      <button
                        type="button"
                        onClick={() => onUnbindLicense('office')}
                        disabled={unbindingSlot === 'office'}
                        className="px-2 py-0.5 rounded text-[11px] font-semibold text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Desvincular chave"
                      >
                        {unbindingSlot === 'office' ? 'Removendo...' : '✕ Remover'}
                      </button>
                    )}
                    {onOpenLicenseModal && (
                      <button
                        type="button"
                        onClick={() => onOpenLicenseModal('office')}
                        className="px-2.5 py-0.5 rounded text-[11px] font-semibold text-orange-400 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 transition-colors cursor-pointer"
                      >
                        {device.serial_office ? 'Alterar' : '+ Atribuir'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="group flex items-center justify-between p-2.5 rounded-lg bg-[#0B0E14] border border-[#1E2636]">
                {isAdmin ? (
                  device.serial_office ? (
                    <span className="font-mono text-xs font-bold text-slate-100 tracking-wider select-all">
                      {device.serial_office}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 italic">
                      — Nenhum serial de Office vinculado —
                    </span>
                  )
                ) : (
                  device.serial_office ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      Licenciado / Possui chave
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#181F2E] text-slate-400 border border-[#263044]">
                      Sem chave
                    </span>
                  )
                )}

                {device.serial_office && isAdmin && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(device.serial_office!, 'off_key')}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white transition-opacity p-1 rounded cursor-pointer"
                    title="Copiar serial Office"
                  >
                    {copiedKey === 'off_key' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bloco 3: Sistema Operacional (Acordeão) */}
      <div className="rounded-xl border border-[#1E2636] bg-[#121721] overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('sistema')}
          className="w-full flex items-center justify-between p-4 bg-[#181F2E]/70 hover:bg-[#181F2E] transition-colors text-left cursor-pointer"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-orange-400/90 flex items-center gap-2">
            <Monitor className="h-4 w-4 text-orange-400" />
            Sistema Operacional &amp; Sincronização
          </span>
          {openSections.sistema ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>
        {openSections.sistema && (
          <div className="p-4 border-t border-[#1E2636] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-medium">Sistema:</span>
              <div className="font-semibold text-slate-100 mt-1">
                {device.so_formatado || device.sistema || 'Não informado'}
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-medium">Versão / Release / Build:</span>
              <div className="font-semibold text-slate-100 mt-1 flex items-center gap-2">
                <span>{device.versao || device.build || 'Não informado'}</span>
                {(device.windows_release_formatado || device.windows_release) && (
                  <span className="rounded bg-[#181F2E] px-1.5 py-0.5 text-[10px] font-bold text-sky-300 border border-[#263044]">
                    Windows {device.windows_release_formatado || device.windows_release}
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-medium">Status Operacional:</span>
              <div className="mt-1">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                    device.status === 'OK'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : device.status === 'UPGRADE_REQUIRED'
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : 'bg-[#181F2E] text-slate-400 border-[#263044]'
                  }`}
                >
                  {device.status === 'OK'
                    ? 'Atualizada'
                    : device.status === 'UPGRADE_REQUIRED'
                    ? 'Atualização Necessária'
                    : 'Não Identificada'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-medium">Última Sincronização:</span>
              <div className="font-semibold text-slate-100 mt-1 flex items-center gap-1.5 font-mono">
                <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0 font-sans" />
                <span>{device.data_coleta_formatada || (device.data_coleta ? String(device.data_coleta) : 'Sem data')}</span>
                {device.tempo_relativo_coleta && (
                  <span className="text-[11px] text-slate-400 font-normal font-sans">
                    ({device.tempo_relativo_coleta})
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bloco 4: Patrimônio & Homologação Firewall (Acordeão) */}
      <div className="rounded-xl border border-[#1E2636] bg-[#121721] overflow-hidden shadow-xs">
        <div className="flex items-center justify-between p-4 bg-[#181F2E]/70 hover:bg-[#181F2E] transition-colors">
          <button
            type="button"
            onClick={() => toggleSection('patrimonio')}
            className="flex-1 flex items-center justify-between text-left cursor-pointer"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-orange-400/90 flex items-center gap-2">
              <Shield className="h-4 w-4 text-orange-400" />
              Patrimônio &amp; Homologação de Firewall
            </span>
            {openSections.patrimonio ? (
              <ChevronUp className="h-4 w-4 text-slate-400 mr-2" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400 mr-2" />
            )}
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => onOpenPatrimonio(device)}
              className="flex items-center gap-1 rounded-lg border border-[#263044] bg-[#181F2E] px-2.5 py-1 text-xs font-semibold text-orange-400 hover:bg-[#263044] transition-colors cursor-pointer"
            >
              <Tag className="h-3 w-3" /> Ajustar
            </button>
          )}
        </div>
        {openSections.patrimonio && (
          <div className="p-4 border-t border-[#1E2636] text-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 font-medium">Número de Patrimônio:</span>
                <div className="group font-mono font-bold text-orange-400 text-sm mt-1 flex items-center gap-1.5">
                  <span>{device.patrimonio || 'Não patrimoniado'}</span>
                  {device.patrimonio && (
                    <button
                      onClick={() => copyToClipboard(device.patrimonio!, 'pat')}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white transition-opacity cursor-pointer shrink-0"
                      title="Copiar Patrimônio"
                    >
                      {copiedKey === 'pat' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Status Firewall:</span>
                <div className="mt-1">
                  {device.firewall_status === 'confirmado' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 font-semibold text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Liberado no Firewall
                    </span>
                  ) : device.firewall_status === 'pendente' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 font-semibold text-amber-300">
                      <Clock className="h-3.5 w-3.5 text-amber-400" /> Pendente de Homologação
                    </span>
                  ) : device.firewall_status === 'rejeitado' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 font-semibold text-rose-300">
                      <XCircle className="h-3.5 w-3.5 text-rose-400" /> Rejeitado
                    </span>
                  ) : (
                    <span className="text-slate-500 italic">Não solicitado</span>
                  )}
                </div>
              </div>

              {device.firewall_solicitado_por && (
                <div>
                  <span className="text-slate-400 font-medium">Solicitado por:</span>
                  <div className="font-semibold text-slate-100 mt-1">
                    {device.firewall_solicitado_por}
                  </div>
                </div>
              )}

              {device.firewall_confirmado_por && (
                <div>
                  <span className="text-slate-400 font-medium">Confirmado por:</span>
                  <div className="font-semibold text-slate-100 mt-1">
                    {device.firewall_confirmado_por}
                  </div>
                </div>
              )}

              {device.licenca_windows_solicitada && (
                <div className="sm:col-span-2 rounded-lg bg-orange-500/10 border border-orange-500/30 p-2.5 text-orange-300 font-semibold">
                  ⭐ Nova licença Windows solicitada pelo operador
                </div>
              )}
            </div>

            {isAdmin && (
              <div className="pt-3 border-t border-[#1E2636] flex justify-end">
                <button
                  onClick={() => onOpenApproval(device)}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-xs cursor-pointer"
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span>Homologação e Ajuste Cadastral</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
