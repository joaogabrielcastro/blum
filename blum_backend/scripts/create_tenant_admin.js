/**
 * Cria ou promove admin num tenant.
 * Uso: node scripts/create_tenant_admin.js --tenant=blu1m --email=... --password=...
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const bcrypt = require("bcrypt");
const { pool } = require("../src/config/database");

function parseArgs(argv) {
  const args = { tenant: null, email: null, password: null, name: "Eduardo" };
  for (const arg of argv) {
    if (arg.startsWith("--tenant=")) args.tenant = arg.split("=").slice(1).join("=");
    else if (arg.startsWith("--email=")) args.email = arg.split("=").slice(1).join("=");
    else if (arg.startsWith("--password=")) args.password = arg.split("=").slice(1).join("=");
    else if (arg.startsWith("--name=")) args.name = arg.split("=").slice(1).join("=");
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.tenant || !args.email || !args.password) {
    console.error("Uso: node scripts/create_tenant_admin.js --tenant=SLUG --email=... --password=...");
    process.exit(1);
  }

  const email = args.email.trim().toLowerCase();
  const password = args.password.trim();
  if (password.length < 6) {
    throw new Error("Senha deve ter no mínimo 6 caracteres");
  }

  const client = await pool.connect();
  try {
    await client.query("SELECT set_config('app.bypass_rls', 'true', true)");
    const tenantRes = await client.query(
      "SELECT id, slug FROM tenants WHERE slug = $1 LIMIT 1",
      [args.tenant.trim().toLowerCase()],
    );
    if (!tenantRes.rows[0]) {
      throw new Error(`Tenant não encontrado: ${args.tenant}`);
    }
    const tenantId = tenantRes.rows[0].id;
    const hash = await bcrypt.hash(password, 10);

    const existingEmail = await client.query(
      `SELECT id, username, role FROM users
       WHERE tenant_id = $1 AND LOWER(TRIM(username)) = LOWER($2)`,
      [tenantId, email],
    );
    if (existingEmail.rows[0]) {
      await client.query(
        `UPDATE users SET password_hash = $1, role = 'admin', name = $2 WHERE id = $3`,
        [hash, args.name, existingEmail.rows[0].id],
      );
      console.log("Admin atualizado:", {
        ...existingEmail.rows[0],
        role: "admin",
      });
      return;
    }

    const legacy = await client.query(
      `SELECT id, username FROM users
       WHERE tenant_id = $1 AND LOWER(TRIM(username)) = 'eduardo'`,
      [tenantId],
    );
    if (legacy.rows[0]) {
      const updated = await client.query(
        `UPDATE users SET username = $1, password_hash = $2, role = 'admin', name = $3
         WHERE id = $4 RETURNING id, username, role`,
        [email, hash, args.name, legacy.rows[0].id],
      );
      console.log("Vendedor promovido a admin:", updated.rows[0]);
      return;
    }

    const inserted = await client.query(
      `INSERT INTO users (username, password_hash, role, name, tenant_id)
       VALUES ($1, $2, 'admin', $3, $4) RETURNING id, username, role`,
      [email, hash, args.name, tenantId],
    );
    console.log("Admin criado:", inserted.rows[0]);
  } finally {
    client.release();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
