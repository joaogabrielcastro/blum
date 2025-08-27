import { useState, useEffect } from 'react';
import apiService from './services/apiService';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await apiService.getOrders();
        setOrders(data);
      } catch (error) {
        console.error('Falha ao buscar pedidos:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando pedidos...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Gerenciamento de Pedidos</h1>
      <p className="text-gray-600 mb-8">Acompanhe o status e histórico de pedidos.</p>
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
        {orders.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {orders.map(order => (
              <li key={order.id} className="py-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">Pedido #{order.id}</h2>
                    <p className="text-sm text-gray-500">Cliente: {order.Client?.companyName || 'N/A'}</p>
                  </div>
                  <div className="mt-2 sm:mt-0 text-right">
                    <p className="text-sm text-gray-700">Total: R$ {order.totalPrice.toFixed(2)}</p>
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                      order.status === 'Aprovado' ? 'bg-green-100 text-green-800' :
                      order.status === 'Em aberto' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center text-gray-500">Nenhum pedido encontrado.</div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
