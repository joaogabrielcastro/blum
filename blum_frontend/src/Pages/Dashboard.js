import { useState, useEffect } from 'react';
import apiService from '../apiService';

const Dashboard = ({ onNavigate }) => {
  const [stats, setStats] = useState({
    totalClients: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalSales: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const statsData = await apiService.getDashboardStats();
      setStats(statsData);
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Painel de Controle</h1>
      
      {loading ? (
        <div className="text-center py-8">Carregando estatísticas...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Clientes</h2>
              <p className="text-3xl font-bold text-blue-600">{stats.totalClients}</p>
              <button 
                onClick={() => onNavigate('clients')}
                className="mt-4 text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                Ver todos →
              </button>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Produtos</h2>
              <p className="text-3xl font-bold text-green-600">{stats.totalProducts}</p>
              <button 
                onClick={() => onNavigate('products')}
                className="mt-4 text-green-600 hover:text-green-800 font-medium text-sm"
              >
                Ver todos →
              </button>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Pedidos</h2>
              <p className="text-3xl font-bold text-purple-600">{stats.totalOrders}</p>
              <button 
                onClick={() => onNavigate('orders')}
                className="mt-4 text-purple-600 hover:text-purple-800 font-medium text-sm"
              >
                Ver todos →
              </button>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Vendas (R$)</h2>
              <p className="text-3xl font-bold text-orange-600">
                {stats.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <button 
                onClick={() => onNavigate('reports')}
                className="mt-4 text-orange-600 hover:text-orange-800 font-medium text-sm"
              >
                Ver relatórios →
              </button>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Ações Rápidas</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={() => onNavigate('clients')}
                className="p-4 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200 font-medium"
              >
                + Adicionar Cliente
              </button>
              <button 
                onClick={() => onNavigate('products')}
                className="p-4 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors duration-200 font-medium"
              >
                + Adicionar Produto
              </button>
              <button 
                onClick={() => onNavigate('orders')}
                className="p-4 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors duration-200 font-medium"
              >
                + Criar Pedido
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;