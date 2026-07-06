import { normalizeClientsResponse } from "../utils/clients";
import { mergeProductCodeFields } from "../utils/productSearch";
import {
  getMeta,
  getAllClients,
  replaceClients,
  replaceProducts,
  setMeta,
} from "./db";

async function fetchAllProductsForBrand(api, brand) {
  const collected = [];
  let page = 1;
  let totalPages = 1;
  const limit = 200;
  const brandName = brand?.name || "";
  const brandId = brand?.id;

  while (page <= totalPages) {
    const response = await api.getProducts(
      brandName,
      page,
      limit,
      "",
      brandId,
    );
    const list = Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response)
        ? response
        : [];
    totalPages =
      response?.totalPages ??
      response?.pagination?.totalPages ??
      (list.length < limit ? page : page + 1);
    collected.push(...list.map(mergeProductCodeFields));
    if (list.length === 0) break;
    page += 1;
  }

  return collected;
}

/**
 * Baixa clientes e produtos de todas as representadas para uso offline.
 */
export async function syncOfflineCatalog(api, brands = [], onProgress) {
  if (!brands.length) {
    throw new Error("Nenhuma representada disponível para sincronizar.");
  }

  onProgress?.({ phase: "clients", message: "Baixando clientes…" });
  const clients = normalizeClientsResponse(await api.getClients());
  await replaceClients(clients);

  const allProducts = [];
  for (let i = 0; i < brands.length; i += 1) {
    const brand = brands[i];
    onProgress?.({
      phase: "products",
      message: `Baixando produtos (${i + 1}/${brands.length}): ${brand.name}`,
      current: i + 1,
      total: brands.length,
    });
    const batch = await fetchAllProductsForBrand(api, brand);
    allProducts.push(...batch);
  }

  await replaceProducts(allProducts);
  const syncedAt = new Date().toISOString();
  await setMeta("catalogSyncedAt", syncedAt);
  await setMeta("clientCount", clients.length);
  await setMeta("productCount", allProducts.length);
  await setMeta("brandCount", brands.length);

  return {
    syncedAt,
    clientCount: clients.length,
    productCount: allProducts.length,
    brandCount: brands.length,
  };
}

export async function getOfflineCatalogMeta() {
  const [catalogSyncedAt, clientCount, productCount, brandCount] =
    await Promise.all([
      getMeta("catalogSyncedAt"),
      getMeta("clientCount"),
      getMeta("productCount"),
      getMeta("brandCount"),
    ]);
  return {
    catalogSyncedAt: catalogSyncedAt || null,
    clientCount: clientCount || 0,
    productCount: productCount || 0,
    brandCount: brandCount || 0,
  };
}

export async function getCachedClients() {
  return getAllClients();
}
