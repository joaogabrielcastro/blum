/**
 * Remove todos os produtos das representadas indicadas (mantém as marcas).
 *
 * Uso:
 *   cd blum_backend
 *   node scripts/delete_products_by_brands.js
 *   node scripts/delete_products_by_brands.js --dry-run
 *   node scripts/delete_products_by_brands.js --confirm
 *   node scripts/delete_products_by_brands.js --brands="Bl1um Distribuição" --confirm
 *
 * Por padrão procura apenas: Bl1um Distribuição (e variantes próximas no catálogo brands).
 * Sem --confirm: apenas lista contagens. Com --confirm: apaga em transação.
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { Pool } = require("pg");

const DEFAULT_BRAND_HINTS = ["Bl1um Distribuição"];

function norm(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run");
  const confirm = process.argv.includes("--confirm");
  const tenantArg = process.argv.find((a) => a.startsWith("--tenant="));
  const brandsArg = process.argv.find((a) => a.startsWith("--brands="));
  const tenantId = tenantArg ? parseInt(tenantArg.split("=")[1], 10) : 1;
  const hints = brandsArg
    ? brandsArg
        .slice("--brands=".length)
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean)
    : DEFAULT_BRAND_HINTS;
  return { dryRun, confirm, tenantId, hints };
}

function hintMatchesBrand(hint, brandName) {
  const h = norm(hint);
  const b = norm(brandName);
  if (!h || !b) return false;
  if (b === h || b.includes(h) || h.includes(b)) return true;
  const hCore = h.replace(/[^a-z0-9]/g, "");
  const bCore = b.replace(/[^a-z0-9]/g, "");
  return hCore.length >= 4 && (bCore.includes(hCore) || hCore.includes(bCore));
}

async function main() {
  const { dryRun, confirm, tenantId, hints } = parseArgs();

  if (!process.env.DATABASE_URL) {
    console.error("Defina DATABASE_URL no .env do blum_backend.");
    process.exit(1);
  }

  if (!confirm && !dryRun) {
    console.log(
      "Modo pré-visualização (nada será apagado). Use --confirm para executar ou --dry-run para o mesmo sem DB write.\n",
    );
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const { rows: allBrands } = await client.query(
      `SELECT id, name FROM brands WHERE tenant_id = $1 ORDER BY name`,
      [tenantId],
    );

    const matchedBrands = allBrands.filter((b) =>
      hints.some((h) => hintMatchesBrand(h, b.name)),
    );

    if (matchedBrands.length === 0) {
      console.log("Nenhuma representada encontrada para os hints:");
      hints.forEach((h) => console.log(`  - ${h}`));
      console.log("\nRepresentadas disponíveis:");
      allBrands.forEach((b) => console.log(`  [${b.id}] ${b.name}`));
      process.exit(1);
    }

    const brandNames = matchedBrands.map((b) => b.name);
    const brandIds = matchedBrands.map((b) => b.id);

    console.log("Representadas que serão afetadas:");
    for (const b of matchedBrands) {
      const countRes = await client.query(
        `SELECT COUNT(*)::int AS c FROM products
         WHERE tenant_id = $1 AND (brand = $2 OR brand_id = $3)`,
        [tenantId, b.name, b.id],
      );
      console.log(`  [${b.id}] ${b.name} — ${countRes.rows[0].c} produto(s)`);
    }

    const totalRes = await client.query(
      `SELECT COUNT(*)::int AS c FROM products
       WHERE tenant_id = $1
         AND (
           brand = ANY($2::text[])
           OR brand_id = ANY($3::int[])
         )`,
      [tenantId, brandNames, brandIds],
    );
    const total = totalRes.rows[0].c;
    console.log(`\nTotal de produtos a remover: ${total}`);

    if (total === 0) {
      console.log("Nada a apagar.");
      return;
    }

    if (!confirm || dryRun) {
      console.log(
        "\nPara apagar de verdade: node scripts/delete_products_by_brands.js --confirm",
      );
      return;
    }

    await client.query("BEGIN");
    const deleted = await client.query(
      `DELETE FROM products
       WHERE tenant_id = $1
         AND (
           brand = ANY($2::text[])
           OR brand_id = ANY($3::int[])
         )
       RETURNING id`,
      [tenantId, brandNames, brandIds],
    );
    await client.query("COMMIT");

    console.log(`\n✅ ${deleted.rowCount} produto(s) removido(s).`);
    console.log(
      "As representadas foram mantidas; pode reimportar produtos e quantidades.",
    );
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Erro:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
