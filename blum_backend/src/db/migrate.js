const fs = require("fs");
const path = require("path");
const { pool } = require("../config/database");

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

  const client = await pool.connect();
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
  } finally {
    client.release();
  }
}

module.exports = { runMigrations };
