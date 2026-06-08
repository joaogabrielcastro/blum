import { useState } from "react";

export default function OrderStockWarningModal({
  open,
  title,
  description,
  lines = [],
  requireExplicitConfirm = false,
  confirmLabel = "Continuar mesmo assim",
  onConfirm,
  onCancel,
}) {
  const [acknowledged, setAcknowledged] = useState(false);

  if (!open) return null;

  const canConfirm = !requireExplicitConfirm || acknowledged;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-warning-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 sm:px-5">
          <h3
            id="stock-warning-title"
            className="text-base sm:text-lg font-semibold text-amber-950"
          >
            {title}
          </h3>
          {description ? (
            <p className="mt-1 text-sm text-amber-900/90">{description}</p>
          ) : null}
        </div>

        <div className="overflow-y-auto px-4 py-3 sm:px-5 space-y-2 flex-1">
          {lines.map((line) => (
            <div
              key={`${line.productName}-${line.quantity}-${line.available}`}
              className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-sm"
            >
              <p className="font-medium text-gray-900 break-words">
                {line.productName}
              </p>
              <p className="text-amber-900 mt-1">
                Pedido: <strong>{line.quantity}</strong> · Disponível:{" "}
                <strong>{line.available}</strong> · Falta:{" "}
                <strong>{line.shortfall}</strong>
              </p>
            </div>
          ))}
        </div>

        {requireExplicitConfirm ? (
          <label className="flex items-start gap-2 px-4 sm:px-5 pb-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
            <span>
              Confirmo que o cliente está ciente de que há itens sem estoque
              suficiente e que a entrega pode depender de reposição.
            </span>
          </label>
        ) : null}

        <div className="flex flex-col-reverse sm:flex-row gap-2 border-t border-gray-200 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 min-h-11 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Voltar e ajustar
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => {
              if (!canConfirm) return;
              onConfirm();
              setAcknowledged(false);
            }}
            className="flex-1 min-h-11 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
