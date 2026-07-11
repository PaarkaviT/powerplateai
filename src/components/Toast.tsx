'use client';

import React, { useState, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

const listeners = new Set<(message: string, type: ToastType) => void>();
let toastIdCounter = 0;

// Exportable trigger function that can be called anywhere in client code
export function toast(message: string, type: ToastType = 'success') {
  listeners.forEach((listener) => listener(message, type));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToast = (message: string, type: ToastType) => {
      const id = toastIdCounter++;
      setToasts((prev) => [...prev, { id, message, type }]);

      // Remove after 3.5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    };

    listeners.add(handleToast);
    return () => {
      listeners.delete(handleToast);
    };
  }, []);

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none sm:bottom-6 sm:left-auto sm:right-6 sm:w-96">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 shadow-xl transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-bottom-4 pointer-events-auto ${
            t.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950 dark:bg-emerald-950 dark:border-emerald-900/50 dark:text-emerald-200'
              : t.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-950 dark:bg-rose-950 dark:border-rose-900/50 dark:text-rose-200'
              : 'bg-zinc-50 border-zinc-200 text-zinc-950 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-200'
          }`}
        >
          <span className="text-base">
            {t.type === 'success' && '✅'}
            {t.type === 'error' && '⚠️'}
            {t.type === 'info' && '✨'}
          </span>
          <p className="text-sm font-medium flex-1 leading-normal">{t.message}</p>
          <button
            onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 ml-2"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
