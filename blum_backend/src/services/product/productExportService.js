const XLSX = require("xlsx");
const { sql } = require("../../config/database");
const { requireTenantId } = require("../../utils/tenantContext");

async function fetchProductsForExport({ tenantId: tenantIdInput, brandId, q }) {
  const tenantId = requireTenantId(tenantIdInput);
  const brandIdNum = parseInt(brandId, 10);

  if (!Number.isInteger(brandIdNum) || brandIdNum <= 0) {
    const err = new Error("brandId é obrigatório para exportação.");
    err.status = 400;
    err.expose = true;
    throw err;
  }

  const brandRows = await sql`
    SELECT name FROM brands
    WHERE id = ${brandIdNum} AND tenant_id = ${tenantId}
    LIMIT 1
  `;

  if (brandRows.length === 0) {
    const err = new Error("Representada não encontrada.");
    err.status = 400;
    err.expose = true;
    throw err;
  }

  const brandName = brandRows[0].name;
  const qTrim = q != null && String(q).trim() !== "" ? String(q).trim() : "";
  const searchPattern = qTrim ? `%${qTrim}%` : null;

  let rows;
  if (searchPattern) {
    rows = await sql`
      SELECT productcode, name, price, stock, minstock, brand
      FROM products
      WHERE tenant_id = ${tenantId}
        AND (brand_id = ${brandIdNum} OR brand = ${brandName})
        AND (
          name ILIKE ${searchPattern}
          OR productcode ILIKE ${searchPattern}
        )
      ORDER BY name ASC
    `;
  } else {
    rows = await sql`
      SELECT productcode, name, price, stock, minstock, brand
      FROM products
      WHERE tenant_id = ${tenantId}
        AND (brand_id = ${brandIdNum} OR brand = ${brandName})
      ORDER BY name ASC
    `;
  }

  return rows.map((row) => ({
    codigo: row.productcode || "",
    nome: row.name || "",
    preco: Math.round(parseFloat(row.price || 0) * 100) / 100,
    estoque: parseInt(row.stock, 10) || 0,
    estoque_minimo: parseInt(row.minstock, 10) || 0,
    marca: row.brand || brandName,
  }));
}

function buildCsvBuffer(rows) {
  const headers = ["codigo", "nome", "preco", "estoque", "estoque_minimo", "marca"];
  const escape = (val) => {
    const s = String(val ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((h) => escape(row[h])).join(","),
    ),
  ];

  const bom = "\uFEFF";
  return Buffer.from(bom + lines.join("\n"), "utf8");
}

function buildExcelBuffer(rows) {
  const sheet = XLSX.utils.json_to_sheet(rows, {
    header: ["codigo", "nome", "preco", "estoque", "estoque_minimo", "marca"],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Produtos");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

async function exportProducts({ tenantId, brandId, q, format = "csv" }) {
  const rows = await fetchProductsForExport({ tenantId, brandId, q });

  if (format === "xlsx") {
    return {
      buffer: buildExcelBuffer(rows),
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: "blum-produtos.xlsx",
      rowCount: rows.length,
    };
  }

  return {
    buffer: buildCsvBuffer(rows),
    contentType: "text/csv; charset=utf-8",
    filename: "blum-produtos.csv",
    rowCount: rows.length,
  };
}

module.exports = {
  fetchProductsForExport,
  exportProducts,
  buildCsvBuffer,
  buildExcelBuffer,
};
