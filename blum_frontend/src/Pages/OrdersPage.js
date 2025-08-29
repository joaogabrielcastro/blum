import { useState, useEffect } from 'react';
import apiService from '../apiService';
import OrdersForm from '../components/OrdersForm';

const OrdersPage = ({ userId }) => {
  const [orders, setOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const ordersData = await apiService.getOrders(userId);
      setOrders(ordersData);
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      alert("Falha ao carregar pedidos.");
    } finally {
      setLoading(false);
    }
  };

  const handleOrderAdded = () => {
    setShowForm(false);
    fetchOrders();
  };

  const handleDeleteOrder = async (orderId) => {
    if (window.confirm("Tem certeza que deseja excluir este pedido?")) {
      try {
        await apiService.deleteOrder(orderId);
        fetchOrders();
      } catch (error) {
        console.error("Erro ao excluir pedido:", error);
        alert("Falha ao excluir pedido.");
      }
    }
  };

  const handleFinalizeOrder = async (orderId) => {
    try {
      await apiService.finalizeOrder(orderId);
      fetchOrders();
    } catch (error) {
      console.error("Erro ao finalizar pedido:", error);
      alert("Falha ao finalizar pedido.");
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Pedidos</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300 shadow-md"
        >
          + Criar Pedido
        </button>
      </div>

      {showForm ? (
        <OrdersForm onOrderAdded={handleOrderAdded} onCancel={() => setShowForm(false)} userId={userId} />
      ) : (
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">Carregando pedidos...</div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Nenhum pedido encontrado.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap">#{order.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">R$ {order.totalPrice.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'Entregue' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {order.status !== 'Entregue' && (
                        <button
                          onClick={() => handleFinalizeOrder(order.id)}
                          className="bg-green-600 text-white font-bold py-1 px-3 rounded-lg hover:bg-green-700 transition duration-300 mr-2"
                        >
                          Finalizar
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="bg-red-600 text-white font-bold py-1 px-3 rounded-lg hover:bg-red-700 transition duration-300"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;