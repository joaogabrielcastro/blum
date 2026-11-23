/** Custo do produto como número (ou null se não informado). */
export function costFromProduct(product) {
  const raw = product?.costPrice ?? product?.cost_price;
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** "12,5" → 12.5 · "" → null · texto inválido → NaN. */
export function parseDecimalInput(value) {
  const text = String(value ?? "").trim().replace(",", ".");
  if (text === "") return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : NaN;
}

/** Margem sobre o preço de venda, em %. null quando não dá para calcular. */
export function marginPercent(price, cost) {
  const p = Number(price);
  if (cost == null || Number.isNaN(cost)) return null;
  const c = Number(cost);
  if (!Number.isFinite(p) || !Number.isFinite(c) || p <= 0) return null;
  return Math.round(((p - c) / p) * 1000) / 10;
}

/** Tom visual da margem: negativa/zero, baixa (<15%) ou ok. */
export function marginTone(margin) {
  if (margin == null) return "muted";
  if (margin <= 0) return "danger";
  if (margin < 15) return "warning";
  return "success";
}
