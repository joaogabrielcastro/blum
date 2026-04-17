const bcrypt = require("bcrypt");
const { sql } = require("../config/database");

/**
 * Lista única de utilizadores “de fábrica” (desenvolvimento / primeiro arranque).
 * Novos vendedores em produção: admin cria em Equipe → API POST /auth/users
 * (não adicione aqui — não é preciso mudar este ficheiro nem correr script manual).
 */
const DEFAULT_SEED_USERS = [
  {
    username: "admin",
    password: "BlumAdmin2025!",
    role: "admin",
    name: "Administrador",
  },
  {
    username: "siane",
    password: "Siane2025!",
    role: "salesperson",
    name: "Siane",
  },
  {
    username: "eduardo",
    password: "Eduardo2025!",
    role: "salesperson",
    name: "Eduardo",
  },
  {
    username: "Antonio",
    password: "123456",
    role: "salesperson",
    name: "Vendedor",
  },
  {
    username: "Ricardo",
    password: "123456!",
    role: "salesperson",
    name: "Vendedor",
  },
];

/**
 * @param {{ onlyIfDatabaseEmpty?: boolean; verbose?: boolean }} [options]
 * - onlyIfDatabaseEmpty: true → só corre se não existir nenhum utilizador (arranque Docker / primeira instalação).
 * - onlyIfDatabaseEmpty: false → tenta criar cada um que ainda não exista (comportamento do script CLI).
 */
async function seedDefaultUsers(options = {}) {
  const onlyIfDatabaseEmpty = Boolean(options.onlyIfDatabaseEmpty);
  const verbose = Boolean(options.verbose);

  if (process.env.BLUM_SKIP_AUTO_USER_SEED === "1") {
    console.log(
      "[bootstrap] BLUM_SKIP_AUTO_USER_SEED=1 — seed de utilizadores ignorado.",
    );
    return { skipped: true, reason: "env", created: 0 };
  }

  const countRows = await sql`SELECT COUNT(*)::int AS c FROM users`;
  const count = Number(countRows[0]?.c ?? 0);

  if (onlyIfDatabaseEmpty && count > 0) {
    console.log(
      "[bootstrap] Já existem utilizadores na base; seed automático não executa.",
    );
    return { skipped: true, reason: "not_empty", created: 0 };
  }

  let created = 0;
  for (const user of DEFAULT_SEED_USERS) {
    const existing = await sql`
      SELECT id FROM users WHERE username = ${user.username}
    `;

    if (existing.length > 0) {
      if (verbose) {
        console.log(`⚠️  Utilizador ${user.username} já existe, a ignorar…`);
      }
      continue;
    }

    const password_hash = await bcrypt.hash(user.password, 10);
    await sql`
      INSERT INTO users (username, password_hash, role, name)
      VALUES (${user.username}, ${password_hash}, ${user.role}, ${user.name})
    `;
    created += 1;
    if (verbose) {
      console.log(`✅ Utilizador ${user.username} criado (${user.role}).`);
    }
  }

  if (created > 0) {
    console.log(
      `[bootstrap] ${created} utilizador(es) inicial(is) criado(s). Altere as senhas após o primeiro login.`,
    );
  } else if (verbose && !onlyIfDatabaseEmpty) {
    console.log("Nenhum utilizador novo (todos já existiam).");
  }

  return { skipped: false, created };
}

module.exports = {
  DEFAULT_SEED_USERS,
  seedDefaultUsers,
};
