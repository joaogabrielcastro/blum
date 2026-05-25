import { safeToFixed } from "../../utils/orderFormUtils";

export default function OrderProductResultRow({ product, onSelect }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(product)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(product);
        }
      }}
      className="p-3 cursor-pointer hover:bg-blue-50 active:bg-blue-100 border-b border-gray-100 last:border-b-0"
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900">{product.name}</div>
          <div className="text-sm text-gray-600 mt-1 flex flex-wrap gap-1">
            <span className="bg-gray-100 px-2 py-1 rounded text-xs">
              Codigo: {product.productcode}
            </span>
          </div>
          <div className="text-sm text-gray-500 mt-1">{product.brand}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-medium text-green-600">
            R$ {safeToFixed(product.price)}
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${
              product.stock > 0
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            Estoque: {product.stock}
          </span>
        </div>
      </div>
    </div>
  );
}
