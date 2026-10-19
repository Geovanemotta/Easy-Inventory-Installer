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
}) => {
  return (
    <div className="space-y-4">
      {/* Bloco 1: Rede & Conectividade (Acordeão) */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('rede')}
          className="w-full flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100/60 transition-colors text-left"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Network className="h-4 w-4 text-emerald-600" />
            Rede &amp; Acesso Remoto
          </span>
          {openSections.rede ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>
        {openSections.rede && (
          <div className="p-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400">IP Principal:</span>
              <div className="font-mono font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                <span className={device.is_rede_formatacao ? 'text-orange-700 font-bold' : ''}>
                  {device.ip || '---'}
                </span>
                {device.ip && (
                  <button
                    onClick={() => copyToClipboard(device.ip!, 'ip')}
                    className="text-slate-400 hover:text-slate-700"
                    title="Copiar IP Principal"
                  >
                    {copiedKey === 'ip' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
                {device.is_rede_formatacao && (
                  <span className="rounded bg-orange-100 px-1 py-0.2 text-[10px] font-bold text-orange-800">
                    .88
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="text-slate-400">Endereço MAC:</span>
              <div className="font-mono font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                <span>{device.mac || '---'}</span>
                {device.mac && (
                  <button
                    onClick={() => copyToClipboard(device.mac!, 'mac')}
                    className="text-slate-400 hover:text-slate-700"
                    title="Copiar MAC"
                  >
                    {copiedKey === 'mac' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* IPs Extras / Secundários Tratados */}
            {device.ips_extras && device.ips_extras.length > 0 && (
              <div className="sm:col-span-2 rounded-lg bg-blue-50/70 border border-blue-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                    <Network className="h-3.5 w-3.5 text-blue-600" />
                    IPs Secundários / Adicionais ({device.ips_extras.length})
                  </span>
                  <span className="text-[10px] text-blue-600 font-medium">Interfaces adicionais válidas</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {device.ips_extras.map((extraIp, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs font-mono font-semibold text-slate-800 border border-blue-200 shadow-2xs"
                    >
                      <span>{extraIp}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(extraIp, `extra_ip_${idx}`)}
                        className="text-slate-400 hover:text-slate-700"
                        title="Copiar IP adicional"
                      >
                        {copiedKey === `extra_ip_${idx}` ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="text-slate-400">RustDesk ID:</span>
              <div className="font-mono font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                <span>{device.rustdesk_id || 'Não informado'}</span>
                {device.rustdesk_id && (
                  <button
                    onClick={() => copyToClipboard(device.rustdesk_id!, 'rustdesk')}
                    className="text-slate-400 hover:text-slate-700"
                    title="Copiar RustDesk ID"
                  >
                    {copiedKey === 'rustdesk' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div>
              <span className="text-slate-400">Domínio / Usuário:</span>
              <div className="font-semibold text-slate-800 mt-0.5">
                {[device.dominio, device.usuario].filter(Boolean).join(' \\ ') || '---'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bloco 2: Hardware & Arquitetura (Acordeão) */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('hardware')}
          className="w-full flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100/60 transition-colors text-left"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Cpu className="h-4 w-4 text-blue-600" />
            Hardware &amp; Arquitetura
          </span>
          {openSections.hardware ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>
        {openSections.hardware && (
          <div className="p-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400">Processador:</span>
              <div className="font-semibold text-slate-800 mt-0.5">
                {device.processador_formatado || device.processador || 'Não informado'}
              </div>
            </div>

            <div>
              <span className="text-slate-400">Memória RAM:</span>
              <div className="font-semibold text-slate-800 mt-0.5 flex items-center gap-2">
                <span>{device.ram_total_formatada || device.ram_total || 'Não informado'}</span>
                {device.ram_tipo && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                    {device.ram_tipo}
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="text-slate-400">Placa-Mãe / Modelo:</span>
              <div className="font-semibold text-slate-800 mt-0.5">
                {device.modelo_formatado || [device.fabricante_limpo, device.modelo_limpo].filter(Boolean).join(' ') || 'Não informado'}
              </div>
            </div>

            <div>
              <span className="text-slate-400">Número de Série (Chassi):</span>
              <div className="font-mono font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                <span>{device.serial_limpo || device.serial || '---'}</span>
                {(device.serial_limpo || device.serial) && (
                  <button
                    onClick={() => copyToClipboard(device.serial_limpo || device.serial!, 'serial')}
                    className="text-slate-400 hover:text-slate-700"
                    title="Copiar Serial"
                  >
                    {copiedKey === 'serial' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {device.fabricante_limpo && (
              <div>
                <span className="text-slate-400">Fabricante:</span>
                <div className="font-semibold text-slate-800 mt-0.5">
                  {device.fabricante_limpo}
                </div>
              </div>
            )}

            {device.modelo_limpo && (
              <div>
                <span className="text-slate-400">Modelo Específico:</span>
                <div className="font-semibold text-slate-800 mt-0.5">
                  {device.modelo_limpo}
                </div>
              </div>
            )}

            {isAdmin ? (
              device.serial_windows && (
                <div className="sm:col-span-2 rounded-lg bg-slate-50 border border-slate-200 p-2.5 flex items-center justify-between font-mono text-xs">
                  <span className="text-slate-500 font-sans">Chave Windows (OEM/BIOS):</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-800">{device.serial_windows}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(device.serial_windows!, 'win_key')}
                      className="text-slate-400 hover:text-slate-700 p-1 rounded"
                      title="Copiar Chave Windows"
                    >
                      {copiedKey === 'win_key' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="sm:col-span-2 rounded-lg bg-slate-50 border border-slate-200 p-2.5 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Chave Windows:</span>
                {device.serial_windows ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    Licenciado / Possui chave
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                    Sem chave
                  </span>
                )}
              </div>
            )}

            {isAdmin ? (
              device.serial_office && (
                <div className="sm:col-span-2 rounded-lg bg-slate-50 border border-slate-200 p-2.5 flex items-center justify-between font-mono text-xs">
                  <span className="text-slate-500 font-sans">Chave Office:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-800">{device.serial_office}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(device.serial_office!, 'off_key')}
                      className="text-slate-400 hover:text-slate-700 p-1 rounded"
                      title="Copiar Chave Office"
                    >
                      {copiedKey === 'off_key' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="sm:col-span-2 rounded-lg bg-slate-50 border border-slate-200 p-2.5 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Chave Office:</span>
                {device.serial_office ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    Licenciado / Possui chave
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                    Sem chave
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bloco 3: Sistema Operacional (Acordeão) */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('sistema')}
          className="w-full flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100/60 transition-colors text-left"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Monitor className="h-4 w-4 text-purple-600" />
            Sistema Operacional &amp; Sincronização
          </span>
          {openSections.sistema ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>
        {openSections.sistema && (
          <div className="p-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400">Sistema:</span>
              <div className="font-semibold text-slate-800 mt-0.5">
                {device.so_formatado || device.sistema || 'Não informado'}
              </div>
            </div>

            <div>
              <span className="text-slate-400">Versão / Release / Build:</span>
              <div className="font-semibold text-slate-800 mt-0.5 flex items-center gap-2">
                <span>{device.versao || device.build || 'Não informado'}</span>
                {(device.windows_release_formatado || device.windows_release) && (
                  <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                    Windows {device.windows_release_formatado || device.windows_release}
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="text-slate-400">Status Operacional:</span>
              <div className="mt-0.5">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    device.status === 'OK'
                      ? 'bg-emerald-100 text-emerald-800'
                      : device.status === 'UPGRADE_REQUIRED'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
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
              <span className="text-slate-400">Última Sincronização:</span>
              <div className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>{device.data_coleta_formatada || (device.data_coleta ? String(device.data_coleta) : 'Sem data')}</span>
                {device.tempo_relativo_coleta && (
                  <span className="text-[11px] text-slate-500 font-normal">
                    ({device.tempo_relativo_coleta})
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bloco 4: Patrimônio & Homologação Firewall (Acordeão) */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100/60 transition-colors">
          <button
            type="button"
            onClick={() => toggleSection('patrimonio')}
            className="flex-1 flex items-center justify-between text-left"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-600" />
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
              className="flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <Tag className="h-3 w-3" /> Ajustar
            </button>
          )}
        </div>
        {openSections.patrimonio && (
          <div className="p-4 border-t border-slate-100 text-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400">Número de Patrimônio:</span>
                <div className="font-mono font-bold text-blue-700 text-sm mt-0.5 flex items-center gap-1.5">
                  <span>{device.patrimonio || 'Não patrimoniado'}</span>
                  {device.patrimonio && (
                    <button
                      onClick={() => copyToClipboard(device.patrimonio!, 'pat')}
                      className="text-slate-400 hover:text-slate-700"
                      title="Copiar Patrimônio"
                    >
                      {copiedKey === 'pat' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span className="text-slate-400">Status Firewall:</span>
                <div className="mt-0.5">
                  {device.firewall_status === 'confirmado' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 font-semibold text-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Liberado no Firewall
                    </span>
                  ) : device.firewall_status === 'pendente' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 font-semibold text-amber-800">
                      <Clock className="h-3.5 w-3.5" /> Pendente de Homologação
                    </span>
                  ) : device.firewall_status === 'rejeitado' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 font-semibold text-rose-800">
                      <XCircle className="h-3.5 w-3.5" /> Rejeitado
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Não solicitado</span>
                  )}
                </div>
              </div>

              {device.firewall_solicitado_por && (
                <div>
                  <span className="text-slate-400">Solicitado por:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {device.firewall_solicitado_por}
                  </div>
                </div>
              )}

              {device.firewall_confirmado_por && (
                <div>
                  <span className="text-slate-400">Confirmado por:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {device.firewall_confirmado_por}
                  </div>
                </div>
              )}

              {device.licenca_windows_solicitada && (
                <div className="sm:col-span-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-amber-800 font-semibold">
                  ⭐ Nova licença Windows solicitada pelo operador
                </div>
              )}
            </div>

            {isAdmin && (
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => onOpenApproval(device)}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs"
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
