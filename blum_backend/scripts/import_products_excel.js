/**
 * Importa produtos de .xls / .xlsx / .csv para a tabela `products`.
 *
 * Uso:
 *   cd blum_backend
 *   node scripts/import_products_excel.js "./planilha.xlsx" --brand-id=1
 *   node scripts/import_products_excel.js "./arquivo.csv" --brand-id=1 --dry-run
 *   node scripts/import_products_excel.js "./export.xlsx" --brand-id=2 --stock-mode=add
 *   node scripts/import_products_excel.js "./export.xlsx" --brand-id=1 --tenant-id=1
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const { parseSpreadsheetBuffer } = require("../src/services/product/productSpreadsheetParser");
const productCatalogImportService = require("../src/services/product/productCatalogImportService");

function parseArgs(argv) {
  const args = {
    file: null,
    dryRun: false,
    brandId: null,
    tenantId: null,
    stockMode: "replace",
  };

  for (const arg of argv) {
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg.startsWith("--brand-id=")) args.brandId = arg.split("=")[1];
    else if (arg.startsWith("--tenant-id=")) args.tenantId = arg.split("=")[1];
    else if (arg.startsWith("--stock-mode=")) {
      args.stockMode = arg.split("=")[1];
    } else if (!arg.startsWith("--") && !args.file) {
      args.file = arg;
    }
  }

  return args;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes("--help")) {
    console.log(
      "Uso: node scripts/import_products_excel.js <arquivo.csv|.xlsx|.xls> --brand-id=N [--tenant-id=N] [--stock-mode=replace|add] [--dry-run]",
    );
    process.exit(argv.includes("--help") ? 0 : 1);
  }

  const args = parseArgs(argv);
  if (!args.file) {
    console.error("Informe o caminho do arquivo.");
    process.exit(1);
  }

  const absPath = path.resolve(args.file);
  if (!fs.existsSync(absPath)) {
    console.error(`Arquivo não encontrado: ${absPath}`);
    process.exit(1);
  }

  const buffer = fs.readFileSync(absPath);
  const parsed = parseSpreadsheetBuffer(buffer, {
    filename: path.basename(absPath),
  });

  console.log(`Perfil detectado: ${parsed.profile}`);
  console.log(`Produtos válidos: ${parsed.products.length}`);
  if (parsed.warnings.length) {
    console.log("Avisos:");
    for (const w of parsed.warnings.slice(0, 10)) console.log(`  - ${w}`);
    if (parsed.warnings.length > 10) {
      console.log(`  … e mais ${parsed.warnings.length - 10}`);
    }
  }

  if (parsed.products.length === 0) {
    process.exit(1);
  }

  const previewItems = parsed.products.map((p) => ({
    productCode: p.productCode,
    description: p.name,
    quantity: p.stock,
    unitPrice: p.price,
    minStock: p.minStock ?? 0,
  }));

  if (args.dryRun) {
    console.log("\n--dry-run: nenhuma alteração no banco.");
    console.log("Primeiras linhas:");
    for (const row of previewItems.slice(0, 5)) {
      console.log(
        `  ${row.productCode} | ${row.description.slice(0, 40)} | est=${row.quantity} | R$ ${row.unitPrice}`,
      );
    }
    process.exit(0);
  }

  if (!args.brandId) {
    console.error("--brand-id é obrigatório (exceto com --dry-run).");
    process.exit(1);
  }

  const tenantId =
    args.tenantId != null
      ? parseInt(args.tenantId, 10)
      : parseInt(process.env.DEFAULT_TENANT_ID || "1", 10);

  const result = await productCatalogImportService.finalizeImport({
    tenantId,
    brandId: args.brandId,
    items: previewItems,
    stockMode: args.stockMode === "add" ? "add" : "replace",
    recordPriceHistory: args.stockMode === "add",
  });

  console.log(result.message);
  console.log(`Criados: ${result.created}, Atualizados: ${result.updated}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
