import React, { useState, useEffect } from "react";
import apiService from "../apiService";
import ConfirmationModal from "../components/ConfirmationModal";
import Modal from "../components/ConfirmationModal";

// O componente recebe clientId, reps, e clients como props
const ClientHistoryPage = ({ clientId, reps, clients }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [stats, setStats] = useState({});

  const fetchData = async () => {
    if (!clientId) return;

    try {
      setLoading(true);
      const [ordersData, statsData] = await Promise.all([
        apiService.getOrders({ clientId }),
        apiService.getClientStats(clientId)
      ]);

      setOrders(ordersData);
      setStats(statsData);
    } catch (error) {
      console.error("Erro ao buscar dados do cliente:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [clientId]);

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
  };

  // Se o loading for true, exibe a mensagem de carregamento
  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Carregando histórico do cliente...
      </div>
    );
  }

  // Acessa o nome do cliente a partir do objeto `clients`
  const clientName = clients[clientId] || "N/A";

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800">
        Histórico de Compras
      </h1>
      <p className="text-xl text-gray-600 mb-6">
        Cliente: <span className="font-semibold">{clientName}</span>
      </p>

      {/* Estatísticas */}
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200 mb-6 flex space-x-4">
        <div className="flex-1 text-center">
          <p className="text-sm text-gray-500">Pedidos Totais</p>
          <p className="text-2xl font-bold text-blue-600">
            {stats.totalOrders}
          </p>
        </div>
        <div className="flex-1 text-center">
          <p className="text-sm text-gray-500">Valor Total Gasto</p>
          <p className="text-2xl font-bold text-green-600">
            R$ {parseFloat(stats.totalSpent || 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Lista de Pedidos */}
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Todos os Pedidos
        </h2>
        {orders.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {orders.map((order) => (
              <li
                key={order.id}
                className="py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleOrderClick(order)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg font-semibold text-gray-800">
                      Pedido #{order.id}
                    </p>
                    <p className="text-sm text-gray-500">
                      Data: {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                    <p className="text-sm text-gray-500">
                      Vendedor: {reps[order.userId] || "N/A"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-700">
                      Total: R$ {parseFloat(order.totalPrice).toFixed(2)}
                    </p>
                    <span
                      className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                        order.status === "Entregue"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-gray-500">
            Nenhum pedido encontrado para este cliente.
          </p>
        )}
      </div>

      {/* Modal de Detalhes do Pedido */}
      {selectedOrder && (
        <Modal show={true} onCancel={() => setSelectedOrder(null)}>
          <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">
              Detalhes do Pedido #{selectedOrder.id}
            </h2>
            <div className="mb-4">
              <p>
                **Data:**{" "}
                {new Date(selectedOrder.createdAt).toLocaleDateString("pt-BR")}
              </p>
              <p>
                **Total:** R$ {parseFloat(selectedOrder.totalPrice).toFixed(2)}
              </p>
              <p>
                **Status:**{" "}
                <span className="font-bold">{selectedOrder.status}</span>
              </p>
            </div>
            <h3 className="text-xl font-semibold mb-2">Itens:</h3>
            <ul className="list-disc list-inside space-y-2">
              {selectedOrder.items.map((item, index) => (
                <li key={index} className="flex justify-between items-center">
                  <span>
                    {item.productName} ({item.quantity}x)
                  </span>
                  <span className="font-semibold">
                    R$ {(item.quantity * parseFloat(item.price)).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ClientHistoryPage;