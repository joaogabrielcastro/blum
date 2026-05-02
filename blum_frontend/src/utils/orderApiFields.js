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

/** ID do vendedor como string para agrupamentos */
export function orderSellerUserKey(order) {
  const v = order.user_ref ?? order.userId ?? order.userid;
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

/**
 * Pedidos com várias marcas no mesmo pedido: reparte o valor total
 * igualmente entre as representadas (lista sem Itens no GET em massa).
 */
export function accumulateSalesByRepresentada(orders) {
  const map = {};
  for (const order of orders) {
    const total = orderTotalPrice(order);
    const raw = orderRepresentadas(order);
    const brands = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (brands.length === 0) {
      const k = "Sem marca definida";
      map[k] = (map[k] || 0) + total;
      continue;
    }
    const share = total / brands.length;
    for (const b of brands) {
      map[b] = (map[b] || 0) + share;
    }
  }
  return map;
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
