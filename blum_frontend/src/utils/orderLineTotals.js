import { parseQuantityByBrand, parseDecimalInput } from "./orderFormUtils";

export function computeLineNetTotal(item) {
  const price = parseDecimalInput(item.price);
  const safePrice = Number.isFinite(price) ? price : 0;
  const quantity = parseQuantityByBrand(item.quantity, item.brand);
  const ldRaw = parseDecimalInput(item.lineDiscount);
  const ld = Number.isFinite(ldRaw) ? ldRaw : 0;
  const factor = 1 - Math.min(100, Math.max(0, ld)) / 100;
  return safePrice * (quantity > 0 ? quantity : 0) * factor;
}

export function computeOrderTotals(items, discountPercent) {
  const subtotalAfterLineDiscounts = (items || []).reduce(
    (total, item) => total + computeLineNetTotal(item),
    0,
  );
  const discountAmount =
    subtotalAfterLineDiscounts * (parseFloat(discountPercent) / 100);
  const netTotal = subtotalAfterLineDiscounts - discountAmount;
  return { subtotalAfterLineDiscounts, discountAmount, netTotal };
}
