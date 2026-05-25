import { safeToFixed } from "../../utils/orderFormUtils";

export default function OrderFormTotals({
  subtotalAfterLineDiscounts,
  discount,
  discountAmount,
  totalPrice,
}) {
  return (
    <section className="mt-8 bg-green-50/50 p-5 sm:p-7 rounded-xl border border-green-100">
      <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">
        Resumo financeiro
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center text-gray-600">
          <span>Subtotal (após descontos nos itens)</span>
          <span className="font-medium">
            R$ {safeToFixed(subtotalAfterLineDiscounts)}
          </span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between items-center text-gray-600">
            <span>Desconto geral ({discount}%)</span>
            <span className="font-medium text-red-500">
              - R$ {safeToFixed(discountAmount)}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center text-gray-900 pt-3 border-t">
          <span className="text-lg sm:text-xl font-bold">Total do Pedido</span>
          <span className="text-xl sm:text-2xl font-bold text-green-700">
            R$ {safeToFixed(totalPrice)}
          </span>
        </div>
      </div>
    </section>
  );
}
