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
  handleUnbindSerial: (slot: 'windows' | 'office') => Promise<void>;
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
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Cpu className="h-4 w-4 text-indigo-600" />
            Especificações do Equipamento
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Filial</span>
              <span className="font-semibold text-slate-800">
                {site
                  ? `${site.code} - ${site.name}`
                  : asset.site_id
                  ? `Filial #${asset.site_id}`
                  : 'Sem filial vinculada'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Localização / Setor</span>
              <span className="font-semibold text-slate-800">
                {asset.localizacao || '—'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Patrimônio / Tombamento</span>
              <span className="font-semibold font-mono text-slate-800">
                {asset.patrimonio || '—'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Nº de Série</span>
              <span className="font-semibold font-mono text-slate-800">
                {asset.numero_serie || '—'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Fabricante</span>
              <span className="font-semibold text-slate-800">
                {asset.fabricante || '—'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Modelo</span>
              <span className="font-semibold text-slate-800">
                {asset.modelo || '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Licenças & Seriais (Windows / Office) */}
      <div className={`rounded-xl border p-4 shadow-2xs space-y-3 ${
        isEstacao ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200 bg-white'
      }`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
            isEstacao ? 'text-amber-900' : 'text-slate-500'
          }`}>
            <Key className={`h-4 w-4 ${isEstacao ? 'text-amber-600' : 'text-amber-500'}`} />
            {isEstacao ? 'Chaves & Licenciamento (Windows / Office)' : 'Licenças & Ativações'}
          </h3>
        </div>

        <div className="space-y-2.5">
          {/* Slot Windows */}
          <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Serial Windows</span>
              {isAdmin && (
                <div className="flex items-center gap-1.5">
                  {asset.serial_windows && (
                    <button
                      type="button"
                      onClick={() => handleUnbindSerial('windows')}
                      disabled={unbindingSlot === 'windows'}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors disabled:opacity-50"
                      title="Desvincular chave"
                    >
                      {unbindingSlot === 'windows' ? 'Removendo...' : '✕ Remover'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenLicenseModal('windows')}
                    className="px-2 py-0.5 rounded text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                  >
                    {asset.serial_windows ? 'Alterar' : '+ Atribuir'}
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              {isAdmin ? (
                asset.serial_windows ? (
                  <span className="font-mono text-xs font-bold text-slate-800 tracking-wide select-all">
                    {asset.serial_windows}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    — Nenhum serial de Windows vinculado —
                  </span>
                )
              ) : (
                asset.serial_windows ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    Licenciado / Possui chave
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                    Sem chave
                  </span>
                )
              )}

              {asset.serial_windows && isAdmin && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(asset.serial_windows!, 'win')}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded"
                  title="Copiar serial"
                >
                  {copiedKey === 'win' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Slot Office */}
          <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Serial Office</span>
              {isAdmin && (
                <div className="flex items-center gap-1.5">
                  {asset.serial_office && (
                    <button
                      type="button"
                      onClick={() => handleUnbindSerial('office')}
                      disabled={unbindingSlot === 'office'}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors disabled:opacity-50"
                      title="Desvincular chave"
                    >
                      {unbindingSlot === 'office' ? 'Removendo...' : '✕ Remover'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenLicenseModal('office')}
                    className="px-2 py-0.5 rounded text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                  >
                    {asset.serial_office ? 'Alterar' : '+ Atribuir'}
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              {isAdmin ? (
                asset.serial_office ? (
                  <span className="font-mono text-xs font-bold text-slate-800 tracking-wide select-all">
                    {asset.serial_office}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    — Nenhum serial de Office vinculado —
                  </span>
                )
              ) : (
                asset.serial_office ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    Licenciado / Possui chave
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                    Sem chave
                  </span>
                )
              )}

              {asset.serial_office && isAdmin && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(asset.serial_office!, 'off')}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded"
                  title="Copiar serial"
                >
                  {copiedKey === 'off' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
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
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            Observações e Anotações
          </h3>
          <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed whitespace-pre-line">
            {asset.observacoes}
          </p>
        </div>
      )}
    </div>
  );
};
