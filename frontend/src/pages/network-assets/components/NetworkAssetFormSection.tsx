import React from 'react';
import { NetworkAsset } from '@/types/networkAsset';
import { Site } from '@/types/site';
import {
  Cpu,
  Key,
  FileText,
  Copy,
  Check,
  CheckCircle2,
} from 'lucide-react';

interface NetworkAssetFormSectionProps {
  asset: NetworkAsset;
  site?: Site;
  isEstacao: boolean;
  isAdmin: boolean;
  copiedKey: string | null;
  copyToClipboard: (text: string, label: string, e?: React.MouseEvent) => void;
  handleUnbindSerial: (slot: 'windows' | 'office') => void | Promise<void>;
  handleOpenLicenseModal: (slot: 'windows' | 'office') => void;
  unbindingSlot: 'windows' | 'office' | null;
}

export const NetworkAssetFormSection: React.FC<NetworkAssetFormSectionProps> = ({
  asset,
  site,
  isEstacao,
  isAdmin,
  copiedKey,
  copyToClipboard,
  handleUnbindSerial,
  handleOpenLicenseModal,
  unbindingSlot,
}) => {
  return (
    <div className="space-y-5">
      {/* 1. Especificações do Equipamento (Apenas para ativos de rede que não são estações integradas) */}
      {!isEstacao && (
        <div className="rounded-xl border border-border-subtle bg-surface p-4 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400/90 flex items-center gap-2">
            <Cpu className="h-4 w-4 text-orange-400" />
            Especificações do Equipamento
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-elevated border border-border-medium p-2.5">
              <span className="text-fg-secondary block mb-0.5 text-[11px]">Filial</span>
              <span className="font-semibold text-fg">
                {site
                  ? site.name
                  : asset.site_id
                  ? `Filial #${asset.site_id}`
                  : 'Sem filial vinculada'}
              </span>
            </div>

            <div className="rounded-lg bg-elevated border border-border-medium p-2.5">
              <span className="text-fg-secondary block mb-0.5 text-[11px]">Localização / Setor</span>
              <span className="font-semibold text-fg">
                {asset.localizacao || '—'}
              </span>
            </div>

            <div className="rounded-lg bg-elevated border border-border-medium p-2.5">
              <span className="text-fg-secondary block mb-0.5 text-[11px]">Patrimônio / Tombamento</span>
              <span className="font-semibold font-mono tabular-nums text-fg">
                {asset.patrimonio || '—'}
              </span>
            </div>

            <div className="rounded-lg bg-elevated border border-border-medium p-2.5">
              <span className="text-fg-secondary block mb-0.5 text-[11px]">Nº de Série</span>
              <span className="font-semibold font-mono tabular-nums text-fg">
                {asset.numero_serie || '—'}
              </span>
            </div>

            <div className="rounded-lg bg-elevated border border-border-medium p-2.5">
              <span className="text-fg-secondary block mb-0.5 text-[11px]">Fabricante</span>
              <span className="font-semibold text-fg">
                {asset.fabricante || '—'}
              </span>
            </div>

            <div className="rounded-lg bg-elevated border border-border-medium p-2.5">
              <span className="text-fg-secondary block mb-0.5 text-[11px]">Modelo</span>
              <span className="font-semibold text-fg">
                {asset.modelo || '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Licenças & Seriais (Windows / Office) */}
      <div className="rounded-xl border border-border-subtle bg-surface p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400/90 flex items-center gap-2">
            <Key className="h-4 w-4 text-orange-400" />
            {isEstacao ? 'Chaves & Licenciamento (Windows / Office)' : 'Licenças & Ativações'}
          </h3>
        </div>

        <div className="space-y-3">
          {/* Slot Windows */}
          <div className="p-3.5 rounded-xl bg-elevated border border-border-medium space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-fg">Serial Windows</span>
              {isAdmin && (
                <div className="flex items-center gap-1.5">
                  {asset.serial_windows && (
                    <button
                      type="button"
                      onClick={() => handleUnbindSerial('windows')}
                      disabled={unbindingSlot === 'windows'}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-colors disabled:opacity-50 cursor-pointer"
                      title="Desvincular chave"
                    >
                      {unbindingSlot === 'windows' ? 'Removendo...' : '✕ Remover'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenLicenseModal('windows')}
                    className="px-2.5 py-0.5 rounded text-[11px] font-semibold text-orange-400 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 transition-colors cursor-pointer"
                  >
                    {asset.serial_windows ? 'Alterar' : '+ Atribuir'}
                  </button>
                </div>
              )}
            </div>

            <div className="group flex items-center justify-between p-2.5 rounded-lg bg-app border border-border-subtle">
              {isAdmin ? (
                asset.serial_windows ? (
                  <span className="font-mono text-xs font-bold text-fg tracking-wider select-all">
                    {asset.serial_windows}
                  </span>
                ) : (
                  <span className="text-xs text-fg-muted italic">
                    — Nenhum serial de Windows vinculado —
                  </span>
                )
              ) : (
                asset.serial_windows ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    Licenciado / Possui chave
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-elevated text-fg-secondary border border-border-medium">
                    Sem chave
                  </span>
                )
              )}

              {asset.serial_windows && isAdmin && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(asset.serial_windows!, 'win')}
                  className="opacity-0 group-hover:opacity-100 text-fg-secondary hover:text-fg transition-opacity p-1 rounded cursor-pointer"
                  title="Copiar serial"
                >
                  {copiedKey === 'win' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Slot Office */}
          <div className="p-3.5 rounded-xl bg-elevated border border-border-medium space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-fg">Serial Office</span>
              {isAdmin && (
                <div className="flex items-center gap-1.5">
                  {asset.serial_office && (
                    <button
                      type="button"
                      onClick={() => handleUnbindSerial('office')}
                      disabled={unbindingSlot === 'office'}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-colors disabled:opacity-50 cursor-pointer"
                      title="Desvincular chave"
                    >
                      {unbindingSlot === 'office' ? 'Removendo...' : '✕ Remover'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenLicenseModal('office')}
                    className="px-2.5 py-0.5 rounded text-[11px] font-semibold text-orange-400 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 transition-colors cursor-pointer"
                  >
                    {asset.serial_office ? 'Alterar' : '+ Atribuir'}
                  </button>
                </div>
              )}
            </div>

            <div className="group flex items-center justify-between p-2.5 rounded-lg bg-app border border-border-subtle">
              {isAdmin ? (
                asset.serial_office ? (
                  <span className="font-mono text-xs font-bold text-fg tracking-wider select-all">
                    {asset.serial_office}
                  </span>
                ) : (
                  <span className="text-xs text-fg-muted italic">
                    — Nenhum serial de Office vinculado —
                  </span>
                )
              ) : (
                asset.serial_office ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    Licenciado / Possui chave
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-elevated text-fg-secondary border border-border-medium">
                    Sem chave
                  </span>
                )
              )}

              {asset.serial_office && isAdmin && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(asset.serial_office!, 'off')}
                  className="opacity-0 group-hover:opacity-100 text-fg-secondary hover:text-fg transition-opacity p-1 rounded cursor-pointer"
                  title="Copiar serial"
                >
                  {copiedKey === 'off' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Observações */}
      {asset.observacoes && (
        <div className="rounded-xl border border-border-subtle bg-surface p-4 shadow-xs space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400/90 flex items-center gap-2">
            <FileText className="h-4 w-4 text-orange-400" />
            Observações e Anotações
          </h3>
          <p className="text-xs text-gray-700 dark:text-slate-300 bg-app p-3 rounded-lg border border-border-subtle leading-relaxed whitespace-pre-line">
            {asset.observacoes}
          </p>
        </div>
      )}
    </div>
  );
};
