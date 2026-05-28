import { mergeProductCodeFields } from "./productSearch";

const CODE_LOOKUP_CHUNK = 12;

function normalizeList(response) {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response)) return response;
  return [];
}

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
  return normalizeList(response).map(mergeProductCodeFields);
}

/** Resolve vínculo por código sem carregar o catálogo inteiro. */
export async function mapImportItemsToCatalog(api, items, brandName, brandId) {
  const brand = String(brandName || "").trim();
  const brandIdStr =
    brandId != null && brandId !== "" ? String(brandId) : "";
  const codeCache = new Map();
  const catalogById = new Map();

  const codes = [
    ...new Set(
      (items || [])
        .map((it) => String(it.productCode ?? "").trim())
        .filter(Boolean),
    ),
  ];

  for (let i = 0; i < codes.length; i += CODE_LOOKUP_CHUNK) {
    const chunk = codes.slice(i, i + CODE_LOOKUP_CHUNK);
    const results = await Promise.all(
      chunk.map(async (code) => {
        try {
          const product = await api.lookupProductByCode(
            code,
            brand,
            brandIdStr || undefined,
          );
          return [code, product];
        } catch {
          return [code, null];
        }
      }),
    );
    for (const [code, product] of results) {
      codeCache.set(code, product);
      if (product?.id != null) {
        catalogById.set(String(product.id), mergeProductCodeFields(product));
      }
    }
  }

  const mapped = (items || []).map((item, index) => {
    const code = String(item.productCode ?? "").trim();
    const found = code ? codeCache.get(code) : null;
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
