import { useState, useEffect } from "react";
import apiService from "../services/apiService";

// Adiciona o link da fonte de ícones diretamente no componente
const iconFontLink = document.createElement("link");
iconFontLink.rel = "stylesheet";
iconFontLink.href =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined";
document.head.appendChild(iconFontLink);

const Dashboard = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ clients: 0, products: 0, orders: 0 });
  const [currentDate, setCurrentDate] = useState("");

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

    const formatDate = () => {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, "0");
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const year = today.getFullYear();
      setCurrentDate(`${day}/${month}/${year}`);
    };

    fetchStats();
    formatDate();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">Carregando dados...</div>
    );
  }

  return (
    <div className="p-8">
      {/* Cabeçalho com data */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-700 text-white p-6 rounded-2xl shadow-md mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Bem-vindo(a) ao Painel Blum
            </h1>
            <p className="text-lg opacity-90">
              Gerencie suas operações com eficiência e clareza.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white text-blue-700 px-3 py-1 rounded-full shadow-sm">
            <span className="material-symbols-outlined text-[20px]">
              calendar_today
            </span>
            <span className="text-sm font-medium">{currentDate}</span>
          </div>
        </div>
      </div>

      {/* Estatísticas principais */}
      <p className="text-lg text-gray-600 mb-8">
        Selecione uma opção abaixo para começar a gerenciar.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Clientes */}
        <div
          className="bg-white p-6 rounded-2xl shadow-md cursor-pointer hover:shadow-lg transition-transform duration-300 transform hover:-translate-y-1"
          onClick={() => onNavigate("clients")}
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2 flex justify-between items-center">
            <span>Total de Clientes</span>
            <span className="material-symbols-outlined text-blue-500 text-[22px]">
              group
            </span>
          </h2>
          <p className="text-4xl font-bold text-blue-600">{stats.clients}</p>
        </div>

        {/* Produtos */}
        <div
          className="bg-white p-6 rounded-2xl shadow-md cursor-pointer hover:shadow-lg transition-transform duration-300 transform hover:-translate-y-1"
          onClick={() => onNavigate("products")}
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2 flex justify-between items-center">
            <span>Total de Produtos</span>
            <span className="material-symbols-outlined text-blue-500 text-[22px]">
              inventory_2
            </span>
          </h2>
          <p className="text-4xl font-bold text-blue-600">{stats.products}</p>
        </div>

        {/* Pedidos */}
        <div
          className="bg-white p-6 rounded-2xl shadow-md cursor-pointer hover:shadow-lg transition-transform duration-300 transform hover:-translate-y-1"
          onClick={() => onNavigate("orders")}
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2 flex justify-between items-center">
            <span>Total de Pedidos</span>
            <span className="material-symbols-outlined text-blue-500 text-[22px]">
              shopping_cart
            </span>
          </h2>
          <p className="text-4xl font-bold text-blue-600">{stats.orders}</p>
        </div>
      </div>

      {/* Ações adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Catálogo de Produtos */}
        <div
          onClick={() => onNavigate("products")}
          className="group bg-white p-6 rounded-2xl shadow-md cursor-pointer hover:shadow-lg transition-transform duration-300 transform hover:-translate-y-1"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2 flex justify-between items-center">
            <span>Catálogo de Produtos</span>
            <span className="material-symbols-outlined text-blue-500 text-[22px] group-hover:scale-110 transition-transform">
              inventory_2
            </span>
          </h2>
          <p className="text-gray-600">Gerencie produtos, estoque e preços.</p>
        </div>

        {/* Gestão de Clientes */}
        <div
          onClick={() => onNavigate("clients")}
          className="group bg-white p-6 rounded-2xl shadow-md cursor-pointer hover:shadow-lg transition-transform duration-300 transform hover:-translate-y-1"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2 flex justify-between items-center">
            <span>Gestão de Clientes</span>
            <span className="material-symbols-outlined text-blue-500 text-[22px] group-hover:scale-110 transition-transform">
              group
            </span>
          </h2>
          <p className="text-gray-600">
            Acesse a carteira de clientes e dados de contato.
          </p>
        </div>

        {/* Gerenciamento de Pedidos */}
        <div
          onClick={() => onNavigate("orders")}
          className="group bg-white p-6 rounded-2xl shadow-md cursor-pointer hover:shadow-lg transition-transform duration-300 transform hover:-translate-y-1"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2 flex justify-between items-center">
            <span>Gerenciamento de Pedidos</span>
            <span className="material-symbols-outlined text-blue-500 text-[22px] group-hover:scale-110 transition-transform">
              shopping_cart
            </span>
          </h2>
          <p className="text-gray-600">
            Acompanhe o fluxo de orçamentos e pedidos.
          </p>
        </div>

        {/* Relatórios */}
        <div
          onClick={() => onNavigate("reports")}
          className="group bg-white p-6 rounded-2xl shadow-md cursor-pointer hover:shadow-lg transition-transform duration-300 transform hover:-translate-y-1"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2 flex justify-between items-center">
            <span>Relatórios</span>
            <span className="material-symbols-outlined text-blue-500 text-[22px] group-hover:scale-110 transition-transform">
              bar_chart
            </span>
          </h2>
          <p className="text-gray-600">Monitore o desempenho de vendas.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
