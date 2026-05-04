import { useState, useEffect, useMemo } from "react";
import apiService from "../services/apiService";
import ListPageSkeleton from "../components/ListPageSkeleton";
import { useToast } from "../context/ToastContext";
import OrdersForm from "../components/OrdersForm";
import ConfirmationModal from "../components/ConfirmationModal";
import PdfGenerator from "../components/PdfGenerator";
import formatCurrency, { formatOrderData } from "../utils/format";
import {
  getClientDisplayName,
  normalizeClientsResponse,
} from "../utils/clients";

const PAYMENT_LABELS = {
  carteira: "Carteira (em aberto)",
  boleto: "Boleto",
  pix: "PIX",
  cheque: "Cheque",
  dinheiro: "Dinheiro",
};

const PAYMENT_BADGE_CLASS = {
  carteira: "bg-amber-100 text-amber-900 border-amber-300",
  boleto: "bg-blue-100 text-blue-900 border-blue-300",
  pix: "bg-emerald-100 text-emerald-900 border-emerald-300",
  cheque: "bg-purple-100 text-purple-900 border-purple-300",
  dinheiro: "bg-lime-100 text-lime-900 border-lime-300",
};

function formatOpenDays(createdAt, status) {
  if (!createdAt || status === "Entregue") return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(
    0,
    Math.floor((Date.now() - d.getTime()) / 86400000),
  );
}

function formatDaySectionLabel(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const thatDay = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tt = new Date(thatDay);
  tt.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today - tt) / 86400000);
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  return thatDay.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function groupOrdersByDay(orders) {
  const groups = new Map();
  for (const order of orders) {
    const raw = order.createdAt ?? order.createdat;
    if (!raw) continue;
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) continue;
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(order);
  }
  const keys = [...groups.keys()].sort((a, b) => b.localeCompare(a));
  return keys.map((dateKey) => ({
    dateKey,
    label: formatDaySectionLabel(dateKey),
    orders: groups.get(dateKey),
  }));
}

