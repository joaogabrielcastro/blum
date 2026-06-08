import {
  allowsDecimalQuantityBrand,
  parseQuantityByBrand,
} from "./orderFormUtils";

/** Marcas com quantidade decimal não controlam estoque (Solo Fino, Colombocal). */
export function controlsStockByBrand(brand) {
  return !allowsDecimalQuantityBrand(brand);
}

export function parseStockShortfallValue(value) {
  const n = parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function computeItemStockShortfall(item) {
  if (!controlsStockByBrand(item?.brand)) return 0;

  const qty = parseQuantityByBrand(item.quantity, item.brand);
  if (!qty) return 0;

  const availableRaw =
    item.availableStock ??
    item.available_stock ??
    item.stockAtSave ??
    item.stock_at_save;
  const available = parseInt(String(availableRaw ?? ""), 10);
  if (!Number.isFinite(available)) return 0;

  return Math.max(0, qty - available);
}

export function getStockWarningLines(items = []) {
  return items
    .map((item) => {
      const quantity = parseQuantityByBrand(item.quantity, item.brand);
      const availableRaw =
        item.availableStock ??
        item.available_stock ??
        item.stockAtSave ??
        item.stock_at_save ??
        0;
      const available = parseInt(String(availableRaw), 10) || 0;
      const shortfall = computeItemStockShortfall(item);
      return {
        item,
        productName: item.productName || item.product_name || "Produto",
        quantity,
        available,
        shortfall,
      };
    })
    .filter((row) => row.shortfall > 0);
}

export function orderHasStockWarnings(items = []) {
  return getStockWarningLines(items).length > 0;
}
