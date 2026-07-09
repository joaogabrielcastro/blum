jest.mock("../config/database", () => ({
  sql: jest.fn(),
  pool: { query: jest.fn() },
}));

const orderService = require("./orderService");
const { sql } = require("../config/database");

const authUser = { role: "admin", userId: 1, tenantId: 1 };

describe("orderService", () => {
  beforeEach(() => jest.clearAllMocks());

  test("findAll retorna lista vazia sem pedidos", async () => {
    sql.mockResolvedValueOnce([]);
    const rows = await orderService.findAll({ tenantId: 1, authUser });
    expect(rows).toEqual([]);
  });

  test("findById lança quando não existe", async () => {
    sql.mockResolvedValueOnce([]);
    await expect(orderService.findById(999, 1)).rejects.toThrow(/não encontrado/i);
  });

  test("updatePaymentMethod valida método permitido", async () => {
    await expect(
      orderService.updatePaymentMethod(1, "invalido", 1),
    ).rejects.toThrow(/pagamento/i);
  });

  test("delete lança quando pedido não existe", async () => {
    sql.mockResolvedValueOnce([]);
    await expect(orderService.delete(999, 1)).rejects.toThrow(/não encontrado/i);
  });
});
