const crypto = require("crypto");
const XLSX = require("xlsx");
const { parseCsvLine } = require("../purchase/csvParseHelpers");
const MAX_IMPORT_ROWS = parseInt(process.env.MAX_IMPORT_ROWS || "50000", 10);
const MAX_IMPORT_SHEETS = parseInt(process.env.MAX_IMPORT_SHEETS || "10", 10);

function importLimitError(message) {
  const error = new Error(message);
  error.statusCode = 413;
  error.expose = true;
  return error;
}

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

function compactHeader(h) {
  return normHeader(h).replace(/[^a-z0-9]/g, "");
}

const HEADER_PREFIXES = {
  code: ["codigo", "codigodoproduto", "sku", "productcode", "ean", "code"],
  name: ["nome", "nomedoproduto", "descricao", "name", "product", "produto"],
  price: ["preco", "precodetabela", "price", "valor", "precounitario"],
  stock: ["estoque", "quantidadeemestoque", "stock", "quantidade", "qtd", "quantity"],
  minStock: ["estoqueminimo", "minstock"],
};

function headerMatches(header, aliases) {
  const compact = compactHeader(header);
  return aliases.some((alias) => compact === alias || compact.startsWith(alias));
}

function valueForHeader(headers, values, aliases) {
  const index = headers.findIndex((header) => headerMatches(header, aliases));
  if (index < 0 || values[index] == null) return "";
  return String(values[index]).trim();
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
  const normalized = headers.filter((header) => compactHeader(header));
  if (normalized.length === 0) return false;
  const semanticHits = Object.values(HEADER_PREFIXES).filter((aliases) =>
    normalized.some((header) => headerMatches(header, aliases)),
  );
  if (semanticHits.length >= 2) return true;
  const hits = normalized.map(normHeader).filter((h) => GENERIC_HEADER_KEYS.has(h));
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
  return {
    productCode: normalizeProductCode(valueForHeader(headers, values, HEADER_PREFIXES.code)),
    name: valueForHeader(headers, values, HEADER_PREFIXES.name),
    price: parseNumber(valueForHeader(headers, values, HEADER_PREFIXES.price), 0),
    stock: parseInteger(valueForHeader(headers, values, HEADER_PREFIXES.stock), 0),
    minStock: parseInteger(valueForHeader(headers, values, HEADER_PREFIXES.minStock), 0),
  };
}

function normalizeRows(rawRows, options = {}) {
  const { codePrefix = "AUTO" } = options;
  const warnings = [];
  const products = [];
  let autoCodeCount = 0;
  const usedCodes = new Set();
  const duplicateCodes = new Set();
  let zeroPriceCount = 0;

  for (const row of rawRows) {
    if (!row.name || String(row.name).trim() === "") continue;

    let productCode = row.productCode;
    if (!productCode) {
      productCode = generateAutoCode(row.name, codePrefix);
      if (productCode) {
        const baseCode = productCode;
        let suffix = 2;
        while (usedCodes.has(productCode.toLocaleLowerCase("pt-BR"))) {
          productCode = `${baseCode}_${suffix}`;
          suffix++;
        }
        autoCodeCount++;
        warnings.push(`Código gerado para "${row.name.slice(0, 40)}": ${productCode}`);
      }
    }

    if (!productCode) continue;

    const normalizedCodeKey = productCode.toLocaleLowerCase("pt-BR");
    if (usedCodes.has(normalizedCodeKey)) duplicateCodes.add(productCode);
    usedCodes.add(normalizedCodeKey);
    if (Number(row.price ?? 0) === 0) zeroPriceCount++;

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

  if (duplicateCodes.size > 0) {
    warnings.unshift(
      `${duplicateCodes.size} código(s) repetido(s) na planilha: ${[...duplicateCodes].slice(0, 10).join(", ")}.`,
    );
  }

  if (zeroPriceCount > 0) {
    warnings.push(`${zeroPriceCount} produto(s) estão com preço zero.`);
  }

  return {
    products,
    warnings,
    stats: {
      autoCodeCount,
      duplicateCodeCount: duplicateCodes.size,
      duplicateCodes: [...duplicateCodes],
      zeroPriceCount,
    },
  };
}

function parseCsvBuffer(buffer, options = {}) {
  const text = stripBom(buffer.toString("utf8"));
  const lines = splitCsvLines(text).filter((l) => l.trim());
  if (lines.length - 1 > MAX_IMPORT_ROWS) {
    throw importLimitError(`A importação excede o limite de ${MAX_IMPORT_ROWS} linhas.`);
  }
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

  const { products, warnings, stats } = normalizeRows(rawRows, options);
  return {
    products,
    warnings,
    stats,
    profile: useGeneric ? "generic" : "erp_export",
  };
}

function parseExcelBuffer(buffer, options = {}) {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: false,
    sheets: 0,
    sheetRows: MAX_IMPORT_ROWS + 2,
  });
  if (workbook.SheetNames.length > MAX_IMPORT_SHEETS) {
    throw importLimitError(`A planilha excede o limite de ${MAX_IMPORT_SHEETS} abas.`);
  }
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
  if (matrix.length - 1 > MAX_IMPORT_ROWS) {
    throw importLimitError(`A importação excede o limite de ${MAX_IMPORT_ROWS} linhas.`);
  }

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

  const { products, warnings, stats } = normalizeRows(rawRows, options);
  return {
    products,
    warnings,
    stats,
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
