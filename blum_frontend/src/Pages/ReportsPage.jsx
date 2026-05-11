import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import apiService from "../services/apiService";
import formatCurrency from "../utils/format";
import SalesChart from "../components/SalesChart";
import BrandSalesComparison from "../components/BrandSalesComparison";
import {
  orderFinishedAt,
  orderTotalPrice,
  orderTotalCommission,
  orderClientId,
  orderSellerUserKey,
  orderSellerName,
  orderSellerUsername,
  orderRepresentadas,
  formatOrderDateLabel,
  accumulateSalesByRepresentada,
  brandBarsFromSalesMap,
  prepareCumulativeSalesChartData,
} from "../utils/orderApiFields";

const ReportsPage = ({ userRole, userId }) => {
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState("all");
  /** "" = todos os representantes do período; senão = id do vendedor (string) */
  const [sellerFilterKey, setSellerFilterKey] = useState("");
  const [clients, setClients] = useState({});
  /** Fallback nome/login do vendedor quando o pedido não traz seller (edge cases) */
  const [usersById, setUsersById] = useState({});
  const monthlyTarget = 80000;
  const mountedRef = useRef(false);

  const fetchReports = useCallback(async (opts = { showSpinner: true }) => {
    try {
      if (opts.showSpinner) setLoading(true);
      const [ordersData, clientsData, usersData] = await Promise.all([
        apiService.getOrders({}),
        apiService.getClients(),
        userRole === "admin"
          ? apiService.getUsers().catch(() => [])
          : Promise.resolve([]),
      ]);
      const clientsMap = {};
      clientsData.forEach((client) => {
        const cid = client.id;
        clientsMap[cid] = client.companyName || client.companyname;
      });
      setClients(clientsMap);
      const teamMap = {};
      if (Array.isArray(usersData)) {
        usersData.forEach((u) => {
          if (u?.id != null) teamMap[String(u.id)] = u;
        });
      }
      setUsersById(teamMap);
      const finishedOrders = ordersData.filter(
        (order) => order.status === "Entregue",
      );
      setAllOrders(finishedOrders);
    } catch (error) {
      console.error("Erro ao buscar relatórios:", error);
    } finally {
      if (opts.showSpinner) setLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    if (userId && userRole) {
      fetchReports({ showSpinner: true });
      mountedRef.current = true;
    }
  }, [userRole, userId, fetchReports]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && mountedRef.current) {
        fetchReports({ showSpinner: false });
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchReports]);

  useEffect(() => {
    setSellerFilterKey("");
  }, [filterPeriod]);

  const getFilteredOrders = (days) => {
    const today = new Date();
    const filterDate = new Date();
    filterDate.setDate(today.getDate() - days);
    return allOrders.filter((order) => {
      const fin = orderFinishedAt(order);
      return fin && new Date(fin) >= filterDate;
    });
  };

  const weeklyOrders = getFilteredOrders(7);
  const monthlyOrders = getFilteredOrders(30);

  const periodFilteredOrders =
    filterPeriod === "weekly"
      ? weeklyOrders
      : filterPeriod === "monthly"
        ? monthlyOrders
        : allOrders;

  const sellerOptions = useMemo(() => {
    const byKey = new Map();
    for (const order of periodFilteredOrders) {
      const key = orderSellerUserKey(order);
      if (byKey.has(key)) continue;
      const team = usersById[key];
      const repName =
        orderSellerName(order) ||
        team?.name ||
        (key !== "N/A" ? `Usuário #${key}` : "");
      const repUser =
        orderSellerUsername(order) || (team?.username ? String(team.username) : "");
      const label =
        repName && repUser
          ? `${repName} (@${repUser})`
          : repName || repUser || key;
      byKey.set(key, { key, label });
    }
    return [...byKey.values()].sort((a, b) =>
      a.label.localeCompare(b.label, "pt-BR"),
    );
  }, [periodFilteredOrders, usersById]);

  const ordersToDisplay = useMemo(() => {
    if (!sellerFilterKey) return periodFilteredOrders;
    return periodFilteredOrders.filter(
      (o) => orderSellerUserKey(o) === sellerFilterKey,
    );
  }, [periodFilteredOrders, sellerFilterKey]);

  const selectedSellerLabel =
    sellerOptions.find((o) => o.key === sellerFilterKey)?.label ?? "";

  const chartData = useMemo(
    () => prepareCumulativeSalesChartData(ordersToDisplay),
    [ordersToDisplay],
  );

  const totalSales = ordersToDisplay.reduce(
    (acc, order) => acc + orderTotalPrice(order),
    0,
  );

  const totalCommissions = ordersToDisplay.reduce(
    (acc, order) => acc + orderTotalCommission(order),
    0,
  );

  const salesByRepresentadaMap = useMemo(
    () => accumulateSalesByRepresentada(ordersToDisplay),
    [ordersToDisplay],
  );

  const brandBars = useMemo(
    () => brandBarsFromSalesMap(salesByRepresentadaMap),
    [salesByRepresentadaMap],
  );

  const marcasComVenda = Object.keys(salesByRepresentadaMap).length;
  const mediaPorRepresentada =
    marcasComVenda > 0 ? totalSales / marcasComVenda : 0;

  const commissionsByRep = useMemo(() => {
    const agg = {};
    for (const order of ordersToDisplay) {
      const repId = orderSellerUserKey(order);
      if (!agg[repId]) {
        agg[repId] = {
          totalSales: 0,
          totalCommission: 0,
          orderCount: 0,
        };
      }
      agg[repId].totalSales += orderTotalPrice(order);
      agg[repId].totalCommission += orderTotalCommission(order);
      agg[repId].orderCount += 1;
    }

    const rows = Object.keys(agg).map((repId) => {
      const sample = ordersToDisplay.find(
        (o) => orderSellerUserKey(o) === repId,
      );
      const team = usersById[repId];
      const nameFromOrder = orderSellerName(sample);
      const usernameFromOrder = orderSellerUsername(sample);
      const displayName =
        nameFromOrder ||
        team?.name ||
        team?.username ||
        (repId !== "N/A" ? `Usuário #${repId}` : "N/A");
      const username =
        usernameFromOrder || (team?.username ? String(team.username) : "");

      const ts = agg[repId].totalSales;
      const tc = agg[repId].totalCommission;
      const n = agg[repId].orderCount;

      return {
        userId: repId,
        displayName,
        username,
        orderCount: n,
        totalCommission: tc,
        totalSales: ts,
        avgTicket: n > 0 ? ts / n : 0,
        commissionRate: ts > 0 ? ((tc / ts) * 100).toFixed(2) : "0.00",
      };
    });

    rows.sort((a, b) => b.totalSales - a.totalSales);
    return rows;
  }, [ordersToDisplay, usersById]);

  const showRepresentantesSummaryTable =
    userRole === "admin" && commissionsByRep.length > 0;

  const formatRepLabel = (sale) => {
    if (!sale) return "N/A";
    const u = sale.username?.trim();
    if (sale.displayName && u) return `${sale.displayName} (@${u})`;
    return sale.displayName || sale.userId || "N/A";
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

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-8 flex-wrap">
        <span className="font-semibold text-gray-700 shrink-0">
          Representante:
        </span>
        <select
          value={sellerFilterKey}
          onChange={(e) => setSellerFilterKey(e.target.value)}
          aria-label="Filtrar pedidos por representante"
          className="w-full sm:w-auto min-w-[200px] max-w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="">Todos os representantes</option>
          {sellerOptions.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
        {sellerFilterKey ? (
          <span className="text-sm text-gray-600">
            Exibindo apenas pedidos de{" "}
            <span className="font-semibold text-gray-800">
              {selectedSellerLabel}
            </span>
            .
          </span>
        ) : null}
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
          {sellerFilterKey && selectedSellerLabel
            ? ` — ${selectedSellerLabel}`
            : ""}
        </h2>
        <SalesChart
          data={chartData}
          monthlyTarget={monthlyTarget}
          filterPeriod={filterPeriod}
          totalSales={totalSales}
        />
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Vendas por representada vs. total do período
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          O total geral soma o valor cheio de cada pedido. As barras repartem
          pedidos com várias marcas entre as representadas (mesma regra do
          somatório do período). A linha tracejada é a média do valor geral
          por marca com venda.
        </p>
        <BrandSalesComparison
          brandBars={brandBars}
          totalPeriodo={totalSales}
          mediaPorRepresentada={mediaPorRepresentada}
        />
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Detalhes dos Pedidos (entregues no período)
      </h2>

      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200 mb-8">
        {ordersToDisplay.length > 0 ? (
          <div className="overflow-x-auto max-w-full min-h-[150px]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pedido
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Representante
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Representadas
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor total
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comissão
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Finalizado em
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ordersToDisplay.map((order) => {
                  const repKey = orderSellerUserKey(order);
                  const team = usersById[repKey];
                  const repName =
                    orderSellerName(order) ||
                    team?.name ||
                    (repKey !== "N/A" ? `Usuário #${repKey}` : "");
                  const repUser =
                    orderSellerUsername(order) || team?.username || "";
                  const repCell =
                    repName && repUser
                      ? `${repName} (@${repUser})`
                      : repName || repUser || repKey;
                  const brandsLabel = orderRepresentadas(order);
                  return (
                    <tr key={order.id}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{order.id}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 max-w-[220px]">
                        {clients[orderClientId(order)] || "N/A"}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-800 whitespace-nowrap">
                        {repCell}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 max-w-[260px]">
                        {brandsLabel ? (
                          <span className="line-clamp-2" title={brandsLabel}>
                            {brandsLabel}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(orderTotalPrice(order))}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-green-700 font-semibold text-right">
                        {formatCurrency(orderTotalCommission(order))}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {orderFinishedAt(order)
                          ? formatOrderDateLabel(orderFinishedAt(order))
                          : "N/A"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-500">
            {sellerFilterKey
              ? "Nenhum pedido deste representante no período selecionado."
              : "Nenhum pedido encontrado para o período selecionado."}
          </div>
        )}
      </div>

      <section
        className="mb-8"
        aria-labelledby="reports-resumo-representantes-heading"
      >
        <h2
          id="reports-resumo-representantes-heading"
          className="text-2xl font-bold text-gray-800 mb-4"
        >
          Resumo por representante (vendedor)
        </h2>
        <p className="text-gray-600 mb-4 max-w-3xl">
          Cada linha é um <strong>vendedor</strong> que lançou o pedido (
          <code className="text-sm bg-gray-100 px-1 rounded">user_ref</code>
          ). Os valores somam apenas pedidos <strong>Entregue</strong> no período e
          filtros acima. A comissão é a soma do campo{" "}
          <strong>total_commission</strong> de cada pedido. A coluna &quot;% efetivo&quot; é{" "}
          <em>comissão ÷ vendas</em> daquele representante.
        </p>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
          {showRepresentantesSummaryTable ? (
            <div className="overflow-x-auto max-w-full min-h-[150px]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Representante
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pedidos
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendas totais
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ticket médio
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comissão total
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {"% efetivo"}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {commissionsByRep.map((sale) => (
                    <tr key={sale.userId}>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        <span className="font-medium">
                          {formatRepLabel(sale)}
                        </span>
                        {sale.userId !== "N/A" && (
                          <span className="block text-xs text-gray-400 mt-0.5">
                            ID {sale.userId}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800 text-right tabular-nums">
                        {sale.orderCount}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800 text-right font-medium tabular-nums">
                        {formatCurrency(sale.totalSales)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right tabular-nums">
                        {formatCurrency(sale.avgTicket)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-green-700 font-semibold text-right tabular-nums">
                        {formatCurrency(sale.totalCommission)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right tabular-nums">
                        {`${sale.commissionRate}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                      Todos os representantes
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold tabular-nums">
                      {ordersToDisplay.length}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold tabular-nums">
                      {formatCurrency(totalSales)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500 tabular-nums">
                      {ordersToDisplay.length > 0
                        ? formatCurrency(totalSales / ordersToDisplay.length)
                        : formatCurrency(0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-green-800 tabular-nums">
                      {formatCurrency(totalCommissions)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600 tabular-nums">
                      {totalSales > 0
                        ? `${((totalCommissions / totalSales) * 100).toFixed(2)}%`
                        : "0.00%"}
                    </td>
                  </tr>
                </tfoot>
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
      </section>
    </div>
  );
};

export default ReportsPage;