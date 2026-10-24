import React from 'react';
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
import { SelectDropdown, SelectOption } from '@/components/common/SelectDropdown';

interface AppsTableProps {
  items: SoftwareCatalogItem[];
  totalFleet: number;
  onSelectSoftware: (software: SoftwareCatalogItem) => void;
  selectedSoftwareId?: number | null;
  loading?: boolean;
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onPerPageChange: (newPerPage: number) => void;
}

const TIPO_STYLES: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: React.FC<{ className?: string }> }
> = {
  aplicativo: {
    label: 'Aplicativo',
    bg: 'bg-blue-500/15',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
    icon: AppWindow,
  },
  agente: {
    label: 'Agente',
    bg: 'bg-purple-500/15',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/30',
    icon: ShieldAlert,
  },
  runtime: {
    label: 'Runtime',
    bg: 'bg-amber-500/15',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
    icon: Terminal,
  },
  ferramenta: {
    label: 'Ferramenta',
    bg: 'bg-elevated',
    text: 'text-fg-secondary',
    border: 'border-border-medium/30',
    icon: Wrench,
  },
};

const PER_PAGE_OPTIONS: SelectOption[] = [
  { value: '25', label: '25' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
];

export const AppsTable: React.FC<AppsTableProps> = ({
  items,
  totalFleet: _totalFleet,
  onSelectSoftware,
  selectedSoftwareId,
  loading = false,
  page,
  perPage,
  totalItems,
  totalPages,
  onPageChange,
  onPerPageChange,
}) => {
  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border-subtle p-8 text-center shadow-sm">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent" />
        <p className="mt-2 text-xs font-medium text-fg-secondary">
          Carregando catálogo de softwares...
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-surface rounded-xl border border-border-subtle p-12 text-center shadow-sm space-y-2">
        <Package className="h-10 w-10 text-fg-muted mx-auto" />
        <h4 className="text-sm font-bold text-fg">Nenhum software encontrado</h4>
        <p className="text-xs text-fg-secondary max-w-sm mx-auto">
          Tente ajustar os filtros de categoria, plataforma, loja ou alterar os termos da busca.
        </p>
      </div>
    );
  }

  const safePage = Math.min(Math.max(1, page), totalPages || 1);
  const startIndex = (safePage - 1) * perPage;
  const endIndex = Math.min(startIndex + items.length, totalItems);

  return (
    <div className="bg-surface rounded-xl border border-border-subtle shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-subtle bg-app text-[11px] font-bold uppercase tracking-wider text-fg-secondary">
              <th className="py-3 px-4">Software / Pacote</th>
              <th className="py-3 px-4">Categoria</th>
              <th className="py-3 px-4">Versão Mais Recente (Parque)</th>
              <th className="py-3 px-4">Presença na Frota</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle text-xs">
            {items.map((item) => {
              const tipoInfo = TIPO_STYLES[item.tipo] || {
                label: item.tipo,
                bg: 'bg-elevated',
                text: 'text-fg-secondary',
                border: 'border-border-medium/30',
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
                      ? 'bg-orange-500/10 hover:bg-orange-500/15'
                      : 'hover:bg-elevated/90'
                  }`}
                >
                  {/* Nome e Identificador */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-elevated border border-border-medium text-fg-secondary group-hover:border-orange-500/40 group-hover:text-orange-400 transition-colors shrink-0">
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-fg group-hover:text-orange-400 transition-colors">
                          {item.nome}
                        </div>
                        <div className="text-[11px] font-mono text-fg-secondary truncate max-w-xs">
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

                  {/* Versão Mais Recente e Dispersão */}
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-fg bg-elevated px-2 py-0.5 rounded border border-border-medium">
                          {versaoRecente ? `v${versaoRecente}` : 'N/D'}
                        </span>
                        {isAppOrAgent && versaoRecente && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
                            <ShieldCheck className="h-3 w-3" />
                            Mais recente
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px]">
                        {isAppOrAgent ? (
                          <>
                            {item.total_versoes > 1 ? (
                              <span className="text-amber-600 dark:text-amber-400 font-medium">
                                {item.total_versoes} versões distintas no parque
                              </span>
                            ) : (
                              <span className="text-fg-muted">Versão uniforme</span>
                            )}

                            {item.total_desatualizadas !== undefined && item.total_desatualizadas > 0 && (
                              <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-0.5">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                {item.total_desatualizadas} desatualizada{item.total_desatualizadas !== 1 ? 's' : ''}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-fg-muted">
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
                        <span className="font-bold text-fg tabular-nums">
                          {item.total_instalacoes.toLocaleString('pt-BR')}{' '}
                          <span className="text-[11px] font-normal text-fg-secondary">
                            máquina{item.total_instalacoes !== 1 ? 's' : ''}
                          </span>
                        </span>
                        <span className="text-[11px] font-semibold text-fg-secondary tabular-nums">
                          {item.percentual_parque}%
                        </span>
                      </div>
                      <div className="w-full bg-elevated border border-border-medium rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            item.percentual_parque > 50
                              ? 'bg-orange-500'
                              : item.percentual_parque > 15
                              ? 'bg-amber-500'
                              : 'bg-fg-muted'
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
                      className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-orange-400 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 transition-colors shadow-sm cursor-pointer"
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
      <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border-subtle px-4 py-3 bg-app text-xs text-fg-secondary gap-3">
        <div className="flex items-center gap-3">
          <div>
            Exibindo{' '}
            <span className="font-semibold text-fg">
              {totalItems === 0 ? 0 : startIndex + 1}
            </span>{' '}
            a{' '}
            <span className="font-semibold text-fg">
              {endIndex}
            </span>{' '}
            de <span className="font-semibold text-fg">{totalItems}</span> softwares
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-fg-secondary">Por página:</span>
            <div className="w-20">
              <SelectDropdown
                value={String(perPage)}
                onChange={(val) => onPerPageChange(Number(val))}
                options={PER_PAGE_OPTIONS}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            disabled={safePage <= 1}
            className="flex items-center gap-1 rounded-lg border border-border-medium bg-elevated px-2.5 py-1 text-gray-700 dark:text-slate-300 hover:text-fg hover:bg-border-subtle disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-default"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Anterior
          </button>
          <span>
            Página <strong className="font-semibold text-fg">{safePage}</strong> de{' '}
            {totalPages || 1}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            disabled={safePage >= totalPages}
            className="flex items-center gap-1 rounded-lg border border-border-medium bg-elevated px-2.5 py-1 text-gray-700 dark:text-slate-300 hover:text-fg hover:bg-border-subtle disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-default"
          >
            Próxima <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
