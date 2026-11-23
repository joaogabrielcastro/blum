const { sql } = require("../config/database");
const { requireTenantId } = require("../utils/tenantContext");

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
    hasStockWarning = false,
    tenantId: tenantIdInput,
  } = payload;
  const tenantId = requireTenantId(tenantIdInput);

  // $13 separado de $7: reutilizar o mesmo parâmetro no CASE causa
  // "inconsistent types deduced for parameter $N" no PostgreSQL.
  const commitStock = docType === "pedido";
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
          createdat = COALESCE($9, createdat),
          has_stock_warning = $10,
          stock_committed_at = CASE
            WHEN $13 THEN COALESCE(stock_committed_at, NOW())
            ELSE NULL
          END
      WHERE id = $11 AND tenant_id = $12
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
      hasStockWarning,
      id,
      tenantId,
      commitStock,
    ],
  );

  return result.rows || result;
}

/**
 * Atualiza o saldo e, se `movement` vier, registra o movimento na mesma
 * instrução (CTE): saldo e histórico nunca divergem.
 * movement: { type, referenceType, referenceId, userId, reason }
 */
async function changeProductStock(executor, { productId, delta, tenantId, movement }) {
  const db = resolveExecutor(executor);
  if (!movement) {
    const result = await db.query(
      `
        UPDATE products
        SET stock = stock + $1::integer
        WHERE id = $2 AND tenant_id = $3
        RETURNING id
      `,
      [delta, productId, tenantId],
    );
    return result.rows || result;
  }
  const userId = Number.parseInt(movement.userId, 10);
  const result = await db.query(
    `
      WITH upd AS (
        UPDATE products
        SET stock = stock + $1::integer
        WHERE id = $2 AND tenant_id = $3
        RETURNING id, stock, tenant_id, cost_price
      )
      INSERT INTO stock_movements
        (tenant_id, product_id, movement_type, quantity, balance_after,
         unit_cost, reference_type, reference_id, reason, user_id)
      SELECT tenant_id, id, $4, $1, stock, cost_price, $5, $6, $7, $8
      FROM upd
      RETURNING product_id AS id
    `,
    [
      delta,
      productId,
      tenantId,
      movement.type,
      movement.referenceType || null,
      movement.referenceId ?? null,
      movement.reason || null,
      Number.isInteger(userId) ? userId : null,
    ],
  );
  return result.rows || result;
}

async function decreaseProductStock(executor, { productId, quantity, tenantId: tenantIdInput, movement }) {
  const tenantId = requireTenantId(tenantIdInput);
  const qInt = quantityToIntForStock(quantity);
  if (qInt == null) {
    return [];
  }
  return changeProductStock(executor, { productId, delta: -qInt, tenantId, movement });
}

async function increaseProductStock(executor, { productId, quantity, tenantId: tenantIdInput, movement }) {
  const tenantId = requireTenantId(tenantIdInput);
  const qInt = quantityToIntForStock(quantity);
  if (qInt == null) {
    return;
  }
  await changeProductStock(executor, { productId, delta: qInt, tenantId, movement });
}

module.exports = {
  updateOrderCore,
  decreaseProductStock,
  increaseProductStock,
  changeProductStock,
};
