import {
  filterOrdersByCalendarMonth,
  orderReportDate,
} from "./orderApiFields";

describe("data comercial dos relatórios", () => {
  test("usa a data de emissão mesmo quando o pedido foi entregue no mês seguinte", () => {
    const order = {
      createdAt: "2026-09-28T12:00:00.000Z",
      finishedAt: "2026-10-02T12:00:00.000Z",
    };

    expect(orderReportDate(order)).toBe(order.createdAt);
    expect(filterOrdersByCalendarMonth([order], 2026, 9)).toEqual([order]);
    expect(filterOrdersByCalendarMonth([order], 2026, 10)).toEqual([]);
  });

  test("mantém compatibilidade com pedido legado sem data de emissão", () => {
    const order = { finishedat: "2026-09-15T12:00:00.000Z" };
    expect(filterOrdersByCalendarMonth([order], 2026, 9)).toEqual([order]);
  });
});
