import { useState, useEffect } from "react";
import apiService from "../services/apiService";
import OrdersForm from "../components/OrdersForm";
import ConfirmationModal from "../components/ConfirmationModal";
import PdfGenerator from "../components/PdfGenerator";
import formatCurrency, { formatOrderData } from "../utils/format";

const OrdersPage = ({ userId, userRole, reps, brands }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [clients, setClients] = useState({});
  const [pdfOrder, setPdfOrder] = useState(null);
  const [modalAction, setModalAction] = useState({ type: null, orderId: null });

  // DEBUG: Verificar as brands recebidas
  console.log("DEBUG - Brands received:", brands);
  console.log("DEBUG - Brands type:", typeof brands);

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
        apiService.getOrders({ userId, userRole }),
        apiService.getClients(),
      ]);

      // DEBUG: Verificar dados brutos
      console.log("DEBUG - Raw orders data:", ordersData);
      console.log("DEBUG - Raw clients data:", clientsData);

      // Formata os pedidos usando a função importada
      const formattedOrders = ordersData.map((order) => formatOrderData(order));

      // DEBUG: Verificar dados formatados
      console.log("DEBUG - Formatted orders:", formattedOrders);

      setOrders(formattedOrders);

      const clientsMap = {};
      clientsData.forEach((client) => {
        clientsMap[client.id] = client.companyName;
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
              : order
          )
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
      await fetchOrders();
    } finally {
      setModalAction({ type: null, orderId: null });
    }
  };

  const renderOrderActions = (order) => {
    const isDelivered = order.status === "Entregue";

    return (
      <div
        className={`flex flex-wrap gap-4 items-center ${
          isDelivered ? "max-[450px]:justify-between max-[450px]:w-full" : ""
        }`}
      >
        {isDelivered && (
          <span className="inline-block px-3 py-1 text-sm font-semibold text-green-800 bg-green-100 rounded-full shadow-sm">
            Entregue
          </span>
        )}
        {!isDelivered && (
          <>
            <button
              onClick={() => {
                setEditingOrder(order);
                setShowForm(true);
              }}
              className="px-3 py-1 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition"
            >
              Editar
            </button>
            <button
              onClick={() =>
                setModalAction({ type: "finalize", orderId: order.id })
              }
              className="px-3 py-1 text-sm font-medium text-green-600 border border-green-600 rounded-lg hover:bg-green-50 transition"
            >
              Finalizar
            </button>
          </>
        )}
        <button
          onClick={() => setModalAction({ type: "delete", orderId: order.id })}
          className="px-3 py-1 text-sm font-medium text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition"
        >
          Excluir
        </button>
        {isDelivered && (
          <button
            onClick={() => setPdfOrder(order)}
            className="px-3 py-1 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-blue-50 transition"
          >
            Gerar PDF
          </button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">Carregando pedidos...</div>
    );
  }

  if (showForm) {
    return (
      <div className="p-8">
        <OrdersForm
          userId={userId}
          clients={clients}
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
    <div className="p-8">
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
          reps={reps}
          brands={safeBrands} // ← Usando safeBrands validado
          onClose={() => setPdfOrder(null)}
        />
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Gerenciamento de Pedidos
        </h1>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingOrder(null);
          }}
          className="bg-blue-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-300 shadow-md"
        >
          + Criar Pedido
        </button>
      </div>

      <p className="text-gray-600 mb-8">
        Acompanhe o status e histórico de pedidos.
      </p>

      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
        {orders.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {orders.map((order) => (
              <li
                key={order.id}
                className="py-6 flex flex-row justify-between items-start gap-4 max-[450px]:flex-col"
              >
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Pedido #{order.id}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Cliente: {clients[order.clientId] || "N/A"}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Itens: {order.items?.length || 0}
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
                <div className="flex flex-col items-end gap-3 text-right w-fit max-[450px]:w-full max-[450px]:items-start max-[450px]:text-left">
                  <div className="flex flex-col items-end gap-2 max-[450px]:flex-row max-[450px]:justify-between max-[450px]:items-center max-[450px]:w-full">
                    <div className="bg-gray-50 rounded-xl px-4 py-2 shadow-sm w-fit">
                      <p className="text-base font-bold text-gray-800">
                        Total: {formatCurrency(order.totalPrice)}
                      </p>
                      {order.discount > 0 && (
                        <p className="text-xs text-gray-500 line-through">
                          {formatCurrency(
                            parseFloat(order.totalPrice) +
                              parseFloat(order.discount)
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
    </div>
  );
};

export default OrdersPage;
