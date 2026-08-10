import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, variant = "info", duration = 4500) => {
      const id = ++idCounter;
      const text = String(message ?? "").trim() || "—";
      setToasts((prev) => [...prev, { id, message: text, variant }]);
      if (duration > 0) {
        setTimeout(() => remove(id), duration);
      }
      return id;
    },
    [remove],
  );

  const success = useCallback((m) => push(m, "success"), [push]);
  const error = useCallback((m) => push(m, "error", 6500), [push]);
  const info = useCallback((m) => push(m, "info"), [push]);
  const warning = useCallback((m) => push(m, "warning", 5500), [push]);

  // Identidade estável: exibir um toast não deve re-renderizar consumidores.
  const contextValue = useMemo(
    () => ({ success, error, info, warning, dismiss: remove }),
    [success, error, info, warning, remove],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        className="fixed bottom-4 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none sm:left-auto sm:right-4 sm:max-w-md"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
              t.variant === "success"
                ? "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/80 dark:text-green-100"
                : t.variant === "error"
                  ? "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/80 dark:text-red-100"
                  : t.variant === "warning"
                    ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-100"
                    : "border-edge bg-surface text-ink"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex-1 break-words whitespace-pre-wrap">
                {t.message}
              </span>
              <button
                type="button"
                className="-mr-1 shrink-0 px-1 text-ink-muted hover:text-ink"
                onClick={() => remove(t.id)}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast deve ser usado dentro de ToastProvider");
  }
  return ctx;
}
