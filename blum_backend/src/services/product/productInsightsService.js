const { sql } = require("../../config/database");
const { requireTenantId } = require("../../utils/tenantContext");
const { marginPercent } = require("./productCost");

/**
 * Ficha do produto (C3): resumo + custo + preço de venda + estoque + vendas.
 * Uso exclusivo de admin (contém custo).
 */

const num = (v) => (v == null || v === "" ? null : Number(v));

function notFound() {
  const err = new Error("Produto não encontrado");
  err.statusCode = 404;
  return err;
}

async function getProductInsights(productId, tenantIdInput) {
  const tenantId = requireTenantId(tenantIdInput);
  const id = Number.parseInt(productId, 10);

  const productRows = await sql`
    SELECT id, name, productcode, brand, brand_id, price, stock, minstock,
           cost_price, last_cost, last_purchase_at, ean, createdat
    FROM products WHERE id = ${id} AND tenant_id = ${tenantId}
  `;
  const p = productRows[0];
  if (!p) throw notFound();

  const [salesSummary, costHistory, priceHistory, movements, clients] = await Promise.all([
    sql`
      SELECT
        MAX(o.createdat) AS last_sale_at,
        COALESCE(SUM(oi.quantity) FILTER (WHERE o.createdat >= NOW() - INTERVAL '30 days'), 0) AS qty_30,
        COALESCE(SUM(oi.quantity) FILTER (WHERE o.createdat >= NOW() - INTERVAL '90 days'), 0) AS qty_90,
        COALESCE(SUM(oi.line_total) FILTER (WHERE o.createdat >= NOW() - INTERVAL '90 days'), 0) AS revenue_90
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id AND o.tenant_id = oi.tenant_id
      WHERE oi.tenant_id = ${tenantId} AND oi.product_id = ${id}
        AND o.document_type = 'pedido'
    `,
    sql`
      SELECT ph.id, ph.event_type, ph.purchase_price, ph.quantity, ph.old_cost, ph.new_cost,
             COALESCE(ph.created_at, ph.changedat, ph.purchase_date) AS at,
             ph.purchase_date,
             ph.changed_by, ph.purchase_invoice_id,
             pi.number AS invoice_number, pi.emitter_name AS supplier
      FROM price_history ph
      LEFT JOIN purchase_invoices pi
        ON pi.id = ph.purchase_invoice_id AND pi.tenant_id = ph.tenant_id
      WHERE ph.tenant_id = ${tenantId}
        AND COALESCE(ph.product_id, ph.productid) = ${id}
        AND COALESCE(ph.event_type, 'custo') IN ('custo', 'custo_manual')
      ORDER BY ph.id DESC
      LIMIT 100
    `,
    sql`
      SELECT id, event_type, old_price, new_price, changed_by,
             COALESCE(changedat, created_at) AS at, purchase_invoice_id
      FROM price_history
      WHERE tenant_id = ${tenantId}
        AND COALESCE(product_id, productid) = ${id}
        AND event_type IN ('venda', 'reajuste')
      ORDER BY id DESC
      LIMIT 100
    `,
    sql`
      SELECT m.id, m.movement_type, m.quantity, m.balance_after, m.unit_cost,
             m.reference_type, m.reference_id, m.reason, m.created_at,
             u.name AS user_name, u.username AS user_username,
             c.companyname AS client_name, pi.number AS invoice_number
      FROM stock_movements m
      LEFT JOIN users u ON u.id = m.user_id
      LEFT JOIN orders o
        ON m.reference_type = 'order' AND o.id = m.reference_id AND o.tenant_id = m.tenant_id
      LEFT JOIN clients c ON c.id = o.clientid AND c.tenant_id = m.tenant_id
      LEFT JOIN purchase_invoices pi
        ON m.reference_type = 'purchase' AND pi.id = m.reference_id AND pi.tenant_id = m.tenant_id
      WHERE m.tenant_id = ${tenantId} AND m.product_id = ${id}
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT 100
    `,
    sql`
      SELECT c.id AS client_id, c.companyname AS client_name,
             SUM(oi.quantity) AS quantity,
             SUM(oi.line_total) AS total,
             MAX(o.createdat) AS last_at,
             (ARRAY_AGG(oi.unit_price ORDER BY o.createdat DESC))[1] AS last_unit_price
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id AND o.tenant_id = oi.tenant_id
      JOIN clients c ON c.id = o.clientid AND c.tenant_id = o.tenant_id
      WHERE oi.tenant_id = ${tenantId} AND oi.product_id = ${id}
        AND o.document_type = 'pedido'
      GROUP BY c.id, c.companyname
      ORDER BY MAX(o.createdat) DESC
      LIMIT 20
    `,
  ]);

  const s = salesSummary[0] || {};
  const price = num(p.price);
  const cost = num(p.cost_price);

  return {
    product: {
      id: p.id,
      name: p.name,
      productCode: p.productcode,
      brand: p.brand,
      brandId: p.brand_id,
      ean: p.ean,
      price,
      stock: Number(p.stock),
      minStock: Number(p.minstock) || 0,
      costPrice: cost,
      lastCost: num(p.last_cost),
      lastPurchaseAt: p.last_purchase_at,
      marginPercent: marginPercent(price, cost),
      createdAt: p.createdat,
    },
    sales: {
      lastSaleAt: s.last_sale_at || null,
      quantity30d: Number(s.qty_30) || 0,
      quantity90d: Number(s.qty_90) || 0,
      revenue90d: Number(s.revenue_90) || 0,
    },
    costHistory: costHistory.map((r) => ({
      id: r.id,
      type: r.event_type || "custo",
      at: r.at,
      unitCost: num(r.purchase_price),
      quantity: r.quantity == null ? null : Number(r.quantity),
      previousCost: num(r.old_cost),
      averageCost: num(r.new_cost),
      purchaseDate: r.purchase_date,
      changedBy: r.changed_by,
      invoiceId: r.purchase_invoice_id,
      invoiceNumber: r.invoice_number,
      supplier: r.supplier,
    })),
    priceHistory: priceHistory.map((r) => ({
      id: r.id,
      type: r.event_type,
      at: r.at,
      oldPrice: num(r.old_price),
      newPrice: num(r.new_price),
      changedBy: r.changed_by,
      invoiceId: r.purchase_invoice_id,
    })),
    movements: movements.map((r) => ({
      id: r.id,
      type: r.movement_type,
      quantity: Number(r.quantity),
      balanceAfter: r.balance_after == null ? null : Number(r.balance_after),
      unitCost: num(r.unit_cost),
      referenceType: r.reference_type,
      referenceId: r.reference_id,
      reason: r.reason,
      at: r.created_at,
      user: r.user_name || r.user_username || null,
      clientName: r.client_name,
      invoiceNumber: r.invoice_number,
    })),
    clients: clients.map((r) => ({
      clientId: r.client_id,
      clientName: r.client_name,
      quantity: Number(r.quantity) || 0,
      total: Number(r.total) || 0,
      lastAt: r.last_at,
      lastUnitPrice: num(r.last_unit_price),
    })),
  };
}

module.exports = { getProductInsights };
