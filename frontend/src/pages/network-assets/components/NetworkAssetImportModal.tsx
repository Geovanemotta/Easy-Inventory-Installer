import React, { useRef, useState } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  Info,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { networkAssetService } from '@/services/networkAssetService';
import { ImportResult } from '@/types/networkAsset';

interface NetworkAssetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NetworkAssetImportModal: React.FC<NetworkAssetImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setResult(null);
      setErrorMsg(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setErrorMsg(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await networkAssetService.downloadTemplate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Erro ao baixar modelo CSV: ${msg}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setImporting(true);
    setErrorMsg(null);
    try {
      const res = await networkAssetService.importCSV(file);
      setResult(res);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Erro ao importar CSV: ${msg}`);
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
          onClick={() => !importing && handleClose()}
        />

        {/* Modal Window Obsidian & Amber */}
        <div className="relative transform overflow-hidden rounded-2xl bg-surface text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-border-subtle">
          <div className="px-6 py-5 border-b border-border-subtle bg-app flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-fg">
                  Importar Planilha de Ativos de Rede
                </h3>
                <p className="text-xs text-fg-secondary mt-0.5">
                  Carregamento em lote compatível com Excel (.csv) e Google Planilhas
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              disabled={importing}
              className="p-1.5 rounded-lg text-fg-secondary hover:text-fg hover:bg-elevated transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Explanatory banner */}
            <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-4 space-y-2 text-xs text-gray-700 dark:text-slate-300">
              <div className="flex items-center gap-2 font-bold text-orange-600 dark:text-orange-300">
                <Info className="h-4 w-4 shrink-0 text-orange-400" />
                <span>Padrão de Colunas Recomendado:</span>
              </div>
              <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                <span className="px-2 py-0.5 rounded bg-elevated border border-border-medium text-orange-600 dark:text-orange-300 font-bold">LOCALIZACAO</span>
                <span className="px-2 py-0.5 rounded bg-elevated border border-border-medium text-orange-600 dark:text-orange-300 font-bold">IP</span>
                <span className="px-2 py-0.5 rounded bg-elevated border border-border-medium text-orange-600 dark:text-orange-300 font-bold">TIPO</span>
                <span className="px-2 py-0.5 rounded bg-elevated border border-border-medium text-orange-600 dark:text-orange-300 font-bold">NOME</span>
                <span className="px-2 py-0.5 rounded bg-elevated border border-border-medium text-orange-600 dark:text-orange-300 font-bold">PATRIMONIO</span>
                <span className="px-2 py-0.5 rounded bg-elevated border border-border-medium text-orange-600 dark:text-orange-300 font-bold">MAC</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-fg-secondary pt-1">
                <li>Valores como <strong className="text-fg">LJ01</strong> ou <strong className="text-fg">CB02</strong> na coluna <code>LOCALIZACAO</code> associam a filial automaticamente.</li>
                <li>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" /> Proteção Ativa de Estações:
                  </span>{' '}
                  se algum IP pertencer a uma máquina inventariada pelos agentes, o computador é preservado e seu patrimônio é sincronizado.
                </li>
              </ul>
            </div>

            {/* Drag & Drop Area */}
            <div
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-orange-500 bg-orange-500/10 scale-[1.01]'
                  : file
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : 'border-border-medium hover:border-orange-500/40 bg-elevated/60'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="flex flex-col items-center justify-center space-y-2">
                <div
                  className={`p-3 rounded-full ${
                    file ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-elevated border border-border-medium text-orange-400'
                  }`}
                >
                  <Upload className="h-6 w-6" />
                </div>
                {file ? (
                  <div>
                    <p className="text-sm font-bold text-fg">{file.name}</p>
                    <p className="text-xs text-fg-secondary font-mono mt-0.5">
                      {(file.size / 1024).toFixed(1)} KB • Clique para trocar de arquivo
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-fg">
                      Clique aqui para selecionar ou arraste o arquivo CSV
                    </p>
                    <p className="text-xs text-fg-muted mt-0.5">
                      Separado por vírgula, ponto-e-vírgula ou tabulação (UTF-8 ou Latin-1)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Results Output */}
            {result && (
              <div className="rounded-xl border border-border-subtle bg-app p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                  <h4 className="text-xs font-bold text-fg uppercase tracking-wider">
                    Resultado do Processamento
                  </h4>
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                      +{result.criados} criados
                    </span>
                    <span className="text-orange-400 bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 rounded-full font-mono">
                      {result.atualizados} atualizados
                    </span>
                    <span className="text-fg-secondary bg-elevated border border-border-medium px-2 py-0.5 rounded-full font-mono">
                      {result.ignorados} ignorados
                    </span>
                  </div>
                </div>

                {/* Station conflicts */}
                {result.conflitos_estacao && result.conflitos_estacao.length > 0 && (
                  <div className="rounded-lg bg-surface border border-amber-500/30 p-3 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
                      <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span>
                        {result.conflitos_estacao.length} Estações de Trabalho Identificadas (Protegidas)
                      </span>
                    </div>
                    <div className="max-h-36 overflow-y-auto divide-y divide-border-subtle pr-1">
                      {result.conflitos_estacao.map((c, idx) => (
                        <div key={idx} className="py-1.5 flex items-center justify-between text-[11px]">
                          <div>
                            <span className="font-mono font-bold text-fg">{c.ip}</span>
                            <span className="text-fg-secondary ml-1.5">
                              (Estação: <strong className="text-fg">{c.estacao_nome}</strong>)
                            </span>
                          </div>
                          <div>
                            {c.patrimonio_atualizado ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                                <Check className="h-3 w-3" /> Patrimônio atualizado: {c.patrimonio_novo}
                              </span>
                            ) : (
                              <span className="text-fg-muted">Mantido</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error messages */}
                {result.erros && result.erros.length > 0 && (
                  <div className="rounded-lg bg-rose-500/15 border border-rose-500/30 p-3 text-xs space-y-1">
                    <span className="font-bold text-rose-700 dark:text-rose-300">
                      Alertas / Erros ({result.erros.length})
                    </span>
                    <ul className="list-disc pl-5 text-rose-700 dark:text-rose-300 max-h-24 overflow-y-auto text-[11px]">
                      {result.erros.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Actions footer */}
            <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-slate-300 bg-elevated border border-border-medium hover:bg-border-subtle hover:text-fg transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-orange-400" />
                Baixar Modelo CSV
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={importing}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-slate-300 bg-elevated border border-border-medium hover:bg-border-subtle hover:text-fg transition-colors cursor-pointer"
                >
                  {result ? 'Fechar' : 'Cancelar'}
                </button>
                <button
                  type="submit"
                  disabled={!file || importing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <Upload className={`h-4 w-4 ${importing ? 'animate-spin' : ''}`} />
                  {importing ? 'Processando CSV...' : 'Processar Importação'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
