import { useState, useEffect } from "react";
import apiService from "../services/apiService";
import OrdersForm from "../components/OrdersForm";
import ConfirmationModal from "../components/ConfirmationModal";
import PdfGenerator from "../components/PdfGenerator";
import formatCurrency, { formatOrderData } from "../utils/format";
import {
  getClientDisplayName,
  normalizeClientsResponse,
} from "../utils/clients";

const OrdersPage = ({ userId, userRole, brands }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingLoading, setEditingLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [clients, setClients] = useState({});
  const [clientsList, setClientsList] = useState([]);
  const [pdfOrder, setPdfOrder] = useState(null);
  const [modalAction, setModalAction] = useState({ type: null, orderId: null });

  // Validar e transformar brands para garantir segurança
  const safeBrands = Array.isArray(brands)
    ? brands.map((brand) => ({
        id: brand.id,
        name: brand.name || "",
        commission_rate: brand.commission_rate || 0,
      }))
    : [];

  useEffect(() => {
    if (userId && userRole) fetchData();
  }, [userId, userRole]);

  const fetchData = async () => {
    try {
      setLoading(true);
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
        setOrders(orders.filter((order) => order.id !== orderId));
      } else if (type === "finalize") {
        await apiService.finalizeOrder(orderId);
        setOrders(
          orders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  status: "Entregue",
                  finishedAt: new Date().toISOString(),
                }
              : order,
          ),
        );
      }
    } catch (error) {
      const errorMessage =
        error.message?.includes("404") ||
        error.message?.includes("não encontrado")
          ? `${
              type === "delete" ? "Pedido" : "Pedido"
            } não encontrado. A lista será atualizada.`
          : `Falha ao ${
              type === "delete" ? "excluir" : "finalizar"
            } pedido. Tente novamente.`;
      alert(errorMessage);
      // Recarrega a lista em caso de erro
      await fetchData();
    } finally {
      setModalAction({ type: null, orderId: null });
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
      alert(
        error?.message ||
          "Não foi possível carregar os itens do pedido para edição.",
      );
    } finally {
      setEditingLoading(false);
    }
  };

  const renderOrderActions = (order) => {
    const isDelivered = order.status === "Entregue";

    return (
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 items-center w-full sm:w-auto">
        {isDelivered && (
          <span className="inline-block col-span-2 sm:col-span-1 px-3 py-1.5 text-sm font-semibold text-green-800 bg-green-100 rounded-full shadow-sm text-center">
            Entregue
          </span>
        )}
        {!isDelivered && (
          <>
            <button
              onClick={() => handleEditOrder(order.id)}
              className="min-h-10 px-3 py-1 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition"
            >
              Editar
            </button>
            <button
              onClick={() =>
                setModalAction({ type: "finalize", orderId: order.id })
              }
              className="min-h-10 px-3 py-1 text-sm font-medium text-green-600 border border-green-600 rounded-lg hover:bg-green-50 transition"
            >
              Finalizar
            </button>
          </>
        )}
        <button
          onClick={() => setModalAction({ type: "delete", orderId: order.id })}
          className="min-h-10 px-3 py-1 text-sm font-medium text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition"
        >
          Excluir
        </button>
        {isDelivered && (
          <button
            onClick={() => setPdfOrder(order)}
            className="min-h-10 px-3 py-1 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-blue-50 transition"
          >
            Gerar PDF
          </button>
        )}
      </div>
    );
  };

  if (loading || editingLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        {editingLoading ? "Carregando pedido para edição..." : "Carregando pedidos..."}
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="w-full -mx-2 sm:-mx-4 md:-mx-6 px-0 sm:px-4 md:px-6 lg:px-8 overflow-x-hidden">
        <OrdersForm
          userId={userId}
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
            : "Tem certeza que deseja finalizar este pedido? Esta ação não pode ser desfeita."
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
          + Criar Pedido
        </button>
      </div>

      <p className="text-gray-600 mb-8">
        Acompanhe o status e histórico de pedidos.
      </p>

      <div className="bg-white rounded-2xl shadow-md p-3 sm:p-6 border border-gray-200">
        {orders.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {orders.map((order) => (
              <li
                key={order.id}
                className="py-5 sm:py-6 flex flex-col sm:flex-row justify-between sm:items-start gap-4"
              >
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Pedido #{order.id}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Cliente: {clients[order.clientId] || "N/A"}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Itens: {order.itemsCount ?? order.items?.length ?? 0}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Descrição: {order.description || "N/A"}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Finalizado em:{" "}
                    {order.finishedAt
                      ? new Date(order.finishedAt).toLocaleDateString("pt-BR")
                      : "N/A"}
                  </p>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-3 text-left sm:text-right w-full sm:w-fit">
                  <div className="flex flex-col items-start sm:items-end gap-2 w-full">
                    <div className="bg-gray-50 rounded-xl px-4 py-2 shadow-sm w-full sm:w-fit">
                      <p className="text-base font-bold text-gray-800">
                        Total: {formatCurrency(order.totalPrice)}
                      </p>
                      {order.discount > 0 && (
                        <p className="text-xs text-gray-500 line-through">
                          {formatCurrency(
                            parseFloat(order.totalPrice) +
                              parseFloat(order.discount),
                          )}
                        </p>
                      )}
                    </div>
                    {renderOrderActions(order)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center text-gray-500">
            Nenhum pedido encontrado.
          </div>
        )}
      </div>

      <button
        type="button"
        aria-label="Criar novo pedido"
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
