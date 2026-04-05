import formatCurrency, { formatOrderData } from "./format";

describe("formatCurrency", () => {
  it("formata número em BRL", () => {
    expect(formatCurrency(10.5)).toMatch(/10/);
    expect(formatCurrency(10.5)).toMatch(/R\$/);
  });

  it("trata null e inválido como zero", () => {
    expect(formatCurrency(null)).toBe("R$ 0,00");
    expect(formatCurrency(undefined)).toBe("R$ 0,00");
    expect(formatCurrency("abc")).toBe("R$ 0,00");
  });
});

describe("formatOrderData", () => {
  it("mapeia user_ref e seller_name", () => {
    const row = {
      id: 1,
      clientid: 2,
      user_ref: 3,
      seller_name: "Maria",
      description: "x",
      items: [],
      totalprice: 100,
      discount: 0,
      status: "Em aberto",
      createdat: "2026-01-01",
      finishedat: null,
    };
    const out = formatOrderData(row);
    expect(out.userId).toBe(3);
    expect(out.sellerName).toBe("Maria");
    expect(out.clientId).toBe(2);
  });

  it("aceita userid legado quando user_ref ausente", () => {
    const out = formatOrderData({
      id: 1,
      clientid: 1,
      userid: "5",
      items: [],
      totalprice: 0,
      discount: 0,
      status: "x",
      createdat: null,
      finishedat: null,
    });
    expect(out.userId).toBe("5");
  });
});
