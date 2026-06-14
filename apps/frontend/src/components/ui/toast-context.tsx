import { createContext, useCallback, useContext, useState, type PropsWithChildren, type ReactNode } from "react";

export type ToastType = "success" | "error" | "info";

export type Toast = {
  id: string;
  message: ReactNode;
  type: ToastType;
  persistent?: boolean;
};

type ToastContextValue = {
  toasts: Toast[];
  addToast: (message: ReactNode, type?: ToastType, persistent?: boolean) => void;
  removeToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: ReactNode, type: ToastType = "info", persistent = false) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((current) => [...current, { id, message, type, persistent }]);

    if (!persistent) {
      setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 3000);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div aria-live="polite" className="toast-container" role="region">
        {toasts.map((toast) => (
          <div className={`toast toast-${toast.type}`} key={toast.id}>
            <span className="toast-message">{toast.message}</span>
            <button aria-label="Dismiss notification" className="toast-close" onClick={() => removeToast(toast.id)} type="button">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
