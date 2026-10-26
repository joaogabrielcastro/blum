import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  PrimaryButton,
  SecondaryButton,
  DangerButton,
} from "./ui/Surface";

const ConfirmationModal = ({
  show,
  onConfirm,
  onCancel,
  title = "Confirmação",
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  tone = "danger",
}) => {
  useEffect(() => {
    if (!show) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [show, onCancel]);

  if (!show) return null;

  const ConfirmBtn = tone === "danger" ? DangerButton : PrimaryButton;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-900/40 p-4 dark:bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="w-full max-w-sm rounded-2xl border border-edge bg-surface p-6 shadow-soft">
        <h3
          id="confirm-modal-title"
          className="text-lg font-semibold tracking-tight text-ink"
        >
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{message}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <SecondaryButton onClick={onCancel} className="w-full sm:w-auto">
            {cancelText}
          </SecondaryButton>
          <ConfirmBtn onClick={onConfirm} className="w-full sm:w-auto">
            {confirmText}
          </ConfirmBtn>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ConfirmationModal;
