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
 *   node scripts/backfill_clients_nome_fantasia.js --apply --delay=5000
 *   node scripts/backfill_clients_nome_fantasia.js --apply --from-id=2881
 *
 * --dry-run      : só mostra o que seria atualizado (padrão)
 * --apply        : grava no banco
 * --limit=N      : processa no máximo N clientes
 * --delay=ms     : pausa entre consultas OK (padrão 5000 ms)
 * --from-id=N    : retoma a partir deste id de cliente
 * --force        : reprocessa mesmo quem já tem nome_fantasia preenchido
 *
 * Em --apply, clientes sem fantasia na Receita recebem nome_fantasia = ''
 * (marca como já consultado; não entram de novo na fila).
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { Pool } = require("pg");

const CNPJ_API = "https://publica.cnpj.ws/cnpj";
const DEFAULT_DELAY_MS = 5000;
const MAX_429_RETRIES = 10;
const RETRY_BASE_MS = 15000;

function parseArgs(argv) {
  const apply = argv.includes("--apply");
  const force = argv.includes("--force");
  const limitArg = argv.find((a) => a.startsWith("--limit="));
  const delayArg = argv.find((a) => a.startsWith("--delay="));
  const fromIdArg = argv.find((a) => a.startsWith("--from-id="));

  const limit = limitArg
    ? parseInt(limitArg.slice("--limit=".length), 10)
    : null;
  const delayMs = delayArg
    ? parseInt(delayArg.slice("--delay=".length), 10)
    : DEFAULT_DELAY_MS;
  const fromId = fromIdArg
    ? parseInt(fromIdArg.slice("--from-id=".length), 10)
    : null;

  return {
    dryRun: !apply,
    apply,
    force,
    limit: Number.isFinite(limit) && limit > 0 ? limit : null,
    delayMs: Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : DEFAULT_DELAY_MS,
    fromId: Number.isFinite(fromId) && fromId > 0 ? fromId : null,
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

function jitter(ms, spread = 0.2) {
  const delta = ms * spread * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(ms + delta));
}

async function fetchNomeFantasiaByCnpj(cnpjDigits) {
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_429_RETRIES; attempt++) {
    let response;
    try {
      response = await fetch(`${CNPJ_API}/${cnpjDigits}`, {
        headers: { Accept: "application/json" },
      });
    } catch (err) {
      lastError = err;
      const waitMs = jitter(RETRY_BASE_MS * Math.pow(1.5, attempt));
      console.warn(
        `[rede] id cnpj=${cnpjDigits}: ${err.message}. Aguardando ${Math.round(waitMs / 1000)}s...`,
      );
      await sleep(waitMs);
      continue;
    }

    if (response.status === 429) {
      const waitMs = jitter(RETRY_BASE_MS * Math.pow(2, attempt));
      console.warn(
        `[429] Limite da API. Aguardando ${Math.round(waitMs / 1000)}s (tentativa ${attempt + 1}/${MAX_429_RETRIES + 1})...`,
      );
      await sleep(waitMs);
      continue;
    }

    if (response.status === 404) {
      return { fantasia: null, notFound: true };
    }

    if (!response.ok) {
      return { fantasia: null, notFound: false };
    }

    const data = await response.json();
    const fantasia = String(data?.estabelecimento?.nome_fantasia ?? "").trim();
    return { fantasia: fantasia || null, notFound: false };
  }

  const err = new Error(
    lastError?.message ||
      `Limite da API (429) após ${MAX_429_RETRIES + 1} tentativas. Aumente --delay e use --from-id para retomar.`,
  );
  err.retryable = true;
  throw err;
}

async function loadCandidates(client, { force, limit, fromId }) {
  const conditions = [
    "cnpj IS NOT NULL",
    "BTRIM(cnpj::text) <> ''",
  ];
  const params = [];

  if (!force) {
    conditions.push("nome_fantasia IS NULL");
  }
  if (fromId) {
    params.push(fromId);
    conditions.push(`id >= $${params.length}`);
  }

  const sql = `
    SELECT id, companyname, cnpj, nome_fantasia
    FROM clients
    WHERE ${conditions.join(" AND ")}
    ORDER BY id
    ${limit ? `LIMIT ${limit}` : ""}
  `;

  const result = await client.query(sql, params);
  return result.rows.filter((row) => onlyDigits(row.cnpj).length === 14);
}

