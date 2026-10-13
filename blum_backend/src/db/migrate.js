const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { pool } = require("../config/database");

async function provisionRuntimeRole(client) {
  const role = String(process.env.DATABASE_RUNTIME_USER || "").trim();
  const password = String(process.env.DATABASE_RUNTIME_PASSWORD || "");
  if (!role && !password) return;
  if (!/^[a-z_][a-z0-9_]*$/.test(role) || !password) {
    throw new Error("DATABASE_RUNTIME_USER/PASSWORD inválidos");
  }
  const quotedRole = `"${role}"`;
  const exists = await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [role]);
  if (!exists.rows.length) {
    await client.query(`CREATE ROLE ${quotedRole} LOGIN NOSUPERUSER NOBYPASSRLS`);
  }
  const passwordDdl = await client.query(
    "SELECT format('ALTER ROLE %I LOGIN PASSWORD %L', $1::text, $2::text) AS ddl",
    [role, password],
  );
  await client.query(passwordDdl.rows[0].ddl);
  const databaseGrant = await client.query(
    "SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), $1::text) AS ddl",
    [role],
  );
  await client.query(databaseGrant.rows[0].ddl);
  await client.query(`GRANT USAGE ON SCHEMA public TO ${quotedRole}`);
  await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${quotedRole}`);
  await client.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${quotedRole}`);
  await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${quotedRole}`);
  await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${quotedRole}`);
}

/**
 * Executa ficheiros .sql em migrations/ por ordem lexicográfica,
 * registando em schema_migrations (execução idempotente por ficheiro).
 */
async function runMigrations() {
  const migrationsDir = path.join(__dirname, "..", "..", "migrations");
  if (!fs.existsSync(migrationsDir)) {
    console.warn("Pasta migrations não encontrada, a ignorar.");
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const adminPool = process.env.DATABASE_ADMIN_URL
    ? new Pool({ connectionString: process.env.DATABASE_ADMIN_URL })
    : pool;
  const client = await adminPool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    for (const file of files) {
      const { rows } = await client.query(
        "SELECT 1 FROM schema_migrations WHERE filename = $1",
        [file],
      );
      if (rows.length > 0) {
        continue;
      }

      const fullPath = path.join(migrationsDir, file);
      const sqlText = fs.readFileSync(fullPath, "utf8");
      console.log(`📂 Migração: ${file}`);
      await client.query(sqlText);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [
        file,
      ]);
    }
    await provisionRuntimeRole(client);
  } finally {
    client.release();
    if (adminPool !== pool) await adminPool.end();
  }
}

module.exports = { runMigrations };
