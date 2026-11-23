const { pool, beginTenantTransaction } = require("../config/database");
const { requireTenantId } = require("../utils/tenantContext");

/**
 * Lucro bruto (C4). Só pedidos confirmados.
 * - Receita do item = line_total rateado pelo desconto do pedido
 *   (line_total × totalprice ÷ soma dos line_total do pedido).
 * - Custo do item = quantidade × unit_cost gravado no momento da venda
 *   (ou estimado pelo admin para pedidos antigos — sinalizado).
 * - Itens sem custo entram na receita, mas ficam fora do lucro/margem.
 * Filtros: período, vendedor (user_ref) e representada (por item).
 */

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const NO_BRAND_KEY = "sem marca definida";

function shape(row) {
  const revenue = round2(row.revenue);
  const revenueWithCost = round2(row.revenue_with_cost);
  const cost = round2(row.cost);
  const profit = round2(revenueWithCost - cost);
  return {
    revenue,
    revenueWithCost,
    revenueWithoutCost: round2(revenue - revenueWithCost),
    revenueEstimatedCost: round2(row.revenue_estimated),
    cost,
    profit,
    marginPercent:
      revenueWithCost > 0 ? Math.round((profit / revenueWithCost) * 1000) / 10 : null,
    quantity: Number(row.quantity) || 0,
  };
}

const GROUPS = {
  brand: {
    key: "COALESCE(NULLIF(trim(l.brand), ''), 'Sem representada')",
    label: "COALESCE(NULLIF(trim(l.brand), ''), 'Sem representada')",
  },
  seller: {
    key: "l.user_ref::text",
    label: "COALESCE(u.name, u.username, 'Sem vendedor')",
  },
  client: {
    key: "l.clientid::text",
    label: "COALESCE(c.companyname, 'Cliente removido')",
  },
  product: {
    key: "COALESCE(l.product_id::text, l.product_name)",
    label: "l.product_name",
  },
};

function buildFilters({ tenantId, startDate, endDate, sellerId, brand }) {
  const params = [tenantId];
  const orderConds = ["o.tenant_id = $1", "o.document_type = 'pedido'"];
  const lineConds = [];
  if (startDate) {
    params.push(startDate);
    orderConds.push(`o.createdat >= $${params.length}`);
  }
  if (endDate) {
    params.push(endDate);
    orderConds.push(`o.createdat <= $${params.length}`);
  }
  if (sellerId != null && sellerId !== "") {
    params.push(Number(sellerId));
    orderConds.push(`o.user_ref = $${params.length}`);
  }
  const brandKey = String(brand ?? "").trim().toLowerCase();
  if (brandKey) {
    if (brandKey === NO_BRAND_KEY) {
      lineConds.push("COALESCE(trim(oi.brand), '') = ''");
    } else {
      params.push(brandKey);
      lineConds.push(`lower(trim(oi.brand)) = $${params.length}`);
    }
  }
  return { params, orderConds, lineConds };
}

