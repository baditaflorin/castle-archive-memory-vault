import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { uuid } from '../utils/ids.js';

type ToastKind = 'info' | 'success' | 'error';

interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
  expiresAt: number;
}

interface ToastApi {
  push(kind: ToastKind, message: string, ttlMs?: number): void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((kind: ToastKind, message: string, ttlMs = 4000) => {
    const id = uuid();
    setItems((prev) => [...prev, { id, kind, message, expiresAt: Date.now() + ttlMs }]);
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    const next = items.reduce((min, it) => Math.min(min, it.expiresAt), Infinity);
    const handle = window.setTimeout(
      () => {
        const now = Date.now();
        setItems((prev) => prev.filter((it) => it.expiresAt > now));
      },
      Math.max(50, next - Date.now())
    );
    return () => window.clearTimeout(handle);
  }, [items]);

  const api = useMemo<ToastApi>(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      >
        {items.map((it) => (
          <div
            key={it.id}
            role={it.kind === 'error' ? 'alert' : 'status'}
            className={[
              'pointer-events-auto max-w-md rounded-md px-4 py-2 text-sm shadow-lg backdrop-blur',
              it.kind === 'success' && 'bg-emerald-900/90 text-emerald-50',
              it.kind === 'error' && 'bg-red-900/90 text-red-50',
              it.kind === 'info' && 'bg-stone-800/90 text-parchment-50',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {it.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
