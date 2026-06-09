/**
 * Preenche nome_fantasia dos clientes existentes consultando a API pública por CNPJ.
 *
 * Requisitos:
 *   - Migração 022_clients_nome_fantasia.sql já aplicada
 *   - DATABASE_URL no .env
 *
 * Uso:
 *   cd blum_backend
 *   node scripts/backfill_clients_nome_fantasia.js --dry-run
 *   node scripts/backfill_clients_nome_fantasia.js --apply
 *   node scripts/backfill_clients_nome_fantasia.js --apply --limit=50
 *   node scripts/backfill_clients_nome_fantasia.js --apply --delay=2000
 *
 * --dry-run   : só mostra o que seria atualizado (padrão se não passar --apply)
 * --apply     : grava nome_fantasia no banco
 * --limit=N   : processa no máximo N clientes
 * --delay=ms  : espera entre consultas (padrão 1500 ms — evita 429 na API)
 * --force     : atualiza mesmo quando já existe nome_fantasia
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { Pool } = require("pg");

const CNPJ_API = "https://publica.cnpj.ws/cnpj";

function parseArgs(argv) {
  const apply = argv.includes("--apply");
  const force = argv.includes("--force");
  const limitArg = argv.find((a) => a.startsWith("--limit="));
  const delayArg = argv.find((a) => a.startsWith("--delay="));
  const limit = limitArg
    ? parseInt(limitArg.slice("--limit=".length), 10)
    : null;
  const delayMs = delayArg
    ? parseInt(delayArg.slice("--delay=".length), 10)
    : 1500;

  return {
    dryRun: !apply,
    apply,
    force,
    limit: Number.isFinite(limit) && limit > 0 ? limit : null,
    delayMs: Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : 1500,
  };
}

function onlyDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeName(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function namesAreEquivalent(a, b) {
  if (!a || !b) return false;
  return normalizeName(a) === normalizeName(b);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchNomeFantasiaByCnpj(cnpjDigits) {
  const response = await fetch(`${CNPJ_API}/${cnpjDigits}`);
  if (response.status === 429) {
    const err = new Error("Limite da API de CNPJ (429). Aumente --delay e tente de novo.");
    err.retryable = true;
    throw err;
  }
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  const fantasia = String(data?.estabelecimento?.nome_fantasia ?? "").trim();
  return fantasia || null;
}

async function loadCandidates(client, { force, limit }) {
  const whereFantasia = force
    ? ""
    : `AND (nome_fantasia IS NULL OR BTRIM(nome_fantasia) = '')`;

  const sql = `
    SELECT id, companyname, cnpj, nome_fantasia
    FROM clients
    WHERE cnpj IS NOT NULL
      AND BTRIM(cnpj::text) <> ''
      ${whereFantasia}
    ORDER BY id
    ${limit ? `LIMIT ${limit}` : ""}
  `;
  const result = await client.query(sql);
  return result.rows.filter((row) => onlyDigits(row.cnpj).length === 14);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL não definida no .env");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = await pool.connect();

  const stats = {
    scanned: 0,
    updated: 0,
    skippedSameAsCompany: 0,
    skippedNoFantasia: 0,
    skippedInvalidCnpj: 0,
    apiErrors: 0,
    dbErrors: 0,
  };

  try {
    const candidates = await loadCandidates(db, opts);
    console.log(
      opts.dryRun
        ? `[dry-run] ${candidates.length} cliente(s) com CNPJ para consultar`
        : `[apply] ${candidates.length} cliente(s) com CNPJ para consultar`,
    );

    for (let i = 0; i < candidates.length; i++) {
      const row = candidates[i];
      stats.scanned += 1;
      const cnpjDigits = onlyDigits(row.cnpj);

      if (cnpjDigits.length !== 14) {
        stats.skippedInvalidCnpj += 1;
        console.warn(`[skip] id=${row.id} CNPJ inválido: ${row.cnpj}`);
        continue;
      }

      let fantasia = null;
      try {
        fantasia = await fetchNomeFantasiaByCnpj(cnpjDigits);
      } catch (err) {
        stats.apiErrors += 1;
        console.error(`[erro API] id=${row.id} cnpj=${cnpjDigits}: ${err.message}`);
        if (err.retryable) break;
        continue;
      }

      if (!fantasia) {
        stats.skippedNoFantasia += 1;
        console.log(
          `[sem fantasia] id=${row.id} | ${row.companyname} | CNPJ ${cnpjDigits}`,
        );
      } else if (namesAreEquivalent(fantasia, row.companyname)) {
        stats.skippedSameAsCompany += 1;
        console.log(
          `[igual razão] id=${row.id} | ${row.companyname} (não grava duplicado)`,
        );
      } else if (opts.dryRun) {
        stats.updated += 1;
        console.log(
          `[atualizaria] id=${row.id} | razão: ${row.companyname} | fantasia: ${fantasia}`,
        );
      } else {
        try {
          await db.query(
            `UPDATE clients SET nome_fantasia = $1 WHERE id = $2`,
            [fantasia.slice(0, 255), row.id],
          );
          stats.updated += 1;
          console.log(
            `[ok] id=${row.id} | fantasia: ${fantasia}`,
          );
        } catch (err) {
          stats.dbErrors += 1;
          console.error(`[erro DB] id=${row.id}: ${err.message}`);
        }
      }

      if (i < candidates.length - 1 && opts.delayMs > 0) {
        await sleep(opts.delayMs);
      }
    }

    console.log("\n--- Resumo ---");
    console.log(JSON.stringify(stats, null, 2));
    if (opts.dryRun) {
      console.log("\nNenhuma alteração gravada. Rode com --apply para salvar.");
    }
  } finally {
    db.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
