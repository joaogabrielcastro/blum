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
  filterOrdersByCalendarMonth,
  prepareMonthlyCumulativeChartData,
  mergeMonthlyComparisonChart,
  getPreviousCalendarMonth,
  formatMonthYearLabel,
  monthYearKey,
} from "../utils/orderApiFields";
import {
  buildAllRepresentativesCommissionPdf,
  buildRepresentativeCommissionPdf,
} from "../utils/commissionReportPdf";
import { buildPdfFile, downloadPdfFile } from "../utils/pdfDownload";
import { useToast } from "../context/ToastContext";

const now = new Date();
const defaultMonthKey = monthYearKey(now.getFullYear(), now.getMonth() + 1);

function parseMonthKey(key) {
  const [y, m] = String(key).split("-").map(Number);
  return { year: y, month: m };
}

const ReportsPage = ({ userRole, userId }) => {
  const toast = useToast();
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonthKey, setSelectedMonthKey] = useState(defaultMonthKey);
  const [monthlySummaries, setMonthlySummaries] = useState([]);
  const [salesTarget, setSalesTarget] = useState(null);
  const [targetDraft, setTargetDraft] = useState("");
  const [savingTarget, setSavingTarget] = useState(false);
  /** "" = todos os representantes do período; senão = id do vendedor (string) */
  const [sellerFilterKey, setSellerFilterKey] = useState("");
  const [clients, setClients] = useState({});
  const [usersById, setUsersById] = useState({});
  const [exportingPdf, setExportingPdf] = useState(null);
  const [exportingExcel, setExportingExcel] = useState(false);
  const mountedRef = useRef(false);

  const { year: selectedYear, month: selectedMonth } =
    parseMonthKey(selectedMonthKey);
  const previousMonth = getPreviousCalendarMonth(selectedYear, selectedMonth);

  const targetSellerKey =
    userRole === "salesperson"
      ? String(userId)
      : sellerFilterKey || null;

  const fetchReports = useCallback(async (opts = { showSpinner: true }) => {
    try {
      if (opts.showSpinner) setLoading(true);
      const summarySellerArg =
        userRole === "salesperson" ? userId : sellerFilterKey || undefined;

      const [ordersData, clientsData, usersData, summariesData] =
        await Promise.all([
          apiService.getOrders({}),
          apiService.getClients(),
          userRole === "admin"
            ? apiService.getUsers().catch(() => [])
            : Promise.resolve([]),
          apiService.getMonthlySalesSummaries(summarySellerArg).catch(() => []),
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
      setMonthlySummaries(Array.isArray(summariesData) ? summariesData : []);
    } catch (error) {
      console.error("Erro ao buscar relatórios:", error);
    } finally {
      if (opts.showSpinner) setLoading(false);
    }
  }, [userRole, sellerFilterKey, userId]);

  const loadSalesTarget = useCallback(async () => {
    try {
      const data = await apiService.getSalesTarget({
        year: selectedYear,
        month: selectedMonth,
        sellerUserId: targetSellerKey,
      });
      const amount = data?.targetAmount ?? null;
      setSalesTarget(amount);
      setTargetDraft(amount != null ? String(amount) : "");
    } catch (error) {
      console.error("Erro ao buscar meta:", error);
      setSalesTarget(null);
      setTargetDraft("");
    }
  }, [selectedYear, selectedMonth, targetSellerKey]);

  useEffect(() => {
    if (userId && userRole) {
      fetchReports({ showSpinner: true });
      mountedRef.current = true;
    }
  }, [userRole, userId, fetchReports]);

  useEffect(() => {
    loadSalesTarget();
  }, [loadSalesTarget]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && mountedRef.current) {
        fetchReports({ showSpinner: false });
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchReports]);

  const monthOptions = useMemo(() => {
    const keys = new Set([defaultMonthKey, selectedMonthKey]);
    monthlySummaries.forEach((row) => {
      keys.add(monthYearKey(row.year, row.month));
    });
    allOrders.forEach((order) => {
      const fin = orderFinishedAt(order);
      if (!fin) return;
      const d = new Date(fin);
      if (Number.isNaN(d.getTime())) return;
      keys.add(monthYearKey(d.getFullYear(), d.getMonth() + 1));
    });
    return [...keys]
      .map((key) => {
        const { year, month } = parseMonthKey(key);
        return { key, label: formatMonthYearLabel(year, month), year, month };
      })
      .sort((a, b) => b.year - a.year || b.month - a.month);
  }, [allOrders, monthlySummaries, selectedMonthKey]);

  const sellerScopedOrders = useMemo(() => {
    if (userRole === "salesperson") {
      return allOrders.filter((o) => orderSellerUserKey(o) === String(userId));
    }
    if (!sellerFilterKey) return allOrders;
    return allOrders.filter((o) => orderSellerUserKey(o) === sellerFilterKey);
  }, [allOrders, sellerFilterKey, userRole, userId]);

  const periodFilteredOrders = useMemo(
    () => filterOrdersByCalendarMonth(sellerScopedOrders, selectedYear, selectedMonth),
    [sellerScopedOrders, selectedYear, selectedMonth],
  );

  const previousMonthOrders = useMemo(
    () =>
      filterOrdersByCalendarMonth(
        sellerScopedOrders,
        previousMonth.year,
        previousMonth.month,
      ),
    [sellerScopedOrders, previousMonth.year, previousMonth.month],
  );

  const previousMonthTotal = useMemo(
    () => previousMonthOrders.reduce((acc, o) => acc + orderTotalPrice(o), 0),
    [previousMonthOrders],
  );

  const suggestedTarget = useMemo(() => {
    if (previousMonthTotal <= 0) return null;
    return Math.round(previousMonthTotal * 1.1 * 100) / 100;
  }, [previousMonthTotal]);

  const sellerOptions = useMemo(() => {
    const monthOrders = filterOrdersByCalendarMonth(
      allOrders,
      selectedYear,
      selectedMonth,
    );
    const byKey = new Map();
    for (const order of monthOrders) {
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
  }, [allOrders, selectedYear, selectedMonth, usersById]);

  const ordersToDisplay = periodFilteredOrders;

  const selectedSellerLabel =
    sellerOptions.find((o) => o.key === sellerFilterKey)?.label ?? "";

  const currentMonthChart = useMemo(
    () => prepareMonthlyCumulativeChartData(periodFilteredOrders, selectedYear, selectedMonth),
    [periodFilteredOrders, selectedYear, selectedMonth],
  );

  const previousMonthChart = useMemo(
    () =>
      prepareMonthlyCumulativeChartData(
        previousMonthOrders,
        previousMonth.year,
        previousMonth.month,
      ),
    [previousMonthOrders, previousMonth.year, previousMonth.month],
  );

  const chartData = useMemo(
    () => mergeMonthlyComparisonChart(currentMonthChart, previousMonthChart),
    [currentMonthChart, previousMonthChart],
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

  const periodLabel = formatMonthYearLabel(selectedYear, selectedMonth);

  const downloadBuiltPdf = async (built) => {
    const file = buildPdfFile(built.doc, built.filename);
    await downloadPdfFile(file);
  };

  const handleExportSalesExcel = async () => {
    if (userRole !== "admin") return;
    try {
      setExportingExcel(true);
      const blob = await apiService.downloadSalesByRepExcel();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "blum-vendas-por-representante.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel exportado.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível exportar Excel.");
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportAllCommissionsPdf = async () => {
    if (!commissionsByRep.length) {
      toast.warning("Não há comissões para exportar neste período.");
      return;
    }
    try {
      setExportingPdf("all");
      const built = buildAllRepresentativesCommissionPdf({
        periodLabel,
        rows: commissionsByRep,
        totals: {
          orderCount: ordersToDisplay.length,
          totalSales,
          totalCommissions,
          avgTicket:
            ordersToDisplay.length > 0
              ? totalSales / ordersToDisplay.length
              : 0,
          effectiveRate:
            totalSales > 0
              ? `${((totalCommissions / totalSales) * 100).toFixed(2)}%`
              : "0.00%",
        },
      });
      await downloadBuiltPdf(built);
      toast.success("PDF de comissões gerado.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setExportingPdf(null);
    }
  };

  const handleExportRepCommissionPdf = async (sale) => {
    const repOrders = ordersToDisplay.filter(
      (order) => orderSellerUserKey(order) === sale.userId,
    );
    if (!repOrders.length) {
      toast.warning("Este representante não tem pedidos no período.");
      return;
    }
    try {
      setExportingPdf(sale.userId);
      const built = buildRepresentativeCommissionPdf({
        rep: sale,
        orders: repOrders,
        clients,
        periodLabel,
        formatRepLabel,
        formatOrderDateLabel,
        orderFinishedAt,
        orderTotalPrice,
        orderTotalCommission,
        orderClientId,
      });
      await downloadBuiltPdf(built);
      toast.success(`PDF de ${sale.displayName} gerado.`);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setExportingPdf(null);
    }
  };

  const goToPreviousMonth = () => {
    setSelectedMonthKey(
      monthYearKey(previousMonth.year, previousMonth.month),
    );
  };

  const goToCurrentMonth = () => {
    setSelectedMonthKey(defaultMonthKey);
  };

  const handleSaveTarget = async () => {
    const amount = parseFloat(String(targetDraft).replace(",", "."));
    if (!Number.isFinite(amount) || amount < 0) return;
    try {
      setSavingTarget(true);
      await apiService.saveSalesTarget({
        year: selectedYear,
        month: selectedMonth,
        targetAmount: amount,
        sellerUserId: targetSellerKey,
      });
      setSalesTarget(amount);
    } catch (error) {
      console.error("Erro ao salvar meta:", error);
    } finally {
      setSavingTarget(false);
    }
  };

  const applySuggestedTarget = () => {
    if (suggestedTarget == null) return;
    setTargetDraft(String(suggestedTarget));
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

      <div className="flex flex-col lg:flex-row lg:items-end gap-3 mb-8">
        <div className="flex flex-col gap-2">
          <span className="font-semibold text-gray-700">Mês calendário:</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={goToCurrentMonth}
              className={`min-w-fit px-4 py-2 rounded-full text-sm font-semibold ${
                selectedMonthKey === defaultMonthKey
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Mês atual
            </button>
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="min-w-fit px-4 py-2 rounded-full text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Mês anterior
            </button>
            <select
              value={selectedMonthKey}
              onChange={(e) => setSelectedMonthKey(e.target.value)}
              className="min-h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800"
              aria-label="Selecionar mês"
            >
              {monthOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {userRole === "admin" ? (
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
      ) : null}

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
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-1">
              Evolução das Vendas — {formatMonthYearLabel(selectedYear, selectedMonth)}
              {sellerFilterKey && selectedSellerLabel
                ? ` — ${selectedSellerLabel}`
                : ""}
            </h2>
            <p className="text-sm text-gray-600">
              Linha cinza: acumulado de{" "}
              {formatMonthYearLabel(previousMonth.year, previousMonth.month)}.
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 min-w-[260px]">
            <h3 className="text-sm font-bold text-gray-800 mb-3">
              Meta do mês
              {userRole === "admin" && !sellerFilterKey ? " (empresa)" : ""}
            </h3>
            <p className="text-xs text-gray-600 mb-1">
              Mês anterior: {formatCurrency(previousMonthTotal)}
            </p>
            {suggestedTarget != null ? (
              <p className="text-xs text-gray-600 mb-3">
                Sugestão (+10%): {formatCurrency(suggestedTarget)}
              </p>
            ) : null}
            <div className="flex gap-2 mb-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={targetDraft}
                onChange={(e) => setTargetDraft(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Valor da meta"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedTarget != null ? (
                <button
                  type="button"
                  onClick={applySuggestedTarget}
                  className="text-xs px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-800 font-semibold hover:bg-indigo-200"
                >
                  Usar sugestão
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleSaveTarget}
                disabled={savingTarget}
                className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {savingTarget ? "Salvando..." : "Salvar meta"}
              </button>
            </div>
            {salesTarget != null && salesTarget > 0 ? (
              <p className="text-xs text-green-700 mt-2 font-medium">
                Meta salva: {formatCurrency(salesTarget)}
              </p>
            ) : null}
          </div>
        </div>
        <SalesChart
          data={chartData}
          monthlyTarget={salesTarget}
          filterPeriod="monthly"
          totalSales={totalSales}
          showComparison
        />
      </div>

      {monthlySummaries.length > 0 ? (
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Histórico mensal de vendas
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">
                    Mês
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-600">
                    Pedidos
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-600">
                    Total vendido
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthlySummaries.map((row) => (
                  <tr key={`${row.year}-${row.month}`} className="border-t">
                    <td className="px-4 py-2 capitalize">
                      {formatMonthYearLabel(row.year, row.month)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {row.orderCount}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">
                      {formatCurrency(row.totalSales)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

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
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2
              id="reports-resumo-representantes-heading"
              className="text-2xl font-bold text-gray-800"
            >
              Resumo por representante (vendedor)
            </h2>
            <p className="text-gray-600 mt-2 max-w-3xl">
              Cada linha é um <strong>vendedor</strong> que lançou o pedido{" "}
              (<code className="text-sm bg-gray-100 px-1 rounded">user_ref</code>
              ). Os valores somam apenas pedidos <strong>Entregue</strong> em{" "}
              <strong>{periodLabel}</strong>. A comissão é a soma do campo{" "}
              <strong>total_commission</strong> de cada pedido.
            </p>
          </div>
          {showRepresentantesSummaryTable && userRole === "admin" ? (
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportSalesExcel}
                disabled={exportingExcel || exportingPdf != null}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-60"
              >
                {exportingExcel ? "Gerando Excel…" : "Exportar Excel"}
              </button>
              <button
                type="button"
                onClick={handleExportAllCommissionsPdf}
                disabled={exportingPdf != null || exportingExcel}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
              >
                {exportingPdf === "all" ? "Gerando PDF…" : "Exportar PDF (todos)"}
              </button>
            </div>
          ) : showRepresentantesSummaryTable ? (
            <button
              type="button"
              onClick={handleExportAllCommissionsPdf}
              disabled={exportingPdf != null}
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {exportingPdf === "all" ? "Gerando PDF…" : "Exportar PDF (todos)"}
            </button>
          ) : null}
        </div>

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
                      % efetivo
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PDF
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
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={() => handleExportRepCommissionPdf(sale)}
                          disabled={exportingPdf != null}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                          title={`PDF de comissões — ${formatRepLabel(sale)}`}
                        >
                          {exportingPdf === sale.userId ? "…" : "PDF"}
                        </button>
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
                    <td className="px-4 py-3" />
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