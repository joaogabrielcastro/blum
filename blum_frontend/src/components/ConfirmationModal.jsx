import { useEffect, useRef, useState } from "react";
import Dialog from "./ui/Dialog";
import Button from "./ui/Button";

/**
 * Confirmação de ação. Se `onConfirm` retornar uma Promise, o botão fica em
 * estado "processando" até ela terminar — impede clique duplo.
 */
const ConfirmationModal = ({
  show,
  onConfirm,
  onCancel,
  title = "Confirmação",
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  tone = "danger",
  loading = false,
}) => {
  const [busy, setBusy] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!show) setBusy(false);
  }, [show]);

  const isBusy = busy || loading;

  const handleConfirm = async () => {
    if (isBusy) return;
    setBusy(true);
    try {
      await onConfirm?.();
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  return (
    <Dialog
      open={show}
      onClose={isBusy ? undefined : onCancel}
      dismissible={!isBusy}
      title={title}
      description={message}
      size="sm"
      footer={
        <>
          <Button onClick={onCancel} disabled={isBusy} className="w-full sm:w-auto">
            {cancelText}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={handleConfirm}
            loading={isBusy}
            className="w-full sm:w-auto"
          >
            {confirmText}
          </Button>
        </>
      }
    />
  );
};

export default ConfirmationModal;
