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
      <div className="rounded-xl border border-border-subtle bg-surface p-12 text-center text-fg-secondary">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mx-auto mb-3" />
        <span className="text-xs">Carregando lojas e filiais...</span>
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface p-12 text-center text-fg-secondary space-y-2">
        <Building2 className="h-8 w-8 mx-auto text-fg-muted mb-2" />
        <h4 className="text-sm font-semibold text-fg">Nenhuma filial encontrada</h4>
        <p className="text-xs text-fg-secondary mt-1">
          Ajuste os filtros de pesquisa ou cadastre uma nova filial.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-surface shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-gray-700 dark:text-slate-300">
          <thead className="bg-app border-b border-border-subtle text-[11px] font-bold uppercase tracking-wider text-fg-secondary">
            <tr>
              <th className="py-3 px-4 w-24">Status</th>
              <th className="py-3 px-4 w-28">Código</th>
              <th className="py-3 px-4">Nome da Filial</th>
              <th className="py-3 px-4 w-36">Circuito</th>
              <th className="py-3 px-4">Identificadores de Hostname</th>
              <th className="py-3 px-4 text-center w-32">VLANs / Faixas</th>
              <th className="py-3 px-4 text-center w-28">Estações</th>
              <th className="py-3 px-4 text-center w-28">Ativos Rede</th>
              <th className="py-3 px-4 text-right w-36">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle font-medium">
            {sites.map((site) => {
              const kind = siteKind(site.code);
              const isCombo = kind === 'combo';
              const isOutros = kind === 'outros';

              return (
                <tr key={site.id} className="hover:bg-elevated/80 transition-colors">
                  {/* Status */}
                  <td className="py-3 px-4">
                    {site.active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="h-3 w-3" /> Ativa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-elevated px-2 py-0.5 text-[10px] font-bold text-fg-secondary border border-border-medium/30">
                        <XCircle className="h-3 w-3" /> Inativa
                      </span>
                    )}
                  </td>

                  {/* Código */}
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-xs border ${
                        isCombo
                          ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
                          : isOutros
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                      }`}
                    >
                      {site.code}
                    </span>
                  </td>

                  {/* Nome da Filial */}
                  <td className="py-3 px-4 font-semibold text-fg">
                    <div className="flex items-center gap-2">
                      <span>{site.name}</span>
                    </div>
                  </td>

                  {/* Circuito */}
                  <td className="py-3 px-4">
                    {site.circuito ? (
                      <span className="inline-block font-mono text-[11px] text-amber-700 dark:text-amber-300 font-semibold bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded">
                        {site.circuito}
                      </span>
                    ) : (
                      <span className="text-fg-muted italic text-[11px]">Não informado</span>
                    )}
                  </td>

                  {/* Identificadores / Tags */}
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {site.identifiers && site.identifiers.length > 0 ? (
                        site.identifiers.map((ident) => (
                          <span
                            key={ident}
                            className="inline-block rounded bg-elevated px-1.5 py-0.5 font-mono text-[10px] font-semibold text-gray-700 dark:text-slate-300 border border-border-medium"
                          >
                            {ident}
                          </span>
                        ))
                      ) : (
                        <span className="text-fg-muted italic text-[11px]">Nenhum padrão</span>
                      )}
                    </div>
                  </td>

                  {/* Faixas de IP / VLANs */}
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => onOpenRanges(site.id)}
                      className="inline-flex items-center gap-1 rounded-md bg-elevated hover:bg-border-subtle hover:text-orange-400 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:text-slate-300 border border-border-medium transition-colors cursor-pointer"
                      title="Gerenciar faixas de IP desta filial"
                    >
                      <Network className="h-3.5 w-3.5 text-orange-400" />
                      <span className="font-mono">{site.ip_ranges_count ?? 0}</span>
                    </button>
                  </td>

                  {/* Estações */}
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-fg bg-elevated px-2 py-0.5 rounded border border-border-medium">
                      <Monitor className="h-3 w-3 text-fg-secondary" />
                      {site.devices_count ?? 0}
                    </span>
                  </td>

                  {/* Ativos de Rede */}
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-orange-400 bg-orange-500/15 px-2 py-0.5 rounded border border-orange-500/30">
                      <Radio className="h-3 w-3 text-orange-400" />
                      {site.network_assets_count ?? 0}
                    </span>
                  </td>

                  {/* Ações */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onSimulate(site)}
                        className="rounded p-1.5 text-fg-secondary hover:bg-purple-500/15 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
                        title="Testar no Simulador de Regras"
                      >
                        <Search className="h-4 w-4" />
                      </button>

                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => onEdit(site)}
                            className="rounded p-1.5 text-fg-secondary hover:bg-orange-500/15 hover:text-orange-400 transition-colors cursor-pointer"
                            title="Editar Filial"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(site)}
                            className="rounded p-1.5 text-fg-secondary hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
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
