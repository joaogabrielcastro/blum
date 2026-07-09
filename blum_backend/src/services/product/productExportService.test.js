const { buildCsvBuffer, buildExcelBuffer } = require("./productExportService");

describe("productExportService", () => {
  const sampleRows = [
    {
      codigo: "42009",
      nome: "Tinta, com vírgula",
      preco: 5.12,
      estoque: 0,
      estoque_minimo: 1,
      marca: "blumenau",
    },
  ];

  test("buildCsvBuffer inclui BOM e cabeçalhos", () => {
    const buffer = buildCsvBuffer(sampleRows);
    const text = buffer.toString("utf8");
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(text).toContain("codigo,nome,preco,estoque,estoque_minimo,marca");
    expect(text).toContain('"Tinta, com vírgula"');
    expect(text).toContain("42009");
  });

  test("buildExcelBuffer gera buffer xlsx", () => {
    const buffer = buildExcelBuffer(sampleRows);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(100);
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });
});
