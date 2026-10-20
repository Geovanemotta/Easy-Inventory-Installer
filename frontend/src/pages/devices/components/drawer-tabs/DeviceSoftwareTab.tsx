import React from 'react';
import { Search, Package } from 'lucide-react';
import { DeviceSoftwareItem } from '@/types/device';

interface DeviceSoftwareTabProps {
  loadingSoftware: boolean;
  filteredSoftwares: DeviceSoftwareItem[];
  softwareSearch: string;
  setSoftwareSearch: (s: string) => void;
  softwareCategoryFilter: string;
  setSoftwareCategoryFilter: (c: string) => void;
  softwareCounts: {
    todos: number;
    aplicativo: number;
    agente: number;
    runtime: number;
    ferramenta: number;
  };
}

export const DeviceSoftwareTab: React.FC<DeviceSoftwareTabProps> = ({
  loadingSoftware,
  filteredSoftwares,
  softwareSearch,
  setSoftwareSearch,
  softwareCategoryFilter,
  setSoftwareCategoryFilter,
  softwareCounts,
}) => {
  return (
    <div className="space-y-4">
      {/* Barra de Pesquisa e Filtro de Categoria */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={softwareSearch}
            onChange={(e) => setSoftwareSearch(e.target.value)}
            placeholder="Buscar por nome do aplicativo, agente ou pacote..."
            className="w-full rounded-lg border border-[#263044] bg-[#181F2E] py-2 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {[
            { key: 'todos', label: 'Todos', count: softwareCounts.todos },
            { key: 'aplicativo', label: 'Aplicativos', count: softwareCounts.aplicativo },
            { key: 'agente', label: 'Agentes', count: softwareCounts.agente },
            { key: 'runtime', label: 'Runtimes', count: softwareCounts.runtime },
            { key: 'ferramenta', label: 'Ferramentas', count: softwareCounts.ferramenta },
          ].map((cat) => {
            const active = softwareCategoryFilter === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSoftwareCategoryFilter(cat.key)}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors border flex items-center gap-1.5 cursor-pointer ${
                  active
                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/40 shadow-xs font-semibold'
                    : 'bg-[#181F2E] text-slate-400 border-[#263044] hover:bg-[#263044] hover:text-slate-200'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold font-mono border ${
                    active
                      ? 'bg-orange-500/30 text-orange-200 border-orange-500/50'
                      : 'bg-[#121721] text-slate-400 border-[#1E2636]'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loadingSoftware ? (
        <div className="text-center py-16 text-xs text-slate-400">
          Carregando catálogo de softwares da estação...
        </div>
      ) : filteredSoftwares.length === 0 ? (
        <div className="text-center py-16 text-xs text-slate-500">
          Nenhum software correspondente encontrado.
        </div>
      ) : (
        <div className="divide-y divide-[#1E2636] rounded-xl border border-[#1E2636] bg-[#121721] overflow-hidden shadow-xs">
          {filteredSoftwares.map((sw: DeviceSoftwareItem, idx: number) => {
            const catLower = (sw.tipo || '').toLowerCase();
            let badgeClass = 'bg-[#181F2E] text-slate-400 border-[#263044]';
            if (catLower === 'aplicativo' || catLower === 'aplicativos') {
              badgeClass = 'bg-sky-500/15 text-sky-300 border-sky-500/30';
            } else if (catLower === 'agente' || catLower === 'agentes') {
              badgeClass = 'bg-purple-500/15 text-purple-300 border-purple-500/30';
            } else if (catLower === 'runtime' || catLower === 'runtimes') {
              badgeClass = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
            } else if (catLower === 'ferramenta' || catLower === 'ferramentas') {
              badgeClass = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
            }

            const pkgs = sw.pacotes || (sw as any).packages || [];

            return (
              <div key={idx} className="p-3 text-xs hover:bg-[#181F2E]/60 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-white flex items-center gap-1.5 truncate" title={sw.nome}>
                    <Package className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                    <span className="truncate">{sw.nome}</span>
                  </span>
                  <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold shrink-0 uppercase tracking-wide ${badgeClass}`}>
                    {sw.tipo || 'aplicativo'}
                  </span>
                </div>
                {pkgs && pkgs.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {pkgs.map((p: any, pIdx: number) => (
                      <span
                        key={pIdx}
                        className="rounded bg-[#0B0E14] px-2 py-0.5 text-[10px] font-mono text-slate-300 border border-[#1E2636] flex items-center gap-1"
                      >
                        <span>{p.pacote}</span>
                        {p.versao && <span className="text-orange-400 font-semibold font-mono">@{p.versao}</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
