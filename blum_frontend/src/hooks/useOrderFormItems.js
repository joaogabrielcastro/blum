import { useCallback, useState } from "react";
import { useToast } from "../context/ToastContext";
import {
  allowsDecimalQuantityBrand,
  parseQuantityByBrand,
} from "../utils/orderFormUtils";

function lineToStaging(item, index) {
  return {
    mode: "edit",
    editIndex: index,
    productName: item.productName,
    brand: item.brand,
    brandId: item.brandId ?? null,
    quantity: item.quantity === "" || item.quantity == null ? "" : item.quantity,
    price: item.price,
    lineDiscount: item.lineDiscount ?? 0,
    productId: item.productId,
    productcode: item.productcode ?? "",
    availableStock: item.availableStock ?? null,
  };
}

function productToStaging(product, selectedBrandId) {
  return {
    mode: "new",
    editIndex: null,
    productName: product.name,
    brand: product.brand,
    brandId: product.brandId ?? product.brand_id ?? selectedBrandId ?? null,
    quantity: "",
    price: product.price,
    lineDiscount: 0,
    productId: product.id,
    productcode: product.productcode ?? product.productCode ?? "",
    availableStock: product.stock,
  };
}

function findExistingIndex(items, product) {
  return items.findIndex(
    (item) =>
      (item.productId != null &&
        String(item.productId) === String(product.id)) ||
      (!item.productId && item.productName === product.name),
  );
}

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
  const [stagingItem, setStagingItem] = useState(null);

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
          newItems[index].availableStock != null &&
          !allowsDecimalQuantityBrand(itemBrand) &&
          parsedQty > newItems[index].availableStock
        ) {
          toast.warning(
            `Quantidade (${parsedQty}) acima do estoque (${newItems[index].availableStock}) em "${newItems[index].productName}". O item ficará marcado com aviso de ruptura.`,
          );
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

  const updateStagingField = useCallback(
    (field, value) => {
      setStagingItem((prev) => {
        if (!prev) return prev;

        if (field === "quantity") {
          const raw = String(value ?? "").trim();
          if (raw === "") return { ...prev, quantity: "" };
          const parsedQty = parseQuantityByBrand(value, prev.brand);
          if (!parsedQty) {
            toast.warning(
              allowsDecimalQuantityBrand(prev.brand)
                ? "Informe uma quantidade válida maior que zero."
                : "Informe uma quantidade inteira maior que zero.",
            );
            return prev;
          }
          if (
            prev.availableStock != null &&
            !allowsDecimalQuantityBrand(prev.brand) &&
            parsedQty > prev.availableStock
          ) {
            toast.warning(
              `Quantidade (${parsedQty}) acima do estoque (${prev.availableStock}). O item ficará marcado com aviso de ruptura.`,
            );
          }
          return { ...prev, quantity: parsedQty };
        }

        if (field === "lineDiscount") {
          let v = parseFloat(value);
          if (!Number.isFinite(v)) v = 0;
          v = Math.min(100, Math.max(0, v));
          return { ...prev, lineDiscount: v };
        }

        if (field === "price") {
          const price = parseFloat(String(value).replace(",", "."));
          if (!Number.isFinite(price) || price <= 0) return prev;
          return { ...prev, price };
        }

        return { ...prev, [field]: value };
      });
    },
    [toast],
  );

  const cancelStaging = useCallback(() => {
    setStagingItem(null);
  }, []);

  const selectProductForStaging = useCallback(
    (product) => {
      if (!product) return;

      const existingIndex = findExistingIndex(items, product);
      if (existingIndex >= 0) {
        setStagingItem(lineToStaging(items[existingIndex], existingIndex));
        toast.info("Produto já no pedido — ajuste a quantidade aqui.");
      } else {
        if (product.stock <= 0 && !allowsDecimalQuantityBrand(product.brand)) {
          toast.warning(
            `Produto "${product.name}" sem estoque. Você pode incluir; o orçamento/pedido será salvo com aviso de ruptura.`,
          );
        }
        setStagingItem(productToStaging(product, selectedBrandId));
      }

      setProductSearch("");
      setSearchResults([]);
      setMobileProductPickerOpen(false);
    },
    [
      items,
      selectedBrandId,
      setProductSearch,
      setSearchResults,
      setMobileProductPickerOpen,
      toast,
    ],
  );

  const selectLineItemForStaging = useCallback(
    (index) => {
      if (index < 0 || index >= items.length) return;
      setStagingItem(lineToStaging(items[index], index));
    },
    [items],
  );

  const confirmStaging = useCallback(() => {
    if (!stagingItem) return false;

    const rawQty = stagingItem.quantity;
    const parsedQty = parseQuantityByBrand(rawQty, stagingItem.brand);
    if (!parsedQty) {
      toast.warning(
        allowsDecimalQuantityBrand(stagingItem.brand)
          ? "Informe a quantidade do item antes de continuar."
          : "Informe uma quantidade inteira maior que zero.",
      );
      return false;
    }

    const linePayload = {
      productName: stagingItem.productName,
      brand: stagingItem.brand,
      brandId: stagingItem.brandId,
      quantity: parsedQty,
      price: stagingItem.price,
      lineDiscount: stagingItem.lineDiscount ?? 0,
      productId: stagingItem.productId,
      productcode: stagingItem.productcode,
      availableStock: stagingItem.availableStock,
    };

    if (stagingItem.mode === "edit" && stagingItem.editIndex != null) {
      setItems((prev) =>
        prev.map((item, i) =>
          i === stagingItem.editIndex ? { ...item, ...linePayload } : item,
        ),
      );
      toast.success("Item atualizado.");
    } else {
      setItems((prev) => [...prev, linePayload]);
      toast.success("Item adicionado ao pedido.");
    }

    setStagingItem(null);
    return true;
  }, [stagingItem, setItems, toast]);

  const removeItem = useCallback(
    (index) => {
      setItems((prev) => prev.filter((_, i) => i !== index));
      setStagingItem((prev) => {
        if (!prev || prev.mode !== "edit") return prev;
        if (prev.editIndex === index) return null;
        if (prev.editIndex > index) {
          return { ...prev, editIndex: prev.editIndex - 1 };
        }
        return prev;
      });
    },
    [setItems],
  );

  return {
    handleItemChange,
    handleProductSelect: selectProductForStaging,
    removeItem,
    stagingItem,
    updateStagingField,
    confirmStaging,
    cancelStaging,
    selectLineItemForStaging,
  };
}
