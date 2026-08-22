import { parseQuantityByBrand, parseDecimalInput } from "./orderFormUtils";

/** Preço unitário após desconto e acréscimo da linha. */
export function computeLineUnitNet(item) {
  const price = parseDecimalInput(item.price);
  const safePrice = Number.isFinite(price) ? price : 0;
  const ldRaw = parseDecimalInput(item.lineDiscount);
  const ld = Number.isFinite(ldRaw) ? ldRaw : 0;
  const lmRaw = parseDecimalInput(item.lineMarkup);
  const lm = Number.isFinite(lmRaw) ? lmRaw : 0;
  const discountFactor = 1 - Math.min(100, Math.max(0, ld)) / 100;
  const markupFactor = 1 + Math.min(100, Math.max(0, lm)) / 100;
  return safePrice * discountFactor * markupFactor;
}

export function computeLineNetTotal(item) {
  const quantity = parseQuantityByBrand(item.quantity, item.brand);
  return computeLineUnitNet(item) * (quantity > 0 ? quantity : 0);
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
