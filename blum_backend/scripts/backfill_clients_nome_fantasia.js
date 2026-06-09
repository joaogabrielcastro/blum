/**
 * Preenche nome_fantasia dos clientes existentes consultando APIs públicas por CNPJ.
 *
 * Uso:
 *   node scripts/backfill_clients_nome_fantasia.js --apply
 *   node scripts/backfill_clients_nome_fantasia.js --apply --delay=10000
 *   node scripts/backfill_clients_nome_fantasia.js --apply --from-id=2885
 *
 * --dry-run           : simula (padrão)
 * --apply             : grava no banco
 * --delay=ms          : pausa entre consultas (padrão 10000)
 * --from-id=N         : retoma a partir deste id
 * --cooldown-every=N  : pausa longa a cada N chamadas à API (padrão 8)
 * --cooldown-ms=ms    : duração da pausa longa (padrão 90000 = 1,5 min)
 * --limit=N / --force : ver versão anterior
 *
 * Cache local em scripts/.cache/cnpj_fantasia.json (não consulta de novo o mesmo CNPJ).
 * Fallback: publica.cnpj.ws → brasilapi.com.br
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const PUBLICA_API = "https://publica.cnpj.ws/cnpj";
const BRASIL_API = "https://brasilapi.com.br/api/cnpj/v1";
const CACHE_FILE = path.join(__dirname, ".cache", "cnpj_fantasia.json");

const DEFAULT_DELAY_MS = 10000;
const DEFAULT_COOLDOWN_EVERY = 8;
const DEFAULT_COOLDOWN_MS = 90000;
const MAX_429_RETRIES = 4;
const RETRY_BASE_MS = 20000;

function parseArgs(argv) {
  const apply = argv.includes("--apply");
  const force = argv.includes("--force");
  const readInt = (prefix) => {
    const arg = argv.find((a) => a.startsWith(prefix));
    return arg ? parseInt(arg.slice(prefix.length), 10) : null;
  };

  const limit = readInt("--limit=");
  const delayMs = readInt("--delay=");
  const fromId = readInt("--from-id=");
  const cooldownEvery = readInt("--cooldown-every=");
  const cooldownMs = readInt("--cooldown-ms=");

  return {
    dryRun: !apply,
    apply,
    force,
    limit: Number.isFinite(limit) && limit > 0 ? limit : null,
    delayMs:
      Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : DEFAULT_DELAY_MS,
    fromId: Number.isFinite(fromId) && fromId > 0 ? fromId : null,
    cooldownEvery:
      Number.isFinite(cooldownEvery) && cooldownEvery > 0
        ? cooldownEvery
        : DEFAULT_COOLDOWN_EVERY,
    cooldownMs:
      Number.isFinite(cooldownMs) && cooldownMs >= 0
        ? cooldownMs
        : DEFAULT_COOLDOWN_MS,
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

function jitter(ms, spread = 0.15) {
  const delta = ms * spread * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(ms + delta));
}

function loadCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return {};
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  const dir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function extractFantasiaFromPublica(data) {
  return String(data?.estabelecimento?.nome_fantasia ?? "").trim() || null;
}

function extractFantasiaFromBrasil(data) {
  return String(data?.nome_fantasia ?? "").trim() || null;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "blum-backfill/1.0" },
  });
  return response;
}

async function tryPublicaApi(cnpjDigits) {
  for (let attempt = 0; attempt <= MAX_429_RETRIES; attempt++) {
    let response;
    try {
      response = await fetchJson(`${PUBLICA_API}/${cnpjDigits}`);
    } catch (err) {
      const waitMs = jitter(RETRY_BASE_MS * Math.pow(1.4, attempt));
      console.warn(
        `[publica/rede] aguardando ${Math.round(waitMs / 1000)}s...`,
      );
      await sleep(waitMs);
      continue;
    }

    if (response.status === 429) {
      const waitMs = jitter(RETRY_BASE_MS * Math.pow(2, attempt));
      console.warn(
        `[publica/429] aguardando ${Math.round(waitMs / 1000)}s (${attempt + 1}/${MAX_429_RETRIES + 1})...`,
      );
      await sleep(waitMs);
      continue;
    }

    if (response.status === 404) {
      return { fantasia: null, source: "publica", notFound: true };
    }
    if (!response.ok) {
      return { fantasia: null, source: "publica", failed: true };
    }

    const data = await response.json();
    return {
      fantasia: extractFantasiaFromPublica(data),
      source: "publica",
      notFound: false,
    };
  }
  return { fantasia: null, source: "publica", rateLimited: true };
}

async function tryBrasilApi(cnpjDigits) {
  await sleep(jitter(3000));
  for (let attempt = 0; attempt <= 2; attempt++) {
    let response;
    try {
      response = await fetchJson(`${BRASIL_API}/${cnpjDigits}`);
    } catch (err) {
      await sleep(jitter(10000));
      continue;
    }

    if (response.status === 429) {
      const waitMs = jitter(30000 * (attempt + 1));
      console.warn(
        `[brasilapi/429] aguardando ${Math.round(waitMs / 1000)}s...`,
      );
      await sleep(waitMs);
      continue;
    }

    if (response.status === 404) {
      return { fantasia: null, source: "brasilapi", notFound: true };
    }
    if (!response.ok) {
      return { fantasia: null, source: "brasilapi", failed: true };
    }

    const data = await response.json();
    return {
      fantasia: extractFantasiaFromBrasil(data),
      source: "brasilapi",
      notFound: false,
    };
  }
  return { fantasia: null, source: "brasilapi", rateLimited: true };
}

async function resolveNomeFantasia(cnpjDigits, cache) {
  if (cache[cnpjDigits]) {
    return { ...cache[cnpjDigits], fromCache: true };
  }

  let result = await tryPublicaApi(cnpjDigits);
  if (result.rateLimited || result.failed) {
    console.warn(`[fallback] tentando brasilapi para ${cnpjDigits}...`);
    result = await tryBrasilApi(cnpjDigits);
  }

  if (result.rateLimited) {
    const err = new Error(
      "Ambas APIs limitaram (429). Aguarde alguns minutos e retome com --from-id.",
    );
    err.retryable = true;
    throw err;
  }

  const entry = {
    fantasia: result.fantasia,
    source: result.source,
    checkedAt: new Date().toISOString(),
  };
  cache[cnpjDigits] = entry;
  saveCache(cache);
  return { ...entry, fromCache: false };
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

  const cache = loadCache();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = await pool.connect();

  const stats = {
    scanned: 0,
    updated: 0,
    markedNoFantasia: 0,
    skippedSameAsCompany: 0,
    skippedInvalidCnpj: 0,
    cacheHits: 0,
    apiCalls: 0,
    apiErrors: 0,
    dbErrors: 0,
    stoppedAtId: null,
  };

  let apiCallsSinceCooldown = 0;

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
      `Delay: ${opts.delayMs}ms | cooldown: ${opts.cooldownMs / 1000}s a cada ${opts.cooldownEvery} API calls`,
    );
    console.log(`Cache: ${Object.keys(cache).length} CNPJ(s) já consultados`);
    if (opts.fromId) {
      console.log(`Retomando id >= ${opts.fromId}`);
    }

    console.log("\nAguardando 5s antes de começar...\n");
    await sleep(5000);

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
          } catch {
            stats.dbErrors += 1;
          }
        }
        continue;
      }

      let result;
      try {
        result = await resolveNomeFantasia(cnpjDigits, cache);
        if (result.fromCache) {
          stats.cacheHits += 1;
        } else {
          stats.apiCalls += 1;
          apiCallsSinceCooldown += 1;
        }
      } catch (err) {
        stats.apiErrors += 1;
        stats.stoppedAtId = row.id;
        console.error(
          `${progress} [parou] id=${row.id}: ${err.message}`,
        );
        console.error(
          `Retome: node scripts/backfill_clients_nome_fantasia.js --apply --from-id=${row.id}`,
        );
        break;
      }

      const { fantasia, source, fromCache } = result;
      const srcLabel = fromCache ? "cache" : source;

      if (!fantasia) {
        stats.markedNoFantasia += 1;
        console.log(
          `${progress} [sem fantasia/${srcLabel}] id=${row.id} | ${row.companyname}`,
        );
        try {
          await markClientChecked(db, row.id, "", { dryRun: opts.dryRun });
        } catch (err) {
          stats.dbErrors += 1;
        }
      } else if (namesAreEquivalent(fantasia, row.companyname)) {
        stats.skippedSameAsCompany += 1;
        console.log(
          `${progress} [igual razão/${srcLabel}] id=${row.id} | ${row.companyname}`,
        );
        try {
          await markClientChecked(db, row.id, "", { dryRun: opts.dryRun });
        } catch {
          stats.dbErrors += 1;
        }
      } else if (opts.dryRun) {
        stats.updated += 1;
        console.log(
          `${progress} [atualizaria/${srcLabel}] id=${row.id} | ${fantasia}`,
        );
      } else {
        try {
          await markClientChecked(db, row.id, fantasia, { dryRun: false });
          stats.updated += 1;
          console.log(
            `${progress} [ok/${srcLabel}] id=${row.id} | ${fantasia}`,
          );
        } catch (err) {
          stats.dbErrors += 1;
        }
      }

      if (
        apiCallsSinceCooldown >= opts.cooldownEvery &&
        i < candidates.length - 1
      ) {
        console.warn(
          `\n[cooldown] ${opts.cooldownMs / 1000}s de pausa após ${apiCallsSinceCooldown} consultas...\n`,
        );
        await sleep(opts.cooldownMs);
        apiCallsSinceCooldown = 0;
      } else if (i < candidates.length - 1 && opts.delayMs > 0 && !fromCache) {
        await sleep(jitter(opts.delayMs));
      } else if (i < candidates.length - 1 && fromCache && opts.delayMs > 0) {
        await sleep(200);
      }
    }

    console.log("\n--- Resumo ---");
    console.log(JSON.stringify(stats, null, 2));
    if (opts.dryRun) {
      console.log("\nNenhuma alteração gravada.");
    } else if (stats.stoppedAtId) {
      console.log(`\nInterrompido. Retome com --from-id=${stats.stoppedAtId}`);
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
