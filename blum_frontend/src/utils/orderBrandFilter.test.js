import {
  orderMatchesBrandFilter,
  orderAmountForBrandFilter,
  buildBrandOptionsFromOrders,
  prepareMonthlyCumulativeChartData,
} from "./orderApiFields";

describe("filtros de representada em relatórios", () => {
  const orderMulti = {
    totalPrice: 100,
    representadas: "Acme, Beta",
    finishedAt: "2026-08-10T12:00:00.000Z",
  };
  const orderSingle = {
    totalPrice: 50,
    representedBrands: "Acme",
    finishedAt: "2026-08-11T12:00:00.000Z",
  };

  it("bate representada com case-insensitive", () => {
    expect(orderMatchesBrandFilter(orderMulti, "acme")).toBe(true);
    expect(orderMatchesBrandFilter(orderMulti, "gamma")).toBe(false);
    expect(orderMatchesBrandFilter(orderMulti, "")).toBe(true);
  });

  it("rateia valor em pedidos multi-marca", () => {
    expect(orderAmountForBrandFilter(orderMulti, "acme")).toBe(50);
    expect(orderAmountForBrandFilter(orderSingle, "acme")).toBe(50);
    expect(orderAmountForBrandFilter(orderMulti, "")).toBe(100);
  });

  it("monta opções de marca a partir dos pedidos", () => {
    const opts = buildBrandOptionsFromOrders([orderMulti, orderSingle]);
    expect(opts.map((o) => o.key).sort()).toEqual(["acme", "beta"]);
  });

  it("gráficos mensais usam amountFn no acumulado", () => {
    const chart = prepareMonthlyCumulativeChartData(
      [orderMulti, orderSingle],
      2026,
      8,
      (o) => orderAmountForBrandFilter(o, "acme"),
    );
    const day10 = chart.find((r) => r.day === 10);
    const day11 = chart.find((r) => r.day === 11);
    expect(day10["Vendas do Dia"]).toBe(50);
    expect(day11["Vendas Acumuladas"]).toBe(100);
  });
});