const OrdersPage = ({ userId, userRole, brands }) => {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingLoading, setEditingLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [clients, setClients] = useState({});
  const [clientsList, setClientsList] = useState([]);
  const [pdfOrder, setPdfOrder] = useState(null);
  const [pdfLoadingOrderId, setPdfLoadingOrderId] = useState(null);
  const [duplicatingOrderId, setDuplicatingOrderId] = useState(null);
  const [paymentDialogOrder, setPaymentDialogOrder] = useState(null);
  const [paymentDialogMethod, setPaymentDialogMethod] = useState("boleto");
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [modalAction, setModalAction] = useState({ type: null, orderId: null });
  const [orderSearch, setOrderSearch] = useState("");
  const [listFetchError, setListFetchError] = useState(null);
  const [visibleDayGroups, setVisibleDayGroups] = useState(10);

  // Validar e transformar brands para garantir segurança
  const safeBrands = Array.isArray(brands)
    ? brands.map((brand) => ({
        id: brand.id,
        name: brand.name || "",
        commission_rate:
          brand.commission_rate ?? brand.commissionRate ?? 0,
      }))
    : [];

  useEffect(() => {
    if (userId && userRole) fetchData();
  }, [userId, userRole]);

  useEffect(() => {
    setVisibleDayGroups(10);
  }, [orderSearch, orders.length]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setListFetchError(null);
      const [ordersData, clientsData] = await Promise.all([
        apiService.getOrders({}),
        apiService.getClients(),
      ]);

      const formattedOrders = ordersData.map((order) => formatOrderData(order));
      setOrders(formattedOrders);

      const list = normalizeClientsResponse(clientsData);
      setClientsList(list);

      const clientsMap = {};
      list.forEach((client) => {
        const id = client.id ?? client.Id;
        if (id == null) return;
        clientsMap[id] =
          getClientDisplayName(client) ||
          (client.cnpj != null && String(client.cnpj).trim()
            ? `CNPJ ${String(client.cnpj).trim()}`
            : "");
      });
      setClients(clientsMap);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      const msg =
        error?.message || "Não foi possível carregar pedidos e clientes.";
      setListFetchError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

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

  const handleConvertToPedido = async (orderId) => {
    if (
      !window.confirm(
        "Converter este orçamento em pedido? Depois você poderá registrar a forma de pagamento e finalizar a entrega.",
      )
    ) {
      return;
    }
    try {
      await apiService.convertOrderToPedido(orderId);
      await fetchData();
      toast.success("Orçamento convertido em pedido.");
    } catch (error) {
      toast.error(
        error?.message || "Não foi possível converter o orçamento.",
      );
    }
  };

  const handleEditOrder = async (orderId) => {
    try {
      setEditingLoading(true);
      const orderDetails = await apiService.getOrderById(orderId);
      setEditingOrder(formatOrderData(orderDetails));
      setShowForm(true);
    } catch (error) {
      console.error("Erro ao carregar pedido para edição:", error);
      toast.error(
        error?.message ||
          "Não foi possível carregar os itens do pedido para edição.",
      );
    } finally {
      setEditingLoading(false);
    }
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
      setEditingOrder(formatOrderData(duplicated));
      setShowForm(true);
      await fetchData();
      toast.success("Pedido duplicado. Revise e guarde.");
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
    const isDelivered = order.status === "Entregue";
    const isQuote = order.documentType === "orcamento";

    return (
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 items-center w-full sm:w-auto">
        {isDelivered && (
          <span className="inline-block col-span-2 sm:col-span-1 px-3 py-1.5 text-sm font-semibold text-green-800 bg-green-100 rounded-full shadow-sm text-center">
            Entregue
          </span>
        )}
        <button
          onClick={() => handleEditOrder(order.id)}
          className="min-h-10 px-3 py-1 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition"
        >
          Editar
        </button>
        {!isDelivered && (
          <>
            {isQuote ? (
              <button
                type="button"
                onClick={() => handleConvertToPedido(order.id)}
                className="min-h-10 px-3 py-1 text-sm font-medium text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50 transition"
              >
                Virar pedido
              </button>
            ) : (
              <button
                onClick={() =>
                  setModalAction({ type: "finalize", orderId: order.id })
                }
                className="min-h-10 px-3 py-1 text-sm font-medium text-green-600 border border-green-600 rounded-lg hover:bg-green-50 transition"
              >
                Finalizar entrega
              </button>
            )}
            {!isQuote && order.paymentMethod === "carteira" && (
              <button
                type="button"
                onClick={() => handleOpenPaymentDialog(order)}
                className="min-h-10 px-3 py-1 text-sm font-medium text-amber-700 border border-amber-500 rounded-lg hover:bg-amber-50 transition"
              >
                Registrar pagamento
              </button>
            )}
          </>
        )}
        <button
          type="button"
          onClick={() => handleDuplicateOrder(order.id)}
          disabled={duplicatingOrderId === order.id}
          className="min-h-10 px-3 py-1 text-sm font-medium text-violet-700 border border-violet-400 rounded-lg hover:bg-violet-50 transition disabled:opacity-60"
        >
          {duplicatingOrderId === order.id ? "Duplicando..." : "Duplicar"}
        </button>
        <button
          onClick={() => setModalAction({ type: "delete", orderId: order.id })}
          className="min-h-10 px-3 py-1 text-sm font-medium text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition"
        >
          Excluir
        </button>
        <button
          type="button"
          onClick={() => handleOpenPdf(order)}
          disabled={pdfLoadingOrderId === order.id}
          className="min-h-10 px-3 py-1 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-blue-50 transition"
        >
          {pdfLoadingOrderId === order.id ? "Carregando..." : "Gerar PDF"}
        </button>
      </div>
    );
  };

  const ordersByDay = useMemo(() => groupOrdersByDay(orders), [orders]);
  const filteredOrdersByDay = useMemo(() => {
    const term = orderSearch.trim().toLocaleLowerCase("pt-BR");
    if (!term) return ordersByDay;
    return ordersByDay
      .map((group) => ({
        ...group,
        orders: group.orders.filter((order) => {
          const clientLabel = clients[order.clientId] || "";
          const haystack = [
            order.id,
            order.description,
            order.status,
            order.representadas,
            order.sellerName,
            order.sellerUsername,
            clientLabel,
          ]
            .map((v) => String(v || "").toLocaleLowerCase("pt-BR"))
            .join(" ");
          return haystack.includes(term);
        }),
      }))
      .filter((group) => group.orders.length > 0);
  }, [ordersByDay, orderSearch, clients]);

  const filteredOrdersByDayPaged = useMemo(
    () => filteredOrdersByDay.slice(0, visibleDayGroups),
    [filteredOrdersByDay, visibleDayGroups],
  );

  if (loading || editingLoading) {
    return (
      <div className="p-3 sm:p-6 md:p-8 w-full max-w-full">
        <div className="mb-6 h-8 bg-gray-200/80 rounded animate-pulse max-w-md" />
        {editingLoading ? (
          <p className="text-center text-gray-500 py-8">
            Carregando pedido para edição...
          </p>
        ) : (
          <ListPageSkeleton variant="list" />
        )}
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="w-full -mx-2 sm:-mx-4 md:-mx-6 px-0 sm:px-4 md:px-6 lg:px-8 overflow-x-hidden">
        <OrdersForm
          userId={userId}
          userRole={userRole}
          clients={clients}
          clientsList={clientsList}
          brands={safeBrands} // ← Usando safeBrands validado
          editingOrder={editingOrder}
          onOrderAdded={() => {
            setShowForm(false);
            setEditingOrder(null);
            fetchData();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingOrder(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 md:p-8">
      <ConfirmationModal
        show={!!modalAction.orderId}
        onConfirm={handleAction}
        onCancel={() => setModalAction({ type: null, orderId: null })}
        message={
          modalAction.type === "delete"
            ? "Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita."
            : "Confirmar finalização da entrega? O estoque será baixado e o status ficará como Entregue."
        }
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
      {paymentDialogOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-gray-800">
              Registrar pagamento do pedido #{paymentDialogOrder.id}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Escolha como o cliente quitou o pedido que estava em carteira.
            </p>
            <select
              value={paymentDialogMethod}
              onChange={(e) => setPaymentDialogMethod(e.target.value)}
              className="mt-4 w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="boleto">Boleto</option>
              <option value="pix">PIX</option>
              <option value="cheque">Cheque</option>
              <option value="dinheiro">Dinheiro</option>
            </select>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPaymentDialogOrder(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={updatingPayment}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPaymentMethod}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={updatingPayment}
              >
                {updatingPayment ? "Salvando..." : "Salvar pagamento"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
          Gerenciamento de Pedidos
        </h1>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingOrder(null);
          }}
          className="hidden sm:inline-flex sm:items-center sm:justify-center min-h-11 bg-blue-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-300 shadow-md"
        >
          + Novo orçamento
        </button>
      </div>
      <div className="mb-5">
        <input
          type="search"
          value={orderSearch}
          onChange={(e) => setOrderSearch(e.target.value)}
          placeholder="Buscar pedido por numero, cliente, representante, representada..."
          className="w-full min-h-11 rounded-lg border border-gray-300 p-3 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {listFetchError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {listFetchError}
        </div>
      )}

      <p className="text-gray-600 mb-8">
        Acompanhe o status e histórico de pedidos.
      </p>
      <div className="bg-white rounded-2xl shadow-md p-3 sm:p-6 border border-gray-200">
        {filteredOrdersByDay.length > 0 ? (
          <div className="space-y-8">
            {filteredOrdersByDayPaged.map(({ dateKey, label, orders: dayOrders }) => (
              <section key={dateKey} className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-100 pb-2">
                  {label}
                </h2>
                <ul className="divide-y divide-gray-200">
                  {dayOrders.map((order) => {
                    const openDays = formatOpenDays(
                      order.createdAt,
                      order.status,
                    );
                    return (
                      <li
                        key={order.id}
                        className="py-5 sm:py-6 flex flex-col sm:flex-row justify-between sm:items-start gap-4"
                      >
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-800">
                            {order.documentType === "orcamento"
                              ? "Orçamento"
                              : "Pedido"}{" "}
                            #{order.id}
                          </h3>
                          <p className="text-xs font-medium text-indigo-700 mt-0.5">
                            {order.documentType === "orcamento"
                              ? "Status: orçamento (aguardando virar pedido)"
                              : "Pedido"}
                          </p>
                          {order.documentType === "pedido" && (
                            <p className="mt-2">
                              <span
                                className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${
                                  PAYMENT_BADGE_CLASS[order.paymentMethod] ||
                                  "bg-gray-100 text-gray-800 border-gray-300"
                                }`}
                              >
                                {order.paymentMethod
                                  ? PAYMENT_LABELS[order.paymentMethod] ||
                                    order.paymentMethod
                                  : "Pagamento não informado"}
                              </span>
                            </p>
                          )}
                          <p className="text-sm text-gray-500 mt-1">
                            Cliente: {clients[order.clientId] || "N/A"}
                          </p>
                          {userRole === "admin" && (order.sellerName || order.sellerUsername) ? (
                            <p className="text-sm text-gray-500 mt-1">
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
                            <p className="text-sm text-gray-700 mt-1 font-medium">
                              Representada: {order.representadas}
                            </p>
                          ) : null}
                          <p className="text-sm text-gray-500 mt-1">
                            Itens: {order.itemsCount ?? order.items?.length ?? 0}
                          </p>
                          {order.createdAt ? (
                            <p className="text-sm text-gray-600 mt-1">
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
                                <span className="ml-2 text-amber-800 font-medium">
                                  • há {openDays} dia
                                  {openDays === 1 ? "" : "s"}
                                </span>
                              ) : null}
                            </p>
                          ) : null}
                          <p className="text-sm text-gray-500 mt-1">
                            Descrição: {order.description || "N/A"}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Finalizado em:{" "}
                            {order.finishedAt
                              ? new Date(order.finishedAt).toLocaleDateString(
                                  "pt-BR",
                                )
                              : "—"}
                          </p>
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-3 text-left sm:text-right w-full sm:w-fit">
                          <div className="flex flex-col items-start sm:items-end gap-2 w-full">
                            <div className="bg-gray-50 rounded-xl px-4 py-2 shadow-sm w-full sm:w-fit">
                              <p className="text-base font-bold text-gray-800">
                                Total: {formatCurrency(order.totalPrice)}
                              </p>
                              {order.discount > 0 && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Desconto geral no pedido: {order.discount}%
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
              <div className="text-center py-6">
                <button
                  type="button"
                  onClick={() => setVisibleDayGroups((n) => n + 10)}
                  className="rounded-lg border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-100 min-h-11 w-full max-w-sm mx-auto"
                >
                  Mostrar mais dias
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500">
            Nenhum pedido encontrado para esta busca.
          </div>
        )}
      </div>

      <button
        type="button"
        aria-label="Novo orçamento"
        className="fixed z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white shadow-lg hover:bg-blue-700 sm:hidden"
        style={{
          bottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))",
          right: "max(1.25rem, env(safe-area-inset-right, 0px))",
        }}
        onClick={() => {
          setShowForm(true);
          setEditingOrder(null);
        }}
      >
        +
      </button>
    </div>
  );
};

export default OrdersPage;
