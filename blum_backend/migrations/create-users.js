// Script opcional: cria utilizadores da lista DEFAULT que ainda não existem.
// No arranque normal da API o seed corre sozinho se a tabela users estiver vazia.
//
// Uso manual: node blum_backend/migrations/create-users.js
//   (ou: docker compose exec backend node migrations/create-users.js)
//
// Novos vendedores: admin → Equipe (POST /api/v1/auth/users) — não edite este ficheiro.

require("dotenv").config();
const { sql } = require("../src/config/database");
const { seedDefaultUsers } = require("../src/bootstrap/seedDefaultUsers");

async function main() {
  console.log("🔐 Sincronizar utilizadores padrão (só os que faltam)…\n");

  try {
    const result = await seedDefaultUsers({
      onlyIfDatabaseEmpty: false,
      verbose: true,
    });

    if (result.skipped && result.reason === "env") {
      process.exit(0);
      return;
    }

    const allUsers = await sql`
      SELECT id, username, role, name, createdat
      FROM users
      ORDER BY id
    `;

    console.log("\n📋 Utilizadores na base:");
    console.table(allUsers);
    console.log(
      `\n✨ Concluído (${result.created ?? 0} novo(s) nesta execução). Altere senhas após o primeiro login.\n`,
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro:", error);
    process.exit(1);
  }
}

main();
