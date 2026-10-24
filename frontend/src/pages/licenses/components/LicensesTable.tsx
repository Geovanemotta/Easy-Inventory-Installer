import React, { useState } from 'react';
import {
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  Edit2,
  Trash2,
  Monitor,
  Building2,
  Receipt,
  Calendar,
} from 'lucide-react';
import { License } from '@/types/license';
import { copyToClipboard as robustCopy } from '@/utils/clipboard';

interface LicensesTableProps {
  licenses: License[];
  isAdmin: boolean;
  onEditLicense: (license: License) => void;
  onDeleteLicense: (license: License) => void;
  onViewDevices: (license: License) => void;
  loading?: boolean;
}

export function mascararChave(chave: string, visivel: boolean): string {
  if (visivel || !chave) return chave;
  const partes = chave.split('-');
  if (partes.length === 5) {
    return `${partes[0]}-•••••-•••••-•••••-${partes[4]}`;
  }
  if (chave.length > 10) {
    return `${chave.slice(0, 4)}••••••••${chave.slice(-4)}`;
  }
  return chave;
}

export const LicensesTable: React.FC<LicensesTableProps> = ({
  licenses,
  isAdmin,
  onEditLicense,
  onDeleteLicense,
  onViewDevices,
  loading = false,
}) => {
  const [reveladas, setReveladas] = useState<Record<number, boolean>>({});
  const [copiadoId, setCopiadoId] = useState<number | null>(null);

  const toggleRevelar = (id: number) => {
    setReveladas((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (id: number, text: string, label = 'Chave de Licença', e?: React.MouseEvent) => {
    robustCopy(text, label, e);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 1500);
  };

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border-subtle p-8 text-center shadow-sm">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent" />
        <p className="mt-2 text-xs font-medium text-fg-secondary">Carregando licenças...</p>
      </div>
    );
  }

  if (licenses.length === 0) {
    return (
      <div className="bg-surface rounded-xl border border-border-subtle p-12 text-center shadow-sm space-y-2">
        <KeyRound className="h-10 w-10 text-fg-muted mx-auto" />
        <h4 className="text-sm font-bold text-fg">Nenhum lote de licença encontrado</h4>
        <p className="text-xs text-fg-secondary max-w-sm mx-auto">
          Tente ajustar os filtros por categoria, status, loja ou cadastre uma nova licença.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl border border-border-subtle shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-subtle bg-app text-[11px] font-bold uppercase tracking-wider text-fg-secondary">
              <th className="py-3 px-4">Software / Edição</th>
              <th className="py-3 px-4">Chave Serial</th>
              <th className="py-3 px-4">Filial / Local</th>
              <th className="py-3 px-4">Tipo &amp; NF</th>
              <th className="py-3 px-4">Ocupação / Estoque</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle text-xs">
            {licenses.map((lic) => {
              const isRevelada = Boolean(reveladas[lic.id]);
              const percentualUso =
                lic.quantidade_total > 0
                  ? Math.round((lic.quantidade_em_uso / lic.quantidade_total) * 100)
                  : 0;

              return (
                <tr
                  key={lic.id}
                  className="hover:bg-elevated/80 transition-colors group"
                >
                  {/* Software & Categoria */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg shrink-0 border ${
                          lic.categoria === 'windows'
                            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                            : lic.categoria === 'office'
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                            : 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                        }`}
                      >
                        <KeyRound className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-bold text-fg">{lic.software_nome}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              lic.categoria === 'windows'
                                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                : lic.categoria === 'office'
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                : 'bg-elevated text-gray-700 dark:text-slate-300 border-border-medium'
                            }`}
                          >
                            {lic.categoria}
                          </span>
                          {lic.observacoes && (
                            <span
                              className="text-[11px] text-fg-secondary truncate max-w-[150px]"
                              title={lic.observacoes}
                            >
                              {lic.observacoes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Chave Serial */}
                  <td className="py-3 px-4">
                    <div className="inline-flex items-center gap-2 bg-elevated border border-border-medium px-2.5 py-1.5 rounded-lg">
                      <span className="font-mono text-xs font-semibold text-fg tracking-wider">
                        {mascararChave(lic.chave, isRevelada)}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleRevelar(lic.id)}
                        title={isRevelada ? 'Ocultar chave' : 'Revelar chave'}
                        className="text-fg-secondary hover:text-fg p-0.5 rounded cursor-pointer transition-colors"
                      >
                        {isRevelada ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleCopy(lic.id, lic.chave, 'Chave de Licença', e)}
                        title="Copiar serial"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-fg-secondary hover:text-fg p-0.5 rounded cursor-pointer"
                      >
                        {copiadoId === lic.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Filial */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-gray-700 dark:text-slate-300 font-medium">
                      <Building2 className="h-3.5 w-3.5 text-fg-muted shrink-0" />
                      <span>
                        {lic.site_nome ? (
                          <>
                            {lic.site_codigo && <strong className="text-orange-400 font-mono font-bold mr-1">[{lic.site_codigo}]</strong>}
                            {lic.site_nome}
                          </>
                        ) : (
                          <span className="text-fg-muted italic">Matriz / Corporativo</span>
                        )}
                      </span>
                    </div>
                  </td>

                  {/* Tipo & NF */}
                  <td className="py-3 px-4">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-fg">
                        {lic.tipo_licenca || 'OEM'}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-fg-secondary">
                        {lic.nota_fiscal && (
                          <span className="flex items-center gap-1" title="Nota Fiscal">
                            <Receipt className="h-3 w-3 text-fg-muted" />
                            NF: {lic.nota_fiscal}
                          </span>
                        )}
                        {lic.data_aquisicao && (
                          <span className="flex items-center gap-1" title="Data de Aquisição">
                            <Calendar className="h-3 w-3 text-fg-muted" />
                            {new Date(lic.data_aquisicao).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Ocupação / Estoque */}
                  <td className="py-3 px-4 min-w-[190px]">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-fg tabular-nums">
                          {lic.quantidade_em_uso} / {lic.quantidade_total}{' '}
                          <span className="text-[11px] font-normal text-fg-secondary">em uso</span>
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                            lic.esgotada
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {lic.esgotada
                            ? 'Esgotada'
                            : `${lic.quantidade_disponivel} livre${
                                lic.quantidade_disponivel !== 1 ? 's' : ''
                              }`}
                        </span>
                      </div>
                      <div className="w-full bg-elevated border border-border-medium rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            lic.esgotada
                              ? 'bg-rose-500'
                              : percentualUso > 75
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(percentualUso, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Ações */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onViewDevices(lic)}
                        title="Ver máquinas usando esta licença"
                        className="inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold text-orange-400 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 transition-colors shadow-sm cursor-pointer"
                      >
                        <Monitor className="h-3.5 w-3.5" />
                        <span>Máquinas ({lic.quantidade_em_uso})</span>
                      </button>

                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => onEditLicense(lic)}
                            title="Editar licença"
                            className="p-1.5 text-fg-secondary hover:text-fg hover:bg-elevated rounded-lg border border-border-medium transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteLicense(lic)}
                            title="Excluir licença"
                            className="p-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-500/15 rounded-lg border border-rose-500/30 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
