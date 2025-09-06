import { useState, useEffect } from "react";
import apiService from "../services/apiService";
import formatCurrency from "../utils/format";
import SalesChart from "../components/SalesChart";

const ReportsPage = ({ userRole, userId, reps = {} }) => {
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState("monthly");
  const [salesByRep, setSalesByRep] = useState([]);
  const [clients, setClients] = useState({});
  const [chartData, setChartData] = useState([]);
  const monthlyTarget = 80000;

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const ordersData = await apiService.getOrders(
          userRole === "salesperson" ? userId : null
        );
        const clientsData = await apiService.getClients();
        const clientsMap = {};
        clientsData.forEach((client) => {
          clientsMap[client.id] = client.companyName;
        });
        setClients(clientsMap);

        const finishedOrders = ordersData.filter(
          (order) => order.status === "Entregue"
        );
        setAllOrders(finishedOrders);
        const salesMap = finishedOrders.reduce((acc, order) => {
          const repId = order.userId || "N/A";
          const total = parseFloat(order.totalPrice) || 0;
          acc[repId] = (acc[repId] || 0) + total;
          return acc;
        }, {});
        const salesByRepList = Object.keys(salesMap).map((repId) => ({
          userId: repId,
          totalSales: salesMap[repId],
        }));
        setSalesByRep(salesByRepList);
      } catch (error) {
        console.error("Erro ao buscar relatórios:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [userRole, userId]);

  useEffect(() => {
    const prepareChartData = () => {
      const currentMonthOrders = allOrders
        .filter((order) => {
          const orderDate = new Date(order.finishedAt);
          const today = new Date();
          return (
            orderDate.getMonth() === today.getMonth() &&
            orderDate.getFullYear() === today.getFullYear()
          );
        })
        .sort((a, b) => new Date(a.finishedAt) - new Date(b.finishedAt));

      let cumulativeSales = 0;
      const data = currentMonthOrders.map((order) => {
        cumulativeSales += parseFloat(order.totalPrice);
        return {
          date: new Date(order.finishedAt).toLocaleDateString("pt-BR"),
          "Vendas Acumuladas": cumulativeSales,
        };
      });
      setChartData(data);
    };
    prepareChartData();
  }, [allOrders]);

  const getFilteredOrders = (days) => {
    const today = new Date();
    const filterDate = new Date();
    filterDate.setDate(today.getDate() - days);
    return allOrders.filter(
      (order) => order.finishedAt && new Date(order.finishedAt) >= filterDate
    );
  };
  const weeklyOrders = getFilteredOrders(7);
  const monthlyOrders = getFilteredOrders(30);

  const ordersToDisplay =
    filterPeriod === "weekly"
      ? weeklyOrders
      : filterPeriod === "monthly"
      ? monthlyOrders
      : allOrders;
  const totalSales = ordersToDisplay.reduce(
    (acc, order) => acc + (parseFloat(order.totalPrice) || 0),
    0
  ); // Função segura para obter nome do representante

  const getRepName = (userId) => {
    return reps[userId] || userId || "N/A";
  };

  if (loading)
    return (
      <div className="p-8 text-center text-gray-500">
        Carregando relatórios...
      </div>
    );

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Relatórios de Vendas
      </h1>
      <div className="flex items-center gap-2 flex-wrap mb-8">
        <span className="font-semibold text-gray-700">
          Filtrar por Período:
        </span>

        <button
          onClick={() => setFilterPeriod("all")}
          className={`min-w-fit px-5 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
            filterPeriod === "all"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Todos
        </button>

        <button
          onClick={() => setFilterPeriod("weekly")}
          className={`min-w-fit px-5 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
            filterPeriod === "weekly"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Última Semana
        </button>

        <button
          onClick={() => setFilterPeriod("monthly")}
          className={`min-w-fit px-5 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
            filterPeriod === "monthly"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Último Mês
        </button>
      </div>{" "}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Total de Pedidos */}
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 hover:shadow-lg transition-transform duration-300 transform hover:-translate-y-1">
          <h2 className="text-xl font-semibold text-gray-800 mb-2 flex justify-between items-center gap-4">
            <span>Total de Pedidos</span>
            <span className="material-symbols-outlined text-blue-500 text-[22px]">
              shopping_cart
            </span>
          </h2>
          <p className="text-4xl font-bold text-blue-600">
            {ordersToDisplay.length}
          </p>
        </div>

        {/* Valor Total de Vendas */}
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 hover:shadow-lg transition-transform duration-300 transform hover:-translate-y-1">
          <h2 className="text-xl font-semibold text-gray-800 mb-2 flex justify-between items-center gap-4">
            <span>Valor Total de Vendas</span>
            <span className="material-symbols-outlined text-blue-500 text-[22px]">
              attach_money
            </span>
          </h2>
          <p className="text-4xl font-bold text-blue-600">
            {formatCurrency(totalSales)}
          </p>
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Progresso de Vendas (Mês Atual)
        </h2>
        {/* A linha do gráfico foi atualizada para strokeWidth={4} dentro de SalesChart */}
        <SalesChart data={chartData} monthlyTarget={monthlyTarget} />
      </div>{" "}
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Detalhes dos Pedidos
      </h2>{" "}
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
        {" "}
        {ordersToDisplay.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            {" "}
            <thead className="bg-gray-50">
              {" "}
              <tr>
                {" "}
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Pedido ID                {" "}
                </th>{" "}
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Cliente                {" "}
                </th>{" "}
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Valor Total                {" "}
                </th>{" "}
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Data de Finalização                {" "}
                </th>{" "}
              </tr>{" "}
            </thead>{" "}
            <tbody className="bg-white divide-y divide-gray-200">
              {" "}
              {ordersToDisplay.map((order) => (
                <tr key={order.id}>
                  {" "}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.id}
                  </td>{" "}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {clients[order.clientId] || "N/A"}
                  </td>{" "}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    R$ {formatCurrency(order.totalPrice)}{" "}
                  </td>{" "}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {" "}
                    {order.finishedAt
                      ? new Date(order.finishedAt).toLocaleDateString("pt-BR")
                      : "N/A"}{" "}
                  </td>{" "}
                </tr>
              ))}{" "}
            </tbody>{" "}
          </table>
        ) : (
          <div className="text-center text-gray-500">
            Nenhum pedido encontrado para o período selecionado.
          </div>
        )}{" "}
      </div>{" "}
      <h2 className="text-2xl font-bold text-gray-800 mt-10 mb-4">
        Vendas por Representante
      </h2>{" "}
      <p className="text-gray-600 mb-4">
        Este relatório consolida o valor total de vendas por representante.
      </p>{" "}
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
        {" "}
        {userRole === "admin" && salesByRep.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            {" "}
            <thead className="bg-gray-50">
              {" "}
              <tr>
                {" "}
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Representante                {" "}
                </th>{" "}
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Valor Total de Vendas                {" "}
                </th>{" "}
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Comissão (6%)                {" "}
                </th>{" "}
              </tr>{" "}
            </thead>{" "}
            <tbody className="bg-white divide-y divide-gray-200">
              {" "}
              {salesByRep.map((sale, index) => (
                <tr key={index}>
                  {" "}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getRepName(sale.userId)}{" "}
                  </td>{" "}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    R$ {formatCurrency(sale.totalSales)}{" "}
                  </td>{" "}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    R${" "}
                    {formatCurrency((parseFloat(sale.totalSales) || 0) * 0.06)}{" "}
                  </td>{" "}
                </tr>
              ))}{" "}
            </tbody>{" "}
          </table>
        ) : (
          <div className="text-center text-gray-500">
            Apenas administradores podem ver este relatório.
          </div>
        )}{" "}
      </div>{" "}
    </div>
  );
};

export default ReportsPage;
