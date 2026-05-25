import {
  allowsDecimalQuantityBrand,
  safeToFixed,
} from "../../utils/orderFormUtils";
import { computeLineNetTotal } from "../../utils/orderLineTotals";

export default function OrderFormLineItems({
  items,
  clientId,
  canEditUnitPrice,
  onItemChange,
  onRemoveItem,
  onOpenHistory,
}) {
  if (!items.length) return null;

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Itens do Pedido</h3>

      <div className="space-y-3 md:hidden">
        {items.map((item, index) => (
          <div
            key={item.productId || index}
            className="border border-gray-200 rounded-lg p-3 space-y-3"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {item.productName}
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                  Codigo: {item.productcode}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{item.brand}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Quantidade
                </label>
                <input
                  type="number"
                  step={
                    allowsDecimalQuantityBrand(item.brand) ? "0.001" : "1"
                  }
                  max={
                    allowsDecimalQuantityBrand(item.brand)
                      ? undefined
                      : item.availableStock || undefined
                  }
                  value={
                    item.quantity === "" || item.quantity == null
                      ? ""
                      : item.quantity
                  }
                  placeholder="—"
                  onChange={(e) =>
                    onItemChange(index, "quantity", e.target.value)
                  }
                  className="w-full p-2.5 border border-gray-300 rounded-md text-center text-base focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {item.availableStock ? (
                  <span className="text-xs text-gray-500 mt-1 inline-block">
                    Disponivel: {item.availableStock}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onRemoveItem(index)}
                className="h-11 px-3 border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors"
              >
                Remover item
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-500 block">
                Desconto no item (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={item.lineDiscount ?? 0}
                onChange={(e) =>
                  onItemChange(index, "lineDiscount", e.target.value)
                }
                className="w-full p-2.5 border border-gray-300 rounded-md text-center text-base"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-500 block">
                Preço unitário (R$)
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={item.price}
                onChange={(e) => onItemChange(index, "price", e.target.value)}
                disabled={!canEditUnitPrice}
                className="w-full p-2.5 border border-gray-300 rounded-md text-center text-base disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Unitário: R$ {safeToFixed(item.price)}
              </span>
              <span className="font-semibold text-gray-900">
                Subtotal: R$ {safeToFixed(computeLineNetTotal(item))}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onOpenHistory(item)}
              disabled={!clientId || !item.productId}
              className="w-full rounded-md border border-blue-300 px-2 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Ver histórico deste produto no cliente
            </button>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg hidden md:block">
        <table className="w-full min-w-[980px] divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[300px]">
                Produto
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[110px]">
                Qtd.
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                Desc. %
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                Preço Unit.
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[130px]">
                Subtotal
              </th>
              <th className="sticky right-0 z-10 bg-gray-50 px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px] border-l border-gray-200">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item, index) => (
              <tr key={item.productId || index}>
                <td className="px-5 py-4">
                  <div className="max-w-[300px]">
                    <div
                      className="text-sm font-medium text-gray-900 truncate"
                      title={item.productName}
                    >
                      {item.productName}
                    </div>
                    <div className="text-sm text-gray-500 space-y-1">
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                        Código: {item.productcode}
                      </span>
                      <div title={item.brand}>{item.brand}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    step={
                      allowsDecimalQuantityBrand(item.brand) ? "0.001" : "1"
                    }
                    max={
                      allowsDecimalQuantityBrand(item.brand)
                        ? undefined
                        : item.availableStock || undefined
                    }
                    value={
                      item.quantity === "" || item.quantity == null
                        ? ""
                        : item.quantity
                    }
                    placeholder="—"
                    onChange={(e) =>
                      onItemChange(index, "quantity", e.target.value)
                    }
                    className="w-full min-w-[82px] p-2 border border-gray-300 rounded-md text-center text-base font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-center">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={item.lineDiscount ?? 0}
                    onChange={(e) =>
                      onItemChange(index, "lineDiscount", e.target.value)
                    }
                    className="w-full min-w-[78px] p-2 border border-gray-300 rounded-md text-center text-base font-medium"
                  />
                </td>
                <td className="px-5 py-4 whitespace-nowrap text-right">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.price}
                    onChange={(e) =>
                      onItemChange(index, "price", e.target.value)
                    }
                    disabled={!canEditUnitPrice}
                    className="w-full min-w-[105px] p-2 border border-gray-300 rounded-md text-right text-base font-medium disabled:bg-gray-100"
                  />
                </td>
                <td className="px-5 py-4 whitespace-nowrap text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    R$ {safeToFixed(computeLineNetTotal(item))}
                  </span>
                </td>
                <td className="sticky right-0 z-10 bg-white px-5 py-4 text-center border-l border-gray-100">
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => onRemoveItem(index)}
                      className="px-3 py-1.5 border border-red-200 text-red-600 rounded-md hover:bg-red-50 text-sm font-medium"
                    >
                      Excluir
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenHistory(item)}
                      disabled={!clientId || !item.productId}
                      className="px-2 py-1 border border-blue-200 text-blue-700 rounded-md hover:bg-blue-50 text-xs font-semibold disabled:opacity-50"
                    >
                      Histórico cliente
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
