/** Resolve representada na lista carregada da API. */
export function findBrandById(brands, brandId) {
  if (brandId == null || brandId === "") return null;
  return (brands || []).find((b) => String(b.id) === String(brandId)) ?? null;
}

export function findBrandByName(brands, brandName) {
  const name = String(brandName ?? "").trim();
  if (!name) return null;
  return (
    (brands || []).find((b) => String(b.name || "").trim() === name) ?? null
  );
}

export function brandNameFromSelection(brands, { brandId, brandName }) {
  if (brandName) return String(brandName).trim();
  return findBrandById(brands, brandId)?.name ?? "";
}

export function brandIdFromSelection(brands, { brandId, brandName }) {
  if (brandId != null && brandId !== "") return String(brandId);
  const found = findBrandByName(brands, brandName);
  return found?.id != null ? String(found.id) : "";
}
