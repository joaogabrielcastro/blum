import { useId } from "react";
import { createPortal } from "react-dom";
import useAccessibleDialog from "../../hooks/useAccessibleDialog";

/**
 * Diálogo modal acessível: Esc fecha, foco preso e restaurado ao fechar,
 * rolagem da página bloqueada. No celular abre como folha inferior.
 */
export default function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissible = true,
}) {
  if (!open) return null;
  return (
    <DialogInner
      onClose={onClose}
      title={title}
      description={description}
      footer={footer}
      size={size}
      dismissible={dismissible}
    >
      {children}
    </DialogInner>
  );
}

const WIDTHS = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-2xl",
};

function DialogInner({ onClose, title, description, children, footer, size, dismissible }) {
  const titleId = useId();
  const descId = useId();
  const close = () => {
    if (dismissible) onClose?.();
  };
  const ref = useAccessibleDialog(close, true);

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-overlay/50 animate-fade-in"
        onClick={close}
        aria-hidden
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`relative flex max-h-[90vh] w-full flex-col rounded-t-2xl border border-edge bg-surface-elevated shadow-pop animate-fade-in focus:outline-none sm:rounded-2xl ${
          WIDTHS[size] || WIDTHS.md
        }`}
      >
        <div className="px-5 pt-5 sm:px-6">
          <h2 id={titleId} className="text-base font-semibold text-ink">
            {title}
          </h2>
          {description ? (
            <div id={descId} className="mt-1.5 text-sm leading-relaxed text-ink-muted">
              {description}
            </div>
          ) : null}
        </div>
        {children ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 sm:px-6">{children}</div>
        ) : null}
        {footer ? (
          <div className="safe-bottom mt-5 flex flex-col-reverse gap-2 border-t border-edge px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            {footer}
          </div>
        ) : (
          <div className="pb-5" />
        )}
      </div>
    </div>,
    document.body,
  );
}
