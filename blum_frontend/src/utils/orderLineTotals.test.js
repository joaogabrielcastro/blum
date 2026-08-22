import { computeLineNetTotal, computeOrderTotals } from "./orderLineTotals";

describe("orderLineTotals", () => {
  it("calcula total líquido com desconto por linha", () => {
    const total = computeLineNetTotal({
      price: 100,
      quantity: 2,
      brand: "outra",
      lineDiscount: 10,
    });
    expect(total).toBe(180);
  });

  it("aplica acréscimo e desconto no preço líquido", () => {
    const total = computeLineNetTotal({
      price: 100,
      quantity: 1,
      brand: "x",
      lineDiscount: 10,
      lineMarkup: 5,
    });
    // 100 * 0.9 * 1.05 = 94.5
    expect(total).toBe(94.5);
  });

  it("calcula totais do pedido com desconto global", () => {
    const result = computeOrderTotals(
      [{ price: 50, quantity: 2, brand: "x", lineDiscount: 0 }],
      10,
    );
    expect(result.subtotalAfterLineDiscounts).toBe(100);
    expect(result.discountAmount).toBe(10);
    expect(result.netTotal).toBe(90);
  });
});
