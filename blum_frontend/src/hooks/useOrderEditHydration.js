import { useEffect } from "react";
import { mergeProductCodeFields } from "../utils/productSearch";

/** Ao editar pedido, carrega só os produtos referenciados nas linhas. */
export function useOrderEditHydration(api, editingOrder, items, setItems) {
  useEffect(() => {
    if (!editingOrder?.id || !items.length) return;

    const ids = [
      ...new Set(
        items.map((i) => i.productId).filter((id) => id != null && id !== ""),
      ),
    ];
    if (!ids.length) return;

    let cancelled = false;
    (async () => {
      try {
        const fetched = await Promise.all(
          ids.map((id) => api.getProductById(id).catch(() => null)),
        );
        if (cancelled) return;
        const byId = new Map(
          fetched
            .filter(Boolean)
            .map((p) => [String(p.id), mergeProductCodeFields(p)]),
        );
        setItems((prev) =>
          prev.map((item) => {
            const p =
              item.productId != null
                ? byId.get(String(item.productId))
                : null;
            if (!p) return item;
            return {
              ...item,
              productcode:
                item.productcode || p.productcode || p.productCode || "",
              availableStock:
                item.availableStock != null ? item.availableStock : p.stock,
              brand: item.brand || p.brand,
            };
          }),
        );
      } catch (err) {
        console.error("Erro ao carregar produtos do pedido:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, editingOrder?.id, items.length, setItems]);
}
