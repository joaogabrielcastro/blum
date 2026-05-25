import {
  fetchCatalogPage,
  mapImportItemsToCatalog,
} from "./catalogApi";

export function normalizeProductCode(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function buildImportSuccessSummary(
  result,
  selectedBrand,
  purchaseDate,
  rowCount,
) {
  const updated = result?.results?.updated ?? 0;
  const created = result?.results?.created ?? 0;
  const brandLabel = result?.brandUsed || selectedBrand?.name || "—";
  return (
    `✅ ${result?.message || "Importação concluída."}\n\n` +
    `Resumo da importação:\n` +
    `• ${updated} produtos atualizados\n` +
    `• ${created} novos produtos criados\n` +
    `• Representada: ${brandLabel}\n` +
    `• Data da compra: ${purchaseDate}\n` +
    `• Linhas importadas: ${rowCount}`
  );
}

export function getDuplicateProductCodesFromItems(items) {
  const codes = (items || [])
    .map((i) => normalizeProductCode(i.productCode))
    .filter(Boolean);
  const repeated = codes.filter((c, idx) => codes.indexOf(c) !== idx);
  return [...new Set(repeated)];
}

function mergeOneProductCodeGroup(grp) {
  const base = { ...grp[0] };
  let totalQty = 0;
  let totalVal = 0;
  for (const row of grp) {
    const q = Number(row.quantity) || 0;
    const p = Number(row.unitPrice) || 0;
    totalQty += q;
    totalVal += q * p;
  }
  base.quantity = totalQty;
  base.unitPrice =
    totalQty > 0
      ? Math.round((totalVal / totalQty) * 10000) / 10000
      : Number(base.unitPrice) || 0;
  const ids = [...new Set(grp.map((r) => r.mappedProductId).filter(Boolean))];
  base.mappedProductId =
    ids.length === 1 ? ids[0] : grp[0].mappedProductId || "";
  base.isNewProduct = !base.mappedProductId;
  return base;
}

export function mergePurchaseItemsByProductCode(items) {
  if (!Array.isArray(items) || items.length === 0) return items;
  const byCode = new Map();
  for (const it of items) {
    const c = normalizeProductCode(it.productCode);
    if (!c) continue;
    if (!byCode.has(c)) byCode.set(c, []);
    byCode.get(c).push(it);
  }
  const out = [];
  const seen = new Set();
  for (const it of items) {
    const c = normalizeProductCode(it.productCode);
    if (!c) {
      out.push({ ...it });
      continue;
    }
    if (seen.has(c)) continue;
    seen.add(c);
    const grp = byCode.get(c);
    if (grp.length === 1) out.push({ ...grp[0] });
    else out.push(mergeOneProductCodeGroup(grp));
  }
  return out;
}

/** Opções do select de revisão: vínculos da importação + 1ª página do catálogo. */
export async function buildVerificationCatalog(
  api,
  mappedItems,
  brandName,
  brandId,
) {
  const fromImport = await mapImportItemsToCatalog(
    api,
    mappedItems,
    brandName,
    brandId,
  );
  const page =
    brandName || brandId
      ? await fetchCatalogPage(api, brandName, 1, 200, brandId)
      : [];
  const byId = new Map();
  for (const p of [...fromImport.catalogProducts, ...page]) {
    if (p?.id != null) byId.set(String(p.id), p);
  }
  return { items: fromImport.items, catalogProducts: [...byId.values()] };
}

const DUPLICATE_CONFIRM_MSG =
  "Unificar automaticamente?\n" +
  "• Soma as quantidades\n" +
  "• Preço unitário = média ponderada\n" +
  "• Usa o produto do catálogo da primeira linha de cada código";

export async function maybeMergeDuplicateProductCodes(rows, setRows) {
  const duplicateProductCodes = getDuplicateProductCodesFromItems(rows);
  if (!duplicateProductCodes.length) return rows;

  const ok = window.confirm(
    `Códigos de produto repetidos na lista: ${duplicateProductCodes.join(", ")}.\n\n` +
      `${DUPLICATE_CONFIRM_MSG}\n\n` +
      "Cancelar = interrompe a importação.",
  );
  if (!ok) return null;

  const merged = mergePurchaseItemsByProductCode(rows);
  setRows(merged);
  return merged;
}

export function validatePurchaseImportRows(rows) {
  const missingProductCodes = rows.filter(
    (item) => !normalizeProductCode(item.productCode),
  );
  if (missingProductCodes.length > 0) {
    return {
      ok: false,
      error: "Todos os itens devem ter um código de produto preenchido.",
    };
  }

  const invalidItems = rows.filter(
    (item) => !item.quantity || item.unitPrice == null || item.unitPrice <= 0,
  );
  if (invalidItems.length > 0) {
    return {
      ok: false,
      error:
        "Todos os itens devem ter quantidade e preço unitário válidos (maior que zero).",
    };
  }

  return { ok: true };
}

export function buildFinalizePurchasePayload(brandId, purchaseDate, rows) {
  return {
    brandId,
    purchaseDate,
    items: rows.map((item) => ({
      mappedProductId: item.mappedProductId || "",
      productCode: item.productCode,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  };
}
