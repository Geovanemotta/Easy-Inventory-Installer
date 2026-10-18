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
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          onClick={() => !importing && handleClose()}
        />

        {/* Modal Window */}
        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-slate-200">
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-600">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Importar Planilha de Ativos de Rede
                </h3>
                <p className="text-xs text-slate-500">
                  Carregamento em lote compatível com Excel (.csv) e Google Planilhas
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              disabled={importing}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Explanatory banner */}
            <div className="rounded-xl bg-blue-50/70 border border-blue-200/80 p-4 space-y-2 text-xs text-blue-900">
              <div className="flex items-center gap-2 font-bold text-blue-800">
                <Info className="h-4 w-4 shrink-0 text-blue-600" />
                <span>Padrão de Colunas Recomendado:</span>
              </div>
              <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">LOCALIZACAO</span>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">IP</span>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">TIPO</span>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">NOME</span>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">PATRIMONIO</span>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">MAC</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 pt-1">
                <li>Valores como <strong>LJ01</strong> ou <strong>CB02</strong> na coluna <code>LOCALIZACAO</code> associam a filial automaticamente.</li>
                <li>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
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
                  ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
                  : file
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
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
                    file ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Upload className="h-6 w-6" />
                </div>
                {file ? (
                  <div>
                    <p className="text-sm font-bold text-slate-800">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB • Clique para trocar de arquivo
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      Clique aqui para selecionar ou arraste o arquivo CSV
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Separado por vírgula, ponto-e-vírgula ou tabulação (UTF-8 ou Latin-1)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Results Output */}
            {result && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Resultado do Processamento
                  </h4>
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      +{result.criados} criados
                    </span>
                    <span className="text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      {result.atualizados} atualizados
                    </span>
                    <span className="text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
                      {result.ignorados} ignorados
                    </span>
                  </div>
                </div>

                {/* Station conflicts */}
                {result.conflitos_estacao && result.conflitos_estacao.length > 0 && (
                  <div className="rounded-lg bg-white border border-amber-200 p-3 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-amber-800">
                      <ShieldCheck className="h-4 w-4 text-amber-600" />
                      <span>
                        {result.conflitos_estacao.length} Estações de Trabalho Identificadas (Protegidas)
                      </span>
                    </div>
                    <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 pr-1">
                      {result.conflitos_estacao.map((c, idx) => (
                        <div key={idx} className="py-1.5 flex items-center justify-between text-[11px]">
                          <div>
                            <span className="font-mono font-bold text-slate-800">{c.ip}</span>
                            <span className="text-slate-500 ml-1.5">
                              (Estação: <strong>{c.estacao_nome}</strong>)
                            </span>
                          </div>
                          <div>
                            {c.patrimonio_atualizado ? (
                              <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                                <Check className="h-3 w-3" /> Patrimônio atualizado: {c.patrimonio_novo}
                              </span>
                            ) : (
                              <span className="text-slate-400">Mantido</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error messages */}
                {result.erros && result.erros.length > 0 && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs space-y-1">
                    <span className="font-bold text-red-800">
                      Alertas / Erros ({result.erros.length})
                    </span>
                    <ul className="list-disc pl-5 text-red-700 max-h-24 overflow-y-auto text-[11px]">
                      {result.erros.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Actions footer */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Baixar Modelo CSV
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={importing}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  {result ? 'Fechar' : 'Cancelar'}
                </button>
                <button
                  type="submit"
                  disabled={!file || importing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50"
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
