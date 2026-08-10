import { safeToFixed } from "../../utils/orderFormUtils";
import StatusBadge from "../ui/StatusBadge";

export default function OrderFormSummaryCard({
  documentType,
  clientLabel,
  brandLabel,
  itemCount,
  subtotalAfterLineDiscounts,
  discount,
  discountAmount,
  totalPrice,
  className = "",
}) {
  return (
    <aside
      className={`rounded-2xl border border-edge bg-surface p-4 shadow-soft sm:p-5 ${className}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">Resumo</h3>
        <StatusBadge
          label={documentType === "pedido" ? "Pedido" : "Orçamento"}
          tone={documentType === "pedido" ? "info" : "neutral"}
        />
      </div>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-xs text-ink-muted">Cliente</dt>
          <dd className="mt-0.5 font-medium text-ink">
            {clientLabel || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Representada</dt>
          <dd className="mt-0.5 font-medium text-ink">
            {brandLabel || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Itens</dt>
          <dd className="mt-0.5 font-medium text-ink">{itemCount}</dd>
        </div>
        <div className="border-t border-edge pt-3 space-y-2">
          <div className="flex justify-between gap-3 text-ink-muted">
            <span>Subtotal</span>
            <span className="font-medium">
              R$ {safeToFixed(subtotalAfterLineDiscounts)}
            </span>
          </div>
          {discount > 0 ? (
            <div className="flex justify-between gap-3 text-ink-muted">
              <span>Desconto ({discount}%)</span>
              <span className="font-medium text-red-600">
                − R$ {safeToFixed(discountAmount)}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between gap-3 border-t border-edge pt-2 text-ink">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-semibold text-brand">
              R$ {safeToFixed(totalPrice)}
            </span>
          </div>
        </div>
      </dl>
    </aside>
  );
}
