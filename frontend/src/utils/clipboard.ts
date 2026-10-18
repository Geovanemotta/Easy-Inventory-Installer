import React, { useState } from 'react';

export interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

type ToastListener = (toasts: ToastData[]) => void;
let listeners: ToastListener[] = [];
let toastList: ToastData[] = [];

export function showGlobalToast(
  message: string,
  type: 'success' | 'error' | 'info' = 'success',
  duration = 3200
) {
  const id = Math.random().toString(36).slice(2, 9);
  const toast: ToastData = { id, message, type };
  toastList = [...toastList, toast];
  listeners.forEach((l) => l(toastList));

  setTimeout(() => {
    toastList = toastList.filter((t) => t.id !== id);
    listeners.forEach((l) => l(toastList));
  }, duration);
}

export function subscribeGlobalToast(listener: ToastListener): () => void {
  listeners.push(listener);
  listener(toastList);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

/**
 * Utilitário centralizado e resiliente para cópia de dados.
 * - Evita propagação de clique e abertura de modais/drawers indesejados.
 * - Funciona perfeitamente em HTTP (fallback document.execCommand) e HTTPS (navigator.clipboard).
 * - Dispara Toast visual padronizado.
 */
export async function copyToClipboard(
  text: string,
  label?: string,
  event?: React.MouseEvent | React.SyntheticEvent
): Promise<boolean> {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  if (!text || !text.trim()) {
    showGlobalToast('Nada para copiar.', 'info');
    return false;
  }

  const cleanText = text.trim();
  let success = false;

  // 1. Tenta API moderna do navegador
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(cleanText);
      success = true;
    } else {
      throw new Error('Clipboard API indisponível em contexto não seguro (HTTP)');
    }
  } catch {
    // 2. Fallback robusto para HTTP / 127.0.0.1
    try {
      const textArea = document.createElement('textarea');
      textArea.value = cleanText;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      success = document.execCommand('copy');
      textArea.remove();
    } catch (err) {
      console.error('Falha no fallback de cópia:', err);
      success = false;
    }
  }

  if (success) {
    const msg = label
      ? `${label} "${cleanText}" copiado para a área de transferência!`
      : `"${cleanText}" copiado para a área de transferência!`;
    showGlobalToast(msg, 'success');
  } else {
    showGlobalToast(`Não foi possível copiar "${cleanText}".`, 'error');
  }

  return success;
}

/**
 * Hook para componentes que necessitam alternar o ícone de copiar para um check verde por 1.5s
 */
export function useCopyFeedback() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copy = (
    text: string,
    key: string,
    label?: string,
    event?: React.MouseEvent | React.SyntheticEvent
  ) => {
    copyToClipboard(text, label, event);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((cur) => (cur === key ? null : cur));
    }, 1500);
  };

  return { copiedKey, copy };
}
