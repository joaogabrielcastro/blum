const { sql } = require("../config/database");

function resolveExecutor(executor) {
  return executor || { query: (text, values) => sql(text, values) };
}

/**
 * Coluna products.stock é inteira; order_items.quantity pode ser DECIMAL.
 * Nunca passar string decimal a CAST(... AS INTEGER) no PG (22P02).
 */
function quantityToIntForStock(quantity) {
  const n = parseFloat(String(quantity ?? "").trim().replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.max(1, Math.round(n));
}

async function updateOrderCore(executor, payload) {
  const db = resolveExecutor(executor);
  const {
    id,
    clientid,
    sellerUserId,
    description,
    discount,
    finalTotal,
    totalCommission,
    docType,
    payment,
    createdAt,
    tenantId = 1,
  } = payload;

  const result = await db.query(
    `
      UPDATE orders
      SET clientid = $1,
          user_ref = $2,
          description = $3,
          discount = $4,
          totalprice = $5,
          total_commission = $6,
          document_type = $7,
          payment_method = $8,
          createdat = COALESCE($9, createdat)
      WHERE id = $10 AND tenant_id = $11
      RETURNING *
    `,
    [
      clientid,
      sellerUserId,
      description || "",
      discount || 0,
      finalTotal,
      totalCommission,
      docType,
      payment,
      createdAt,
      id,
      tenantId,
    ],
  );

  return result.rows || result;
}

async function markOrderDelivered(executor, id, tenantId = 1) {
  const db = resolveExecutor(executor);
  const result = await db.query(
    `
      UPDATE orders
      SET status = 'Entregue', finishedat = COALESCE(finishedat, NOW())
      WHERE id = $1
        AND tenant_id = $2
        AND (status IS DISTINCT FROM 'Entregue')
      RETURNING id
    `,
    [id, tenantId],
  );
  return result.rows || result;
}

async function getOrderStatusById(executor, id, tenantId = 1) {
  const db = resolveExecutor(executor);
  const result = await db.query(
    "SELECT id, status FROM orders WHERE id = $1 AND tenant_id = $2",
    [id, tenantId],
  );
  const rows = result.rows || result;
  return rows[0] || null;
}

async function getOrderLinesForStock(executor, id, tenantId = 1) {
  const db = resolveExecutor(executor);
  const result = await db.query(
    `
      SELECT product_id, quantity, brand
      FROM order_items
      WHERE order_id = $1 AND tenant_id = $2
    `,
    [id, tenantId],
  );
  return result.rows || result;
}

async function decreaseProductStock(executor, { productId, quantity, tenantId = 1 }) {
  const db = resolveExecutor(executor);
  const qInt = quantityToIntForStock(quantity);
  if (qInt == null) {
    return [];
  }
  const result = await db.query(
    `
      UPDATE products
      SET stock = stock - $1::integer
      WHERE id = $2
        AND tenant_id = $3
        AND stock >= $1::integer
      RETURNING id
    `,
    [qInt, productId, tenantId],
  );
  return result.rows || result;
}

async function increaseProductStock(executor, { productId, quantity, tenantId = 1 }) {
  const db = resolveExecutor(executor);
  const qInt = quantityToIntForStock(quantity);
  if (qInt == null) {
    return;
  }
  await db.query(
    `
      UPDATE products
      SET stock = stock + $1::integer
      WHERE id = $2 AND tenant_id = $3
    `,
    [qInt, productId, tenantId],
  );
}

module.exports = {
  updateOrderCore,
  markOrderDelivered,
  getOrderStatusById,
  getOrderLinesForStock,
  decreaseProductStock,
  increaseProductStock,
};
