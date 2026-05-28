import { safeToFixed } from "../../utils/orderFormUtils";

export default function OrderFormTotals({
  subtotalAfterLineDiscounts,
  discount,
  discountAmount,
  totalPrice,
}) {
  return (
    <section className="mt-6 sm:mt-8 bg-green-50/50 p-4 sm:p-5 md:p-6 rounded-xl border border-green-100 min-w-0">
      <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">
        Resumo financeiro
      </h3>
      <div className="space-y-3">
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-gray-600 text-sm sm:text-base">
          <span className="min-w-0 flex-1">Subtotal (após descontos nos itens)</span>
          <span className="font-medium shrink-0">
            R$ {safeToFixed(subtotalAfterLineDiscounts)}
          </span>
        </div>
        {discount > 0 && (
          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-gray-600 text-sm sm:text-base">
            <span>Desconto geral ({discount}%)</span>
            <span className="font-medium text-red-500 shrink-0">
              - R$ {safeToFixed(discountAmount)}
            </span>
          </div>
        )}
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 items-center text-gray-900 pt-3 border-t border-green-200/80">
          <span className="text-base sm:text-lg font-bold">Total do Pedido</span>
          <span className="text-lg sm:text-xl font-bold text-green-700 shrink-0">
            R$ {safeToFixed(totalPrice)}
          </span>
        </div>
      </div>
    </section>
  );
}
