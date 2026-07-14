require("dotenv").config({ override: false });
const { assertProductionConfig } = require("./src/config/env");
assertProductionConfig();

/**
 * Observabilidade ANTES do Express:
 * Sentry (e OTel, se ativo) precisam registrar instrumentação
 * antes de carregar http/express via createApp.
 */
const {
  initSentry,
  startOpenTelemetry,
} = require("./src/observability/instrumentCompat");

initSentry();

let app = null;

const setupDatabase = async () => {
  const { runMigrations } = require("./src/db/migrate");
  const { seedDefaultUsers } = require("./src/bootstrap/seedDefaultUsers");
  try {
    console.log("Conectando ao banco de dados PostgreSQL...");
    await runMigrations();
    console.log("Migrações aplicadas.");
    await seedDefaultUsers({ onlyIfDatabaseEmpty: true });
  } catch (error) {
    console.error("Erro ao configurar o banco de dados:", error);
    process.exit(1);
  }
};

const startApp = async () => {
  try {
    try {
      await startOpenTelemetry();
    } catch (otelErr) {
      // Observabilidade é opcional — não derruba a API.
      console.error(
        JSON.stringify({
          level: "error",
          message: "otel_start_failed",
          error: otelErr.message,
        }),
      );
    }

    const { createApp } = require("./src/createApp");
    app = createApp();
    const port = process.env.PORT || 3011;

    await setupDatabase();

    app.listen(port, "0.0.0.0", () => {
      console.log(`🚀 Servidor rodando na porta ${port}`);
      console.log("✅ Banco de dados e Servidor prontos!");
    });
  } catch (error) {
    console.error("❌ Erro ao iniciar a aplicação:", error);
    process.exit(1);
  }
};

startApp();

module.exports = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === "then" || prop === "catch" || prop === "finally") {
        return undefined;
      }
      if (!app) return undefined;
      const value = app[prop];
      return typeof value === "function" ? value.bind(app) : value;
    },
  },
);