async function getProfitReport({
  tenantId,
  startDate,
  endDate,
  sellerId,
  brand,
  limit = 10,
}) {
  tenantId = requireTenantId(tenantId);
  const { params, orderConds, lineConds } = buildFilters({
    tenantId,
    startDate,
    endDate,
    sellerId,
    brand,
  });
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));

  // O rateio do desconto usa todas as linhas do pedido; o filtro de
  // representada só escolhe quais linhas entram no resultado.
  const linesCte = `
    WITH orders_f AS (
      SELECT o.id, o.totalprice, o.user_ref, o.clientid,
             NULLIF((SELECT SUM(x.line_total) FROM order_items x
                     WHERE x.order_id = o.id AND x.tenant_id = o.tenant_id), 0) AS lines_total
      FROM orders o
      WHERE ${orderConds.join(" AND ")}
    ),
    lines AS (
      SELECT f.id AS order_id, oi.product_id, oi.product_name, oi.brand, oi.quantity,
             oi.unit_cost, oi.unit_cost_estimated, f.user_ref, f.clientid,
             oi.line_total * COALESCE(f.totalprice / f.lines_total, 1) AS revenue
      FROM orders_f f
      JOIN order_items oi ON oi.order_id = f.id AND oi.tenant_id = $1
      ${lineConds.length ? `WHERE ${lineConds.join(" AND ")}` : ""}
    )
  `;
  const measures = `
    COALESCE(SUM(l.revenue), 0) AS revenue,
    COALESCE(SUM(l.revenue) FILTER (WHERE l.unit_cost IS NOT NULL), 0) AS revenue_with_cost,
    COALESCE(SUM(l.revenue) FILTER (WHERE l.unit_cost_estimated), 0) AS revenue_estimated,
    COALESCE(SUM(l.quantity * l.unit_cost) FILTER (WHERE l.unit_cost IS NOT NULL), 0) AS cost,
    COALESCE(SUM(l.quantity), 0) AS quantity
  `;
  const joins = `
    FROM lines l
    LEFT JOIN users u ON u.id = l.user_ref
    LEFT JOIN clients c ON c.id = l.clientid AND c.tenant_id = $1
  `;

  const client = await pool.connect();
  try {
    await beginTenantTransaction(client);
    const totalRes = await client.query(
      `${linesCte}
       SELECT ${measures}, COUNT(DISTINCT l.order_id) AS orders_count
       FROM lines l`,
      params,
    );
    const missingRes = await client.query(
      `${linesCte}
       SELECT COUNT(*) AS n FROM lines l
       JOIN products p ON p.id = l.product_id AND p.tenant_id = $1
       WHERE l.unit_cost IS NULL AND p.cost_price IS NOT NULL`,
      params,
    );
    const groups = {};
    for (const [name, g] of Object.entries(GROUPS)) {
      const res = await client.query(
        `${linesCte}
         SELECT ${g.key} AS key, MAX(${g.label}) AS label, ${measures}
         ${joins}
         GROUP BY ${g.key}
         ORDER BY SUM(l.revenue) DESC NULLS LAST`,
        params,
      );
      groups[name] = res.rows.map((r) => ({ key: r.key, label: r.label, ...shape(r) }));
    }
    await client.query("COMMIT");

    const totalRow = totalRes.rows[0] || {};
    const total = shape(totalRow);
    const products = groups.product;
    return {
      period: { startDate: startDate || null, endDate: endDate || null },
      filters: { sellerId: sellerId || null, brand: brand || null },
      total: {
        ...total,
        ordersCount: Number(totalRow.orders_count) || 0,
        costCoveragePercent:
          total.revenue > 0
            ? Math.round((total.revenueWithCost / total.revenue) * 1000) / 10
            : null,
        /** Itens sem custo cujo produto já tem custo hoje (podem ser estimados). */
        estimableItems: Number(missingRes.rows[0]?.n) || 0,
      },
      byBrand: groups.brand,
      bySeller: groups.seller,
      byClient: groups.client.slice(0, safeLimit),
      topProducts: products.slice(0, safeLimit),
      lowestMarginProducts: products
        .filter((p) => p.marginPercent != null)
        .sort((a, b) => a.marginPercent - b.marginPercent)
        .slice(0, safeLimit),
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Preenche o custo dos itens de pedidos confirmados que estão sem custo,
 * usando o custo ATUAL do produto. Marca como estimado. Ação do admin.
 */
async function estimateMissingCosts({ tenantId }) {
  tenantId = requireTenantId(tenantId);
  const client = await pool.connect();
  try {
    await beginTenantTransaction(client);
    const res = await client.query(
      `UPDATE order_items oi
       SET unit_cost = p.cost_price, unit_cost_estimated = TRUE
       FROM products p, orders o
       WHERE oi.tenant_id = $1
         AND oi.unit_cost IS NULL
         AND p.id = oi.product_id AND p.tenant_id = oi.tenant_id
         AND p.cost_price IS NOT NULL
         AND o.id = oi.order_id AND o.tenant_id = oi.tenant_id
         AND o.document_type = 'pedido'`,
      [tenantId],
    );
    await client.query("COMMIT");
    return { updated: res.rowCount || 0 };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { getProfitReport, estimateMissingCosts };
