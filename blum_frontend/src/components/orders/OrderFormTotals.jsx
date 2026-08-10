import { safeToFixed } from "../../utils/orderFormUtils";

export default function OrderFormTotals({
  subtotalAfterLineDiscounts,
  discount,
  discountAmount,
  totalPrice,
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-edge bg-surface-muted/80 p-4 sm:p-5">
      <h3 className="mb-3 text-base font-semibold text-ink">
        Resumo financeiro
      </h3>
      <div className="space-y-3">
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-ink-muted sm:text-base">
          <span className="min-w-0 flex-1">
            Subtotal (após descontos nos itens)
          </span>
          <span className="shrink-0 font-medium">
            R$ {safeToFixed(subtotalAfterLineDiscounts)}
          </span>
        </div>
        {discount > 0 && (
          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-ink-muted sm:text-base">
            <span>Desconto geral ({discount}%)</span>
            <span className="shrink-0 font-medium text-red-600">
              − R$ {safeToFixed(discountAmount)}
            </span>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-edge pt-3 text-ink">
          <span className="text-base font-semibold sm:text-lg">Total</span>
          <span className="shrink-0 text-lg font-semibold text-brand sm:text-xl">
            R$ {safeToFixed(totalPrice)}
          </span>
        </div>
      </div>
    </section>
  );
}
