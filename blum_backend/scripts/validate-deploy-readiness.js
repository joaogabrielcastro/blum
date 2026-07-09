#!/usr/bin/env node
/**
 * Valida variáveis críticas e conectividade antes do deploy.
 * Uso: node scripts/validate-deploy-readiness.js
 */
require("dotenv").config();

const REQUIRED = [
  "DATABASE_URL",
  "JWT_SECRET",
  "FRONTEND_URL",
  "TENANT_BASE_DOMAIN",
];

const STRIPE_RECOMMENDED = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_STARTER",
  "STRIPE_PRICE_PROFESSIONAL",
  "STRIPE_PRICE_ENTERPRISE",
];

function check(name, value, minLen = 1) {
  const ok = value && String(value).trim().length >= minLen;
  return { name, ok, value: ok ? "(definido)" : "(ausente)" };
}

async function main() {
  const results = [];

  for (const key of REQUIRED) {
    results.push(check(key, process.env[key]));
  }

  results.push(check("JWT_SECRET", process.env.JWT_SECRET, 32));

  for (const key of STRIPE_RECOMMENDED) {
    results.push({ name: key, ok: Boolean(process.env[key]), value: process.env[key] ? "(definido)" : "(ausente)" });
  }

  const billingEnforce = process.env.BILLING_ENFORCE === "true";
  results.push({
    name: "BILLING_ENFORCE",
    ok: true,
    value: billingEnforce ? "true (ativo)" : "false (recomendado até validar webhook)",
  });

  console.log("\n=== Blum deploy readiness ===\n");
  let failed = 0;
  for (const r of results) {
    const icon = r.ok ? "OK" : "FALTA";
    if (!r.ok && REQUIRED.includes(r.name)) failed += 1;
    console.log(`[${icon}] ${r.name}: ${r.value}`);
  }

  if (process.env.DATABASE_URL) {
    try {
      const { pool } = require("../src/config/database");
      const client = await pool.connect();
      const mig = await client.query(
        "SELECT filename FROM schema_migrations WHERE filename IN ($1, $2, $3, $4) ORDER BY filename",
        [
          "025_tenant_onboarding.sql",
          "026_platform_admin.sql",
          "027_row_level_security.sql",
          "028_sales_targets_tenant_fk.sql",
        ],
      );
      client.release();
      console.log("\nMigrations recentes aplicadas:", mig.rows.map((r) => r.filename).join(", ") || "(nenhuma)");
    } catch (e) {
      console.warn("\nAviso: não foi possível verificar Postgres:", e.message);
    }
  }

  console.log("\nDocumentação: docs/DEPLOY.md\n");
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
