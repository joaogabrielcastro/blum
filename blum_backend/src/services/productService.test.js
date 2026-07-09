jest.mock("../config/database", () => ({
  sql: jest.fn(),
}));

const productService = require("./productService");
const { sql } = require("../config/database");

describe("productService", () => {
  beforeEach(() => jest.clearAllMocks());

  test("resolveBrandName retorna nome da marca", async () => {
    sql.mockResolvedValueOnce([{ name: "Marca X" }]);
    const name = await productService.resolveBrandName(3, 1);
    expect(name).toBe("Marca X");
  });

  test("findById lança quando ausente", async () => {
    sql.mockResolvedValueOnce([]);
    await expect(productService.findById(999, 1)).rejects.toThrow(/não encontrado/i);
  });

  test("hasStock verifica quantidade", async () => {
    sql.mockResolvedValueOnce([{ stock: 5 }]);
    const ok = await productService.hasStock(1, 3, 1);
    expect(ok).toBe(true);
  });

  test("hasStock false quando stock insuficiente", async () => {
    sql.mockResolvedValueOnce([{ stock: 1 }]);
    const ok = await productService.hasStock(1, 3, 1);
    expect(ok).toBe(false);
  });
});
