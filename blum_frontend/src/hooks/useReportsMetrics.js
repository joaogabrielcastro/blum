import { useMemo } from "react";
import {
  orderFinishedAt,
  orderTotalPrice,
  orderTotalCommission,
  orderSellerUserKey,
  orderSellerName,
  orderSellerUsername,
  orderRepresentadas,
  filterOrdersByCalendarMonth,
  prepareMonthlyCumulativeChartData,
  mergeMonthlyComparisonChart,
  formatMonthYearLabel,
  monthYearKey,
  accumulateSalesByRepresentada,
  brandBarsFromSalesMap,
} from "../utils/orderApiFields";
import { defaultMonthKey, parseMonthKey } from "./useReportsData";

/** Métricas derivadas dos relatórios (gráficos, totais, comissões). */
export function useReportsMetrics({
  allOrders,
  monthlySummaries,
  selectedMonthKey,
  selectedYear,
  selectedMonth,
  previousMonth,
  sellerFilterKey,
  userRole,
  userId,
  usersById,
}) {
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
        agg[repId] = { totalSales: 0, totalCommission: 0, orderCount: 0 };
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
      const displayName =
        orderSellerName(sample) ||
        team?.name ||
        team?.username ||
        (repId !== "N/A" ? `Usuário #${repId}` : "N/A");
      const username =
        orderSellerUsername(sample) ||
        (team?.username ? String(team.username) : "");

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

  const periodLabel = formatMonthYearLabel(selectedYear, selectedMonth);

  return {
    monthOptions,
    sellerOptions,
    ordersToDisplay,
    chartData,
    totalSales,
    totalCommissions,
    brandBars,
    marcasComVenda,
    mediaPorRepresentada,
    commissionsByRep,
    suggestedTarget,
    previousMonthTotal,
    periodLabel,
    showRepresentantesSummaryTable:
      userRole === "admin" && commissionsByRep.length > 0,
  };
}
