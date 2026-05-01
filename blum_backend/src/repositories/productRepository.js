const { sql, pool } = require("../config/database");

async function findById(id) {
  return sql`SELECT * FROM products WHERE id = ${id}`;
}

async function findByProductCode(productcode) {
  return sql`
    SELECT id, name FROM products
    WHERE productcode = ${productcode}
  `;
}

async function findByProductCodeExcludingId(productcode, id) {
  return sql`
    SELECT id, name FROM products
    WHERE productcode = ${productcode} AND id != ${id}
  `;
}

async function findBySubcode(subcode) {
  return sql`
    SELECT id, name FROM products
    WHERE subcode = ${subcode}
  `;
}

async function findBySubcodeExcludingId(subcode, id) {
  return sql`
    SELECT id, name FROM products
    WHERE subcode = ${subcode} AND id != ${id}
  `;
}

async function insertProduct({
  name,
  productcode,
  subcode,
  price,
  stock,
  brand,
  minstock,
  tenant_id,
}) {
  const rows = await sql(
    `INSERT INTO products (name, productcode, subcode, price, stock, brand, minstock, tenant_id, createdat)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     RETURNING *`,
    [name, productcode, subcode || "", price, stock, brand, minstock || 0, tenant_id || 1],
  );
  return rows[0];
}

async function updateProduct(
  id,
  { name, productcode, subcode, price, stock, brand, minstock },
) {
  return sql(
    `UPDATE products
     SET name = $1, productcode = $2, subcode = $3, price = $4, stock = $5, brand = $6, minstock = $7
     WHERE id = $8
     RETURNING *`,
    [name, productcode, subcode || "", price, stock, brand, minstock || 0, id],
  );
}

async function deleteProduct(id) {
  return sql`DELETE FROM products WHERE id = ${id} RETURNING *`;
}

async function updateStock(productId, newStock) {
  return sql`UPDATE products SET stock = ${newStock} WHERE id = ${productId}`;
}

async function findLowStock() {
  return sql`
    SELECT * FROM products
    WHERE stock <= minstock
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
  findBySubcode,
  findBySubcodeExcludingId,
  insertProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  findLowStock,
  queryRaw,
};
