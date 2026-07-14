const { Client } = require("pg");
const { requireDatabaseUrl } = require("../config/database");

/**
 * Garante que a database do Control Plane existe (útil no compose local).
 * Conecta à DB `postgres` (ou agent_control admin) e faz CREATE DATABASE.
 */
async function ensureDatabase() {
  const databaseUrl = requireDatabaseUrl();
  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL inválida");
  }

  const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!dbName || dbName === "postgres") {
    return;
  }

  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = "/postgres";

  const client = new Client({ connectionString: adminUrl.toString() });
  try {
    await client.connect();
    const { rows } = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName],
    );
    if (rows.length === 0) {
      // CREATE DATABASE não aceita parâmetros; dbName vem do env controlado.
      if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
        throw new Error(`Nome de database inválido: ${dbName}`);
      }
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(
        JSON.stringify({
          level: "info",
          message: "database_created",
          database: dbName,
        }),
      );
    }
  } finally {
    await client.end().catch(() => {});
  }
}

module.exports = { ensureDatabase };
