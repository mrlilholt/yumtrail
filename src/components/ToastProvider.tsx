import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type Toast = {
  id: string;
  message: string;
  tone?: 'info' | 'success' | 'warning';
};

type ToastContextValue = {
  showToast: (message: string, tone?: Toast['tone']) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, tone: Toast['tone'] = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const next: Toast = { id, message, tone };
    setToasts((prev) => [...prev, next]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed right-6 top-6 z-50 flex w-[280px] flex-col gap-3"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`card animate-fade-in border-l-4 px-4 py-3 text-sm text-pine-900 shadow-soft ${
              toast.tone === 'success'
                ? 'border-moss-400'
                : toast.tone === 'warning'
                ? 'border-sun-400'
                : 'border-mist-300'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};
