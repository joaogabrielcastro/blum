const crypto = require("crypto");
const XLSX = require("xlsx");
const { getValueByHeader, parseCsvLine } = require("../purchase/csvParseHelpers");

const CODE_ALIASES = ["codigo", "sku", "productcode", "código", "ean", "code"];
const NAME_ALIASES = [
  "nome",
  "descricao",
  "descrição",
  "name",
  "product",
  "produto",
];
const PRICE_ALIASES = ["preco", "preço", "price", "valor", "precounitario"];
const STOCK_ALIASES = [
  "estoque",
  "stock",
  "quantidade",
  "qtd",
  "quantity",
];
const MIN_STOCK_ALIASES = ["estoque_minimo", "minstock", "min_stock", "estoque minimo"];

const GENERIC_HEADER_KEYS = new Set([
  ...CODE_ALIASES,
  ...NAME_ALIASES,
  ...PRICE_ALIASES,
  ...STOCK_ALIASES,
  ...MIN_STOCK_ALIASES,
  "categoria",
  "category",
  "grupo",
  "marca",
  "brand",
]);

const BRAND_PREFIXES = {
  colombocal: "COL",
  frete: "FRT",
  embalagens: "EMB",
  blum: "BLM",
  padova: "PAD",
  zagonel: "ZAG",
  durin: "DUR",
  pratelheiras: "PRT",
  caixa_correio: "CXC",
};

function stripBom(text) {
  return String(text || "").replace(/^\uFEFF/, "");
}

