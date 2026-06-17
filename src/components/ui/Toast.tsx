'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Check, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { classNames } from '@/lib/utils';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastInput {
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ActiveToast extends Required<Omit<ToastInput, 'duration'>> {
  id: number;
  duration: number;
}

interface ToastContextValue {
  show: (toast: ToastInput) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Soft tinted background + a 4px left accent border per variant — the toast
// language from the reference dashboards.
const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'bg-[#DCFCE7] border-l-4 border-primary',
  error: 'bg-danger-light border-l-4 border-danger',
  warning: 'bg-warning-light border-l-4 border-warning',
  info: 'bg-[#EFF6FF] border-l-4 border-[#3B82F6]',
};

const VARIANT_ICONS: Record<ToastVariant, ReactNode> = {
  success: <Check className="h-4 w-4 text-primary" aria-hidden="true" />,
  error: <AlertCircle className="h-4 w-4 text-danger" aria-hidden="true" />,
  warning: <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />,
  info: <Info className="h-4 w-4 text-[#3B82F6]" aria-hidden="true" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const idCounter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    ({ message, variant = 'info', duration = 4000 }: ToastInput) => {
      idCounter.current += 1;
      const toast: ActiveToast = {
        id: idCounter.current,
        message,
        variant,
        duration,
      };
      setToasts((current) => [...current, toast]);
    },
    [],
  );

  const value = useMemo<ToastContextValue>(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[1200] flex flex-col items-center gap-2 px-4 md:items-end md:bottom-6 md:right-6 md:left-auto md:px-0"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ActiveToast;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => window.clearTimeout(timer);
  }, [toast.duration, toast.id, onDismiss]);

  return (
    <div
      role="status"
      className={classNames(
        'animate-toast-in pointer-events-auto w-full max-w-sm text-text-primary',
        'shadow-md rounded-md px-4 py-3 flex items-start gap-3',
        VARIANT_STYLES[toast.variant],
      )}
    >
      <span className="mt-0.5">{VARIANT_ICONS[toast.variant]}</span>
      <p className="text-sm leading-snug flex-1">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Fermer la notification"
        className="text-xs font-semibold text-text-muted hover:text-text-primary"
      >
        ×
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within <ToastProvider>.');
  }
  return ctx;
}

export default ToastProvider;
