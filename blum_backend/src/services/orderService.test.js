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

  test("updateStatus não permite contornar a finalização da entrega", async () => {
    await expect(orderService.updateStatus(1, "Entregue", 1)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(sql).not.toHaveBeenCalled();
  });

  test("finalize apenas marca a entrega, sem baixar estoque novamente", async () => {
    jest.spyOn(orderService, "findById").mockResolvedValueOnce({
      id: 8,
      document_type: "pedido",
    });
    const client = { query: jest.fn(), release: jest.fn() };
    pool.connect.mockResolvedValueOnce(client);
    const repository = require("../repositories/orderRepository");
    jest.spyOn(repository, "markOrderDelivered").mockResolvedValueOnce([{ id: 8 }]);
    jest.spyOn(repository, "decreaseProductStock");

    await expect(orderService.finalize(8, 1)).resolves.toEqual({
      message: "Pedido finalizado com sucesso",
    });
    expect(repository.decreaseProductStock).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledWith("COMMIT");
    expect(client.release).toHaveBeenCalled();
  });

  test("converter orçamento em pedido baixa o estoque mesmo ficando negativo", async () => {
    jest.spyOn(orderService, "findById")
      .mockResolvedValueOnce({
        id: 8,
        document_type: "orcamento",
        status: "Em aberto",
        discount: 0,
        items: [{ productId: 5, quantity: 2, brand: "Marca" }],
      })
      .mockResolvedValueOnce({ id: 8, document_type: "pedido" });
    jest.spyOn(orderService, "loadProductStockMap").mockResolvedValueOnce(
      new Map([["5", { stock: 0, name: "Produto", brand: "Marca", price: 10 }]]),
    );
    jest.spyOn(orderService, "calculateItemsCommission").mockResolvedValueOnce({
      finalTotal: 20,
      totalCommission: 2,
      items: [{ productId: 5, quantity: 2, brand: "Marca", price: 10 }],
    });
    jest.spyOn(orderService, "persistOrderItemsWithClient").mockResolvedValueOnce();
    const client = { query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() };
    pool.connect.mockResolvedValueOnce(client);
    const repository = require("../repositories/orderRepository");
    jest.spyOn(repository, "decreaseProductStock").mockResolvedValueOnce([{ id: 5, stock: -2 }]);

    await orderService.convertToPedido(8, 1, { confirm_stock_warning: true });

    expect(repository.decreaseProductStock).toHaveBeenCalledWith(
      client,
      expect.objectContaining({ productId: "5", quantity: 2, tenantId: 1 }),
    );
    expect(client.query).toHaveBeenCalledWith("COMMIT");
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

  test("create passa stock_committed_at como $13 sem reutilizar document_type no CASE", async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // idempotency check
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // seller
        .mockResolvedValueOnce({ rows: [{ id: 10 }] }) // client
        .mockResolvedValueOnce({ rows: [{ id: 99 }] }) // INSERT
        .mockResolvedValueOnce({}), // COMMIT
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
    jest.spyOn(orderService, "persistOrderItemsWithClient").mockResolvedValueOnce();
    jest.spyOn(orderService, "findById").mockResolvedValueOnce({ id: 99 });

    await orderService.create(
      {
        clientid: 10,
        userid: 1,
        items: [{ productId: 5, productName: "Produto", brand: "Marca", quantity: 1, price: 10 }],
        document_type: "orcamento",
        clientRequestId: "request_abcdef12",
      },
      authUser,
    );

    const insertCall = client.query.mock.calls.find(
      ([sql]) => typeof sql === "string" && sql.includes("INSERT INTO orders"),
    );
    expect(insertCall).toBeDefined();
    const [insertSql, insertParams] = insertCall;
    expect(insertSql).toContain("$13");
    expect(insertSql).not.toMatch(/CASE WHEN \$9/);
    expect(insertParams[8]).toBe("orcamento");
    expect(insertParams[12]).toBeNull();
  });
});