function normHeader(h) {
  return String(h || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeProductCode(value) {
  if (value == null || value === "") return "";
  let s = String(value).trim();
  if (/^\d+\.0+$/.test(s)) {
    s = String(parseInt(s, 10));
  }
  return s;
}

function parseNumber(value, fallback = 0) {
  if (value == null || value === "") return fallback;
  let s = String(value).trim();
  if (!s) return fallback;

  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  }

  const n = parseFloat(s.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

function parseInteger(value, fallback = 0) {
  const n = parseNumber(value, fallback);
  return Math.max(0, Math.trunc(n));
}

function generateAutoCode(name, prefix = "AUTO") {
  if (name == null || String(name).trim() === "") return null;

  let cleaned = String(name)
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .trim();

  if (cleaned.length > 30) {
    const hash = crypto.createHash("md5").update(String(name)).digest("hex").slice(0, 6).toUpperCase();
    cleaned = `${cleaned.slice(0, 20)}_${hash}`;
  }

  return `${prefix}_${cleaned}`;
}

function inferBrandPrefixFromFilename(filename) {
  const base = String(filename || "")
    .replace(/\.[^.]+$/, "")
    .toLowerCase();

  if (base.includes("colombocal")) return { brand: "colombocal", prefix: "COL" };
  if (base.includes("frete")) return { brand: "frete", prefix: "FRT" };
  if (base.includes("embalagens")) return { brand: "embalagens", prefix: "EMB" };
  if (base.includes("blum")) return { brand: "blum", prefix: "BLM" };
  if (base.includes("padova")) return { brand: "padova", prefix: "PAD" };
  if (base.includes("zagonel")) return { brand: "zagonel", prefix: "ZAG" };
  if (base.includes("durin")) return { brand: "durin", prefix: "DUR" };
  if (base.includes("pratelheiras")) return { brand: "pratelheiras", prefix: "PRT" };
  if (base.includes("caixa") && base.includes("correio")) {
    return { brand: "caixa_correio", prefix: "CXC" };
  }
  return { brand: null, prefix: "AUTO" };
}

function detectDelimiter(headerLine) {
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semiCount = (headerLine.match(/;/g) || []).length;
  return semiCount > commaCount ? ";" : ",";
}

function splitCsvLines(text) {
  const raw = stripBom(text);
  const lines = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && raw[i + 1] === "\n") i++;
      if (current.trim()) lines.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) lines.push(current);
  return lines;
}

function parseCsvLineWithDelimiter(line, delimiter) {
  if (delimiter === ",") return parseCsvLine(line);
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((val) => val.replace(/^"|"$/g, "").trim());
}

function headersLookGeneric(headers) {
  const normalized = headers.map(normHeader).filter(Boolean);
  if (normalized.length === 0) return false;
  const hits = normalized.filter((h) => GENERIC_HEADER_KEYS.has(h));
  return hits.length >= 2;
}

function rowFromErpExport(row) {
  const getCell = (idx) => {
    if (idx >= row.length) return "";
    const v = row[idx];
    return v == null ? "" : String(v).trim();
  };

  return {
    productCode: normalizeProductCode(getCell(0)),
    name: getCell(1),
    price: parseNumber(getCell(2), 0),
    stock: parseInteger(getCell(9), 0),
    minStock: 0,
  };
}

function rowFromGeneric(headers, values) {
  const h = headers.map(normHeader);
  return {
    productCode: normalizeProductCode(
      getValueByHeader(h, values, CODE_ALIASES),
    ),
    name: getValueByHeader(h, values, NAME_ALIASES),
    price: parseNumber(getValueByHeader(h, values, PRICE_ALIASES), 0),
    stock: parseInteger(getValueByHeader(h, values, STOCK_ALIASES), 0),
    minStock: parseInteger(getValueByHeader(h, values, MIN_STOCK_ALIASES), 0),
  };
}

function normalizeRows(rawRows, options = {}) {
  const { codePrefix = "AUTO" } = options;
  const warnings = [];
  const products = [];
  let autoCodeCount = 0;

  for (const row of rawRows) {
    if (!row.name || String(row.name).trim() === "") continue;

    let productCode = row.productCode;
    if (!productCode) {
      productCode = generateAutoCode(row.name, codePrefix);
      if (productCode) {
        autoCodeCount++;
        warnings.push(`Código gerado para "${row.name.slice(0, 40)}": ${productCode}`);
      }
    }

    if (!productCode) continue;

    products.push({
      productCode,
      name: String(row.name).trim(),
      price: row.price ?? 0,
      stock: row.stock ?? 0,
      minStock: row.minStock ?? 0,
    });
  }

  if (autoCodeCount > 0) {
    warnings.unshift(`${autoCodeCount} produto(s) sem código — códigos gerados automaticamente.`);
  }

  return { products, warnings };
}

function parseCsvBuffer(buffer, options = {}) {
  const text = stripBom(buffer.toString("utf8"));
  const lines = splitCsvLines(text).filter((l) => l.trim());
  if (lines.length === 0) {
    return { products: [], warnings: [], profile: "empty" };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headerValues = parseCsvLineWithDelimiter(lines[0], delimiter);
  const headers = headerValues.map((h) => normHeader(h));
  const useGeneric = headersLookGeneric(headers);
  const rawRows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLineWithDelimiter(lines[i], delimiter);
    if (useGeneric) {
      rawRows.push(rowFromGeneric(headers, values));
    } else {
      rawRows.push(rowFromErpExport(values));
    }
  }

  const { products, warnings } = normalizeRows(rawRows, options);
  return {
    products,
    warnings,
    profile: useGeneric ? "generic" : "erp_export",
  };
}

function parseExcelBuffer(buffer, options = {}) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (!matrix.length) {
    return { products: [], warnings: [], profile: "empty" };
  }

  const firstRow = matrix[0].map((c) => String(c ?? "").trim());
  const useGeneric = headersLookGeneric(firstRow);
  const rawRows = [];

  if (useGeneric) {
    const headers = firstRow.map(normHeader);
    for (let i = 1; i < matrix.length; i++) {
      const values = matrix[i].map((c) => String(c ?? "").trim());
      rawRows.push(rowFromGeneric(headers, values));
    }
  } else {
    for (let i = 0; i < matrix.length; i++) {
      const values = matrix[i].map((c) => String(c ?? "").trim());
      if (i === 0 && headersLookGeneric(values)) continue;
      rawRows.push(rowFromErpExport(values));
    }
  }

  const { products, warnings } = normalizeRows(rawRows, options);
  return {
    products,
    warnings,
    profile: useGeneric ? "generic" : "erp_export",
  };
}

function isExcelFilename(filename) {
  const lower = String(filename || "").toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xls");
}

/**
 * Parse CSV or Excel buffer into normalized product rows.
 * @param {Buffer} buffer
 * @param {{ filename?: string, codePrefix?: string }} options
 */
function parseSpreadsheetBuffer(buffer, options = {}) {
  const filename = options.filename || "";
  const inferred = inferBrandPrefixFromFilename(filename);
  const codePrefix = options.codePrefix || inferred.prefix;

  if (isExcelFilename(filename)) {
    return parseExcelBuffer(buffer, { codePrefix });
  }

  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv") || !filename) {
    return parseCsvBuffer(buffer, { codePrefix });
  }

  if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
    return parseExcelBuffer(buffer, { codePrefix });
  }

  return parseCsvBuffer(buffer, { codePrefix });
}

module.exports = {
  parseSpreadsheetBuffer,
  parseCsvBuffer,
  parseExcelBuffer,
  normalizeProductCode,
  generateAutoCode,
  inferBrandPrefixFromFilename,
  BRAND_PREFIXES,
};
