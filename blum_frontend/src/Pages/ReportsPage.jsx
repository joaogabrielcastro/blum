import { useState, useEffect } from "react";
import apiService from "../services/apiService";
import formatCurrency from "../utils/format";
import SalesChart from "../components/SalesChart";

const ReportsPage = ({ userRole, userId, reps = {} }) => {
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [salesByRep, setSalesByRep] = useState([]);
  const [commissionsByRep, setCommissionsByRep] = useState([]);
  const [clients, setClients] = useState({});
  const [chartData, setChartData] = useState([]);
  const monthlyTarget = 80000;

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const ordersData = await apiService.getOrders({
          userRole,
          userId,
        });

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

        // Calcular vendas por representante
        const salesMap = finishedOrders.reduce((acc, order) => {
          const repId = order.userid || "N/A";
          const total = parseFloat(order.totalprice) || 0;
          acc[repId] = (acc[repId] || 0) + total;
          return acc;
        }, {});

        const salesByRepList = Object.keys(salesMap).map((repId) => ({
          userId: repId,
          totalSales: salesMap[repId],
        }));
        setSalesByRep(salesByRepList);

        // Calcular comissões reais por representante
        const commissionsMap = finishedOrders.reduce((acc, order) => {
          const repId = order.userid || "N/A";
          const commission = parseFloat(order.total_commission) || 0;
          acc[repId] = (acc[repId] || 0) + commission;
          return acc;
        }, {});

        const commissionsByRepList = Object.keys(commissionsMap).map(
          (repId) => ({
            userId: repId,
            totalCommission: commissionsMap[repId],
            totalSales: salesMap[repId] || 0,
            commissionRate:
              salesMap[repId] > 0
                ? ((commissionsMap[repId] / salesMap[repId]) * 100).toFixed(2)
                : "0.00",
          })
        );
        setCommissionsByRep(commissionsByRepList);
      } catch (error) {
        console.error("Erro ao buscar relatórios:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId && userRole) {
      fetchOrders();
    }
  }, [userRole, userId]);

  const getFilteredOrders = (days) => {
    const today = new Date();
    const filterDate = new Date();
    filterDate.setDate(today.getDate() - days);
    return allOrders.filter(
      (order) => order.finishedat && new Date(order.finishedat) >= filterDate
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

  // CORREÇÃO: Gráfico por data para evitar poluição visual
  useEffect(() => {
    const prepareChartData = () => {
      if (ordersToDisplay.length === 0) {
        setChartData([]);
        return;
      }

      // Agrupar vendas por data para gráfico mais limpo
      const salesByDate = {};
      
      ordersToDisplay.forEach(order => {
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
        return new Date(a.split('/').reverse().join('-')) - new Date(b.split('/').reverse().join('-'));
      });

      // Calcular vendas acumuladas
      let cumulativeSales = 0;
      const data = sortedDates.map(date => {
        cumulativeSales += salesByDate[date];
        return {
          date: date,
          "Vendas Acumuladas": cumulativeSales,
          "Vendas do Dia": salesByDate[date]
        };
      });

      setChartData(data);
    };

    prepareChartData();
  }, [ordersToDisplay, filterPeriod]);

  const totalSales = ordersToDisplay.reduce(
    (acc, order) => acc + (parseFloat(order.totalprice) || 0),
    0
  );

  const totalCommissions = ordersToDisplay.reduce(
    (acc, order) => acc + (parseFloat(order.total_commission) || 0),
    0
  );

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
        Relatórios de Vendas e Comissões
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 hover:shadow-lg transition-transform duration-300 transform hover:-translate-y-1">
          <h2 className="text-xl font-semibold text-gray-800 mb-2 flex justify-between items-center gap-4">
            <span>Total de Pedidos</span>
          </h2>
          <p className="text-4xl font-bold text-blue-600">
            {ordersToDisplay.length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 hover:shadow-lg transition-transform duration-300 transform hover:-translate-y-1">
          <h2 className="text-xl font-semibold text-gray-800 mb-2 flex justify-between items-center gap-4">
            <span>Valor Total de Vendas</span>
          </h2>
          <p className="text-4xl font-bold text-blue-600">
            {formatCurrency(totalSales)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 hover:shadow-lg transition-transform duration-300 transform hover:-translate-y-1">
          <h2 className="text-xl font-semibold text-gray-800 mb-2 flex justify-between items-center gap-4">
            <span>Total de Comissões</span>
          </h2>
          <p className="text-4xl font-bold text-green-600">
            {formatCurrency(totalCommissions)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {totalSales > 0
              ? ((totalCommissions / totalSales) * 100).toFixed(2)
              : "0.00"}
            % das vendas
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Evolução das Vendas
          {filterPeriod === "weekly" && " (Última Semana)"}
          {filterPeriod === "monthly" && " (Último Mês)"}
          {filterPeriod === "all" && " (Todos os Períodos)"}
        </h2>
        <SalesChart 
          data={chartData} 
          monthlyTarget={monthlyTarget}
          filterPeriod={filterPeriod}
          totalSales={totalSales}
        />
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Detalhes dos Pedidos
      </h2>

      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200 mb-8">
        {ordersToDisplay.length > 0 ? (
          <div className="overflow-x-auto max-w-full min-h-[150px]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pedido ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comissão
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data de Finalização
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ordersToDisplay.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {clients[order.clientid] || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(order.totalprice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                      {formatCurrency(order.total_commission || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.finishedat
                        ? new Date(order.finishedat).toLocaleDateString("pt-BR")
                        : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-500">
            Nenhum pedido encontrado para o período selecionado.
          </div>
        )}
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Comissões por Representante
      </h2>
      <p className="text-gray-600 mb-4">
        Este relatório mostra as comissões reais calculadas por marca dos produtos vendidos.
      </p>

      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
        {userRole === "admin" && commissionsByRep.length > 0 ? (
          <div className="overflow-x-auto max-w-full min-h-[150px]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Representante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Total de Vendas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comissão Real
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % Comissão
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {commissionsByRep.map((sale, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getRepName(sale.userId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(sale.totalSales)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                      {formatCurrency(sale.totalCommission)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sale.commissionRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-500">
            {userRole === "admin"
              ? "Nenhuma venda encontrada."
              : "Apenas administradores podem ver este relatório."}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;