/**
 * Busca tolerante a acentos e a várias palavras (ex.: "Lamp 9w" → nome "Lâmpada LED 9W").
 */

export function normalizeSearchText(value) {
  if (value == null) return "";
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * @param {object} product
 * @param {string} searchQuery
 * @param {string} [brandFilter] - se definido, produto deve ser dessa representada
 */
export function productMatchesFlexible(product, searchQuery, brandFilter) {
  if (brandFilter && String(product.brand || "") !== String(brandFilter)) {
    return false;
  }
  const raw = String(searchQuery || "").trim();
  if (raw.length < 2) return false;

  const tokens = raw.split(/\s+/).filter(Boolean);
  const name = normalizeSearchText(product.name);
  const code = normalizeSearchText(product.productcode || "");
  const sub = normalizeSearchText(product.subcode || "");

  return tokens.every((tok) => {
    const t = normalizeSearchText(tok);
    if (!t) return true;
    return name.includes(t) || code.includes(t) || sub.includes(t);
  });
}
