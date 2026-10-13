const { validateFileContent } = require("./upload");

describe("validateFileContent", () => {
  test("aceita PDF com assinatura real", () => {
    expect(() =>
      validateFileContent(
        { originalname: "pedido.pdf", buffer: Buffer.from("%PDF-1.7\n") },
        ["pdf"],
      ),
    ).not.toThrow();
  });

  test("rejeita executável renomeado para PDF", () => {
    expect(() =>
      validateFileContent(
        { originalname: "pedido.pdf", buffer: Buffer.from("MZfake") },
        ["pdf"],
      ),
    ).toThrow(/conteúdo/i);
  });

  test("não aceita PDF no endpoint CSV", () => {
    expect(() =>
      validateFileContent(
        { originalname: "pedido.csv", buffer: Buffer.from("%PDF-1.7\n") },
        ["csv"],
      ),
    ).toThrow(/conteúdo/i);
  });

  test("aceita assinaturas XLSX e XLS", () => {
    expect(() =>
      validateFileContent(
        { originalname: "itens.xlsx", buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04]) },
        ["xlsx"],
      ),
    ).not.toThrow();
    expect(() =>
      validateFileContent(
        {
          originalname: "itens.xls",
          buffer: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
        },
        ["xls"],
      ),
    ).not.toThrow();
  });
});
