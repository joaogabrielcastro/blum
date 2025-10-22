import { useState, useEffect } from "react";
import apiService from "../services/apiService";
import SalesChart from "../components/SalesChart";
import LoadingSpinner from "../components/LoadingSpinner";

const Dashboard = ({ onNavigate, userId, username, userRole }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    clients: 0,
    products: 0,
    orders: 0,
    purchases: 0,
    revenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        const currentUserId = userId || username;

        if (!currentUserId) {
          console.error("UserId não disponível");
          return;
        }

        console.log("Buscando dados para:", { currentUserId, userRole });

        // Prepara os parâmetros base - DIFERENTES para admin vs vendedor
        let ordersParams = {
          limit: 50, // Aumentei para pegar mais pedidos para o gráfico
          sort: "createdAt",
          order: "desc",
        };

        let reportParams = {};

        // SE FOR VENDEDOR: aplica filtro por usuário
        if (userRole === "salesperson") {
          ordersParams.userId = currentUserId;
          ordersParams.userRole = "salesperson";
          reportParams.userId = currentUserId;
          reportParams.userRole = "salesperson";
          console.log(
            "🔍 Vendedor - Aplicando filtro por usuário:",
            currentUserId
          );
        }
        // SE FOR ADMIN: NÃO aplica filtro (vê tudo)
        else if (userRole === "admin") {
          ordersParams.userRole = "admin";
          console.log("👑 Admin - Sem filtro (vendo tudo)");
        }

        const [statusResponse, ordersResponse, salesResponse] =
          await Promise.all([
            apiService.getStatus(),
            apiService.getOrders(ordersParams),
            apiService.getReportStats(reportParams),
          ]);

        console.log("Status Response:", statusResponse);
        console.log("Orders Response:", ordersResponse);
        console.log("Sales Response:", salesResponse);

        // CORREÇÃO: Usar os dados filtrados para os cards
        setStats({
          clients: statusResponse.database.stats.clients,
          products: statusResponse.database.stats.products,
          orders: salesResponse?.totalOrders || 0,
          revenue: salesResponse?.totalSales || 0,
        });

        setRecentOrders(ordersResponse?.slice(0, 5) || []); // Apenas os 5 mais recentes

        // PREPARAR DADOS PARA O GRÁFICO (igual ao ReportsPage)
        const finishedOrders = ordersResponse.filter(
          (order) => order.status === "Entregue"
        );

        // Agrupar vendas por data para gráfico
        const salesByDate = {};

        finishedOrders.forEach((order) => {
          if (!order.finishedat) return;

          const date = new Date(order.finishedat).toLocaleDateString("pt-BR");
          const total = parseFloat(order.totalprice) || 0;

          if (salesByDate[date]) {
            salesByDate[date] += total;
          } else {
            salesByDate[date] = total;
          }
        });

        // Ordenar datas cronologicamente
        const sortedDates = Object.keys(salesByDate).sort((a, b) => {
          return (
            new Date(a.split("/").reverse().join("-")) -
            new Date(b.split("/").reverse().join("-"))
          );
        });

        // Calcular vendas acumuladas
        let cumulativeSales = 0;
        const chartData = sortedDates.map((date) => {
          cumulativeSales += salesByDate[date];
          return {
            date: date,
            "Vendas Acumuladas": cumulativeSales,
            "Vendas do Dia": salesByDate[date],
          };
        });

        setSalesData(chartData);
      } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    const formatDate = () => {
      const today = new Date();
      const options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      setCurrentDate(today.toLocaleDateString("pt-BR", options));
    };

    fetchDashboardData();
    formatDate();
  }, [userId, username, userRole]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const getOrderStatus = (status) => {
    const statusMap = {
      pending: { color: "bg-yellow-100 text-yellow-800", text: "Pendente" },
      processing: { color: "bg-blue-100 text-blue-800", text: "Processando" },
      completed: { color: "bg-green-100 text-green-800", text: "Concluído" },
      cancelled: { color: "bg-red-100 text-red-800", text: "Cancelado" },
    };
    return (
      statusMap[status] || { color: "bg-gray-100 text-gray-800", text: status }
    );
  };

  if (loading) {
    return <LoadingSpinner message="Carregando dashboard..." />;
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header Fixo */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">
                Bem-vindo(a) ao Painel Blum
              </h1>
              <p className="text-blue-100 text-sm">
                Gerencie suas operações com eficiência e clareza
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white text-blue-700 px-3 py-1 rounded-full shadow-sm">
              <span className="text-sm font-medium">{currentDate}</span>
            </div>
          </div>
        </div>
      </div>
      <span>
        <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto">
          {/* Conteúdo Principal */}
        </div>
      </span>
      {/* Grid de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Clientes */}
        <div
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-all duration-300 hover:border-blue-300 group"
          onClick={() => onNavigate("clients")}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <span className="text-2xl font-bold text-blue-600">
              {stats.clients}
            </span>
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">Clientes</h3>
          <p className="text-sm text-gray-600">Total cadastrado</p>
        </div>

        {/* Produtos */}
        <div
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-all duration-300 hover:border-green-300 group"
          onClick={() => onNavigate("products")}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <span className="text-2xl font-bold text-green-600">
              {stats.products}
            </span>
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">Produtos</h3>
          <p className="text-sm text-gray-600">Em estoque</p>
        </div>

        {/* Pedidos */}
        <div
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-all duration-300 hover:border-purple-300 group"
          onClick={() => onNavigate("orders")}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
            <span className="text-2xl font-bold text-purple-600">
              {stats.orders}
            </span>
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">Pedidos</h3>
          <p className="text-sm text-gray-600">Realizados</p>
        </div>

        {/* Receita */}
        <div
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-all duration-300 hover:border-orange-300 group"
          onClick={() => onNavigate("reports")}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition-colors">
              <svg
                className="w-6 h-6 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
            </div>
            <span className="text-2xl font-bold text-orange-600">
              {formatCurrency(stats.revenue)}
            </span>
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">Receita</h3>
          <p className="text-sm text-gray-600">Total acumulado</p>
        </div>
      </div>

      {/* Gráfico e Pedidos Recentes */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        {/* Gráfico de Vendas */}
        <div className="xl:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Desempenho de Vendas
            </h2>
            <button
              onClick={() => onNavigate("reports")}
              className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
            >
              Ver detalhes
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
          <div className="flex-1">
            <SalesChart
              data={salesData}
              simplified={true} // ← Adicione esta prop
            />
          </div>
        </div>

        {/* Pedidos Recentes */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Pedidos Recentes
            </h2>
            <button
              onClick={() => onNavigate("orders")}
              className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
            >
              Ver todos
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <div className="space-y-4">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        Pedido #{order.id}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(order.createdat).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        getOrderStatus(order.status).color
                      }`}
                    >
                      {getOrderStatus(order.status).text}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg
                    className="w-12 h-12 mx-auto text-gray-400 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                  <p>Nenhum pedido recente</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
