require("dotenv").config({ override: false });
const { assertProductionConfig } = require("./src/config/env");
assertProductionConfig();

const { createApp } = require("./src/createApp");
const { runMigrations } = require("./src/db/migrate");
const { seedDefaultUsers } = require("./src/bootstrap/seedDefaultUsers");

const app = createApp();
const port = process.env.PORT || 3011;

const setupDatabase = async () => {
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

module.exports = app;
