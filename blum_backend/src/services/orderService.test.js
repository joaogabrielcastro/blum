jest.mock("../config/database", () => ({
  sql: jest.fn(),
  pool: { query: jest.fn(), connect: jest.fn() },
}));

const orderService = require("./orderService");
const { sql, pool } = require("../config/database");

const authUser = { role: "admin", userId: 1, tenantId: 1 };

describe("orderService", () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

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

  test("updateStatus não permite contornar a baixa de estoque", async () => {
    await expect(orderService.updateStatus(1, "Entregue", 1)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(sql).not.toHaveBeenCalled();
  });

  test("finalize faz rollback quando o estoque é insuficiente", async () => {
    jest.spyOn(orderService, "findById").mockResolvedValueOnce({
      id: 8,
      document_type: "pedido",
    });
    const client = { query: jest.fn(), release: jest.fn() };
    pool.connect.mockResolvedValueOnce(client);
    const repository = require("../repositories/orderRepository");
    jest.spyOn(repository, "markOrderDelivered").mockResolvedValueOnce([{ id: 8 }]);
    jest.spyOn(repository, "getOrderLinesForStock").mockResolvedValueOnce([
      { product_id: 5, quantity: 2, brand: "Marca" },
    ]);
    jest.spyOn(repository, "decreaseProductStock").mockResolvedValueOnce([]);

    await expect(orderService.finalize(8, 1)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(client.query).not.toHaveBeenCalledWith("COMMIT");
    expect(client.release).toHaveBeenCalled();
  });

  test("vendedor usa preço, nome e marca oficiais do catálogo", () => {
    const productMap = new Map([
      ["5", { name: "Produto oficial", brand: "Marca oficial", brandId: 9, price: 25 }],
    ]);
    const [item] = orderService.reconcileItemsWithCatalog(
      [{ productId: 5, productName: "Falso", brand: "Outra", price: 1 }],
      productMap,
    );

    expect(item).toMatchObject({
      productName: "Produto oficial",
      brand: "Marca oficial",
      brandId: 9,
      price: 25,
    });
  });

  test("admin pode negociar somente o preço unitário", () => {
    const productMap = new Map([
      ["5", { name: "Produto oficial", brand: "Marca oficial", brandId: 9, price: 25 }],
    ]);
    const [item] = orderService.reconcileItemsWithCatalog(
      [{ productId: 5, productName: "Falso", brand: "Outra", price: 18.5 }],
      productMap,
      { canOverridePrice: true },
    );

    expect(item).toMatchObject({
      productName: "Produto oficial",
      brand: "Marca oficial",
      brandId: 9,
      price: 18.5,
    });
  });

  test("create faz rollback integral quando falha ao persistir itens", async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 10 }] })
        .mockResolvedValueOnce({ rows: [{ id: 99 }] })
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };
    pool.connect.mockResolvedValueOnce(client);
    jest.spyOn(orderService, "loadProductStockMap").mockResolvedValueOnce(
      new Map([["5", { stock: 10, name: "Produto" }]]),
    );
    jest.spyOn(orderService, "calculateItemsCommission").mockResolvedValueOnce({
      finalTotal: 10,
      totalCommission: 1,
      items: [{ productId: 5, productName: "Produto", brand: "Marca", quantity: 1, price: 10 }],
    });
    jest
      .spyOn(orderService, "persistOrderItemsWithClient")
      .mockRejectedValueOnce(new Error("falha nas linhas"));

    await expect(
      orderService.create(
        {
          clientid: 10,
          userid: 1,
          items: [{ productId: 5, productName: "Produto", brand: "Marca", quantity: 1, price: 10 }],
          document_type: "orcamento",
          clientRequestId: "request_12345678",
        },
        authUser,
      ),
    ).rejects.toThrow("falha nas linhas");

    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(client.query).not.toHaveBeenCalledWith("COMMIT");
    expect(client.release).toHaveBeenCalled();
  });
});
