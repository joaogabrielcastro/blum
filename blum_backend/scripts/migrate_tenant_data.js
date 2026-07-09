/**
 * Migra dados operacionais de um tenant para outro (cenário B: default → cliente dedicado).
 *
 * Mantém utilizadores com is_platform_admin=true no tenant de origem (ex.: gestão /platform).
 * Move clientes, produtos, pedidos, marcas, vendedores e restantes dados do tenant.
 *
 * Uso:
 *   cd blum_backend
 *   node scripts/migrate_tenant_data.js --slug=representada-x --name="Representada X" --dry-run
 *   node scripts/migrate_tenant_data.js --slug=representada-x --name="Representada X"
 *
 * Opções:
 *   --source-slug=default     Tenant de origem (default)
 *   --rename-source="..."       Renomeia o tenant de origem após migração
 *   --dry-run                   Só mostra contagens, não altera dados
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { pool } = require("../src/config/database");
const { validateTenantSlug } = require("../src/utils/tenantSlug");

/** Tabelas com tenant_id migradas em bloco (origem → destino). */
const TENANT_SCOPED_TABLES = [
  "clients",
  "products",
  "brands",
  "orders",
  "order_items",
  "price_history",
  "user_allowed_brands",
  "audit_logs",
  "sales_targets",
  "monthly_sales_summary",
];

function parseArgs(argv) {
  const args = {
    slug: null,
    name: null,
    sourceSlug: "default",
    renameSource: null,
    dryRun: false,
  };

  for (const arg of argv) {
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg.startsWith("--slug=")) args.slug = arg.split("=").slice(1).join("=");
    else if (arg.startsWith("--name=")) args.name = arg.split("=").slice(1).join("=");
    else if (arg.startsWith("--source-slug=")) {
      args.sourceSlug = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--rename-source=")) {
      args.renameSource = arg.split("=").slice(1).join("=");
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    }
  }

  return args;
}

async function getTenantBySlug(client, slug) {
  const result = await client.query(
    `SELECT id, slug, name, status FROM tenants WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  return result.rows[0] || null;
}

async function countRows(client, table, tenantId) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS c FROM ${table} WHERE tenant_id = $1`,
    [tenantId],
  );
  return result.rows[0]?.c ?? 0;
}

async function countUsersToMove(client, sourceId) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS c FROM users
     WHERE tenant_id = $1 AND COALESCE(is_platform_admin, false) = false`,
    [sourceId],
  );
  return result.rows[0]?.c ?? 0;
}

async function countPlatformAdmins(client, sourceId) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS c FROM users
     WHERE tenant_id = $1 AND is_platform_admin = true`,
    [sourceId],
  );
  return result.rows[0]?.c ?? 0;
}

async function printDryRunReport(client, sourceId, targetId) {
  const usersToMove = await countUsersToMove(client, sourceId);
  const platformAdmins = await countPlatformAdmins(client, sourceId);

  console.log("\n--- Pré-visualização da migração ---\n");
  console.log(`Utilizadores a mover (não platform admin): ${usersToMove}`);
  console.log(`Platform admins que ficam na origem: ${platformAdmins}`);

  for (const table of TENANT_SCOPED_TABLES) {
    const count = await countRows(client, table, sourceId);
    if (count > 0) {
      console.log(`${table}: ${count} linha(s)`);
    }
  }

  if (targetId) {
    console.log(`\nDestino existente: tenant_id=${targetId}`);
  } else {
    console.log("\nDestino: será criado um tenant novo.");
  }
}

async function migrateTenantData(options) {
  const slugValidation = validateTenantSlug(options.slug);
  if (!slugValidation.ok) {
    throw new Error(slugValidation.error);
  }
  const targetSlug = slugValidation.slug;

  if (targetSlug === options.sourceSlug) {
    throw new Error("O slug de destino não pode ser igual ao de origem.");
  }

  const companyName = String(options.name || "").trim();
  if (companyName.length < 2) {
    throw new Error("--name é obrigatório (mínimo 2 caracteres).");
  }

  const client = await pool.connect();
  try {
    const source = await getTenantBySlug(client, options.sourceSlug);
    if (!source) {
      throw new Error(`Tenant de origem não encontrado: ${options.sourceSlug}`);
    }

    let target = await getTenantBySlug(client, targetSlug);

    if (options.dryRun) {
      await printDryRunReport(client, source.id, target?.id ?? null);
      console.log("\n--dry-run: nenhuma alteração aplicada.\n");
      return { dryRun: true, source, targetSlug, companyName };
    }

    await client.query("BEGIN");
    await client.query("SELECT set_config('app.bypass_rls', 'true', true)");

    if (!target) {
      const inserted = await client.query(
        `INSERT INTO tenants (slug, name, status, onboarding_completed_at)
         VALUES ($1, $2, 'active', NOW())
         RETURNING id, slug, name`,
        [targetSlug, companyName],
      );
      target = inserted.rows[0];
      console.log(`+ Tenant criado: ${target.slug} (id=${target.id})`);
    } else {
      console.log(`✓ Tenant destino já existe: ${target.slug} (id=${target.id})`);
    }

    const usersResult = await client.query(
      `UPDATE users
       SET tenant_id = $1
       WHERE tenant_id = $2 AND COALESCE(is_platform_admin, false) = false
       RETURNING id`,
      [target.id, source.id],
    );
    console.log(`✓ Utilizadores migrados: ${usersResult.rowCount}`);

    for (const table of TENANT_SCOPED_TABLES) {
      const result = await client.query(
        `UPDATE ${table} SET tenant_id = $1 WHERE tenant_id = $2`,
        [target.id, source.id],
      );
      if (result.rowCount > 0) {
        console.log(`✓ ${table}: ${result.rowCount} linha(s)`);
      }
    }

    const tokensResult = await client.query(
      `UPDATE auth_refresh_tokens art
       SET tenant_id = $1
       FROM users u
       WHERE art.user_id = u.id AND u.tenant_id = $1 AND art.tenant_id = $2`,
      [target.id, source.id],
    );
    if (tokensResult.rowCount > 0) {
      console.log(`✓ auth_refresh_tokens: ${tokensResult.rowCount} linha(s)`);
    }

    if (options.renameSource) {
      await client.query(`UPDATE tenants SET name = $1 WHERE id = $2`, [
        options.renameSource,
        source.id,
      ]);
      console.log(`✓ Tenant origem renomeado: "${options.renameSource}"`);
    }

    await client.query("COMMIT");

    console.log(`
✅ Migração concluída.

Origem:  ${source.slug} (id=${source.id}) — dados operacionais movidos; platform admin mantido.
Destino: ${target.slug} (id=${target.id}) — ${companyName}

Login da cliente:
  URL: https://${target.slug}.blum.jwsoftware.com.br/login
  ou blum.jwsoftware.com.br/login com identificador "${target.slug}"

Gestão SaaS (você): continue com admin platform em /platform no tenant "${source.slug}".
`);
    return { source, target };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.slug) {
    console.log(`
Uso: node scripts/migrate_tenant_data.js --slug=SLUG --name="Nome da empresa" [opções]

Opções:
  --source-slug=default       Tenant de origem (default: default)
  --rename-source="..."       Nome do tenant origem após migração
  --dry-run                   Apenas pré-visualizar
  --help                      Esta ajuda

Exemplo:
  node scripts/migrate_tenant_data.js --slug=minha-representada --name="Minha Representada Ltda" --dry-run
`);
    process.exit(args.help ? 0 : 1);
  }

  await migrateTenantData(args);
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
  TENANT_SCOPED_TABLES,
  migrateTenantData,
};
