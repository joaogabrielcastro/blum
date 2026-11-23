import { computeInvoiceLine, suggestPrice, parseFactor } from "./purchaseInvoice";

describe("computeInvoiceLine", () => {
  const item = { quantity: 2, totalCost: 221.12 };
  const product = { stock: 50, price: 10, costPrice: 6.4 };

  test("fator 12: 24 un, custo por unidade e média ponderada", () => {
    const line = computeInvoiceLine(item, product, "12");
    expect(line.stockQuantity).toBe(24);
    expect(line.unitCost).toBe(9.2133);
    expect(line.newAverageCost).toBe(7.3124);
    expect(line.currentMargin).toBe(36);
    expect(line.marginAfter).toBeCloseTo(26.9, 1);
  });

  test("produto novo: custo médio = custo da nota, sem sugestão", () => {
    const line = computeInvoiceLine({ quantity: 10, totalCost: 35 }, null, 1);
    expect(line.unitCost).toBe(3.5);
    expect(line.newAverageCost).toBe(3.5);
    expect(line.suggestedPrice).toBeNull();
  });
});

describe("suggestPrice", () => {
  test("mantém a margem atual", () => {
    // margem 40% (custo 6 / venda 10): novo custo 7,50 → 12,50
    expect(suggestPrice({ currentPrice: 10, currentCost: 6, newCost: 7.5 })).toBe(12.5);
  });
});

test("parseFactor aceita vírgula e rejeita zero", () => {
  expect(parseFactor("1,5")).toBe(1.5);
  expect(parseFactor("0")).toBeNull();
});
