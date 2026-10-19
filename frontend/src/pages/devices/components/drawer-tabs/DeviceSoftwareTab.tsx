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
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {[
            { key: 'todos', label: 'Todos', count: softwareCounts.todos, color: 'text-slate-700' },
            { key: 'aplicativo', label: 'Aplicativos', count: softwareCounts.aplicativo, color: 'text-blue-700' },
            { key: 'agente', label: 'Agentes', count: softwareCounts.agente, color: 'text-purple-700' },
            { key: 'runtime', label: 'Runtimes', count: softwareCounts.runtime, color: 'text-emerald-700' },
            { key: 'ferramenta', label: 'Ferramentas', count: softwareCounts.ferramenta, color: 'text-amber-700' },
          ].map((cat) => {
            const active = softwareCategoryFilter === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSoftwareCategoryFilter(cat.key)}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors border flex items-center gap-1.5 ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    active ? 'bg-slate-700 text-slate-100' : 'bg-slate-200 text-slate-700'
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
          Carregando inventário de softwares da máquina...
        </div>
      ) : filteredSoftwares.length === 0 ? (
        <div className="text-center py-16 text-xs text-slate-400">
          Nenhum software encontrado.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          {filteredSoftwares.map((sw: DeviceSoftwareItem, idx: number) => {
            const catLower = (sw.tipo || '').toLowerCase();
            let badgeClass = 'bg-slate-50 text-slate-700 border-slate-200';
            if (catLower === 'aplicativo' || catLower === 'aplicativos') {
              badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
            } else if (catLower === 'agente' || catLower === 'agentes') {
              badgeClass = 'bg-purple-50 text-purple-700 border-purple-200';
            } else if (catLower === 'runtime' || catLower === 'runtimes') {
              badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            } else if (catLower === 'ferramenta' || catLower === 'ferramentas') {
              badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
            }

            const pkgs = sw.pacotes || (sw as any).packages || [];

            return (
              <div key={idx} className="p-3 text-xs hover:bg-slate-50/70 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5 truncate" title={sw.nome}>
                    <Package className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">{sw.nome}</span>
                  </span>
                  <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold shrink-0 uppercase tracking-wide ${badgeClass}`}>
                    {sw.tipo || 'aplicativo'}
                  </span>
                </div>
                {pkgs && pkgs.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {pkgs.map((p: any, pIdx: number) => (
                      <span
                        key={pIdx}
                        className="rounded bg-slate-50 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 border border-slate-200"
                      >
                        {p.pacote} {p.versao && <span className="text-slate-400">@ {p.versao}</span>}
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
