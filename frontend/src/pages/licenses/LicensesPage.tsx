import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, KeyRound, Sparkles, X, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  License,
  LicenseInput,
  LicenseStats,
} from '@/types/license';
import { Site } from '@/types/site';
import { licenseService } from '@/services/licenseService';
import { siteService } from '@/services/siteService';

import { LicenseKpiStrip } from './components/LicenseKpiStrip';
import { LicenseFilters } from './components/LicenseFilters';
import { LicensesTable } from './components/LicensesTable';
import { LicenseFormModal } from './components/LicenseFormModal';
import { LicenseDetailsDrawer } from './components/LicenseDetailsDrawer';

export const LicensesPage: React.FC = () => {
  const { isAdmin, isMatrizOperator } = useAuth();
  const canManage = isAdmin || isMatrizOperator;

  // Dados
  const [licenses, setLicenses] = useState<License[]>([]);
  const [stats, setStats] = useState<LicenseStats | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [siteId, setSiteId] = useState<string>('todos');
  const [categoria, setCategoria] = useState<string>('todos');
  const [status, setStatus] = useState<string>('todas');
  const [softwareNome, setSoftwareNome] = useState<string>('todos');

  // Modais e Drawers
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [detailsLicense, setDetailsLicense] = useState<License | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [licenseToDelete, setLicenseToDelete] = useState<License | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast feedback simples
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Carrega lista de filiais
  useEffect(() => {
    siteService
      .listSites()
      .then((res) => setSites(res))
      .catch((err) => console.error('Erro ao carregar lojas:', err));
  }, []);

  // Carrega dados de licenças e estatísticas
  const loadData = useCallback(() => {
    setLoading(true);
    const siteIdNum = siteId !== 'todos' ? Number(siteId) : undefined;

    Promise.all([
      licenseService.listLicenses({
        site_id: siteIdNum,
        categoria: categoria !== 'todos' ? categoria : undefined,
        status: status !== 'todas' ? status : undefined,
        search: search || undefined,
        software_nome: softwareNome !== 'todos' ? softwareNome : undefined,
      }),
      licenseService.getStats(siteIdNum),
    ])
      .then(([licList, st]) => {
        setLicenses(licList || []);
        setStats(st);
      })
      .catch((err) => {
        console.error('Erro ao carregar licenças:', err);
        showToast('Erro ao carregar dados de licenças');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [siteId, categoria, status, search, softwareNome]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Lista de nomes únicos de softwares cadastrados
  const softwaresDisponiveis = useMemo(() => {
    const set = new Set<string>();
    licenses.forEach((l) => {
      if (l.software_nome) set.add(l.software_nome);
    });
    return Array.from(set).sort();
  }, [licenses]);

  // Ações de formulário
  const handleOpenNewLicense = () => {
    setEditingLicense(null);
    setIsFormModalOpen(true);
  };

  const handleEditLicense = (lic: License) => {
    setEditingLicense(lic);
    setIsFormModalOpen(true);
  };

  const handleSaveLicense = async (data: LicenseInput) => {
    if (editingLicense) {
      await licenseService.updateLicense(editingLicense.id, data);
      showToast(`Licença "${data.software_nome}" atualizada com sucesso!`);
    } else {
      await licenseService.createLicense(data);
      showToast(`Nova licença "${data.software_nome}" cadastrada com sucesso!`);
    }
    loadData();
  };

  // Exclusão de licença
  const handleConfirmDelete = async () => {
    if (!licenseToDelete) return;
    setIsDeleting(true);
    try {
      await licenseService.deleteLicense(licenseToDelete.id);
      showToast(`Licença "${licenseToDelete.software_nome}" excluída com sucesso.`);
      setLicenseToDelete(null);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Erro ao excluir: ${msg}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Visualização de máquinas
  const handleViewDevices = (lic: License) => {
    setDetailsLicense(lic);
    setIsDetailsOpen(true);
  };

  const handleDeviceUnlinked = () => {
    showToast('Licença desvinculada da máquina!');
    loadData();
  };

  // Exportação CSV
  const handleExportCsv = () => {
    if (licenses.length === 0) return;
    const headers = [
      'Software',
      'Categoria',
      'Chave Serial',
      'Tipo Licença',
      'Nota Fiscal',
      'Loja / Filial',
      'Quantidade Total',
      'Quantidade Em Uso',
      'Quantidade Disponível',
      'Esgotada',
      'Data Aquisição',
      'Observações',
    ];

    const rows = licenses.map((l) => [
      l.software_nome,
      l.categoria,
      l.chave,
      l.tipo_licenca || '',
      l.nota_fiscal || '',
      l.site_nome || 'Matriz / Global',
      l.quantidade_total,
      l.quantidade_em_uso,
      l.quantidade_disponivel,
      l.esgotada ? 'Sim' : 'Não',
      l.data_aquisicao ? new Date(l.data_aquisicao).toLocaleDateString('pt-BR') : '',
      l.observacoes || '',
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')),
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'zenithmap_licencas.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Toast Notificação */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-app border border-border-medium px-4 py-2.5 text-xs font-semibold text-fg shadow-2xl animate-in slide-in-from-bottom duration-150">
          <Sparkles className="h-4 w-4 text-orange-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-fg flex items-center gap-2.5">
              <KeyRound className="h-6 w-6 text-orange-400" />
              Controle de Licenças &amp; Seriais
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-orange-500/15 text-orange-400 border border-orange-500/30">
              {stats?.total_licencas ?? 0} lotes
            </span>
          </div>
          <p className="text-xs text-fg-secondary mt-0.5">
            Gestão de licenças de Windows, Office e softwares corporativos por filial
          </p>
        </div>
      </div>

      {/* Faixa de KPIs */}
      <LicenseKpiStrip
        stats={stats}
        statusAtivo={status}
        onSelectStatus={(st) => setStatus(st)}
        loading={loading}
      />

      {/* Filtros */}
      <LicenseFilters
        search={search}
        onSearchChange={setSearch}
        siteId={siteId}
        onSiteChange={setSiteId}
        sites={sites}
        categoria={categoria}
        onCategoriaChange={setCategoria}
        status={status}
        onStatusChange={setStatus}
        softwareNome={softwareNome}
        onSoftwareNomeChange={setSoftwareNome}
        softwaresDisponiveis={softwaresDisponiveis}
        isAdmin={isAdmin}
        onNewLicense={handleOpenNewLicense}
        onRefresh={loadData}
        onExportCsv={handleExportCsv}
        loading={loading}
        totalFiltered={licenses.length}
      />

      {/* Tabela de Licenças */}
      <LicensesTable
        licenses={licenses}
        isAdmin={isAdmin}
        onEditLicense={handleEditLicense}
        onDeleteLicense={(lic) => setLicenseToDelete(lic)}
        onViewDevices={handleViewDevices}
        loading={loading}
      />

      {/* Modal de Cadastro / Edição */}
      <LicenseFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveLicense}
        editingLicense={editingLicense}
        sites={sites}
        initialSiteId={siteId}
      />

      {/* Drawer de Máquinas Vinculadas */}
      <LicenseDetailsDrawer
        license={detailsLicense}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setDetailsLicense(null);
        }}
        canManage={canManage}
        onDeviceUnlinked={handleDeviceUnlinked}
      />

      {/* Modal de Confirmação de Exclusão no padrão Obsidian & Amber */}
      {licenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-surface rounded-2xl border border-border-subtle shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-app">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-fg">Confirmar Exclusão</h3>
                  <p className="text-[11px] text-fg-secondary">Ação irreversível de licença</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLicenseToDelete(null)}
                className="rounded-lg p-1 text-fg-secondary hover:bg-elevated hover:text-fg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs leading-relaxed">
              <p className="text-gray-700 dark:text-slate-300">
                Tem certeza que deseja excluir o lote de licença{' '}
                <strong className="text-fg font-bold bg-elevated px-2 py-0.5 rounded border border-border-medium">
                  "{licenseToDelete.software_nome}"
                </strong>
                ?
              </p>
              {licenseToDelete.quantidade_em_uso > 0 && (
                <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 font-semibold">
                  Atenção: Existem {licenseToDelete.quantidade_em_uso} máquina(s) vinculadas a este serial.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-border-subtle bg-app">
              <button
                type="button"
                onClick={() => setLicenseToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg border border-border-medium bg-elevated text-gray-700 dark:text-slate-300 font-semibold hover:text-fg hover:bg-border-subtle transition-colors text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span>Excluir Definitivamente</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LicensesPage;
