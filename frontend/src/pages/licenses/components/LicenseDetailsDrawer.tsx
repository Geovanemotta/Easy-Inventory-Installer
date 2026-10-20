import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Search,
  Monitor,
  Building2,
  Unlink,
  ExternalLink,
  Copy,
  Check,
  KeyRound,
  Download,
} from 'lucide-react';
import {
  License,
  LicenseDeviceItem,
} from '@/types/license';
import { licenseService } from '@/services/licenseService';
import { mascararChave } from './LicensesTable';
import { copyToClipboard as robustCopy } from '@/utils/clipboard';

interface LicenseDetailsDrawerProps {
  license: License | null;
  isOpen: boolean;
  onClose: () => void;
  canManage: boolean;
  onDeviceUnlinked: () => void;
}

export const LicenseDetailsDrawer: React.FC<LicenseDetailsDrawerProps> = ({
  license,
  isOpen,
  onClose,
  canManage,
  onDeviceUnlinked,
}) => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<LicenseDeviceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    if (!isOpen || !license) {
      setDevices([]);
      setSearch('');
      return;
    }

    setLoading(true);
    licenseService
      .getLicenseDevices(license.id)
      .then((res) => {
        setDevices(res);
      })
      .catch((err) => {
        console.error('Erro ao buscar computadores da licença:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, license]);

  const handleCopyKey = (e?: React.MouseEvent) => {
    if (!license) return;
    robustCopy(license.chave, 'Chave de Licença', e);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 1500);
  };

  const handleUnlink = async (dev: LicenseDeviceItem) => {
    if (!license) return;
    const key = `${dev.origem}-${dev.id}`;
    setUnlinkingId(key);

    try {
      await licenseService.assignLicense({
        device_id: dev.origem === 'estacao' ? dev.id : undefined,
        network_asset_id: dev.origem === 'ativo' ? dev.id : undefined,
        slot: dev.slot,
        chave: null, // desvincula
      });

      // Remove da lista local
      setDevices((prev) =>
        prev.filter(
          (d) => !(d.id === dev.id && d.slot === dev.slot && d.origem === dev.origem),
        ),
      );
      onDeviceUnlinked();
    } catch (err) {
      console.error('Erro ao desvincular licença:', err);
    } finally {
      setUnlinkingId(null);
    }
  };

  const filteredDevices = useMemo(() => {
    if (!devices) return [];
    if (!search.trim()) return devices;
    const s = search.toLowerCase();
    return devices.filter(
      (d) =>
        d.hostname.toLowerCase().includes(s) ||
        (d.ip && d.ip.toLowerCase().includes(s)) ||
        (d.site_nome && d.site_nome.toLowerCase().includes(s)) ||
        (d.patrimonio && d.patrimonio.toLowerCase().includes(s)),
    );
  }, [devices, search]);

  const handleExportCsv = () => {
    if (!license || filteredDevices.length === 0) return;
    const headers = [
      'Hostname',
      'Tipo Origem',
      'IP',
      'Patrimônio',
      'Loja / Filial',
      'Slot',
      'Data Vínculo / Coleta',
    ];
    const rows = filteredDevices.map((d) => [
      d.hostname,
      d.origem,
      d.ip || '',
      d.patrimonio || '',
      d.site_nome || '',
      d.slot,
      d.data_coleta ? new Date(d.data_coleta).toLocaleString('pt-BR') : '',
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')),
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `maquinas_licenca_${license.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen || !license) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-xs flex justify-end transition-opacity cursor-pointer"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#121721] h-full shadow-2xl flex flex-col border-l border-[#1E2636] animate-in slide-in-from-right duration-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-[#1E2636] bg-[#0E131B] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 shadow-sm">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {license.software_nome}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#181F2E] text-slate-300 border border-[#263044]">
                  {license.categoria}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-xs text-slate-300 font-semibold">
                  {mascararChave(license.chave, false)}
                </span>
                <button
                  type="button"
                  onClick={handleCopyKey}
                  title="Copiar serial completo"
                  className="text-slate-400 hover:text-white cursor-pointer transition-colors"
                >
                  {copiedKey ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredDevices.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-[#181F2E] hover:bg-[#222B3D] border border-[#263044] rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              <span>Exportar</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-[#181F2E] rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Resumo de Ocupação e Busca */}
        <div className="p-4 border-b border-[#1E2636] bg-[#121721] space-y-3 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Ocupação do Lote:{' '}
              <strong className="text-white font-mono">
                {license.quantidade_em_uso} / {license.quantidade_total}
              </strong>
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                license.esgotada
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {license.esgotada
                ? 'Lote 100% Esgotado'
                : `${license.quantidade_disponivel} licença(s) livre(s)`}
            </span>
          </div>

          {/* Busca na lista */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por hostname, IP, loja ou patrimônio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-[#263044] bg-[#181F2E] text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de Máquinas Vinculadas */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-[#0B0E14]">
          {loading ? (
            <div className="text-center py-16 space-y-2">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent" />
              <p className="text-xs font-medium text-slate-400">
                Carregando máquinas vinculadas...
              </p>
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="text-center py-16 bg-[#121721] rounded-xl border border-[#1E2636] p-8 space-y-2">
              <Monitor className="h-8 w-8 text-slate-600 mx-auto" />
              <h4 className="text-xs font-bold text-white">Nenhum computador vinculado</h4>
              <p className="text-[11px] text-slate-400">
                {search
                  ? 'Nenhum resultado corresponde ao termo pesquisado.'
                  : 'Nenhuma máquina ou ativo de rede está consumindo este lote atualmente.'}
              </p>
            </div>
          ) : (
            filteredDevices.map((dev) => {
              const devKey = `${dev.origem}-${dev.id}`;
              const isUnlinking = unlinkingId === devKey;

              return (
                <div
                  key={devKey}
                  className="p-3.5 bg-[#0E131B] rounded-xl border border-[#1E2636] hover:border-orange-500/40 hover:bg-[#181F2E]/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="font-bold text-white text-xs hover:text-orange-400 cursor-pointer transition-colors"
                        onClick={() =>
                          navigate(`/devices?search=${encodeURIComponent(dev.hostname)}`)
                        }
                      >
                        {dev.hostname}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#181F2E] text-slate-300 border border-[#263044]">
                        {dev.origem === 'estacao' ? 'Estação' : 'Ativo de Rede'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-500/15 text-orange-400 border border-orange-500/30">
                        Slot {dev.slot}
                      </span>
                      {dev.patrimonio && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Patr: {dev.patrimonio}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 font-mono">
                      {dev.ip && <span>IP: {dev.ip}</span>}
                      {dev.site_nome && (
                        <span className="flex items-center gap-1 text-slate-300 font-sans">
                          <Building2 className="h-3 w-3 text-slate-500" />
                          <span>
                            {dev.site_codigo && `[${dev.site_codigo}] `}
                            {dev.site_nome}
                          </span>
                        </span>
                      )}
                      {dev.data_coleta && (
                        <span className="text-slate-500 text-[10px] font-sans">
                          Visto em: {new Date(dev.data_coleta).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/devices?search=${encodeURIComponent(dev.hostname)}`)
                      }
                      title="Ver no Inventário"
                      className="p-1.5 text-orange-400 hover:bg-orange-500/20 border border-orange-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => handleUnlink(dev)}
                        disabled={isUnlinking}
                        title="Desvincular esta chave serial da máquina"
                        className="p-1.5 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <Unlink className={`h-3.5 w-3.5 ${isUnlinking ? 'animate-spin' : ''}`} />
                        <span>Desvincular</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-3 border-t border-[#1E2636] bg-[#0E131B] flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>
            Mostrando <strong className="text-white font-semibold">{filteredDevices.length}</strong> máquinas vinculadas
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[#263044] bg-[#181F2E] text-slate-300 font-semibold hover:text-white hover:bg-[#222B3D] transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
