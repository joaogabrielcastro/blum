/**
 * Padroniza usernames de um tenant para e-mails @dominio (ex.: siane → siane@blu1m.com).
 *
 * Uso:
 *   node scripts/normalize_tenant_emails.js --tenant=blu1m --domain=blu1m.com --dry-run
 *   node scripts/normalize_tenant_emails.js --tenant=blu1m --domain=blu1m.com
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { pool } = require("../src/config/database");

function parseArgs(argv) {
  const args = {
    tenant: null,
    domain: null,
    dryRun: false,
  };

  for (const arg of argv) {
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg.startsWith("--tenant=")) {
      args.tenant = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--domain=")) {
      args.domain = arg.split("=").slice(1).join("=");
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    }
  }

  return args;
}

function normalizeEmailLocalPart(username) {
  const raw = String(username || "").trim().toLowerCase();
  if (!raw) return "";
  const at = raw.indexOf("@");
  return (at >= 0 ? raw.slice(0, at) : raw).replace(/[^a-z0-9._+-]/g, "");
}

function buildTenantEmail(username, domain) {
  const local = normalizeEmailLocalPart(username);
  const dom = String(domain || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");
  if (!local || !dom || !dom.includes(".")) {
    return null;
  }
  return `${local}@${dom}`;
}

function planEmailUpdates(users, domain) {
  const planned = [];
  const targets = new Map();

  for (const user of users) {
    const current = String(user.username || "").trim().toLowerCase();
    const targetEmail = buildTenantEmail(user.username, domain);

    if (!targetEmail) {
      planned.push({
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        targetEmail: null,
        action: "invalid",
      });
      continue;
    }

    if (current === targetEmail) {
      planned.push({
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        targetEmail,
        action: "skip",
      });
      continue;
    }

    planned.push({
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      targetEmail,
      action: "update",
    });

    const bucket = targets.get(targetEmail) || [];
    bucket.push(user.id);
    targets.set(targetEmail, bucket);
  }

  const conflicts = [...targets.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([email, ids]) => ({ email, userIds: ids }));

  return { planned, conflicts };
}

async function normalizeTenantEmails(options) {
  const tenantSlug = String(options.tenant || "").trim().toLowerCase();
  const domain = String(options.domain || "").trim().toLowerCase().replace(/^@+/, "");

  if (!tenantSlug) {
    throw new Error("--tenant é obrigatório");
  }
  if (!domain) {
    throw new Error("--domain é obrigatório (ex.: blu1m.com)");
  }

  const client = await pool.connect();
  try {
    await client.query("SELECT set_config('app.bypass_rls', 'true', true)");

    const tenantRes = await client.query(
      "SELECT id, slug, name FROM tenants WHERE slug = $1 LIMIT 1",
      [tenantSlug],
    );
    const tenant = tenantRes.rows[0];
    if (!tenant) {
      throw new Error(`Tenant não encontrado: ${tenantSlug}`);
    }

    const usersRes = await client.query(
      `SELECT id, username, role, name, COALESCE(is_platform_admin, false) AS is_platform_admin
       FROM users
       WHERE tenant_id = $1
       ORDER BY id ASC`,
      [tenant.id],
    );

    const users = usersRes.rows.filter((u) => !u.is_platform_admin);
    const skippedPlatform = usersRes.rows.length - users.length;
    const { planned, conflicts } = planEmailUpdates(users, domain);

    console.log(`\nTenant: ${tenant.name} (${tenant.slug})`);
    console.log(`Domínio alvo: @${domain}`);
    if (skippedPlatform > 0) {
      console.log(`Platform admins ignorados: ${skippedPlatform}`);
    }

    console.log("\n--- Plano ---\n");
    for (const row of planned) {
      if (row.action === "skip") {
        console.log(`= ${row.username} (já padronizado)`);
      } else if (row.action === "invalid") {
        console.log(`! ${row.username} → não foi possível gerar e-mail`);
      } else {
        console.log(`→ ${row.username} → ${row.targetEmail} [${row.role}]`);
      }
    }

    if (conflicts.length > 0) {
      console.error("\n❌ Conflitos detectados (dois users para o mesmo e-mail):");
      for (const c of conflicts) {
        console.error(`   ${c.email} ← user ids: ${c.userIds.join(", ")}`);
      }
      throw new Error("Corrija conflitos antes de aplicar.");
    }

    const toUpdate = planned.filter((p) => p.action === "update");
    if (toUpdate.length === 0) {
      console.log("\nNada a alterar.\n");
      return { updated: 0, skipped: planned.filter((p) => p.action === "skip").length };
    }

    if (options.dryRun) {
      console.log(`\n--dry-run: ${toUpdate.length} utilizador(es) seriam atualizados.\n`);
      return { dryRun: true, wouldUpdate: toUpdate.length };
    }

    await client.query("BEGIN");
    for (const row of toUpdate) {
      const taken = await client.query(
        `SELECT id FROM users
         WHERE tenant_id = $1 AND LOWER(TRIM(username)) = LOWER($2) AND id <> $3
         LIMIT 1`,
        [tenant.id, row.targetEmail, row.id],
      );
      if (taken.rows[0]) {
        throw new Error(
          `E-mail ${row.targetEmail} já está em uso por outro utilizador (id=${taken.rows[0].id})`,
        );
      }

      await client.query(`UPDATE users SET username = $1 WHERE id = $2`, [
        row.targetEmail,
        row.id,
      ]);
    }
    await client.query("COMMIT");

    console.log(`\n✅ ${toUpdate.length} utilizador(es) atualizados.\n`);
    return { updated: toUpdate.length };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.tenant) {
    console.log(`
Uso: node scripts/normalize_tenant_emails.js --tenant=SLUG --domain=dominio.com [opções]

Opções:
  --domain=blu1m.com   Domínio dos e-mails (sem @)
  --dry-run            Só mostra o plano
  --help               Esta ajuda

Exemplo:
  node scripts/normalize_tenant_emails.js --tenant=blu1m --domain=blu1m.com --dry-run
`);
    process.exit(args.help ? 0 : 1);
  }

  await normalizeTenantEmails(args);
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌", err.message || err);
      process.exit(1);
    });
}

module.exports = {
  parseArgs,
  normalizeEmailLocalPart,
  buildTenantEmail,
  planEmailUpdates,
  normalizeTenantEmails,
};
