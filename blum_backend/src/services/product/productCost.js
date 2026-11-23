/**
 * Regras de custo do produto (C1).
 * Custo oficial = custo médio ponderado pelo estoque.
 */

function roundCost(value) {
  return Math.round(Number(value) * 10000) / 10000;
}

/**
 * Novo custo médio após uma entrada.
 * - Sem custo anterior ou sem saldo positivo: o custo passa a ser o da entrada.
 * - Estoque negativo (vendido sem estoque) não pesa na média.
 */
function weightedAverageCost({ currentStock, currentCost, quantity, unitCost }) {
  const qty = Number(quantity);
  const cost = Number(unitCost);
  if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(cost)) {
    return currentCost == null ? null : roundCost(currentCost);
  }
  const stock = Math.max(0, Number(currentStock) || 0);
  const prev = currentCost == null ? null : Number(currentCost);
  if (prev == null || !Number.isFinite(prev) || stock === 0) {
    return roundCost(cost);
  }
  return roundCost((stock * prev + qty * cost) / (stock + qty));
}

/** Margem sobre o preço de venda, em % (null se não houver custo/preço). */
function marginPercent(price, cost) {
  const p = Number(price);
  if (cost == null || cost === "") return null;
  const c = Number(cost);
  if (!Number.isFinite(p) || !Number.isFinite(c) || p <= 0) return null;
  return Math.round(((p - c) / p) * 10000) / 100;
}

/** Normaliza o custo vindo de formulário: "" / null = sem custo. */
function parseCostInput(raw) {
  if (raw == null) return null;
  const text = String(raw).trim().replace(",", ".");
  if (text === "") return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0) {
    const err = new Error("Preço de custo inválido.");
    err.statusCode = 400;
    throw err;
  }
  return roundCost(n);
}

module.exports = { weightedAverageCost, marginPercent, parseCostInput, roundCost };
