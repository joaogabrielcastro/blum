import { useState, useEffect } from "react";
import apiService from "../apiService";

const Dashboard = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    clients: 0,
    products: 0,
    orders: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const statusResponse = await apiService.getStatus();
        setStats(statusResponse.database.stats);
      } catch (error) {
        console.error("Erro ao buscar estatísticas:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Carregando dados...
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Bem-vindo(a) ao Painel Blum
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        Selecione uma opção abaixo para começar a gerenciar.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div
          className="bg-white p-6 rounded-2xl shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1"
          onClick={() => onNavigate("clients")}
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Total de Clientes
          </h2>
          <p className="text-4xl font-bold text-blue-600">{stats.clients}</p>
        </div>
        <div
          className="bg-white p-6 rounded-2xl shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1"
          onClick={() => onNavigate("products")}
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Total de Produtos
          </h2>
          <p className="text-4xl font-bold text-blue-600">{stats.products}</p>
        </div>
        <div
          className="bg-white p-6 rounded-2xl shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1"
          onClick={() => onNavigate("orders")}
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Total de Pedidos
          </h2>
          <p className="text-4xl font-bold text-blue-600">{stats.orders}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          onClick={() => onNavigate("products")}
          className="bg-white p-6 rounded-2xl shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Catálogo de Produtos
          </h2>
          <p className="text-gray-600">Gerencie produtos, estoque e preços.</p>
        </div>
        <div
          onClick={() => onNavigate("clients")}
          className="bg-white p-6 rounded-2xl shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Gestão de Clientes
          </h2>
          <p className="text-gray-600">
            Acesse a carteira de clientes e dados de contato.
          </p>
        </div>
        <div
          onClick={() => onNavigate("orders")}
          className="bg-white p-6 rounded-2xl shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Gerenciamento de Pedidos
          </h2>
          <p className="text-gray-600">
            Acompanhe o fluxo de orçamentos e pedidos.
          </p>
        </div>
        <div
          onClick={() => onNavigate("reports")}
          className="bg-white p-6 rounded-2xl shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Relatórios
          </h2>
          <p className="text-gray-600">Monitore o desempenho de vendas.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
