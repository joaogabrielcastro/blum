const { Pool } = require("pg");

function requireDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url || !String(url).trim()) {
    throw new Error("DATABASE_URL é obrigatório para o Control Plane");
  }
  return String(url).trim();
}

const pool = new Pool({
  connectionString: requireDatabaseUrl(),
  max: 10,
});

pool.on("error", (err) => {
  console.error(
    JSON.stringify({
      level: "error",
      message: "pg_pool_error",
      error: err.message,
    }),
  );
});

module.exports = { pool, requireDatabaseUrl };
