const { sql, pool } = require("../config/database");
const { requireTenantId } = require("../utils/tenantContext");

async function findById(id, tenantId) {
  tenantId = requireTenantId(tenantId);
  return sql`SELECT * FROM products WHERE id = ${id} AND tenant_id = ${tenantId}`;
}

async function findByProductCode(productcode, tenantId) {
  tenantId = requireTenantId(tenantId);
  return sql`
    SELECT id, name FROM products
    WHERE productcode = ${productcode} AND tenant_id = ${tenantId}
  `;
}

async function findByProductCodeExcludingId(productcode, id, tenantId) {
  tenantId = requireTenantId(tenantId);
  return sql`
    SELECT id, name FROM products
    WHERE productcode = ${productcode} AND id != ${id} AND tenant_id = ${tenantId}
  `;
}

async function insertProduct({
  name,
  productcode,
  price,
  stock,
  brand,
  brand_id,
  minstock,
  tenant_id,
}) {
  const tenantId = requireTenantId(tenant_id);
  const rows = await sql(
    `INSERT INTO products (name, productcode, price, stock, brand, brand_id, minstock, tenant_id, createdat)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     RETURNING *`,
    [
      name,
      productcode,
      price,
      stock,
      brand,
      brand_id ?? null,
      minstock || 0,
      tenantId,
    ],
  );
  return rows[0];
}

async function updateProduct(
  id,
  { name, productcode, price, stock, brand, minstock },
  tenantId,
) {
  tenantId = requireTenantId(tenantId);
  return sql(
    `UPDATE products
     SET name = $1, productcode = $2, price = $3, stock = $4, brand = $5, minstock = $6
     WHERE id = $7 AND tenant_id = $8
     RETURNING *`,
    [name, productcode, price, stock, brand, minstock || 0, id, tenantId],
  );
}

async function deleteProduct(id, tenantId) {
  tenantId = requireTenantId(tenantId);
  return sql`
    DELETE FROM products WHERE id = ${id} AND tenant_id = ${tenantId} RETURNING *
  `;
}

async function updateStock(productId, newStock, tenantId) {
  tenantId = requireTenantId(tenantId);
  return sql`
    UPDATE products SET stock = ${newStock}
    WHERE id = ${productId} AND tenant_id = ${tenantId}
  `;
}

async function findLowStock(tenantId) {
  tenantId = requireTenantId(tenantId);
  return sql`
    SELECT * FROM products
    WHERE stock <= minstock AND tenant_id = ${tenantId}
    ORDER BY stock ASC
  `;
}

async function queryRaw(text, values) {
  const result = await pool.query(text, values);
  return result.rows;
}

module.exports = {
  findById,
  findByProductCode,
  findByProductCodeExcludingId,
  insertProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  findLowStock,
  queryRaw,
};
