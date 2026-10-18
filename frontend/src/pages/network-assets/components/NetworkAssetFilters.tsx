import React, { useEffect, useState } from 'react';
import {
  Search,
  X,
  Plus,
  Upload,
  Download,
  Zap,
  BarChart3,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { Site, SiteIpRange } from '@/types/site';
import { TIPOS_PREDEFINIDOS } from '@/types/networkAsset';
import { SiteSelect } from '@/components/common/SiteSelect';

interface NetworkAssetFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  siteId: string;
  onSiteChange: (siteId: string) => void;
  tipo: string;
  onTipoChange: (tipo: string) => void;
  statusOnline: 'todos' | 'online' | 'offline' | 'nao_testado';
  onStatusChange: (status: 'todos' | 'online' | 'offline' | 'nao_testado') => void;
  filtroOcupacao: 'todos' | 'ocupados' | 'livres' | 'estacoes' | 'ativos';
  onOcupacaoChange: (val: 'todos' | 'ocupados' | 'livres' | 'estacoes' | 'ativos') => void;
  faixaId: string;
  onFaixaChange: (faixaId: string) => void;
  sites: Site[];
  faixas: SiteIpRange[];
  showKpis: boolean;
  onToggleKpis: () => void;
  onOpenCreate: () => void;
  onOpenScan: () => void;
  onOpenImport: () => void;
  onExportCSV: () => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  isAdmin: boolean;
  loading: boolean;
}

export const NetworkAssetFilters: React.FC<NetworkAssetFiltersProps> = ({
  search,
  onSearchChange,
  siteId,
  onSiteChange,
  tipo,
  onTipoChange,
  statusOnline,
  onStatusChange,
  filtroOcupacao,
  onOcupacaoChange,
  faixaId,
  onFaixaChange,
  sites,
  faixas,
  showKpis,
  onToggleKpis,
  onOpenCreate,
  onOpenScan,
  onOpenImport,
  onExportCSV,
  onResetFilters,
  hasActiveFilters,
  isAdmin,
  loading: _loading,
}) => {
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        onSearchChange(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, search, onSearchChange]);

  const faixasDisponiveis = faixas.filter((f) => {
    if (siteId === 'todos' || siteId === '') return true;
    if (siteId === 'sem') return false;
    return String(f.site_id) === siteId;
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
      {/* Barra de Filtros e Ações em 1 Linha Única Horizontal no Desktop */}
      <div className="flex flex-wrap lg:flex-nowrap items-center gap-2">
        {/* 1. Busca com Debounce */}
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar nome, IP, MAC, patrimônio, modelo..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-7 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch('');
                onSearchChange('');
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              title="Limpar busca"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* 2. Filial */}
        <div className="w-36 shrink-0">
          <SiteSelect
            value={siteId}
            onChange={onSiteChange}
            sites={sites}
            allowAll={true}
            allowWithoutSite={true}
            allLabel="Todas as Filiais"
            fullWidth={true}
          />
        </div>

        {/* 3. Tipo de Ativo */}
        <div className="w-32 shrink-0">
          <select
            value={tipo}
            onChange={(e) => onTipoChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-1.5 px-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none truncate"
          >
            <option value="todos">Todos os Tipos</option>
            {TIPOS_PREDEFINIDOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Status de Conexão */}
        <div className="w-28 shrink-0">
          <select
            value={statusOnline}
            onChange={(e) => onStatusChange(e.target.value as any)}
            className="w-full rounded-lg border border-slate-300 py-1.5 px-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="todos">Status (Todos)</option>
            <option value="online">Online (Ping OK)</option>
            <option value="offline">Offline (Falha)</option>
            <option value="nao_testado">Não Testado</option>
          </select>
        </div>

        {/* 5. Ocupação / Origem */}
        <div className="w-28 shrink-0">
          <select
            value={filtroOcupacao}
            onChange={(e) => onOcupacaoChange(e.target.value as any)}
            className="w-full rounded-lg border border-slate-300 py-1.5 px-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="todos">Ocupação (Todos)</option>
            <option value="ocupados">Apenas Ocupados</option>
            <option value="livres">Apenas IPs Livres</option>
            <option value="estacoes">Apenas Estações</option>
            <option value="ativos">Apenas Ativos</option>
          </select>
        </div>

        {/* 6. Faixa de IP / VLAN */}
        <div className="w-36 shrink-0">
          <select
            value={faixaId}
            onChange={(e) => onFaixaChange(e.target.value)}
            disabled={faixasDisponiveis.length === 0}
            className="w-full rounded-lg border border-slate-300 py-1.5 px-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none disabled:bg-slate-100 disabled:opacity-60 truncate"
          >
            <option value="todas">VLANs (Todas)</option>
            {faixasDisponiveis.map((f) => (
              <option key={f.id} value={String(f.id)}>
                {f.nome}
              </option>
            ))}
          </select>
        </div>

        {/* 7. Botão Toggle 'Indicadores / Resumo' */}
        <button
          type="button"
          onClick={onToggleKpis}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shrink-0 transition-colors ${
            showKpis
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
          title="Exibir ou ocultar resumo e indicadores"
        >
          <BarChart3 className="h-3.5 w-3.5 text-blue-600" />
          <span className="hidden xl:inline">Indicadores</span>
          {showKpis ? (
            <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          )}
        </button>

        {/* 8. Botões de Ação Administrativos e Utilitários */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={onOpenScan}
                className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                title="Testar conectividade (Ping) em lote"
              >
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span className="hidden sm:inline">Varredura</span>
              </button>

              <button
                type="button"
                onClick={onOpenImport}
                className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                title="Importar ativos via planilha CSV"
              >
                <Upload className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Importar</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onExportCSV}
            className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Exportar ativos filtrados para CSV"
          >
            <Download className="h-3.5 w-3.5 text-blue-600" />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          {/* Único Botão Novo Ativo (Admin) */}
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenCreate}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-2xs"
              title="Cadastrar novo ativo de rede"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Ativo</span>
            </button>
          )}

          {/* Botão Limpar Filtros quando ativo */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              title="Limpar todos os filtros"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
