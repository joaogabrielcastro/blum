import { computeLineNetTotal } from "./orderLineTotals";

/**
 * Margem estimada do pedido (só admin recebe custo). Itens sem custo ficam
 * fora do cálculo e são contados em `missingCost`.
 */
export function computeOrderMargin(items, discountPercent = 0) {
  const factor = 1 - Math.min(100, Math.max(0, Number(discountPercent) || 0)) / 100;
  let revenueWithCost = 0;
  let cost = 0;
  let missingCost = 0;
  const belowCost = [];

  for (const item of items || []) {
    const unitCost = item.unitCost == null ? null : Number(item.unitCost);
    if (unitCost == null || !Number.isFinite(unitCost)) {
      missingCost += 1;
      continue;
    }
    const qty = Number(item.quantity) || 0;
    const revenue = computeLineNetTotal(item) * factor;
    const lineCost = qty * unitCost;
    revenueWithCost += revenue;
    cost += lineCost;
    if (qty > 0 && revenue / qty < unitCost) {
      belowCost.push(item.productName);
    }
  }

  const profit = revenueWithCost - cost;
  return {
    revenueWithCost,
    cost,
    profit,
    marginPercent:
      revenueWithCost > 0 ? Math.round((profit / revenueWithCost) * 1000) / 10 : null,
    missingCost,
    belowCost,
    hasCostData: revenueWithCost > 0 || cost > 0,
  };
}
