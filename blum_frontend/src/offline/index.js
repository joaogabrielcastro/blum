import { syncOfflineCatalog, getOfflineCatalogMeta } from "./catalogSync";
import { syncPendingOrders, getPendingOrdersCount } from "./orderQueue";
import { isBrowserOnline } from "./network";

export { syncOfflineCatalog, getOfflineCatalogMeta, syncPendingOrders, getPendingOrdersCount };
export { getCachedClients } from "./catalogSync";
export { searchOfflineProducts, lookupOfflineProductByCode } from "./localCatalogSearch";
export { enqueuePendingOrder, listPendingOrders, pendingOrderToListItem } from "./orderQueue";
export { isBrowserOnline } from "./network";

export async function runOnlineSync(api, brands = []) {
  if (!isBrowserOnline()) {
    return { orders: null, catalog: null, skipped: true };
  }

  const orders = await syncPendingOrders(api);
  let catalog = null;
  if (brands.length > 0) {
    try {
      catalog = await syncOfflineCatalog(api, brands);
    } catch (error) {
      catalog = { error: error?.message || "Falha ao sincronizar catálogo." };
    }
  }

  return { orders, catalog, skipped: false };
}
