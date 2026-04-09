/**
 * Importa clientes de .xls / .xlsx para a tabela `clients`.
 *
 * Uso:
 *   cd blum_backend
 *   npm install
 *   node scripts/import_clients_excel.js "C:/Users/.../relatorio.xls"
 *   node scripts/import_clients_excel.js "./planilha.xlsx" --dry-run
 *   node scripts/import_clients_excel.js "./arquivo.xls" --sheet="Nome da aba"
 *
 * Com --dry-run: não conecta ao PostgreSQL.
 * Sem --dry-run: DATABASE_URL no .env (igual ao backend — ver docker-compose.yml).
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const { Pool } = require("pg");
const XLSX = require("xlsx");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function normKey(s) {
  if (s == null) return "";
  return String(s)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

/**
 * Mapeia cabeçalho -> índices.
 * companyname: lista ordenada por prioridade (razão social > fantasia > empresa…).
 */
function buildColumnMap(headerRow) {
  const map = { companyname: [] };
  const companyCandidates = [];

  headerRow.forEach((cell, idx) => {
    const k = normKey(cell);
    if (!k) return;

    let companyScore = 0;
    if (k.includes("razao") && k.includes("social")) companyScore = 100;
    else if (k.includes("nome") && k.includes("fantasia")) companyScore = 95;
    else if (k === "fantasia" || (k.includes("fantasia") && !k.includes("cnpj")))
      companyScore = 90;
    else if (k.includes("empresa") || k.includes("company")) companyScore = 80;
    else if (k === "cliente" || k === "fornecedor" || k.endsWith(" cliente"))
      companyScore = 75;
    else if (k.includes("cliente") && !k.includes("codigo") && !k.includes("cod"))
      companyScore = 70;
    else if (k === "nome" && !k.includes("contato") && !k.includes("fantasia"))
      companyScore = 35;
    if (companyScore > 0) companyCandidates.push({ idx, score: companyScore });

    if (/^cnpj$|^cpf$|^documento$/.test(k) || k.includes("cnpj") || k.includes("cpf"))
      if (map.cnpj == null) map.cnpj = idx;
    if (
      /^contato$|^responsavel/.test(k) ||
      (k.includes("contato") && !k.includes("telefone"))
    )
      if (map.contactperson == null) map.contactperson = idx;
    if (/^tel|^fone|^cel|^whatsapp/.test(k) || k.includes("telefone"))
      if (map.phone == null) map.phone = idx;
    if (/^uf$|^estado$|^regiao$|^cidade$/.test(k) || k.includes("regiao"))
      if (map.region == null) map.region = idx;
    if (k.includes("email") || k.includes("e-mail"))
      if (map.email == null) map.email = idx;
  });

  companyCandidates.sort((a, b) => b.score - a.score);
  map.companyname = companyCandidates.map((c) => c.idx);
  return map;
}

function pickCompany(row, colMap) {
  const indices = colMap.companyname;
  if (!Array.isArray(indices) || indices.length === 0) return "";
  for (const i of indices) {
    const v = row[i];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function pickField(row, colMap, key) {
  const i = colMap[key];
  if (i == null) return null;
  const v = row[i];
  if (v == null || String(v).trim() === "") return null;
  return String(v).trim();
}

function parseRows(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
  if (!rows.length) return { header: [], data: [] };
  const header = rows[0].map((c) => String(c ?? "").trim());
  const data = rows.slice(1).filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
  return { header, data };
}

/** Mapa lowercase -> nome real da coluna (ex.: contactperson -> "contactPerson"). */
async function fetchClientsColumnMap(client) {
  const { rows } = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients'
  `);
  const lowerToActual = new Map();
  for (const { column_name } of rows) {
    lowerToActual.set(String(column_name).toLowerCase(), column_name);
  }
  return lowerToActual;
}

function pickDbColumn(lowerToActual, aliases) {
  for (const a of aliases) {
    const act = lowerToActual.get(a.toLowerCase());
    if (act) return act;
  }
  return null;
}

function quoteIdent(name) {
  if (/^[a-z_][a-z0-9_]*$/i.test(name) && name === name.toLowerCase()) return name;
  return `"${String(name).replace(/"/g, '""')}"`;
}

async function insertClientDynamic(db, lowerToActual, row) {
  const companyCol = pickDbColumn(lowerToActual, [
    "companyname",
    "company_name",
    "name",
  ]);
  if (!companyCol) {
    throw new Error(
      "Tabela clients sem coluna companyname / company_name / name",
    );
  }

  const pairs = [{ col: companyCol, val: row.companyname.slice(0, 255) }];

  const optional = [
    { aliases: ["contactperson", "contact_person"], val: row.contactperson },
    { aliases: ["phone", "telefone"], val: row.phone },
    { aliases: ["region", "regiao", "estado"], val: row.region },
    { aliases: ["cnpj"], val: row.cnpj },
    { aliases: ["email"], val: row.email },
  ];

  for (const { aliases, val } of optional) {
    if (val == null || String(val).trim() === "") continue;
    const col = pickDbColumn(lowerToActual, aliases);
    if (!col) continue;
    pairs.push({ col, val: String(val).trim().slice(0, 255) });
  }

  const cols = pairs.map((p) => quoteIdent(p.col)).join(", ");
  const nums = pairs.map((_, i) => `$${i + 1}`).join(", ");
  await db.query(
    `INSERT INTO clients (${cols}) VALUES (${nums})`,
    pairs.map((p) => p.val),
  );
}

