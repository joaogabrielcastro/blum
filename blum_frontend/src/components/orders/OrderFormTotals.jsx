import { safeToFixed } from "../../utils/orderFormUtils";
import formatCurrency from "../../utils/format";

const pct = (n) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

/** Margem estimada (só admin). Itens sem custo ficam fora da conta. */
function MarginBlock({ margin }) {
  if (!margin) return null;
  if (!margin.hasCostData) {
    return (
      <p className="border-t border-edge pt-3 text-xs text-ink-muted">
        Margem: os itens deste pedido ainda não têm custo cadastrado.
      </p>
    );
  }
  const tone =
    margin.marginPercent == null || margin.marginPercent <= 0
      ? "text-red-600"
      : margin.marginPercent < 15
        ? "text-amber-700"
        : "text-emerald-700";
  return (
    <div className="space-y-2 border-t border-edge pt-3 text-sm">
      <div className="flex flex-wrap justify-between gap-x-4 text-ink-muted">
        <span>Lucro estimado · visível só para administradores</span>
        <span className={`font-semibold tabular-nums ${tone}`}>
          {formatCurrency(margin.profit)} ({margin.marginPercent == null ? "—" : pct(margin.marginPercent)})
        </span>
      </div>
      {margin.missingCost > 0 ? (
        <p className="text-xs text-ink-muted">
          {margin.missingCost} item(ns) sem custo ficaram fora do cálculo.
        </p>
      ) : null}
      {margin.belowCost.length > 0 ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-800">
          Abaixo do custo: {margin.belowCost.join(", ")}.
        </p>
      ) : null}
    </div>
  );
}

export default function OrderFormTotals({
  subtotalAfterLineDiscounts,
  discount,
  discountAmount,
  totalPrice,
  margin = null,
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
        <MarginBlock margin={margin} />
      </div>
    </section>
  );
}
