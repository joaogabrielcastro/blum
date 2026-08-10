import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import apiService from "../services/apiService";
import OrdersForm from "../components/OrdersForm";
import ListPageSkeleton from "../components/ListPageSkeleton";
import OfflineSyncBar from "../components/offline/OfflineSyncBar";
import { useOfflineSync } from "../hooks/useOfflineSync";
import { useAppData } from "../context/AppDataProvider";
import { useToast } from "../context/ToastContext";
import { formatOrderData } from "../utils/format";
import { getClientDisplayName } from "../utils/clients";

const OrderFormPage = ({ userId, userRole, brands, isOnline = true }) => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { clientsList, brands: sharedBrands } = useAppData();
  const [editingOrder, setEditingOrder] = useState(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [loadError, setLoadError] = useState(null);

  const brandSource =
    Array.isArray(brands) && brands.length > 0 ? brands : sharedBrands;

  const safeBrands = useMemo(
    () =>
      Array.isArray(brandSource)
        ? brandSource.map((brand) => ({
            id: brand.id,
            name: brand.name || "",
            commission_rate:
              brand.commission_rate ?? brand.commissionRate ?? 0,
          }))
        : [],
    [brandSource],
  );

  const clientsMap = useMemo(() => {
    const map = {};
    (clientsList || []).forEach((client) => {
      const id = client.id ?? client.Id;
      if (id == null) return;
      map[id] =
        getClientDisplayName(client) ||
        (client.cnpj != null && String(client.cnpj).trim()
          ? `CNPJ ${String(client.cnpj).trim()}`
          : "");
    });
    return map;
  }, [clientsList]);

  const {
    meta: offlineMeta,
    pendingCount,
    syncing: offlineSyncing,
    downloadCatalogForOffline,
    syncAll,
  } = useOfflineSync({
    api: apiService,
    brands: safeBrands,
    isOnline,
    isLoggedIn: Boolean(userId),
    toast,
  });

  useEffect(() => {
    let cancelled = false;
    if (!orderId) {
      setEditingOrder(null);
      setLoading(false);
      setLoadError(null);
      return undefined;
    }

    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const orderDetails = await apiService.getOrderById(orderId);
        if (cancelled) return;
        setEditingOrder(formatOrderData(orderDetails));
      } catch (error) {
        if (cancelled) return;
        console.error("Erro ao carregar pedido:", error);
        setLoadError(
          error?.message ||
            "Não foi possível carregar o pedido para edição.",
        );
        toast.error(
          error?.message ||
            "Não foi possível carregar o pedido para edição.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId, toast]);

  const goToList = () => navigate("/orders");

  const handleDownloadOffline = async () => {
    try {
      const summary = await downloadCatalogForOffline();
      toast.success(
        `Dados baixados: ${summary.clientCount} clientes e ${summary.productCount} produtos.`,
      );
    } catch (error) {
      toast.error(
        error?.message || "Não foi possível baixar os dados para uso offline.",
      );
    }
  };

  const handleSyncAll = async () => {
    try {
      const result = await syncAll();
      if (result.orders?.synced > 0) {
        toast.success(
          `${result.orders.synced} orçamento(s) enviado(s) ao servidor.`,
        );
      }
      if (result.catalog && !result.catalog.error) {
        toast.success("Catálogo offline atualizado.");
      }
    } catch (error) {
      toast.error(error?.message || "Falha ao sincronizar.");
    }
  };

  if (loading) {
    return (
      <div className="p-3 sm:p-6 md:p-8">
        <ListPageSkeleton variant="list" />
        <p className="mt-4 text-center text-sm text-ink-muted">
          Carregando pedido…
        </p>
      </div>
    );
  }

  if (orderId && (loadError || !editingOrder)) {
    return (
      <div className="mx-auto max-w-lg p-6 text-center">
        <h1 className="text-lg font-semibold text-ink">
          Pedido indisponível
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {loadError || "Este pedido não foi encontrado."}
        </p>
        <button
          type="button"
          onClick={goToList}
          className="mt-4 text-sm font-semibold text-brand hover:underline"
        >
          Voltar à lista de pedidos
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-none px-2 sm:px-3 md:px-4">
      <div className="mb-4">
        <OfflineSyncBar
          isOnline={isOnline}
          meta={offlineMeta}
          pendingCount={pendingCount}
          syncing={offlineSyncing}
          onDownload={handleDownloadOffline}
          onSyncAll={handleSyncAll}
        />
      </div>
      <OrdersForm
        userId={userId}
        userRole={userRole}
        clients={clientsMap}
        clientsList={clientsList}
        brands={safeBrands}
        editingOrder={editingOrder}
        onOrderAdded={goToList}
        onCancel={goToList}
      />
    </div>
  );
};

export default OrderFormPage;
