export {
  buildVerificationCatalog,
  getDuplicateProductCodesFromItems,
  mergePurchaseItemsByProductCode,
  maybeMergeDuplicateProductCodes,
  normalizeProductCode,
} from "./purchaseImportUtils";

export function validateProductImportRows(rows, stockMode = "replace") {
  const missingProductCodes = (rows || []).filter(
    (item) => !String(item.productCode ?? "").trim(),
  );
  if (missingProductCodes.length > 0) {
    return {
      ok: false,
      error: "Todos os itens devem ter um código de produto preenchido.",
    };
  }

  const missingNames = (rows || []).filter(
    (item) => !String(item.description ?? item.name ?? "").trim(),
  );
  if (missingNames.length > 0) {
    return {
      ok: false,
      error: "Todos os itens devem ter descrição/nome preenchido.",
    };
  }

  if (stockMode === "add") {
    const invalidItems = (rows || []).filter(
      (item) =>
        item.quantity == null
        || item.quantity === ""
        || Number(item.quantity) <= 0
        || item.unitPrice == null
        || item.unitPrice === ""
        || Number(item.unitPrice) <= 0,
    );
    if (invalidItems.length > 0) {
      return {
        ok: false,
        error:
          "No modo «Somar estoque», quantidade e preço devem ser maiores que zero.",
      };
    }
  } else {
    const invalidPrice = (rows || []).filter(
      (item) =>
        item.unitPrice == null
        || item.unitPrice === ""
        || Number.isNaN(Number(item.unitPrice))
        || Number(item.unitPrice) < 0,
    );
    if (invalidPrice.length > 0) {
      return {
        ok: false,
        error: "Preço inválido em um ou mais itens (deve ser >= 0).",
      };
    }

    const invalidQty = (rows || []).filter(
      (item) =>
        item.quantity == null
        || item.quantity === ""
        || Number.isNaN(Number(item.quantity))
        || Number(item.quantity) < 0,
    );
    if (invalidQty.length > 0) {
      return {
        ok: false,
        error: "Estoque inválido em um ou mais itens (deve ser >= 0).",
      };
    }
  }

  return { ok: true };
}

export function buildProductImportPayload(brandId, stockMode, rows) {
  return {
    brandId,
    stockMode,
    recordPriceHistory: stockMode === "add",
    items: rows.map((item) => ({
      mappedProductId: item.mappedProductId || "",
      productCode: item.productCode,
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      minStock: Number(item.minStock ?? item.minstock ?? 0),
    })),
  };
}

export function buildProductImportSuccessSummary(result, selectedBrand, rowCount, stockMode) {
  const updated = result?.updated ?? 0;
  const created = result?.created ?? 0;
  const brandLabel = result?.brandUsed || selectedBrand?.name || "—";
  const modeLabel =
    stockMode === "add" ? "Somar estoque" : "Sincronizar catálogo";
  return (
    `${result?.message || "Importação concluída."}\n\n` +
    `Resumo:\n` +
    `• ${updated} produtos atualizados\n` +
    `• ${created} novos produtos criados\n` +
    `• Representada: ${brandLabel}\n` +
    `• Modo: ${modeLabel}\n` +
    `• Linhas importadas: ${rowCount}`
  );
}
