const { pool } = require("../../config/database");
const { parseSpreadsheetBuffer } = require("../product/productSpreadsheetParser");

async function processCsvData(csvText, selectedBrand) {
  const buffer = Buffer.from(String(csvText || ""), "utf8");
  const result = parseSpreadsheetBuffer(buffer, { filename: "import.csv" });

  return result.products.map((p) => ({
    productCode: p.productCode,
    name: p.name,
    price: p.price,
    stock: p.stock,
    brand: selectedBrand,
    category: "",
  }));
}

async function importProductsToDatabase(products, tenantId) {
  const { requireTenantId } = require("../../utils/tenantContext");
  tenantId = requireTenantId(tenantId);
  const results = {
    created: 0,
    updated: 0,
    errors: 0,
    details: [],
  };

  if (!Array.isArray(products) || products.length === 0) {
    return results;
  }

  const normalized = products
    .map((product) => {
      const productCode = String(product.productCode || "").trim();
      const name = String(product.name || "").trim();
      if (!productCode || !name) return null;
      return {
        product_code: productCode,
        name,
        price: Number(product.price || 0),
        stock: Number(product.stock || 0),
        brand: String(product.brand || "").trim(),
      };
    })
    .filter(Boolean);

  if (normalized.length === 0) {
    return results;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const payloadJson = JSON.stringify(normalized);
    const existingRows = await client.query(
      `
      WITH input AS (
        SELECT *
        FROM jsonb_to_recordset($1::jsonb) AS x(
          product_code TEXT,
          name TEXT,
          price NUMERIC,
          stock NUMERIC,
          brand TEXT
        )
      )
      SELECT p.productcode
      FROM products p
      JOIN input i ON i.product_code = p.productcode
      WHERE p.tenant_id = $2
      `,
      [payloadJson, tenantId],
    );

    const existingCodes = new Set(existingRows.rows.map((row) => row.productcode));

    const updated = await client.query(
      `
      WITH input AS (
        SELECT *
        FROM jsonb_to_recordset($1::jsonb) AS x(
          product_code TEXT,
          name TEXT,
          price NUMERIC,
          stock NUMERIC,
          brand TEXT
        )
      )
      UPDATE products p
      SET
        name = i.name,
        price = i.price,
        stock = p.stock + i.stock::INT,
        brand = i.brand
      FROM input i
      WHERE p.productcode = i.product_code
        AND p.tenant_id = $2
      `,
      [payloadJson, tenantId],
    );

    const inserted = await client.query(
      `
      WITH input AS (
        SELECT *
        FROM jsonb_to_recordset($1::jsonb) AS x(
          product_code TEXT,
          name TEXT,
          price NUMERIC,
          stock NUMERIC,
          brand TEXT
        )
      )
      INSERT INTO products (
        name, productcode, price, stock, brand, minstock, tenant_id, createdat
      )
      SELECT
        i.name, i.product_code, i.price, i.stock::INT, i.brand, 0, $2, NOW()
      FROM input i
      LEFT JOIN products p
        ON p.productcode = i.product_code AND p.tenant_id = $2
      WHERE p.id IS NULL
      `,
      [payloadJson, tenantId],
    );

    results.updated = updated.rowCount || 0;
    results.created = inserted.rowCount || 0;
    results.errors = Math.max(0, products.length - (results.updated + results.created));

    for (const product of normalized) {
      const marker = existingCodes.has(product.product_code)
        ? "✅ Atualizado"
        : "🆕 Criado";
      results.details.push(
        `${marker}: ${product.product_code} - ${product.name.substring(0, 30)}...`,
      );
    }

    await client.query("COMMIT");
    return results;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  processCsvData,
  importProductsToDatabase,
};
