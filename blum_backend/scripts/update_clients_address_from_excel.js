/**
 * Atualiza endereço dos clientes a partir de relatório Mercos (.xls/.xlsx).
 *
 * Colunas esperadas (linha de cabeçalho): Razão social | Telefones | Endereço principal | Cidade | Estado
 * Não há CNPJ na planilha — o pareamento é por nome (companyname), com aviso se houver 0 ou >1 cliente.
 *
 * Uso (usa DATABASE_URL do .env — aponte para PRD quando for o caso):
 *   cd blum_backend
 *   node scripts/update_clients_address_from_excel.js "C:/Users/.../relatorio.xls" --dry-run
 *   node scripts/update_clients_address_from_excel.js "C:/Users/.../relatorio.xls" --apply
 *   node scripts/update_clients_address_from_excel.js "./rel.xls" --apply --with-phone
 *
 * --dry-run  : só consulta e mostra o que seria atualizado (recomendado antes do --apply)
 * --apply    : executa UPDATE no banco
 * --with-phone : também grava o telefone da planilha em `phone`
 * --header-row=N : linha 1-based do cabeçalho (padrão: 5, para o export testado)
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const { Pool } = require("pg");
const XLSX = require("xlsx");

function parseArgs(argv) {
  const dryRun = argv.includes("--dry-run");
  const apply = argv.includes("--apply");
  const withPhone = argv.includes("--with-phone");
  const headerArg = argv.find((a) => a.startsWith("--header-row="));
  const headerRow1Based = headerArg
    ? parseInt(headerArg.slice("--header-row=".length), 10)
    : 5;
  const positional = argv.filter(
    (a) =>
      ![
        "--dry-run",
        "--apply",
        "--with-phone",
      ].includes(a) && !a.startsWith("--header-row="),
  );
  return {
    dryRun: dryRun || !apply,
    apply,
    withPhone,
    headerRow1Based: Number.isFinite(headerRow1Based) ? headerRow1Based : 5,
    filePath: positional[0],
  };
}

/** Separa logradouro e número pelo último trecho após vírgula que parece número/SN. */
function splitStreetNumber(endereco) {
  const s = String(endereco || "").trim();
  if (!s) return { street: null, number: null };
  const lastComma = s.lastIndexOf(",");
  if (lastComma === -1) return { street: s, number: null };
  const right = s.slice(lastComma + 1).trim();
  const left = s.slice(0, lastComma).trim();
  const looksLikeNum =
    /^\d/.test(right) ||
    /^s\/?n\b/i.test(right) ||
    /^km\s*\d/i.test(right) ||
    /^n[ºo]?\s*\d/i.test(right);
  if (looksLikeNum && left.length > 0) {
    return { street: left, number: right };
  }
  return { street: s, number: null };
}

