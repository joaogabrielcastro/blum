import { mergeProductCodeFields } from "./productSearch";

/** Busca server-side (filtro por representada no backend quando brandId/brand informados). */
export async function searchCatalogProducts(
  api,
  { q, brand, brandId, limit = 25 },
) {
  const term = String(q ?? "").trim();
  if (term.length < 2) return [];

  const brandIdStr =
    brandId != null && brandId !== "" ? String(brandId) : "";
  const brandNorm = brand ? String(brand).trim() : "";

  const rows = await api.searchProducts(
    term,
    brandNorm || undefined,
    brandIdStr || undefined,
  );
  return (Array.isArray(rows) ? rows : [])
    .map(mergeProductCodeFields)
    .slice(0, limit);
}

/** Uma página do catálogo (para selects de revisão de importação). */
export async function fetchCatalogPage(
  api,
  brand,
  page = 1,
  limit = 200,
  brandId,
) {
  if (!brand && !brandId) return [];
  const response = await api.getProducts(brand || "all", page, limit, brandId);
  const normalizeList = (res) => {
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res)) return res;
    return [];
  };
  return normalizeList(response).map(mergeProductCodeFields);
}

function buildCodeLookupMap(productsByCode) {
  const lookup = new Map();
  for (const [code, product] of Object.entries(productsByCode || {})) {
    const trimmed = String(code ?? "").trim();
    if (!trimmed) continue;
    lookup.set(trimmed, product);
    lookup.set(trimmed.toLowerCase(), product);
  }
  return lookup;
}

/** Resolve vínculo por código sem carregar o catálogo inteiro. */
export async function mapImportItemsToCatalog(api, items, brandName, brandId) {
  const brand = String(brandName || "").trim();
  const brandIdStr =
    brandId != null && brandId !== "" ? String(brandId) : "";

  const codes = [
    ...new Set(
      (items || [])
        .map((it) => String(it.productCode ?? "").trim())
        .filter(Boolean),
    ),
  ];

  const productsByCode =
    codes.length > 0 && (brand || brandIdStr)
      ? await api.lookupProductsByCodes(codes, brand, brandIdStr)
      : {};

  const codeLookup = buildCodeLookupMap(productsByCode);
  const catalogById = new Map();

  for (const product of Object.values(productsByCode)) {
    if (product?.id != null) {
      catalogById.set(String(product.id), mergeProductCodeFields(product));
    }
  }

  const mapped = (items || []).map((item, index) => {
    const code = String(item.productCode ?? "").trim();
    const found = code
      ? codeLookup.get(code) ?? codeLookup.get(code.toLowerCase()) ?? null
      : null;
    return {
      ...item,
      id: item.id ?? index,
      mappedProductId: found?.id != null ? String(found.id) : "",
      isNewProduct: !found,
    };
  });

  return {
    items: mapped,
    catalogProducts: [...catalogById.values()],
  };
}
