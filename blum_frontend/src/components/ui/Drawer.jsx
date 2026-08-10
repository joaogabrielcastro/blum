import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * Slide-over panel from the right (Sheet-style).
 */
export default function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  widthClass = "max-w-xl",
  footer = null,
}) {
  const titleId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex justify-end" role="presentation">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm animate-fade-in dark:bg-black/50"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 flex h-full w-full ${widthClass} flex-col border-l border-edge bg-surface/95 shadow-glass backdrop-blur-md animate-drawer-in`}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-edge px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-lg font-semibold tracking-tight text-ink"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-ink-muted transition-all duration-200 ease-in-out hover:bg-surface-muted hover:text-ink active:scale-[0.98]"
            aria-label="Fechar painel"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer ? (
          <footer className="shrink-0 border-t border-edge bg-surface/80 px-5 py-4 backdrop-blur-md sm:px-6">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}
