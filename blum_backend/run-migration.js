const { neon } = require("@neondatabase/serverless");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const sql = neon(process.env.DATABASE_URL);

async function runMigration() {
  try {
    console.log("📊 Executando migration: Criando índices...");

    const migrationPath = path.join(
      __dirname,
      "migrations",
      "002_add_indexes.sql"
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    // Divide as queries por ponto e vírgula e executa uma por vez
    const queries = migrationSQL
      .split(";")
      .map((q) => q.trim())
      .filter((q) => q.length > 0 && !q.startsWith("--"));

    for (const query of queries) {
      await sql(query);
      console.log(`✅ Executado: ${query.substring(0, 50)}...`);
    }

    console.log("\n✅ Todos os índices foram criados com sucesso!");
    console.log("📈 Performance de consultas melhorada significativamente.");
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error.message);
    process.exit(1);
  }
}

runMigration();
