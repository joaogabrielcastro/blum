import { useState } from "react";
import ProductSheet from "./products/ProductSheet";
import KebabMenu from "./ui/KebabMenu";
import formatCurrency from "../utils/format";
import { costFromProduct, marginPercent, marginTone } from "../utils/productCost";

const MARGIN_TONE_CLASS = {
  danger: "text-red-600",
  warning: "text-amber-700",
  success: "text-emerald-700",
  muted: "text-ink-muted",
};

const ProductRow = ({
  product,
  onEdit,
  onDelete,
  confirmDelete,
  deleteType,
  deleteId,
  onConfirmDelete,
  onCancelDelete,
  userRole,
  selectable = false,
  selected = false,
  onToggleSelect,
}) => {
  const [showSheet, setShowSheet] = useState(false);
  const lowStock = product.stock <= (product.minstock || 0);
  const priceValue =
    product.price != null && !Number.isNaN(Number(product.price))
      ? Number(product.price)
      : 0;
  // Custo e margem só chegam da API para admin.
  const isAdmin = userRole === "admin";
  const cost = isAdmin ? costFromProduct(product) : null;
  const margin = marginPercent(priceValue, cost);

  const menuItems = [
    userRole === "admin"
      ? {
          id: "sheet",
          label: "Ficha do produto",
          onClick: () => setShowSheet(true),
        }
      : null,
    userRole === "admin"
      ? {
          id: "edit",
          label: "Editar",
          onClick: () => onEdit(product),
        }
      : null,
    userRole === "admin"
      ? {
          id: "delete",
          label: "Excluir",
          tone: "danger",
          onClick: () => onDelete("product", product.id, product.name),
        }
      : null,
  ].filter(Boolean);

  return (
    <>
      <tr className="border-b border-edge transition-colors duration-200 ease-in-out hover:bg-surface-muted/50">
        {selectable ? (
          <td className="w-10 px-3 py-3.5">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect?.(product.id)}
              aria-label={`Selecionar ${product.name}`}
              className="h-4 w-4 rounded border-zinc-300 text-brand focus:ring-brand/30"
            />
          </td>
        ) : null}
        <td className="px-4 py-3.5">
          <div className="flex min-w-0 flex-col">
            {isAdmin ? (
              <button
                type="button"
                onClick={() => setShowSheet(true)}
                className="text-left font-semibold text-ink hover:text-brand hover:underline"
              >
                {product.name}
              </button>
            ) : (
              <h3 className="font-semibold text-ink">{product.name}</h3>
            )}
            <span className="mt-1 w-fit rounded-md border border-edge bg-surface-muted px-2 py-0.5 font-mono text-xs text-ink-muted">
              {product.productcode || product.productCode || "—"}
            </span>
          </div>
        </td>
        <td className="px-4 py-3.5 text-sm text-ink-muted">{product.brand}</td>
        <td className="px-4 py-3.5 text-right">
          <div className="flex flex-col items-end">
            <span className="text-base font-semibold tabular-nums text-ink">
              {formatCurrency(priceValue)}
            </span>
            {isAdmin ? (
              <span className="mt-0.5 text-xs tabular-nums text-ink-muted">
                {cost == null ? (
                  "Sem custo"
                ) : (
                  <>
                    Custo {formatCurrency(cost)} ·{" "}
                    <span className={`font-medium ${MARGIN_TONE_CLASS[marginTone(margin)]}`}>
                      {margin == null
                        ? "—"
                        : `${margin.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
                    </span>
                  </>
                )}
              </span>
            ) : null}
          </div>
        </td>
        <td className="px-4 py-3.5 text-right">
          <div className="flex flex-col items-end">
            <span
              className={`text-sm font-medium tabular-nums ${
                lowStock ? "text-red-600" : "text-ink"
              }`}
            >
              {product.stock} un.
            </span>
            {product.minstock > 0 ? (
              <span className="mt-0.5 text-xs text-ink-muted">
                Mín. {product.minstock}
              </span>
            ) : null}
          </div>
        </td>
        <td className="px-3 py-3.5 text-right">
          {menuItems.length > 0 ? <KebabMenu items={menuItems} /> : null}
        </td>
      </tr>

      {confirmDelete &&
      deleteType === "product" &&
      deleteId === product.id ? (
        <tr>
          <td colSpan={selectable ? 6 : 5} className="p-0">
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/50 p-4">
              <div className="w-full max-w-sm rounded-2xl border border-edge bg-surface/95 p-6 shadow-glass">
                <h3 className="text-lg font-semibold text-ink">
                  Excluir produto?
                </h3>
                <p className="mt-2 text-sm text-ink-muted">
                  Tem certeza que deseja excluir{" "}
                  <strong className="text-ink">{confirmDelete}</strong>?
                </p>
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={onCancelDelete}
                    className="flex-1 rounded-xl border border-edge py-2 text-sm font-semibold text-ink transition-all duration-200 hover:bg-surface-muted active:scale-[0.98]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => onConfirmDelete(product.id)}
                    className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-red-500 active:scale-[0.98]"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      ) : null}

      {showSheet ? (
        <ProductSheet productId={product.id} onClose={() => setShowSheet(false)} />
      ) : null}
    </>
  );
};

export default ProductRow;
