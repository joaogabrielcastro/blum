import { useState, useEffect } from "react";

const Dashboard = ({ onNavigate, db, authReady }) => {
  const [stats, setStats] = useState({
    clients: 0,
    products: 0,
    orders: 0,
    sales: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !authReady) return;

    const fetchStats = async () => {
      try {
        // Buscar contagem de clientes
        const clientsRef = collection(db, getPublicCollectionPath('clients'));
        const clientsSnapshot = await getDocs(clientsRef);
        
        // Buscar contagem de produtos
        const productsRef = collection(db, getPublicCollectionPath('products'));
        const productsSnapshot = await getDocs(productsRef);
        
        // Buscar pedidos e calcular vendas
        const ordersRef = collection(db, getPublicCollectionPath('orders'));
        const ordersSnapshot = await getDocs(ordersRef);
        const totalSales = ordersSnapshot.docs.reduce((sum, doc) => {
          const order = doc.data();
          return sum + (order.totalPrice || 0);
        }, 0);

        setStats({
          clients: clientsSnapshot.size,
          products: productsSnapshot.size,
          orders: ordersSnapshot.size,
          sales: totalSales
        });
      } catch (error) {
        console.error("Erro ao buscar estatísticas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [db, authReady]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-500">Carregando dados...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Bem-vindo(a) ao Painel Blum</h1>
      
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Clientes</h2>
          <p className="text-3xl font-bold text-blue-600">{stats.clients}</p>
          <button 
            onClick={() => onNavigate('clients')}
            className="text-blue-500 text-sm hover:underline mt-2"
          >
            Ver todos →
          </button>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Produtos</h2>
          <p className="text-3xl font-bold text-green-600">{stats.products}</p>
          <button 
            onClick={() => onNavigate('products')}
            className="text-blue-500 text-sm hover:underline mt-2"
          >
            Ver todos →
          </button>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Pedidos</h2>
          <p className="text-3xl font-bold text-purple-600">{stats.orders}</p>
          <button 
            onClick={() => onNavigate('orders')}
            className="text-blue-500 text-sm hover:underline mt-2"
          >
            Ver todos →
          </button>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Vendas (R$)</h2>
          <p className="text-3xl font-bold text-orange-600">
            R$ {stats.sales.toFixed(2)}
          </p>
          <button 
            onClick={() => onNavigate('reports')}
            className="text-blue-500 text-sm hover:underline mt-2"
          >
            Ver relatórios →
          </button>
        </div>
      </div>

      <p className="text-lg text-gray-600 mb-8">Selecione uma opção abaixo para começar a gerenciar.</p>
      
      {/* Ações Rápidas */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => onNavigate('clients')}
            className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition duration-300 text-center"
          >
            <span className="font-semibold">+ Adicionar Cliente</span>
          </button>
          <button
            onClick={() => onNavigate('products')}
            className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition duration-300 text-center"
          >
            <span className="font-semibold">+ Adicionar Produto</span>
          </button>
          <button
            onClick={() => onNavigate('orders')}
            className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition duration-300 text-center"
          >
            <span className="font-semibold">+ Criar Pedido</span>
          </button>
        </div>
      </div>

      {/* Cards de Navegação */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          onClick={() => onNavigate('products')} 
          className="bg-white p-6 rounded-2xl shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Catálogo de Produtos</h2>
          <p className="text-gray-600">Gerencie produtos, estoque e preços.</p>
        </div>
        <div 
          onClick={() => onNavigate('clients')} 
          className="bg-white p-6 rounded-2xl shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Gestão de Clientes</h2>
          <p className="text-gray-600">Acesse a carteira de clientes e dados de contato.</p>
        </div>
        <div 
          onClick={() => onNavigate('orders')} 
          className="bg-white p-6 rounded-2xl shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Gerenciamento de Pedidos</h2>
          <p className="text-gray-600">Acompanhe o fluxo de orçamentos e pedidos.</p>
        </div>
        <div 
          onClick={() => onNavigate('reports')} 
          className="bg-white p-6 rounded-2xl shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Relatórios</h2>
          <p className="text-gray-600">Monitore o desempenho de vendas.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
