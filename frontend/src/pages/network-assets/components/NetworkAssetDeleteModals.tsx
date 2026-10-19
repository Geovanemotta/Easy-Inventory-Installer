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
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => !deleting && onCancelSingleDelete()}
            />
            <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-slate-200 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600">
                  <Trash2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Excluir Ativo de Rede?</h3>
                  <p className="text-xs text-slate-500">Esta ação não poderá ser desfeita.</p>
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                Tem certeza que deseja remover o equipamento{' '}
                <strong className="text-slate-900 font-bold">{assetToDelete.nome}</strong>{' '}
                {assetToDelete.ip ? `(${assetToDelete.ip})` : ''} do inventário permanente?
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onCancelSingleDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onConfirmSingleDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-xs disabled:opacity-50"
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
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => !deleting && onCancelBulkDelete()}
            />
            <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-slate-200 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Excluir {selectedCount} Ativos Selecionados?
                  </h3>
                  <p className="text-xs text-slate-500">Exclusão permanente em lote</p>
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                Você está prestes a remover permanentemente{' '}
                <strong className="text-slate-900 font-bold">{selectedCount} equipamentos</strong>{' '}
                do inventário de ativos. Esta ação não poderá ser desfeita.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onCancelBulkDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onConfirmBulkDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-xs disabled:opacity-50"
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
