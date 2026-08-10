import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import apiService from "../services/apiService";
import ListPageSkeleton from "../components/ListPageSkeleton";
import { useToast } from "../context/ToastContext";
import OrderStockWarningModal from "../components/orders/OrderStockWarningModal";
import ConfirmationModal from "../components/ConfirmationModal";
import PdfGenerator from "../components/PdfGenerator";
import { formatOrderData } from "../utils/format";
import PaymentMethodBadge from "../components/orders/PaymentMethodBadge";
import StatusBadge from "../components/ui/StatusBadge";
import OfflineSyncBar from "../components/offline/OfflineSyncBar";
import { useOfflineSync } from "../hooks/useOfflineSync";
import { useAppData } from "../context/AppDataProvider";
import { useOrdersList } from "../hooks/useOrdersList";
import { formatOpenDays } from "../utils/ordersListUtils";
import Surface, {
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from "../components/ui/Surface";

const OrdersPage = ({ userId, userRole, brands, isOnline = true }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { clientsList: sharedClientsList } = useAppData();
  const {
    orders,
    setOrders,
    loading,
    clients,
    listFetchError,
    orderSearch,
    setOrderSearch,
    sellerFilterKey,
    setSellerFilterKey,
    visibleDayGroups,
    setVisibleDayGroups,
    sellerOptions,
    filteredOrdersByDay,
    filteredOrdersByDayPaged,
    fetchData,
    formatCurrency,
    clientsList,
  } = useOrdersList({ sharedClientsList, toast, userId, userRole });
  const [pdfOrder, setPdfOrder] = useState(null);
  const [pdfLoadingOrderId, setPdfLoadingOrderId] = useState(null);
  const [duplicatingOrderId, setDuplicatingOrderId] = useState(null);
  const [paymentDialogOrder, setPaymentDialogOrder] = useState(null);
  const [paymentDialogMethod, setPaymentDialogMethod] = useState("boleto");
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [modalAction, setModalAction] = useState({ type: null, orderId: null });
  const [convertConfirmId, setConvertConfirmId] = useState(null);
  const [convertStockModal, setConvertStockModal] = useState({
    open: false,
    orderId: null,
    lines: [],
  });

  const safeBrands = useMemo(
    () =>
      Array.isArray(brands)
        ? brands.map((brand) => ({
            id: brand.id,
            name: brand.name || "",
            commission_rate:
              brand.commission_rate ?? brand.commissionRate ?? 0,
          }))
        : [],
    [brands],
  );

  const {
    meta: offlineMeta,
    pendingCount,
    syncing: offlineSyncing,
    downloadCatalogForOffline,
    syncAll,
    refreshStatus: refreshOfflineStatus,
  } = useOfflineSync({
    api: apiService,
    brands: safeBrands,
    isOnline,
    isLoggedIn: Boolean(userId),
    toast,
  });

  const handleAction = async () => {
    const { type, orderId } = modalAction;
    if (!orderId) return;

    try {
      if (type === "delete") {
        await apiService.deleteOrder(orderId);
        setOrders(
          orders.filter((order) => String(order.id) !== String(orderId)),
        );
        toast.success("Pedido excluído.");
      } else if (type === "finalize") {
        await apiService.finalizeOrder(orderId);
        setOrders(
          orders.map((order) =>
            String(order.id) === String(orderId)
              ? {
                  ...order,
                  status: "Entregue",
                  finishedAt: new Date().toISOString(),
                }
              : order,
          ),
        );
        toast.success("Entrega finalizada.");
      }
    } catch (error) {
      const raw = (error?.message || "").trim();
      const lower = raw.toLowerCase();
      const notFound =
        lower.includes("404") || lower.includes("não encontrado");
      if (notFound) {
        toast.error("Pedido não encontrado. A lista será atualizada.");
      } else if (raw) {
        toast.error(raw);
      } else {
        toast.error(
          type === "delete"
            ? "Falha ao excluir pedido. Tente novamente."
            : "Falha ao finalizar pedido. Tente novamente.",
        );
      }
      // Recarrega a lista em caso de erro
      await fetchData();
    } finally {
      setModalAction({ type: null, orderId: null });
    }
  };

  const handleConvertToPedido = async (orderId, { confirmStockWarning = false } = {}) => {
    try {
      await apiService.convertOrderToPedido(orderId, { confirmStockWarning });
      setConvertStockModal({ open: false, orderId: null, lines: [] });
      setConvertConfirmId(null);
      await fetchData();
      toast.success(
        confirmStockWarning
          ? "Orçamento convertido em pedido com aviso de ruptura de estoque."
          : "Orçamento convertido em pedido.",
      );
    } catch (error) {
      if (error?.code === "STOCK_WARNING_CONFIRM_REQUIRED") {
        const lines = (error.stockWarnings || []).map((row) => ({
          productName: row.productName,
          quantity: row.quantity,
          available: row.availableStock ?? 0,
          shortfall: row.shortfall,
        }));
        setConvertConfirmId(null);
        setConvertStockModal({ open: true, orderId, lines });
        return;
      }
      toast.error(
        error?.message || "Não foi possível converter o orçamento.",
      );
    }
  };

  const handleEditOrder = (orderId) => {
    navigate(`/orders/${orderId}/edit`);
  };

  const handleOpenPdf = async (order) => {
    try {
      setPdfLoadingOrderId(order.id);
      const orderDetails = await apiService.getOrderById(order.id);
      const detailedOrder = formatOrderData(orderDetails);
      setPdfOrder({
        ...order,
        ...detailedOrder,
      });
    } catch (error) {
      console.error("Erro ao carregar pedido completo para PDF:", error);
      setPdfOrder(order);
      if (!order.items || order.items.length === 0) {
        toast.error(
          "Não foi possível carregar os itens completos do pedido. Tente novamente.",
        );
      }
    } finally {
      setPdfLoadingOrderId(null);
    }
  };

  const handleDuplicateOrder = async (orderId) => {
    try {
      setDuplicatingOrderId(orderId);
      const duplicated = await apiService.duplicateOrder(orderId);
      const formatted = formatOrderData(duplicated);
      await fetchData();
      toast.success("Pedido duplicado. Revise e guarde.");
      navigate(`/orders/${formatted.id}/edit`);
    } catch (error) {
      toast.error(error?.message || "Não foi possível duplicar o pedido.");
    } finally {
      setDuplicatingOrderId(null);
    }
  };

  const handleOpenPaymentDialog = (order) => {
    setPaymentDialogOrder(order);
    setPaymentDialogMethod("boleto");
  };

  const handleConfirmPaymentMethod = async () => {
    if (!paymentDialogOrder?.id) return;
    try {
      setUpdatingPayment(true);
      await apiService.updateOrderPaymentMethod(
        paymentDialogOrder.id,
        paymentDialogMethod,
      );
      setPaymentDialogOrder(null);
      await fetchData();
      toast.success("Forma de pagamento atualizada.");
    } catch (error) {
      toast.error(
        error?.message ||
          "Não foi possível atualizar a forma de pagamento do pedido.",
      );
    } finally {
      setUpdatingPayment(false);
    }
  };

  const renderOrderActions = (order) => {
    if (order.isOfflinePending) {
      return (
        <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900">
          Aguardando envio ao servidor
        </span>
      );
    }

    const isDelivered = order.status === "Entregue";
    const isQuote = order.documentType === "orcamento";

    return (
      <div className="grid w-full grid-cols-2 items-stretch gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-2">
        {isDelivered ? (
          <div className="col-span-2 flex sm:col-span-1 sm:contents">
            <StatusBadge status="Entregue" />
          </div>
        ) : null}
        <SecondaryButton
          onClick={() => handleEditOrder(order.id)}
          className="!min-h-11 !px-3 !py-2 !text-sm touch-manipulation"
        >
          Editar
        </SecondaryButton>
        {!isDelivered ? (
          <>
            {isQuote ? (
              <SecondaryButton
                type="button"
                onClick={() => setConvertConfirmId(order.id)}
                className="!min-h-11 !px-3 !py-2 !text-sm touch-manipulation !border-indigo-200 !text-indigo-700 hover:!bg-indigo-50"
              >
                Virar pedido
              </SecondaryButton>
            ) : (
              <SecondaryButton
                onClick={() =>
                  setModalAction({ type: "finalize", orderId: order.id })
                }
                className="!min-h-11 !px-3 !py-2 !text-sm touch-manipulation !border-emerald-200 !text-emerald-700 hover:!bg-emerald-50"
              >
                Finalizar entrega
              </SecondaryButton>
            )}
            {!isQuote && order.paymentMethod === "carteira" ? (
              <SecondaryButton
                type="button"
                onClick={() => handleOpenPaymentDialog(order)}
                className="col-span-2 !min-h-11 !px-3 !py-2 !text-sm touch-manipulation !border-amber-200 !text-amber-800 hover:!bg-amber-50 sm:col-span-1"
              >
                Registrar pagamento
              </SecondaryButton>
            ) : null}
          </>
        ) : null}
        <SecondaryButton
          type="button"
          onClick={() => handleDuplicateOrder(order.id)}
          disabled={duplicatingOrderId === order.id}
          className="!min-h-11 !px-3 !py-2 !text-sm touch-manipulation"
        >
          {duplicatingOrderId === order.id ? "Duplicando…" : "Duplicar"}
        </SecondaryButton>
        <SecondaryButton
          onClick={() => setModalAction({ type: "delete", orderId: order.id })}
          className="!min-h-11 !px-3 !py-2 !text-sm touch-manipulation !border-red-200 !text-red-700 hover:!bg-red-50"
        >
          Excluir
        </SecondaryButton>
        <SecondaryButton
          type="button"
          onClick={() => handleOpenPdf(order)}
          disabled={pdfLoadingOrderId === order.id}
          className="!min-h-11 !px-3 !py-2 !text-sm touch-manipulation"
        >
          {pdfLoadingOrderId === order.id ? "Carregando…" : "Gerar PDF"}
        </SecondaryButton>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="w-full max-w-full p-3 sm:p-6 md:p-8">
        <ListPageSkeleton variant="list" />
      </div>
    );
  }

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
      await fetchData();
    } catch (error) {
      toast.error(error?.message || "Falha ao sincronizar.");
    }
  };

  const offlineSyncBar = (
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
  );

  return (
    <div className="p-3 sm:p-6 md:p-8">
      {offlineSyncBar}
      <ConfirmationModal
        show={!!modalAction.orderId}
        onConfirm={handleAction}
        onCancel={() => setModalAction({ type: null, orderId: null })}
        title={
          modalAction.type === "delete"
            ? "Excluir pedido"
            : "Finalizar entrega"
        }
        tone={modalAction.type === "delete" ? "danger" : "primary"}
        confirmText={
          modalAction.type === "delete" ? "Excluir" : "Finalizar"
        }
        message={
          modalAction.type === "delete"
            ? "Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita."
            : "Confirmar finalização da entrega? O estoque será baixado e o status ficará como Entregue."
        }
      />
      <ConfirmationModal
        show={!!convertConfirmId}
        title="Converter em pedido"
        tone="primary"
        confirmText="Converter"
        message="Converter este orçamento em pedido? Depois você poderá registrar a forma de pagamento e finalizar a entrega."
        onConfirm={() =>
          convertConfirmId && handleConvertToPedido(convertConfirmId)
        }
        onCancel={() => setConvertConfirmId(null)}
      />

      {pdfOrder && (
        <PdfGenerator
          order={pdfOrder}
          clients={clients}
          clientsList={clientsList}
          brands={safeBrands}
          onClose={() => setPdfOrder(null)}
        />
      )}
      <OrderStockWarningModal
        open={convertStockModal.open}
        title="Converter orçamento com itens sem estoque"
        description="Ao virar pedido, o aviso ficará registrado. A entrega só será possível quando houver estoque."
        lines={convertStockModal.lines}
        requireExplicitConfirm
        confirmLabel="Converter em pedido com aviso"
        onConfirm={() =>
          convertStockModal.orderId &&
          handleConvertToPedido(convertStockModal.orderId, {
            confirmStockWarning: true,
          })
        }
        onCancel={() =>
          setConvertStockModal({ open: false, orderId: null, lines: [] })
        }
      />

      {paymentDialogOrder ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-2xl bg-surface p-5 shadow-soft sm:rounded-2xl">
            <h3 className="text-lg font-semibold text-ink">
              Registrar pagamento #{paymentDialogOrder.id}
            </h3>
            <p className="mt-1 text-sm text-ink-muted">
              Como o cliente quitou o pedido em carteira?
            </p>
            <select
              value={paymentDialogMethod}
              onChange={(e) => setPaymentDialogMethod(e.target.value)}
              className="mt-4 min-h-11 w-full rounded-xl border border-edge bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              <option value="boleto">Boleto</option>
              <option value="pix">PIX</option>
              <option value="cheque">Cheque</option>
              <option value="dinheiro">Dinheiro</option>
            </select>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <SecondaryButton
                type="button"
                onClick={() => setPaymentDialogOrder(null)}
                disabled={updatingPayment}
                className="!min-h-11 w-full sm:w-auto"
              >
                Cancelar
              </SecondaryButton>
              <PrimaryButton
                type="button"
                onClick={handleConfirmPaymentMethod}
                disabled={updatingPayment}
                className="!min-h-11 w-full sm:w-auto"
              >
                {updatingPayment ? "Salvando…" : "Salvar pagamento"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      ) : null}

      <PageHeader
        title="Pedidos"
        description="Orçamentos e pedidos agrupados por dia."
        actions={
          <PrimaryButton
            className="hidden sm:inline-flex"
            onClick={() => navigate("/orders/new")}
          >
            Novo orçamento
          </PrimaryButton>
        }
      />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
        <div className="min-w-0 flex-1">
          <input
            type="search"
            value={orderSearch}
            onChange={(e) => setOrderSearch(e.target.value)}
            placeholder="Buscar por número, cliente, representante…"
            className="min-h-11 w-full rounded-xl border border-edge bg-surface p-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <label
            htmlFor="orders-seller-filter"
            className="whitespace-nowrap text-sm font-medium text-ink"
          >
            Representante
          </label>
          <select
            id="orders-seller-filter"
            value={sellerFilterKey}
            onChange={(e) => setSellerFilterKey(e.target.value)}
            aria-label="Filtrar lista por representante"
            className="min-h-11 w-full rounded-xl border border-edge bg-surface px-3 py-2 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 sm:w-[min(100%,280px)]"
          >
            <option value="">Todos</option>
            {sellerOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {listFetchError && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {listFetchError}
        </div>
      )}

      <Surface padded={false} className="overflow-hidden">
        <div className="p-3 sm:p-5">
        {filteredOrdersByDay.length > 0 ? (
          <div className="space-y-8">
            {filteredOrdersByDayPaged.map(({ dateKey, label, orders: dayOrders }) => (
              <section key={dateKey} className="space-y-3">
                <h2 className="border-b border-edge pb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">
                  {label}
                </h2>
                <ul className="divide-y divide-edge">
                  {dayOrders.map((order) => {
                    const openDays = formatOpenDays(
                      order.createdAt,
                      order.status,
                    );
                    return (
                      <li
                        key={order.id}
                        className="flex flex-col justify-between gap-4 py-5 sm:flex-row sm:items-start sm:py-6"
                      >
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <h3 className="text-lg font-semibold text-ink">
                              {order.documentType === "orcamento"
                                ? "Orçamento"
                                : "Pedido"}{" "}
                              #{order.id}
                            </h3>
                            {order.documentType === "pedido" ? (
                              <PaymentMethodBadge
                                method={order.paymentMethod}
                                prominent
                              />
                            ) : (
                              <StatusBadge label="Orçamento" tone="neutral" />
                            )}
                            {order.isOfflinePending ? (
                              <StatusBadge
                                label="Offline — aguardando envio"
                                tone="warning"
                              />
                            ) : null}
                            {order.hasStockWarning ? (
                              <StatusBadge
                                label="Sem estoque"
                                tone="warning"
                              />
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-ink-muted">
                            Cliente: {clients[order.clientId] || "N/A"}
                          </p>
                          {userRole === "admin" && (order.sellerName || order.sellerUsername) ? (
                            <p className="mt-1 text-sm text-ink-muted">
                              Criado por:{" "}
                              {order.sellerName ||
                                order.sellerUsername ||
                                "Representante"}
                              {order.sellerName && order.sellerUsername
                                ? ` (@${order.sellerUsername})`
                                : ""}
                            </p>
                          ) : null}
                          {order.representadas ? (
                            <p className="mt-1 text-sm font-medium text-ink">
                              Representada: {order.representadas}
                            </p>
                          ) : null}
                          <p className="mt-1 text-sm text-ink-muted">
                            Itens: {order.itemsCount ?? order.items?.length ?? 0}
                          </p>
                          {order.createdAt ? (
                            <p className="mt-1 text-sm text-ink-muted">
                              Criado em:{" "}
                              {new Date(order.createdAt).toLocaleString(
                                "pt-BR",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                              {openDays != null ? (
                                <span className="ml-2 font-medium text-amber-800">
                                  • há {openDays} dia
                                  {openDays === 1 ? "" : "s"}
                                </span>
                              ) : null}
                            </p>
                          ) : null}
                          {order.description ? (
                            <p className="mt-1 text-sm text-ink-muted">
                              Obs.: {order.description}
                            </p>
                          ) : null}
                          {order.finishedAt ? (
                            <p className="mt-1 text-sm text-ink-muted">
                              Finalizado em:{" "}
                              {new Date(order.finishedAt).toLocaleDateString(
                                "pt-BR",
                              )}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex w-full flex-col items-start gap-3 text-left sm:w-fit sm:items-end sm:text-right">
                          <div className="flex w-full flex-col items-start gap-2 sm:items-end">
                            <div className="w-full rounded-xl border border-edge bg-surface-muted px-4 py-2 sm:w-fit">
                              <p className="text-base font-semibold text-ink">
                                {formatCurrency(order.totalPrice)}
                              </p>
                              {order.discount > 0 && (
                                <p className="mt-0.5 text-xs text-ink-muted">
                                  Desconto geral: {order.discount}%
                                </p>
                              )}
                            </div>
                            {renderOrderActions(order)}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            {filteredOrdersByDay.length > visibleDayGroups && (
              <div className="py-6 text-center">
                <SecondaryButton
                  type="button"
                  onClick={() => setVisibleDayGroups((n) => n + 10)}
                  className="mx-auto w-full max-w-sm"
                >
                  Mostrar mais dias
                </SecondaryButton>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center text-ink-muted">
            <p className="text-sm font-medium text-ink">
              Nenhum pedido encontrado
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              Ajuste a busca ou crie um novo orçamento.
            </p>
            <PrimaryButton
              className="mt-4"
              onClick={() => navigate("/orders/new")}
            >
              Novo orçamento
            </PrimaryButton>
          </div>
        )}
        </div>
      </Surface>

      <button
        type="button"
        aria-label="Novo orçamento"
        className="fixed z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-2xl font-bold text-white shadow-soft hover:bg-brand-600 sm:hidden"
        style={{
          bottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))",
          right: "max(1.25rem, env(safe-area-inset-right, 0px))",
        }}
        onClick={() => navigate("/orders/new")}
      >
        +
      </button>
    </div>
  );
};

export default OrdersPage;
