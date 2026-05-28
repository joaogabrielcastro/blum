import { useCallback } from "react";
import { useToast } from "../context/ToastContext";
import {
  allowsDecimalQuantityBrand,
  parseQuantityByBrand,
} from "../utils/orderFormUtils";

export function useOrderFormItems(
  items,
  setItems,
  {
    selectedBrandId,
    setProductSearch,
    setSearchResults,
    setMobileProductPickerOpen,
  },
) {
  const toast = useToast();

  const handleItemChange = useCallback(
    (index, field, value) => {
      const newItems = [...items];

      if (field === "quantity") {
        const itemBrand = newItems[index].brand;
        const raw = String(value ?? "").trim();
        if (raw === "") {
          newItems[index][field] = "";
          setItems(newItems);
          return;
        }
        const parsedQty = parseQuantityByBrand(value, itemBrand);
        if (!parsedQty) {
          toast.warning(
            allowsDecimalQuantityBrand(itemBrand)
              ? "Informe uma quantidade válida maior que zero."
              : "Informe uma quantidade inteira maior que zero.",
          );
          return;
        }
        if (
          newItems[index].availableStock &&
          !allowsDecimalQuantityBrand(itemBrand) &&
          parsedQty > newItems[index].availableStock
        ) {
          toast.warning(
            `Quantidade solicitada (${parsedQty}) excede o estoque disponível (${newItems[index].availableStock}) para "${newItems[index].productName}"`,
          );
          return;
        }
        newItems[index][field] = parsedQty;
        setItems(newItems);
        return;
      }

      if (field === "lineDiscount") {
        let v = parseFloat(value);
        if (!Number.isFinite(v)) v = 0;
        v = Math.min(100, Math.max(0, v));
        newItems[index][field] = v;
      } else if (field === "price") {
        const price = parseFloat(String(value).replace(",", "."));
        if (!Number.isFinite(price) || price <= 0) return;
        newItems[index][field] = price;
      } else {
        newItems[index][field] = value;
      }
      setItems(newItems);
    },
    [items, setItems, toast],
  );

  const handleProductSelect = useCallback(
    (product) => {
      if (!product) return;

      const existingItem = items.find(
        (item) =>
          (item.productId != null &&
            String(item.productId) === String(product.id)) ||
          (!item.productId && item.productName === product.name),
      );

      if (!existingItem) {
        if (product.stock <= 0 && !allowsDecimalQuantityBrand(product.brand)) {
          toast.warning(`Produto "${product.name}" sem estoque disponível!`);
          return;
        }

        setItems((prev) => [
          ...prev,
          {
            productName: product.name,
            brand: product.brand,
            brandId:
              product.brandId ??
              product.brand_id ??
              selectedBrandId ??
              null,
            quantity: "",
            price: product.price,
            lineDiscount: 0,
            productId: product.id,
            productcode: product.productcode ?? product.productCode ?? "",
            availableStock: product.stock,
          },
        ]);
      } else {
        toast.warning("Este produto já foi adicionado ao pedido.");
      }

      setProductSearch("");
      setSearchResults([]);
      setMobileProductPickerOpen(false);
    },
    [
      items,
      setItems,
      selectedBrandId,
      setProductSearch,
      setSearchResults,
      setMobileProductPickerOpen,
      toast,
    ],
  );

  const removeItem = useCallback(
    (index) => {
      setItems((prev) => prev.filter((_, i) => i !== index));
    },
    [setItems],
  );

  return { handleItemChange, handleProductSelect, removeItem };
}
