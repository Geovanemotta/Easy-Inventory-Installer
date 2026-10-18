import React from 'react';
import {
  Edit2,
  Trash2,
  Network,
  Search,
  CheckCircle2,
  XCircle,
  Building2,
  Monitor,
  Radio,
} from 'lucide-react';
import { Site } from '@/types/site';
import { siteKind } from '@/components/common/SiteSelect';

interface SitesTableProps {
  sites: Site[];
  loading: boolean;
  isAdmin: boolean;
  onEdit: (site: Site) => void;
  onDelete: (site: Site) => void;
  onOpenRanges: (siteId: number) => void;
  onSimulate: (site: Site) => void;
}

export const SitesTable: React.FC<SitesTableProps> = ({
  sites,
  loading,
  isAdmin,
  onEdit,
  onDelete,
  onOpenRanges,
  onSimulate,
}) => {
  if (loading && sites.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto mb-3" />
        <span className="text-xs">Carregando lojas e filiais...</span>
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400">
        <Building2 className="h-8 w-8 mx-auto text-slate-300 mb-2" />
        <h4 className="text-sm font-semibold text-slate-700">Nenhuma filial encontrada</h4>
        <p className="text-xs text-slate-400 mt-1">
          Ajuste os filtros de pesquisa ou cadastre uma nova filial.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="py-3 px-4 w-24">Status</th>
              <th className="py-3 px-4 w-28">Código</th>
              <th className="py-3 px-4">Nome da Filial</th>
              <th className="py-3 px-4">Identificadores de Hostname</th>
              <th className="py-3 px-4 text-center w-32">VLANs / Faixas</th>
              <th className="py-3 px-4 text-center w-28">Estações</th>
              <th className="py-3 px-4 text-center w-28">Ativos Rede</th>
              <th className="py-3 px-4 text-right w-36">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {sites.map((site) => {
              const kind = siteKind(site.code);
              const isCombo = kind === 'combo';
              const isOutros = kind === 'outros';

              return (
                <tr key={site.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Status */}
                  <td className="py-3 px-4">
                    {site.active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" /> Ativa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 border border-slate-200">
                        <XCircle className="h-3 w-3" /> Inativa
                      </span>
                    )}
                  </td>

                  {/* Código */}
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-xs border ${
                        isCombo
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : isOutros
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {site.code}
                    </span>
                  </td>

                  {/* Nome da Filial */}
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    <div className="flex items-center gap-2">
                      <span>{site.name}</span>
                    </div>
                  </td>

                  {/* Identificadores / Tags */}
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {site.identifiers && site.identifiers.length > 0 ? (
                        site.identifiers.map((ident) => (
                          <span
                            key={ident}
                            className="inline-block rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700 border border-slate-200"
                          >
                            {ident}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Nenhum padrão</span>
                      )}
                    </div>
                  </td>

                  {/* Faixas de IP / VLANs */}
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => onOpenRanges(site.id)}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200 transition-colors"
                      title="Gerenciar faixas de IP desta filial"
                    >
                      <Network className="h-3.5 w-3.5 text-blue-600" />
                      <span>{site.ip_ranges_count ?? 0}</span>
                    </button>
                  </td>

                  {/* Estações */}
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                      <Monitor className="h-3 w-3 text-slate-400" />
                      {site.devices_count ?? 0}
                    </span>
                  </td>

                  {/* Ativos de Rede */}
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                      <Radio className="h-3 w-3 text-amber-500" />
                      {site.network_assets_count ?? 0}
                    </span>
                  </td>

                  {/* Ações */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onSimulate(site)}
                        className="rounded p-1.5 text-slate-400 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                        title="Testar no Simulador de Regras"
                      >
                        <Search className="h-4 w-4" />
                      </button>

                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => onEdit(site)}
                            className="rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            title="Editar Filial"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(site)}
                            className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Excluir ou Desativar Filial"
                          >
                            <Trash2 className="h-4 w-4" />
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
