import { useCallback, useEffect, useRef, useState } from "react";
import {
  getOfflineCatalogMeta,
  getPendingOrdersCount,
  isBrowserOnline,
  syncOfflineCatalog,
  syncPendingOrders,
} from "../offline";

/** Atualiza catálogo local automaticamente se passou mais que isto (com internet). */
const CATALOG_AUTO_REFRESH_MS = 24 * 60 * 60 * 1000;

export function useOfflineSync({ api, brands, isOnline, isLoggedIn, toast }) {
  const [meta, setMeta] = useState({
    catalogSyncedAt: null,
    clientCount: 0,
    productCount: 0,
    brandCount: 0,
  });
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const autoRefreshAttemptedRef = useRef(false);

  const refreshStatus = useCallback(async () => {
    try {
      const [catalogMeta, count] = await Promise.all([
        getOfflineCatalogMeta(),
        getPendingOrdersCount(),
      ]);
      setMeta(catalogMeta);
      setPendingCount(count);
    } catch (error) {
      console.error("Erro ao ler status offline:", error);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) refreshStatus();
  }, [isLoggedIn, refreshStatus]);

  const syncQueuedOrders = useCallback(async () => {
    if (!isBrowserOnline()) return { synced: 0, failed: [] };
    const result = await syncPendingOrders(api);
    await refreshStatus();
    return result;
  }, [api, refreshStatus]);

  useEffect(() => {
    if (!isLoggedIn || !isOnline) return;
    let cancelled = false;
    (async () => {
      const result = await syncQueuedOrders();
      if (cancelled) return;
      if (result.synced > 0) {
        toast.success(
          `${result.synced} orçamento(s) offline enviado(s) ao servidor.`,
        );
      }
      if (result.failed?.length > 0) {
        toast.warning(
          `${result.failed.length} orçamento(s) não puderam ser enviados. Tente sincronizar de novo.`,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, isOnline, syncQueuedOrders, toast]);

  // Com internet: atualiza catálogo local se estiver desatualizado (>24h).
  useEffect(() => {
    if (!isLoggedIn || !isOnline || !brands?.length || syncing) return;
    if (autoRefreshAttemptedRef.current) return;
    autoRefreshAttemptedRef.current = true;

    let cancelled = false;
    (async () => {
      const catalogMeta = await getOfflineCatalogMeta();
      if (!catalogMeta.catalogSyncedAt || cancelled) return;

      const age =
        Date.now() - new Date(catalogMeta.catalogSyncedAt).getTime();
      if (age < CATALOG_AUTO_REFRESH_MS) return;

      try {
        setSyncing(true);
        await syncOfflineCatalog(api, brands);
        if (!cancelled) {
          await refreshStatus();
          toast.info("Dados offline atualizados automaticamente.");
        }
      } catch (error) {
        console.warn("Atualização automática offline:", error);
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, isOnline, brands, api, refreshStatus, syncing, toast]);

  const downloadCatalogForOffline = useCallback(
    async (onProgress) => {
      if (!isBrowserOnline()) {
        throw new Error("Conecte-se à internet para baixar os dados.");
      }
      if (!brands?.length) {
        throw new Error("Nenhuma representada disponível.");
      }
      setSyncing(true);
      try {
        const summary = await syncOfflineCatalog(api, brands, onProgress);
        await refreshStatus();
        return summary;
      } finally {
        setSyncing(false);
      }
    },
    [api, brands, refreshStatus],
  );

  const syncAll = useCallback(async () => {
    if (!isBrowserOnline()) {
      throw new Error("Sem internet para sincronizar.");
    }
    setSyncing(true);
    try {
      const orders = await syncQueuedOrders();
      let catalog = null;
      if (brands?.length) {
        catalog = await syncOfflineCatalog(api, brands);
      }
      await refreshStatus();
      return { orders, catalog };
    } finally {
      setSyncing(false);
    }
  }, [api, brands, refreshStatus, syncQueuedOrders]);

  return {
    meta,
    pendingCount,
    syncing,
    refreshStatus,
    downloadCatalogForOffline,
    syncAll,
    syncQueuedOrders,
  };
}
