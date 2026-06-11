import { useEffect, useRef } from "react";
import {
  allowsDecimalQuantityBrand,
  safeToFixed,
} from "../../utils/orderFormUtils";
import { computeLineNetTotal } from "../../utils/orderLineTotals";
import { computeItemStockShortfall } from "../../utils/orderStockWarnings";
import OrderFormItemHistoryPanel from "./OrderFormItemHistoryPanel";

export default function OrderFormProductStaging({
  stagingItem,
  clientId,
  canEditUnitPrice,
  onFieldChange,
  onConfirm,
  onCancel,
  onOpenFullHistory,
}) {
  const qtyRef = useRef(null);

  useEffect(() => {
    if (stagingItem) {
      qtyRef.current?.focus();
      qtyRef.current?.select();
    }
  }, [stagingItem?.productId, stagingItem?.editIndex, stagingItem?.mode]);

  if (!stagingItem) return null;

  const isEdit = stagingItem.mode === "edit";
  const shortfall = computeItemStockShortfall(stagingItem);
  const decimalQty = allowsDecimalQuantityBrand(stagingItem.brand);

  const handleQtyKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onConfirm();
    }
  };

  return (
    <div
      className={`rounded-xl border-2 bg-gradient-to-b from-blue-50/80 to-white p-4 sm:p-5 space-y-4 shadow-sm ${
        isEdit ? "border-indigo-300" : "border-blue-300"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
            {isEdit ? "Editar item do pedido" : "Item selecionado"}
          </p>
          <h4 className="mt-1 text-base sm:text-lg font-bold text-gray-900 break-words">
            {stagingItem.productName}
          </h4>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded bg-white px-2 py-1 font-medium text-gray-700 border border-gray-200">
              Código: {stagingItem.productcode || "—"}
            </span>
            {stagingItem.brand ? (
              <span className="rounded bg-white px-2 py-1 text-gray-600 border border-gray-200">
                {stagingItem.brand}
              </span>
            ) : null}
            <span className="rounded bg-green-50 px-2 py-1 font-semibold text-green-800 border border-green-200">
              R$ {safeToFixed(stagingItem.price)}
            </span>
            {stagingItem.availableStock != null && !decimalQty ? (
              <span
                className={`rounded px-2 py-1 border ${
                  stagingItem.availableStock > 0
                    ? "bg-white text-gray-700 border-gray-200"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}
              >
                Estoque: {stagingItem.availableStock}
              </span>
            ) : null}
            {shortfall > 0 ? (
              <span className="rounded bg-amber-50 px-2 py-1 font-medium text-amber-900 border border-amber-200">
                Falta: {shortfall}
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-white hover:text-gray-600"
          aria-label="Fechar painel do item"
        >
          ✕
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <p className="mb-2 text-xs font-semibold text-gray-700">
          Histórico no cliente
        </p>
        <OrderFormItemHistoryPanel
          clientId={clientId}
          productId={stagingItem.productId}
          compact
          onOpenFullHistory={onOpenFullHistory}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="col-span-1">
          <label className="mb-1 block text-xs font-semibold text-gray-700">
            Quantidade *
          </label>
          <input
            ref={qtyRef}
            type="number"
            step={decimalQty ? "0.001" : "1"}
            min={decimalQty ? "0.001" : "1"}
            value={
              stagingItem.quantity === "" || stagingItem.quantity == null
                ? ""
                : stagingItem.quantity
            }
            placeholder="0"
            onChange={(e) => onFieldChange("quantity", e.target.value)}
            onKeyDown={handleQtyKeyDown}
            className="w-full rounded-lg border-2 border-blue-300 bg-white p-3 text-center text-lg font-semibold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="col-span-1">
          <label className="mb-1 block text-xs font-semibold text-gray-700">
            Desc. %
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={stagingItem.lineDiscount ?? 0}
            onChange={(e) => onFieldChange("lineDiscount", e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-3 text-center text-base focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-semibold text-gray-700">
            Preço unit. (R$)
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={stagingItem.price}
            onChange={(e) => onFieldChange("price", e.target.value)}
            disabled={!canEditUnitPrice}
            className="w-full rounded-lg border border-gray-300 p-3 text-center text-base disabled:bg-gray-100 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-gray-200 pt-3">
        <p className="text-sm text-gray-600">
          Subtotal:{" "}
          <span className="font-bold text-gray-900">
            R$ {safeToFixed(computeLineNetTotal(stagingItem))}
          </span>
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 shadow-sm"
          >
            {isEdit ? "Salvar alterações" : "Adicionar ao pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}
