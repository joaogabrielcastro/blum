/**
 * Campos de pedido compatíveis com API v2 (camelCase) e legado snake_case.
 */

export function orderCreatedAt(order) {
  return order.createdAt ?? order.createdat ?? order.created_at;
}

export function orderFinishedAt(order) {
  return order.finishedAt ?? order.finishedat ?? order.finished_at;
}

export function orderTotalPrice(order) {
  const v = order.totalPrice ?? order.totalprice ?? order.total_price;
  return parseFloat(v) || 0;
}

export function orderTotalCommission(order) {
  const v = order.totalCommission ?? order.total_commission;
  return parseFloat(v) || 0;
}

export function orderClientId(order) {
  return order.clientId ?? order.clientid ?? order.client_id;
}

/** representadas string da API ou camelCase */
export function orderRepresentadas(order) {
  return order.representedBrands ?? order.representadas ?? "";
}

export function orderSellerName(order) {
  return order.sellerName ?? order.seller_name ?? "";
}

export function orderSellerUsername(order) {
  return order.sellerUsername ?? order.seller_username ?? "";
}

/** ID do vendedor como string para agrupamentos */
export function orderSellerUserKey(order) {
  const v =
    order.user_ref ?? order.userRef ?? order.userId ?? order.userid;
  return v != null ? String(v) : "N/A";
}

export function localDateKeyFromIso(raw) {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatOrderDateLabel(raw) {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function pickBetterBrandLabel(current, next) {
  if (current === next) return current;
  if (current.toLowerCase() !== next.toLowerCase()) return current;
  if (current === current.toLowerCase() && next !== next.toLowerCase()) return next;
  if (next === next.toLowerCase() && current !== current.toLowerCase()) return current;
  return current.length >= next.length ? current : next;
}

function upsertBrandSales(byKey, normKey, rawName, amount) {
  if (!byKey[normKey]) {
    byKey[normKey] = { displayName: rawName, vendas: 0 };
  } else {
    byKey[normKey].displayName = pickBetterBrandLabel(
      byKey[normKey].displayName,
      rawName,
    );
  }
  byKey[normKey].vendas += amount;
}

/**
 * Pedidos com várias marcas no mesmo pedido: reparte o valor total
 * igualmente entre as representadas (lista sem Itens no GET em massa).
 */
export function accumulateSalesByRepresentada(orders) {
  const byKey = {};
  for (const order of orders) {
    const total = orderTotalPrice(order);
    const raw = orderRepresentadas(order);
    const brands = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (brands.length === 0) {
      upsertBrandSales(byKey, "sem marca definida", "Sem marca definida", total);
      continue;
    }
    const share = total / brands.length;
    for (const b of brands) {
      upsertBrandSales(byKey, b.toLowerCase(), b, share);
    }
  }
  return Object.fromEntries(
    Object.values(byKey).map((entry) => [entry.displayName, entry.vendas]),
  );
}

/** [{ name, vendas }] ordenado; agrupa excedente em "Outras" */
export function brandBarsFromSalesMap(salesMap, maxBars = 12) {
  const entries = Object.entries(salesMap).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return [];
  const top = entries.slice(0, maxBars);
  const restSum = entries
    .slice(maxBars)
    .reduce((acc, [, v]) => acc + v, 0);
  const rows = top.map(([name, vendas]) => ({ name, vendas }));
  if (restSum > 0) {
    rows.push({ name: "Outras", vendas: restSum });
  }
  return rows;
}

/** Dados acumulados para SalesChart (pedidos já filtrados e entregues) */
export function prepareCumulativeSalesChartData(orders) {
  const salesByDayKey = {};
  for (const order of orders) {
    const fin = orderFinishedAt(order);
    if (!fin) continue;
    const dayKey = localDateKeyFromIso(fin);
    if (!dayKey) continue;
    salesByDayKey[dayKey] =
      (salesByDayKey[dayKey] || 0) + orderTotalPrice(order);
  }
  const sortedDayKeys = Object.keys(salesByDayKey).sort();
  let cumulativeSales = 0;
  return sortedDayKeys.map((dayKey) => {
    cumulativeSales += salesByDayKey[dayKey];
    const labelDate = new Date(`${dayKey}T12:00:00`);
    return {
      date: Number.isNaN(labelDate.getTime())
        ? dayKey
        : labelDate.toLocaleDateString("pt-BR"),
      "Vendas Acumuladas": cumulativeSales,
      "Vendas do Dia": salesByDayKey[dayKey],
    };
  });
}

export function getPreviousCalendarMonth(year, month) {
  if (month <= 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

export function formatMonthYearLabel(year, month) {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function monthYearKey(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function orderInCalendarMonth(order, year, month) {
  const fin = orderFinishedAt(order);
  if (!fin) return false;
  const d = new Date(fin);
  if (Number.isNaN(d.getTime())) return false;
  return d.getFullYear() === year && d.getMonth() + 1 === month;
}

export function filterOrdersByCalendarMonth(orders, year, month) {
  return orders.filter((order) => orderInCalendarMonth(order, year, month));
}

/** Gráfico acumulado dia a dia de um mês calendário (todos os dias do mês). */
export function prepareMonthlyCumulativeChartData(orders, year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const salesByDay = {};
  for (let day = 1; day <= daysInMonth; day += 1) {
    salesByDay[day] = 0;
  }

  for (const order of orders) {
    if (!orderInCalendarMonth(order, year, month)) continue;
    const fin = orderFinishedAt(order);
    const day = new Date(fin).getDate();
    salesByDay[day] = (salesByDay[day] || 0) + orderTotalPrice(order);
  }

  let cumulative = 0;
  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    cumulative += salesByDay[day] || 0;
    const labelDate = new Date(year, month - 1, day);
    return {
      date: labelDate.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
      day,
      "Vendas Acumuladas": cumulative,
      "Vendas do Dia": salesByDay[day] || 0,
    };
  });
}

export function mergeMonthlyComparisonChart(currentData, previousData) {
  const maxLen = Math.max(currentData.length, previousData.length);
  return Array.from({ length: maxLen }, (_, index) => {
    const current = currentData[index];
    const previous = previousData[index];
    const day = current?.day ?? previous?.day ?? index + 1;
    return {
      date: current?.date ?? previous?.date ?? `Dia ${day}`,
      day,
      "Vendas Acumuladas": current?.["Vendas Acumuladas"] ?? 0,
      "Vendas do Dia": current?.["Vendas do Dia"] ?? 0,
      "Mês anterior (acum.)": previous?.["Vendas Acumuladas"] ?? 0,
    };
  });
}
