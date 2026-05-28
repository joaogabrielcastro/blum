import {
  allowsDecimalQuantityBrand,
  safeToFixed,
} from "../../utils/orderFormUtils";
import { computeLineNetTotal } from "../../utils/orderLineTotals";

function OrderItemCard({
  item,
  index,
  clientId,
  canEditUnitPrice,
  onItemChange,
  onRemoveItem,
  onOpenHistory,
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 sm:p-4 space-y-3 bg-white">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 break-words">
          {item.productName}
        </p>
        <div className="flex flex-wrap gap-1 mt-1">
          <span className="bg-gray-100 px-2 py-0.5 rounded text-xs break-all">
            Código: {item.productcode}
          </span>
        </div>
        {item.brand ? (
          <p className="text-xs text-gray-500 mt-1 break-words">{item.brand}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="col-span-1">
          <label className="text-xs text-gray-500 block mb-1">Quantidade</label>
          <input
            type="number"
            step={allowsDecimalQuantityBrand(item.brand) ? "0.001" : "1"}
            max={
              allowsDecimalQuantityBrand(item.brand)
                ? undefined
                : item.availableStock || undefined
            }
            value={
              item.quantity === "" || item.quantity == null ? "" : item.quantity
            }
            placeholder="—"
            onChange={(e) => onItemChange(index, "quantity", e.target.value)}
            className="w-full p-2.5 border border-gray-300 rounded-md text-center text-base focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {item.availableStock ? (
            <span className="text-xs text-gray-500 mt-1 block">
              Disp.: {item.availableStock}
            </span>
          ) : null}
        </div>
        <div className="col-span-1">
          <label className="text-xs text-gray-500 block mb-1">Desc. %</label>
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
        <div className="col-span-2 sm:col-span-2">
          <label className="text-xs text-gray-500 block mb-1">
            Preço unit. (R$)
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
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm border-t border-gray-100 pt-3">
        <span className="text-gray-600">
          Unit.: R$ {safeToFixed(item.price)}
        </span>
        <span className="font-semibold text-gray-900">
          Subtotal: R$ {safeToFixed(computeLineNetTotal(item))}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => onRemoveItem(index)}
          className="flex-1 min-h-10 px-3 border border-red-200 text-red-600 rounded-md hover:bg-red-50 text-sm font-medium"
        >
          Remover item
        </button>
        <button
          type="button"
          onClick={() => onOpenHistory(item)}
          disabled={!clientId || !item.productId}
          className="flex-1 min-h-10 rounded-md border border-blue-300 px-2 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Histórico no cliente
        </button>
      </div>
    </div>
  );
}

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
    <div className="mt-6 sm:mt-8 min-w-0">
      <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">
        Itens do Pedido
      </h3>

      {/* Cards: telas até xl (evita tabela larga com scroll em laptops/tablets) */}
      <div className="space-y-3 xl:hidden">
        {items.map((item, index) => (
          <OrderItemCard
            key={item.productId || index}
            item={item}
            index={index}
            clientId={clientId}
            canEditUnitPrice={canEditUnitPrice}
            onItemChange={onItemChange}
            onRemoveItem={onRemoveItem}
            onOpenHistory={onOpenHistory}
          />
        ))}
      </div>

      {/* Tabela só em telas largas */}
      <div className="hidden xl:block border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full table-fixed divide-y divide-gray-200">
          <colgroup>
            <col className="w-[32%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Produto
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Qtd.
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Desc. %
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Preço unit.
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Subtotal
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item, index) => (
              <tr key={item.productId || index} className="align-top">
                <td className="px-3 py-3">
                  <div className="min-w-0">
                    <div
                      className="text-sm font-medium text-gray-900 break-words"
                      title={item.productName}
                    >
                      {item.productName}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                      <span className="inline-block bg-gray-100 px-1.5 py-0.5 rounded break-all">
                        {item.productcode}
                      </span>
                      {item.brand ? (
                        <div className="break-words">{item.brand}</div>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-2 py-3">
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
                    className="w-full p-2 border border-gray-300 rounded-md text-center text-sm"
                  />
                </td>
                <td className="px-2 py-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={item.lineDiscount ?? 0}
                    onChange={(e) =>
                      onItemChange(index, "lineDiscount", e.target.value)
                    }
                    className="w-full p-2 border border-gray-300 rounded-md text-center text-sm"
                  />
                </td>
                <td className="px-3 py-3">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.price}
                    onChange={(e) =>
                      onItemChange(index, "price", e.target.value)
                    }
                    disabled={!canEditUnitPrice}
                    className="w-full p-2 border border-gray-300 rounded-md text-right text-sm disabled:bg-gray-100"
                  />
                </td>
                <td className="px-3 py-3 text-right text-sm font-semibold text-gray-900 whitespace-nowrap">
                  R$ {safeToFixed(computeLineNetTotal(item))}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => onRemoveItem(index)}
                      className="px-2 py-1 border border-red-200 text-red-600 rounded-md hover:bg-red-50 text-xs font-medium"
                    >
                      Excluir
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenHistory(item)}
                      disabled={!clientId || !item.productId}
                      className="px-2 py-1 border border-blue-200 text-blue-700 rounded-md hover:bg-blue-50 text-xs font-semibold disabled:opacity-50"
                    >
                      Histórico
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
