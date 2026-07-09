const { sql, pool } = require("../../config/database");
const { invalidateProductsCache } = require("../../config/cache");
const { requireTenantId } = require("../../utils/tenantContext");
const { parseSpreadsheetBuffer } = require("./productSpreadsheetParser");

function previewFromBuffer(buffer, options = {}) {
  const result = parseSpreadsheetBuffer(buffer, options);
  const items = result.products.map((p) => ({
    productCode: p.productCode,
    description: p.name,
    quantity: p.stock,
    unitPrice: p.price,
    minStock: p.minStock ?? 0,
  }));

  return {
    items,
    warnings: result.warnings,
    profile: result.profile,
    rowCount: items.length,
  };
}

async function resolveBrand(brandId, tenantId) {
  const id = parseInt(brandId, 10);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error("ID da representada inválido.");
    err.status = 400;
    err.expose = true;
    throw err;
  }

  const rows = await sql`
    SELECT id, name FROM brands
    WHERE id = ${id} AND tenant_id = ${tenantId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    const err = new Error("Representada não encontrada.");
    err.status = 400;
    err.expose = true;
    throw err;
  }

  return { brandId: rows[0].id, brandName: rows[0].name };
}

function normalizeImportItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error("Nenhum item válido foi recebido.");
    err.status = 400;
    err.expose = true;
    throw err;
  }

  const normalized = items
    .map((item) => {
      const productCode = String(item.productCode || "").trim();
      const name = String(item.description || item.name || "").trim();
      if (!productCode || !name) return null;

      return {
        product_code: productCode,
        name,
        price: Number(item.unitPrice ?? item.price ?? 0),
        stock: Math.max(0, Math.trunc(Number(item.quantity ?? item.stock ?? 0))),
        minstock: Math.max(0, Math.trunc(Number(item.minStock ?? item.minstock ?? 0))),
      };
    })
    .filter(Boolean);

  if (normalized.length === 0) {
    const err = new Error("Nenhum produto válido após normalização.");
    err.status = 400;
    err.expose = true;
    throw err;
  }

  const codes = normalized.map((p) => p.product_code);
  const dupes = codes.filter((c, i) => codes.indexOf(c) !== i);
  if (dupes.length > 0) {
    const err = new Error(
      `Códigos de produto duplicados: ${[...new Set(dupes)].join(", ")}`,
    );
    err.status = 400;
    err.expose = true;
    throw err;
  }

  return normalized;
}

async function finalizeImport({
  tenantId: tenantIdInput,
  brandId,
  items,
  stockMode = "replace",
  recordPriceHistory = false,
  purchaseDate,
}) {
  const tenantId = requireTenantId(tenantIdInput);
  const { brandId: brandIdResolved, brandName } = await resolveBrand(
    brandId,
    tenantId,
  );
  const normalized = normalizeImportItems(items);
  const mode = stockMode === "add" ? "add" : "replace";
  const purchaseDateIso = purchaseDate || new Date().toISOString();

  const client = await pool.connect();
  const results = { created: 0, updated: 0, errors: 0 };

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
          minstock NUMERIC
        )
      )
      SELECT p.id, p.productcode, p.price AS current_price
      FROM products p
      JOIN input i ON i.product_code = p.productcode
      WHERE p.tenant_id = $2
        AND (p.brand_id = $3 OR p.brand = $4)
      `,
      [payloadJson, tenantId, brandIdResolved, brandName],
    );

    const existingByCode = new Map(
      existingRows.rows.map((r) => [String(r.productcode), r]),
    );

    if (mode === "replace") {
      const updated = await client.query(
        `
        WITH input AS (
          SELECT *
          FROM jsonb_to_recordset($1::jsonb) AS x(
            product_code TEXT,
            name TEXT,
            price NUMERIC,
            stock NUMERIC,
            minstock NUMERIC
          )
        )
        UPDATE products p
        SET
          name = i.name,
          price = i.price,
          stock = i.stock::INT,
          minstock = i.minstock::INT,
          brand = $4,
          brand_id = $3
        FROM input i
        WHERE p.productcode = i.product_code
          AND p.tenant_id = $2
          AND (p.brand_id = $3 OR p.brand = $4)
        `,
        [payloadJson, tenantId, brandIdResolved, brandName],
      );
      results.updated = updated.rowCount || 0;
    } else {
      const updated = await client.query(
        `
        WITH input AS (
          SELECT *
          FROM jsonb_to_recordset($1::jsonb) AS x(
            product_code TEXT,
            name TEXT,
            price NUMERIC,
            stock NUMERIC,
            minstock NUMERIC
          )
        )
        UPDATE products p
        SET
          name = i.name,
          price = i.price,
          stock = p.stock + i.stock::INT,
          minstock = GREATEST(p.minstock, i.minstock::INT),
          brand = $4,
          brand_id = $3
        FROM input i
        WHERE p.productcode = i.product_code
          AND p.tenant_id = $2
          AND (p.brand_id = $3 OR p.brand = $4)
        `,
        [payloadJson, tenantId, brandIdResolved, brandName],
      );
      results.updated = updated.rowCount || 0;
    }

    const inserted = await client.query(
      `
      WITH input AS (
        SELECT *
        FROM jsonb_to_recordset($1::jsonb) AS x(
          product_code TEXT,
          name TEXT,
          price NUMERIC,
          stock NUMERIC,
          minstock NUMERIC
        )
      )
      INSERT INTO products (
        name, productcode, price, stock, brand, brand_id, minstock, tenant_id, createdat
      )
      SELECT
        i.name,
        i.product_code,
        i.price,
        i.stock::INT,
        $4,
        $3,
        i.minstock::INT,
        $2,
        NOW()
      FROM input i
      LEFT JOIN products p
        ON p.productcode = i.product_code
        AND p.tenant_id = $2
        AND (p.brand_id = $3 OR p.brand = $4)
      WHERE p.id IS NULL
      `,
      [payloadJson, tenantId, brandIdResolved, brandName],
    );
    results.created = inserted.rowCount || 0;

    if (mode === "add" && recordPriceHistory) {
      for (const item of normalized) {
        const existing = existingByCode.get(item.product_code);
        if (!existing) continue;
        const prevPrice = parseFloat(existing.current_price);
        if (prevPrice !== item.price) {
          await client.query(
            `
            INSERT INTO price_history (product_id, tenant_id, purchase_price, quantity, purchase_date)
            VALUES ($1, $2, $3, $4, $5)
            `,
            [existing.id, tenantId, item.price, item.stock, purchaseDateIso],
          );
        }
      }
    }

    await client.query("COMMIT");
    await invalidateProductsCache(tenantId);

    return {
      ...results,
      brandUsed: brandName,
      stockMode: mode,
      message: `Importação concluída: ${results.created} criados, ${results.updated} atualizados.`,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  previewFromBuffer,
  finalizeImport,
  normalizeImportItems,
};