function normKey(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

async function main() {
  const { dryRun, apply, withPhone, headerRow1Based, filePath } = parseArgs(
    process.argv.slice(2),
  );

  if (!filePath || !fs.existsSync(filePath)) {
    console.error(
      "Uso: node scripts/update_clients_address_from_excel.js <arquivo.xls> [--dry-run] [--apply] [--with-phone] [--header-row=5]",
    );
    process.exit(1);
  }

  if (apply && dryRun) {
    console.error("Use apenas um: --dry-run (padrão) ou --apply");
    process.exit(1);
  }

  const wb = XLSX.readFile(filePath, { cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  const hi = Math.max(0, headerRow1Based - 1);
  const header = (rows[hi] || []).map((c) => String(c ?? "").trim());
  const dataRows = rows.slice(hi + 1).filter((r) => r.some((c) => String(c ?? "").trim()));

  const idxRazao = header.findIndex((h) => normKey(h).includes("razao"));
  const idxTel = header.findIndex(
    (h) => normKey(h).includes("telefone") || normKey(h) === "telefones",
  );
  const idxEnd = header.findIndex(
    (h) =>
      normKey(h).includes("endereco") || normKey(h).includes("principal"),
  );
  const idxCidade = header.findIndex(
    (h) => normKey(h) === "cidade" || normKey(h).includes("municipio"),
  );
  const idxUf = header.findIndex(
    (h) =>
      normKey(h) === "estado" ||
      normKey(h) === "uf" ||
      normKey(h).includes("estado"),
  );

  if (idxRazao < 0 || idxEnd < 0) {
    console.error(
      "Cabeçalho não reconhecido. Encontrado:",
      header.join(" | "),
    );
    console.error(
      "Ajuste --header-row=N (1-based) para a linha com 'Razão social' e 'Endereço principal'.",
    );
    process.exit(1);
  }

  console.log(
    `Folha: "${wb.SheetNames[0]}" | Cabeçalho linha ${headerRow1Based} | Linhas de dados: ${dataRows.length}`,
  );
  console.log(
    `Colunas: razão[${idxRazao}] tel[${idxTel}] end[${idxEnd}] cidade[${idxCidade}] uf[${idxUf}]`,
  );

  if (!process.env.DATABASE_URL || !String(process.env.DATABASE_URL).trim()) {
    console.error("Defina DATABASE_URL no blum_backend/.env (ex.: URL de PRD).");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  let updated = 0;
  let skippedNoMatch = 0;
  let skippedAmbiguous = 0;
  let skippedEmptyName = 0;
  let errors = 0;

  const previewLimit = 15;
  let previewed = 0;

  try {
    if (apply) {
      await client.query("BEGIN");
    }

    for (const row of dataRows) {
      const razao = String(row[idxRazao] ?? "").trim();
      if (!razao) {
        skippedEmptyName++;
        continue;
      }

      const endRaw = idxEnd >= 0 ? String(row[idxEnd] ?? "").trim() : "";
      const cidade =
        idxCidade >= 0 ? String(row[idxCidade] ?? "").trim() : "";
      const uf = idxUf >= 0 ? String(row[idxUf] ?? "").trim().slice(0, 2) : "";
      const tel =
        idxTel >= 0 ? String(row[idxTel] ?? "").trim() : "";

      const { street, number } = splitStreetNumber(endRaw);

      const found = await client.query(
        `SELECT id, companyname FROM clients
         WHERE lower(trim(companyname)) = lower(trim($1))`,
        [razao],
      );

      if (found.rows.length === 0) {
        skippedNoMatch++;
        if (previewed < previewLimit) {
          console.warn("[sem match]", razao.slice(0, 80));
          previewed++;
        }
        continue;
      }

      if (found.rows.length > 1) {
        skippedAmbiguous++;
        console.warn(
          "[duplicado nome]",
          razao.slice(0, 60),
          "ids:",
          found.rows.map((r) => r.id).join(","),
        );
        continue;
      }

      const id = found.rows[0].id;

      if (!apply) {
        updated++;
        if (previewed < previewLimit) {
          console.log(
            "[dry-run ok]",
            { id, razao: razao.slice(0, 50), street, number, cidade, uf },
          );
          previewed++;
        }
        continue;
      }

      try {
        const sets = [
          "street = $2",
          "number = $3",
          "city = $4",
          "region = $5",
        ];
        const vals = [id, street, number, cidade || null, uf || null];
        let p = 6;
        if (withPhone && tel) {
          sets.push(`phone = $${p}`);
          vals.push(tel);
          p++;
        }
        await client.query(
          `UPDATE clients SET ${sets.join(", ")} WHERE id = $1`,
          vals,
        );
        updated++;
      } catch (e) {
        errors++;
        console.error("UPDATE falhou id=", id, razao, e.message);
      }
    }

    if (apply) {
      await client.query("COMMIT");
    }
  } catch (e) {
    if (apply) {
      await client.query("ROLLBACK");
    }
    throw e;
  } finally {
    client.release();
    await pool.end();
  }

  const mode = apply ? "APLICADO" : "DRY-RUN (sem gravação)";
  console.log(`\n--- ${mode} ---`);
  console.log(
    apply ? `Atualizados: ${updated}` : `Seriam atualizados: ${updated}`,
  );
  console.log("Sem cliente com mesmo nome:", skippedNoMatch);
  console.log("Nomes duplicados no banco (ignorados):", skippedAmbiguous);
  console.log("Linhas sem razão social:", skippedEmptyName);
  console.log("Erros:", errors);
  if (!apply) {
    console.log(
      "\nPara gravar no banco apontado por DATABASE_URL, rode de novo com --apply",
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
