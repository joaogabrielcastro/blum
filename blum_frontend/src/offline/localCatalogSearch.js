import { getAllProducts } from "./db";
import {
  mergeProductCodeFields,
  productMatchesFlexible,
} from "../utils/productSearch";

function matchesBrand(product, brand, brandId) {
  const brandIdStr =
    brandId != null && brandId !== "" ? String(brandId) : "";
  if (brandIdStr) {
    const pid = product.brandId ?? product.brand_id;
    if (pid != null && String(pid) === brandIdStr) return true;
  }
  if (brand && String(product.brand || "") === String(brand)) return true;
  return !brand && !brandIdStr;
}

export async function searchOfflineProducts({
  q,
  brand,
  brandId,
  limit = 30,
}) {
  const term = String(q ?? "").trim();
  if (term.length < 2) return [];

  const products = await getAllProducts();
  return products
    .filter((product) => {
      if (!matchesBrand(product, brand, brandId)) return false;
      return productMatchesFlexible(product, term, null);
    })
    .slice(0, limit)
    .map((product) => {
      const merged = mergeProductCodeFields(product);
      return {
        ...merged,
        name: merged.name,
        brand: merged.brand,
        brandId: merged.brandId ?? merged.brand_id,
        price: merged.price,
        stock: merged.stock ?? 0,
      };
    });
}

export async function lookupOfflineProductByCode(code, brand, brandId) {
  const trimmed = String(code ?? "").trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  const products = await getAllProducts();
  const found = products.find((product) => {
    if (!matchesBrand(product, brand, brandId)) return false;
    const pc = String(product.productcode ?? product.productCode ?? "")
      .trim()
      .toLowerCase();
    return pc === lower;
  });
  return found ? mergeProductCodeFields(found) : null;
}
