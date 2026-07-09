const bcrypt = require("bcrypt");
const { sql } = require("../config/database");

const DEV_DEFAULT_PASSWORD = "BlumAdmin2025!";

/**
 * Utilizador admin inicial — apenas bootstrap do tenant `default`.
 * Novos utilizadores em produção: admin cria em Equipe → POST /auth/users.
 *
 * Variáveis:
 * - SEED_ADMIN_EMAIL (default: admin@jwsoftware.com.br)
 * - SEED_ADMIN_PASSWORD (obrigatória em produção; em dev usa DEV_DEFAULT_PASSWORD)
 */
function buildSeedAdminUser() {
  const username = String(
    process.env.SEED_ADMIN_EMAIL || "admin@jwsoftware.com.br",
  ).trim();
  const password = String(process.env.SEED_ADMIN_PASSWORD || "").trim();
  const isProd = process.env.NODE_ENV === "production";

  if (!password) {
    if (isProd) {
      return null;
    }
    return {
      username,
      password: DEV_DEFAULT_PASSWORD,
      role: "admin",
      name: "Administrador",
    };
  }

  return {
    username,
    password,
    role: "admin",
    name: "Administrador",
  };
}

/**
 * @param {{ onlyIfDatabaseEmpty?: boolean; verbose?: boolean }} [options]
 * - onlyIfDatabaseEmpty: true → só corre se não existir nenhum utilizador.
 * - onlyIfDatabaseEmpty: false → tenta criar o admin se ainda não existir.
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

  const seedUser = buildSeedAdminUser();
  if (!seedUser) {
    console.warn(
      "[bootstrap] SEED_ADMIN_PASSWORD não definida em produção — seed de admin ignorado.",
    );
    return { skipped: true, reason: "no_password", created: 0 };
  }

  const countRows = await sql`SELECT COUNT(*)::int AS c FROM users`;
  const count = Number(countRows[0]?.c ?? 0);
  const tenantRows =
    await sql`SELECT id FROM tenants WHERE slug = 'default' ORDER BY id LIMIT 1`;
  const defaultTenantId = tenantRows[0]?.id;
  if (!defaultTenantId) {
    throw new Error("Tenant default não encontrado para seed de usuários.");
  }

  if (onlyIfDatabaseEmpty && count > 0) {
    console.log(
      "[bootstrap] Já existem utilizadores na base; seed automático não executa.",
    );
    return { skipped: true, reason: "not_empty", created: 0 };
  }

  const existing = await sql`
    SELECT id FROM users WHERE username = ${seedUser.username}
  `;

  if (existing.length > 0) {
    if (verbose) {
      console.log(`⚠️  Utilizador ${seedUser.username} já existe, a ignorar…`);
    }
    return { skipped: false, created: 0 };
  }

  const password_hash = await bcrypt.hash(seedUser.password, 10);
  await sql`
    INSERT INTO users (username, password_hash, role, name, tenant_id)
    VALUES (${seedUser.username}, ${password_hash}, ${seedUser.role}, ${seedUser.name}, ${defaultTenantId})
  `;

  console.log(
    `[bootstrap] Admin inicial criado (${seedUser.username}). Altere a senha após o primeiro login.`,
  );

  return { skipped: false, created: 1 };
}

module.exports = {
  buildSeedAdminUser,
  seedDefaultUsers,
};
