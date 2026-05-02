import React, {
  createContext,
  useCallback,
  useContext,
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

  return (
    <ToastContext.Provider
      value={{ success, error, info, warning, dismiss: remove }}
    >
      {children}
      <div
        className="fixed bottom-4 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none sm:left-auto sm:right-4 sm:max-w-md"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto rounded-lg shadow-lg px-4 py-3 text-sm font-medium border ${
              t.variant === "success"
                ? "bg-green-50 text-green-900 border-green-200"
                : t.variant === "error"
                  ? "bg-red-50 text-red-900 border-red-200"
                  : t.variant === "warning"
                    ? "bg-amber-50 text-amber-900 border-amber-200"
                    : "bg-white text-gray-900 border-gray-200"
            }`}
          >
            <div className="flex justify-between gap-3 items-start">
              <span className="flex-1 whitespace-pre-wrap break-words">
                {t.message}
              </span>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-800 shrink-0 -mr-1 px-1"
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
