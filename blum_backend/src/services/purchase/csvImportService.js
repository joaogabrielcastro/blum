const { sql, pool } = require("../../config/database");
const { getValueByHeader, parseCsvLine } = require("./csvParseHelpers");

async function processCsvData(csvText, selectedBrand) {
  const lines = csvText.split("\n").filter((line) => line.trim());
  const products = [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);

    const product = {
      productCode: getValueByHeader(headers, values, [
        "codigo",
        "sku",
        "productcode",
        "código",
        "ean",
      ]),
      name: getValueByHeader(headers, values, [
        "nome",
        "descricao",
        "descrição",
        "name",
        "product",
        "produto",
      ]),
      price:
        parseFloat(
          getValueByHeader(headers, values, [
            "preco",
            "preço",
            "price",
            "valor",
            "precounitario",
          ]),
        ) || 0,
      stock:
        parseInt(
          getValueByHeader(headers, values, [
            "estoque",
            "stock",
            "quantidade",
            "qtd",
            "quantity",
          ]),
        ) || 0,
      subcode: getValueByHeader(headers, values, [
        "subcode",
        "subcodigo",
        "subcódigo",
        "codigointerno",
        "interno",
      ]),
      brand: selectedBrand,
      category: getValueByHeader(headers, values, [
        "categoria",
        "category",
        "grupo",
      ]),
    };

    if (
      product.productCode &&
      product.name &&
      product.productCode.trim() !== ""
    ) {
      products.push(product);
    }
  }

  return products;
}

async function importProductsToDatabase(products, tenantId = 1) {
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
    .map((product, index) => {
      const productCode = String(product.productCode || "").trim();
      const name = String(product.name || "").trim();
      if (!productCode || !name) return null;
      return {
        product_code: productCode,
        name,
        price: Number(product.price || 0),
        stock: Number(product.stock || 0),
        brand: String(product.brand || "").trim(),
        subcode:
          String(product.subcode || "").trim() ||
          `CSV-${productCode}-${(index + 1).toString(36)}`,
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
          subcode TEXT,
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
          subcode TEXT,
          brand TEXT
        )
      )
      UPDATE products p
      SET
        name = i.name,
        price = i.price,
        stock = p.stock + i.stock::INT,
        brand = i.brand,
        subcode = i.subcode
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
          subcode TEXT,
          brand TEXT
        )
      )
      INSERT INTO products (
        name, productcode, subcode, price, stock, brand, minstock, tenant_id, createdat
      )
      SELECT
        i.name, i.product_code, i.subcode, i.price, i.stock::INT, i.brand, 0, $2, NOW()
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
