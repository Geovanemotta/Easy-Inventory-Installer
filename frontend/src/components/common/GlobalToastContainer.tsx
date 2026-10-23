import React, { useEffect, useState } from 'react';
import { subscribeGlobalToast, ToastData } from '@/utils/clipboard';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const GlobalToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeGlobalToast((newToasts) => {
      setToasts(newToasts);
    });
    return unsubscribe;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none select-none max-w-sm w-full"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-xs font-semibold shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-2 fade-in ${
              isSuccess
                ? 'bg-surface text-fg border border-border-medium/80 shadow-emerald-950/20'
                : isError
                ? 'bg-rose-900 text-white border border-rose-700 shadow-rose-950/20'
                : 'bg-elevated text-fg border border-border-medium'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {isSuccess && <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
              {isError && <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />}
              {!isSuccess && !isError && <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />}
              <span className="truncate">{toast.message}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