async function existingCnpjs(client, cnpjColumn) {
  const q = quoteIdent(cnpjColumn);
  const r = await client.query(
    `SELECT ${q} AS cnpj FROM clients WHERE ${q} IS NOT NULL AND TRIM(${q}::text) <> ''`,
  );
  const set = new Set();
  for (const row of r.rows) {
    const d = onlyDigits(row.cnpj);
    if (d) set.add(d);
  }
  return set;
}

function parseArgs(argv) {
  const dryRun = argv.includes("--dry-run");
  const sheetArg = argv.find((a) => a.startsWith("--sheet="));
  const sheetName = sheetArg ? sheetArg.slice("--sheet=".length).replace(/^"|"$/g, "") : null;
  const positional = argv.filter(
    (a) => a !== "--dry-run" && !a.startsWith("--sheet="),
  );
  return { dryRun, sheetName, filePath: positional[0] };
}

async function main() {
  const { dryRun, sheetName, filePath } = parseArgs(process.argv.slice(2));

  if (!filePath || !fs.existsSync(filePath)) {
    console.error(
      "Uso: node scripts/import_clients_excel.js <arquivo.xls|.xlsx> [--dry-run] [--sheet=Nome]",
    );
    process.exit(1);
  }

  const wb = XLSX.readFile(filePath, { cellDates: true });
  let chosenSheet = wb.SheetNames[0];
  if (sheetName) {
    if (!wb.SheetNames.includes(sheetName)) {
      console.error(
        `Aba "${sheetName}" não encontrada. Abas: ${wb.SheetNames.join(", ")}`,
      );
      process.exit(1);
    }
    chosenSheet = sheetName;
  }
  const sheet = wb.Sheets[chosenSheet];
  const { header, data } = parseRows(sheet);

  if (!header.length) {
    console.error("Planilha vazia ou sem cabeçalho na primeira linha.");
    process.exit(1);
  }

  const colMap = buildColumnMap(header);
  const hasCompany =
    Array.isArray(colMap.companyname) && colMap.companyname.length > 0;
  if (!hasCompany && colMap.cnpj == null) {
    console.error(
      "Não encontrei colunas reconhecíveis. Cabeçalhos:",
      header.join(" | "),
    );
    console.error(
      "Inclua colunas com nomes como: Razão Social, Cliente, Empresa, Nome Fantasia, CNPJ.",
    );
    process.exit(1);
  }

  console.log(`Folha: "${chosenSheet}" | Linhas de dados: ${data.length}`);
  console.log("Mapeamento de colunas (índice 0-based):", colMap);

  if (dryRun) {
    console.log("(Simulação: sem conexão ao PostgreSQL.)");
  } else if (!process.env.DATABASE_URL || !String(process.env.DATABASE_URL).trim()) {
    console.error("Defina DATABASE_URL no .env do blum_backend (postgresql://user:pass@host:porta/db).");
    process.exit(1);
  }

  let db = null;
  let inserted = 0;
  let skippedDup = 0;
  let skippedEmpty = 0;
  let errors = 0;

  try {
    let lowerToActual = null;
    let cnpjCol = "cnpj";
    if (!dryRun) {
      db = await pool.connect();
      lowerToActual = await fetchClientsColumnMap(db);
      const foundCnpj = pickDbColumn(lowerToActual, ["cnpj"]);
      if (!foundCnpj) {
        console.error(
          "Tabela clients sem coluna cnpj; não é possível deduplicar por CNPJ.",
        );
        process.exit(1);
      }
      cnpjCol = foundCnpj;
      console.log(
        "Colunas em clients:",
        [...lowerToActual.values()].sort().join(", "),
      );
    }
    const cnpjSet = dryRun ? new Set() : await existingCnpjs(db, cnpjCol);

    for (const row of data) {
      let companyname = pickCompany(row, colMap);
      const cnpjRaw = pickField(row, colMap, "cnpj");
      const cnpjDigits = onlyDigits(cnpjRaw || "");

      if (!companyname && !cnpjDigits) {
        skippedEmpty++;
        continue;
      }

      if (!companyname && cnpjDigits) {
        companyname = `Cliente CNPJ ${cnpjDigits}`;
      }

      if (cnpjDigits && cnpjSet.has(cnpjDigits)) {
        skippedDup++;
        continue;
      }

      const contactperson = pickField(row, colMap, "contactperson");
      const phone = pickField(row, colMap, "phone");
      const region = pickField(row, colMap, "region");
      const email = pickField(row, colMap, "email");
      const cnpjStore = cnpjRaw ? String(cnpjRaw).trim() : null;

      if (dryRun) {
        console.log(
          "[dry-run]",
          companyname.slice(0, 60),
          cnpjStore || "(sem cnpj)",
        );
        inserted++;
        if (cnpjDigits) cnpjSet.add(cnpjDigits);
        continue;
      }

      try {
        await insertClientDynamic(db, lowerToActual, {
          companyname,
          contactperson: contactperson ? contactperson.slice(0, 255) : null,
          phone: phone ? phone.slice(0, 255) : null,
          region: region ? region.slice(0, 255) : null,
          cnpj: cnpjStore ? cnpjStore.slice(0, 255) : null,
          email: email ? email.slice(0, 255) : null,
        });
        inserted++;
        if (cnpjDigits) cnpjSet.add(cnpjDigits);
      } catch (e) {
        errors++;
        console.error("Erro ao inserir:", companyname, e.message);
      }
    }
  } finally {
    if (db) db.release();
    await pool.end();
  }

  console.log(
    dryRun ? "--- Simulação ---" : "--- Concluído ---",
    `\nInseridos/simulados: ${inserted}`,
    `\nIgnorados (duplicado CNPJ): ${skippedDup}`,
    `\nIgnorados (vazio): ${skippedEmpty}`,
    `\nErros: ${errors}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
