import React, { useState } from 'react';
import {
  Monitor,
  ChevronRight,
  ChevronLeft,
  AppWindow,
  ShieldAlert,
  Terminal,
  Wrench,
  Package,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { SoftwareCatalogItem } from '@/types/software';

interface AppsTableProps {
  items: SoftwareCatalogItem[];
  totalFleet: number;
  onSelectSoftware: (software: SoftwareCatalogItem) => void;
  selectedSoftwareId?: number | null;
  loading?: boolean;
}

const TIPO_STYLES: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: React.FC<{ className?: string }> }
> = {
  aplicativo: {
    label: 'Aplicativo',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: AppWindow,
  },
  agente: {
    label: 'Agente',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: ShieldAlert,
  },
  runtime: {
    label: 'Runtime',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: Terminal,
  },
  ferramenta: {
    label: 'Ferramenta',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: Wrench,
  },
};

export const AppsTable: React.FC<AppsTableProps> = ({
  items,
  totalFleet: _totalFleet,
  onSelectSoftware,
  selectedSoftwareId,
  loading = false,
}) => {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
        <p className="mt-2 text-xs font-medium text-slate-500">
          Carregando catálogo de softwares...
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs space-y-2">
        <Package className="h-10 w-10 text-slate-300 mx-auto" />
        <h4 className="text-sm font-bold text-slate-700">Nenhum software encontrado</h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Tente ajustar os filtros de categoria, plataforma, loja ou alterar os termos da busca.
        </p>
      </div>
    );
  }

  // Paginação no cliente
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const safePage = Math.min(Math.max(1, page), totalPages || 1);
  const startIndex = (safePage - 1) * perPage;
  const paginatedItems = items.slice(startIndex, startIndex + perPage);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3 px-4">Software / Pacote</th>
              <th className="py-3 px-4">Categoria</th>
              <th className="py-3 px-4">Versão Mais Recente (Parque)</th>
              <th className="py-3 px-4">Presença na Frota</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {paginatedItems.map((item) => {
              const tipoInfo = TIPO_STYLES[item.tipo] || {
                label: item.tipo,
                bg: 'bg-slate-100',
                text: 'text-slate-700',
                border: 'border-slate-200',
                icon: Package,
              };
              const TipoIcon = tipoInfo.icon;
              const isSelected = selectedSoftwareId === item.id;
              const isAppOrAgent = item.tipo === 'aplicativo' || item.tipo === 'agente';
              const versaoRecente = item.versao_mais_recente || item.ultima_versao;

              return (
                <tr
                  key={item.id}
                  onClick={() => onSelectSoftware(item)}
                  className={`group cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50/60 hover:bg-blue-50/80'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  {/* Nome e Identificador */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors shrink-0">
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
                          {item.nome}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 truncate max-w-xs">
                          {item.identifier}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Categoria */}
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${tipoInfo.bg} ${tipoInfo.text} ${tipoInfo.border}`}
                    >
                      <TipoIcon className="h-3 w-3" />
                      {tipoInfo.label}
                    </span>
                  </td>

                  {/* Versão Mais Recente e Dispersão (Alertas de desatualização apenas para aplicativo e agente) */}
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {versaoRecente ? `v${versaoRecente}` : 'N/D'}
                        </span>
                        {isAppOrAgent && versaoRecente && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            <ShieldCheck className="h-3 w-3" />
                            Mais recente
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px]">
                        {isAppOrAgent ? (
                          <>
                            {item.total_versoes > 1 ? (
                              <span className="text-amber-600 font-medium">
                                {item.total_versoes} versões distintas no parque
                              </span>
                            ) : (
                              <span className="text-slate-400">Versão uniforme</span>
                            )}

                            {item.total_desatualizadas !== undefined && item.total_desatualizadas > 0 && (
                              <span className="text-rose-600 font-semibold flex items-center gap-0.5">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                {item.total_desatualizadas} desatualizada{item.total_desatualizadas !== 1 ? 's' : ''}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400">
                            {item.total_versoes > 1
                              ? `${item.total_versoes} versões instaladas`
                              : 'Versão uniforme'}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Instalações / % Frota */}
                  <td className="py-3 px-4 min-w-[200px]">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">
                          {item.total_instalacoes.toLocaleString('pt-BR')}{' '}
                          <span className="text-[11px] font-normal text-slate-500">
                            máquina{item.total_instalacoes !== 1 ? 's' : ''}
                          </span>
                        </span>
                        <span className="text-[11px] font-semibold text-slate-600">
                          {item.percentual_parque}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            item.percentual_parque > 50
                              ? 'bg-blue-600'
                              : item.percentual_parque > 15
                              ? 'bg-indigo-500'
                              : 'bg-slate-400'
                          }`}
                          style={{ width: `${Math.min(item.percentual_parque, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Botão de Ação */}
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSoftware(item);
                      }}
                      className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors shadow-2xs"
                    >
                      <Monitor className="h-3.5 w-3.5" />
                      <span>Ver Máquinas</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Barra de Paginação Padrão */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 px-4 py-3 bg-slate-50 text-xs text-slate-600 gap-3">
        <div className="flex items-center gap-3">
          <div>
            Exibindo{' '}
            <span className="font-semibold text-slate-800">
              {totalItems === 0 ? 0 : startIndex + 1}
            </span>{' '}
            a{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(startIndex + perPage, totalItems)}
            </span>{' '}
            de <span className="font-semibold text-slate-800">{totalItems}</span> softwares
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Por página:</span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="py-1 px-2 rounded border border-slate-200 bg-white text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-default"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Anterior
          </button>
          <span>
            Página <strong className="font-semibold text-slate-800">{safePage}</strong> de{' '}
            {totalPages || 1}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-default"
          >
            Próxima <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
