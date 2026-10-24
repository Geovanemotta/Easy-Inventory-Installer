import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { NetworkAsset } from '@/types/networkAsset';

interface NetworkAssetDeleteModalsProps {
  assetToDelete: NetworkAsset | null;
  onCancelSingleDelete: () => void;
  onConfirmSingleDelete: () => void;
  confirmBulkDeleteOpen: boolean;
  selectedCount: number;
  onCancelBulkDelete: () => void;
  onConfirmBulkDelete: () => void;
  deleting: boolean;
}

export const NetworkAssetDeleteModals: React.FC<NetworkAssetDeleteModalsProps> = ({
  assetToDelete,
  onCancelSingleDelete,
  onConfirmSingleDelete,
  confirmBulkDeleteOpen,
  selectedCount,
  onCancelBulkDelete,
  onConfirmBulkDelete,
  deleting,
}) => {
  return (
    <>
      {/* 1. Single Delete Confirmation */}
      {assetToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <div
              className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
              onClick={() => !deleting && onCancelSingleDelete()}
            />
            <div className="relative transform overflow-hidden rounded-2xl bg-surface text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-border-subtle p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400">
                  <Trash2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-fg">Excluir Ativo de Rede?</h3>
                  <p className="text-xs text-fg-secondary">Esta ação não poderá ser desfeita.</p>
                </div>
              </div>

              <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                Tem certeza que deseja remover o equipamento{' '}
                <strong className="text-fg font-bold">{assetToDelete.nome}</strong>{' '}
                {assetToDelete.ip ? <span className="font-mono tabular-nums text-gray-700 dark:text-slate-300">({assetToDelete.ip})</span> : ''} do inventário permanente?
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={onCancelSingleDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-slate-300 bg-elevated border border-border-medium hover:bg-border-subtle hover:text-fg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onConfirmSingleDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Bulk Delete Confirmation */}
      {confirmBulkDeleteOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <div
              className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
              onClick={() => !deleting && onCancelBulkDelete()}
            />
            <div className="relative transform overflow-hidden rounded-2xl bg-surface text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-border-subtle p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-fg">
                    Excluir {selectedCount} Ativos Selecionados?
                  </h3>
                  <p className="text-xs text-fg-secondary">Exclusão permanente em lote</p>
                </div>
              </div>

              <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                Você está prestes a remover permanentemente{' '}
                <strong className="text-fg font-bold font-mono">{selectedCount} equipamentos</strong>{' '}
                do inventário de ativos. Esta ação não poderá ser desfeita.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={onCancelBulkDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-slate-300 bg-elevated border border-border-medium hover:bg-border-subtle hover:text-fg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onConfirmBulkDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {deleting ? 'Excluindo...' : `Excluir ${selectedCount} Ativos`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
