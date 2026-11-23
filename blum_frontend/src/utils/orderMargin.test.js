import { computeOrderMargin } from "./orderMargin";

describe("computeOrderMargin", () => {
  test("lucro e margem com desconto geral; item sem custo fica de fora", () => {
    const items = [
      { productName: "Lâmpada", brand: "X", quantity: 2, price: 10, unitCost: 6 },
      { productName: "Fita", brand: "X", quantity: 1, price: 5, unitCost: null },
    ];
    const m = computeOrderMargin(items, 10);
    // receita com custo: 20 × 0,9 = 18; custo 12; lucro 6; margem 33,3%
    expect(m.revenueWithCost).toBeCloseTo(18);
    expect(m.cost).toBe(12);
    expect(m.profit).toBeCloseTo(6);
    expect(m.marginPercent).toBe(33.3);
    expect(m.missingCost).toBe(1);
    expect(m.belowCost).toEqual([]);
  });

  test("aponta item vendido abaixo do custo", () => {
    const m = computeOrderMargin(
      [{ productName: "Cabo", brand: "X", quantity: 1, price: 4, unitCost: 5 }],
      0,
    );
    expect(m.belowCost).toEqual(["Cabo"]);
    expect(m.marginPercent).toBe(-25);
  });

  test("sem custo nenhum", () => {
    const m = computeOrderMargin([{ productName: "A", brand: "X", quantity: 1, price: 4 }]);
    expect(m.hasCostData).toBe(false);
  });
});
