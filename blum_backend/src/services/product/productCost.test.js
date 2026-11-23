const {
  weightedAverageCost,
  marginPercent,
  parseCostInput,
} = require("./productCost");
const { mapProductResponse } = require("../../mappers/apiResponseMapper");

describe("weightedAverageCost", () => {
  test("sem custo anterior: custo da entrada", () => {
    expect(
      weightedAverageCost({ currentStock: 10, currentCost: null, quantity: 5, unitCost: 8 }),
    ).toBe(8);
  });

  test("média ponderada pelo estoque", () => {
    // 10 un a R$ 10 + 10 un a R$ 12 = R$ 11
    expect(
      weightedAverageCost({ currentStock: 10, currentCost: 10, quantity: 10, unitCost: 12 }),
    ).toBe(11);
  });

  test("estoque zerado ou negativo não pesa", () => {
    expect(
      weightedAverageCost({ currentStock: -3, currentCost: 50, quantity: 2, unitCost: 9.5 }),
    ).toBe(9.5);
  });

  test("4 casas decimais", () => {
    expect(
      weightedAverageCost({ currentStock: 3, currentCost: 1, quantity: 4, unitCost: 2 }),
    ).toBe(1.5714);
  });
});

describe("marginPercent", () => {
  test("margem sobre o preço de venda", () => {
    expect(marginPercent(100, 60)).toBe(40);
  });
  test("sem custo: null", () => {
    expect(marginPercent(100, null)).toBeNull();
  });
});

describe("parseCostInput", () => {
  test("aceita vírgula e vazio", () => {
    expect(parseCostInput("12,5")).toBe(12.5);
    expect(parseCostInput("")).toBeNull();
  });
  test("rejeita negativo", () => {
    expect(() => parseCostInput("-1")).toThrow("Preço de custo inválido.");
  });
});

describe("custo no item do pedido", () => {
  const { mapOrderResponse } = require("../../mappers/apiResponseMapper");
  const order = { id: 1, items: [{ id: 9, product_id: 3, unit_price: "10", unit_cost: "6.5" }] };

  test("admin recebe unitCost", () => {
    const mapped = mapOrderResponse(order, { camelOnly: true, includeCost: true });
    expect(mapped.items[0].unitCost).toBe(6.5);
  });

  test("vendedor não recebe custo do item", () => {
    const mapped = mapOrderResponse(order, { camelOnly: true });
    expect(mapped.items[0]).not.toHaveProperty("unitCost");
    expect(mapped.items[0]).not.toHaveProperty("unit_cost");
  });
});

describe("custo na resposta de produto", () => {
  const row = { id: 1, name: "X", price: "20.00", cost_price: "12.0000", last_cost: "13.0000" };

  test("admin recebe custo e margem", () => {
    const mapped = mapProductResponse(row, { camelOnly: true, includeCost: true });
    expect(mapped).toMatchObject({ costPrice: 12, lastCost: 13, marginPercent: 40 });
    expect(mapped.cost_price).toBeUndefined();
  });

  test("vendedor não recebe nenhum campo de custo", () => {
    const mapped = mapProductResponse(row, { camelOnly: true });
    for (const key of ["cost_price", "costPrice", "last_cost", "lastCost", "marginPercent"]) {
      expect(mapped).not.toHaveProperty(key);
    }
  });
});