async function markClientChecked(db, id, fantasia, { dryRun }) {
  const value = fantasia ? fantasia.slice(0, 255) : "";
  if (dryRun) return;
  await db.query(`UPDATE clients SET nome_fantasia = $1 WHERE id = $2`, [
    value,
    id,
  ]);
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
    markedNoFantasia: 0,
    skippedSameAsCompany: 0,
    skippedInvalidCnpj: 0,
    apiErrors: 0,
    dbErrors: 0,
    stoppedAtId: null,
  };

  try {
    const candidates = await loadCandidates(db, opts);
    const etaMin = Math.ceil(
      (candidates.length * opts.delayMs) / 60000,
    );

    console.log(
      opts.dryRun
        ? `[dry-run] ${candidates.length} cliente(s) na fila`
        : `[apply] ${candidates.length} cliente(s) na fila`,
    );
    console.log(
      `Delay entre consultas: ${opts.delayMs}ms (~${etaMin} min no total, sem contar retries)`,
    );
    if (opts.fromId) {
      console.log(`Retomando a partir do id >= ${opts.fromId}`);
    }

    console.log("Aguardando 3s antes da primeira consulta...\n");
    await sleep(3000);

    for (let i = 0; i < candidates.length; i++) {
      const row = candidates[i];
      stats.scanned += 1;
      const cnpjDigits = onlyDigits(row.cnpj);
      const progress = `[${i + 1}/${candidates.length}]`;

      if (cnpjDigits.length !== 14) {
        stats.skippedInvalidCnpj += 1;
        console.warn(`${progress} [skip] id=${row.id} CNPJ inválido`);
        if (opts.apply) {
          try {
            await markClientChecked(db, row.id, "", { dryRun: false });
          } catch (err) {
            stats.dbErrors += 1;
          }
        }
        continue;
      }

      let result;
      try {
        result = await fetchNomeFantasiaByCnpj(cnpjDigits);
      } catch (err) {
        stats.apiErrors += 1;
        stats.stoppedAtId = row.id;
        console.error(
          `${progress} [parou] id=${row.id} cnpj=${cnpjDigits}: ${err.message}`,
        );
        console.error(
          `\nRetome com: node scripts/backfill_clients_nome_fantasia.js --apply --from-id=${row.id}`,
        );
        break;
      }

      const { fantasia } = result;

      if (!fantasia) {
        stats.markedNoFantasia += 1;
        console.log(
          `${progress} [sem fantasia] id=${row.id} | ${row.companyname}`,
        );
        try {
          await markClientChecked(db, row.id, "", {
            dryRun: opts.dryRun,
          });
        } catch (err) {
          stats.dbErrors += 1;
          console.error(`[erro DB] id=${row.id}: ${err.message}`);
        }
      } else if (namesAreEquivalent(fantasia, row.companyname)) {
        stats.skippedSameAsCompany += 1;
        console.log(
          `${progress} [igual razão] id=${row.id} | ${row.companyname}`,
        );
        try {
          await markClientChecked(db, row.id, "", {
            dryRun: opts.dryRun,
          });
        } catch (err) {
          stats.dbErrors += 1;
        }
      } else if (opts.dryRun) {
        stats.updated += 1;
        console.log(
          `${progress} [atualizaria] id=${row.id} | fantasia: ${fantasia}`,
        );
      } else {
        try {
          await markClientChecked(db, row.id, fantasia, { dryRun: false });
          stats.updated += 1;
          console.log(`${progress} [ok] id=${row.id} | fantasia: ${fantasia}`);
        } catch (err) {
          stats.dbErrors += 1;
          console.error(`[erro DB] id=${row.id}: ${err.message}`);
        }
      }

      if (i < candidates.length - 1 && opts.delayMs > 0) {
        await sleep(jitter(opts.delayMs));
      }
    }

    console.log("\n--- Resumo ---");
    console.log(JSON.stringify(stats, null, 2));
    if (opts.dryRun) {
      console.log("\nNenhuma alteração gravada. Rode com --apply para salvar.");
    } else if (stats.stoppedAtId) {
      console.log(
        `\nProcesso interrompido. Retome com --from-id=${stats.stoppedAtId}`,
      );
    } else {
      console.log("\nConcluído.");
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
