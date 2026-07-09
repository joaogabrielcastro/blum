const fs = require("fs");
const path = require("path");
const {
  parseSpreadsheetBuffer,
  parseCsvBuffer,
  normalizeProductCode,
  generateAutoCode,
} = require("./productSpreadsheetParser");

const FIXTURES_DIR = path.resolve(
  __dirname,
  "../../../../../produtos blum",
);

function readFixture(name) {
  const filePath = path.join(FIXTURES_DIR, name);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

describe("productSpreadsheetParser", () => {
  test("normalizeProductCode remove sufixo .0", () => {
    expect(normalizeProductCode("42009.0")).toBe("42009");
    expect(normalizeProductCode("W0106-AM")).toBe("W0106-AM");
  });

  test("generateAutoCode gera prefixo", () => {
    const code = generateAutoCode("Frete por saca", "FRT");
    expect(code).toMatch(/^FRT_/);
  });

  test("parseCsvBuffer perfil generic com cabeçalhos PT", () => {
    const csv = [
      "codigo,nome,preco,estoque,marca",
      "ABC001,Produto Teste,10.5,3,zagonel",
    ].join("\n");
    const result = parseCsvBuffer(Buffer.from(csv, "utf8"));
    expect(result.profile).toBe("generic");
    expect(result.products).toHaveLength(1);
    expect(result.products[0]).toMatchObject({
      productCode: "ABC001",
      name: "Produto Teste",
      price: 10.5,
      stock: 3,
    });
  });

  test("parseCsvBuffer remove BOM UTF-8", () => {
    const csv = "\uFEFFcodigo,nome,preco,estoque\nX1,Item,1,0";
    const result = parseCsvBuffer(Buffer.from(csv, "utf8"));
    expect(result.products[0].productCode).toBe("X1");
  });

  test("parseCsvBuffer aceita delimitador ponto-e-vírgula", () => {
    const csv = "codigo;nome;preco;estoque\nS1;Produto;9,99;2";
    const result = parseCsvBuffer(Buffer.from(csv, "utf8"));
    expect(result.products).toHaveLength(1);
    expect(result.products[0].productCode).toBe("S1");
  });

  test("parseCsvBuffer gera código quando ausente", () => {
    const csv = "codigo,nome,preco,estoque\n,Produto sem codigo,5,1";
    const result = parseCsvBuffer(Buffer.from(csv, "utf8"), {
      codePrefix: "TST",
    });
    expect(result.products).toHaveLength(1);
    expect(result.products[0].productCode).toMatch(/^TST_/);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  test("parseCsvBuffer permite estoque zero", () => {
    const csv = "codigo,nome,preco,estoque\nF1,Frete,145,0";
    const result = parseCsvBuffer(Buffer.from(csv, "utf8"));
    expect(result.products[0].stock).toBe(0);
  });

  test("fixture zagonel.csv real", () => {
    const buffer = readFixture("zagonel.csv");
    if (!buffer) {
      console.warn("Fixture zagonel.csv não encontrada — teste ignorado.");
      return;
    }
    const result = parseSpreadsheetBuffer(buffer, { filename: "zagonel.csv" });
    expect(result.profile).toBe("generic");
    expect(result.products.length).toBeGreaterThan(10);
    expect(result.products[0].productCode).toBeTruthy();
    expect(result.products[0].name).toBeTruthy();
  });

  test("fixture frete.csv real com estoque zero", () => {
    const buffer = readFixture("frete.csv");
    if (!buffer) {
      console.warn("Fixture frete.csv não encontrada — teste ignorado.");
      return;
    }
    const result = parseSpreadsheetBuffer(buffer, { filename: "frete.csv" });
    expect(result.products.length).toBeGreaterThan(0);
    expect(result.products.every((p) => p.stock === 0)).toBe(true);
  });

  test("fixture exportacao_produtos normaliza codigos numericos", () => {
    const buffer = readFixture("exportacao_produtos_2026-06-26_10-29-46.csv");
    if (!buffer) {
      console.warn("Fixture exportacao não encontrada — teste ignorado.");
      return;
    }
    const result = parseSpreadsheetBuffer(buffer, {
      filename: "exportacao_produtos_2026-06-26_10-29-46.csv",
    });
    expect(result.products.length).toBeGreaterThan(10);
    const withNumeric = result.products.find((p) => p.productCode === "42009");
    expect(withNumeric).toBeTruthy();
    expect(withNumeric.name).toContain("MASSA ACRILICA");
  });
});
