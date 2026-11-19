import { useId } from "react";
import { createPortal } from "react-dom";
import useAccessibleDialog from "../../hooks/useAccessibleDialog";

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
  const panelRef = useAccessibleDialog(() => onClose?.(), Boolean(open));

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex justify-end" role="presentation">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-overlay/50 animate-fade-in"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative z-10 flex h-full w-full ${widthClass} flex-col border-l border-edge bg-surface-elevated shadow-pop focus:outline-none animate-drawer-in`}
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
            className="rounded-xl p-2 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
            aria-label="Fechar painel"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer ? (
          <footer className="shrink-0 border-t border-edge bg-surface px-5 py-4 sm:px-6">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}
