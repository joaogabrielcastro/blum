const {
  mapProductResponse,
  mapProductsPayload,
  mapClientResponse,
  mapClientsPayload,
  mapOrderResponse,
  mapAuthUserResponse,
  mapBrandsPayload,
  mapOrdersPayload,
  mapSalesByRepPayload,
  mapCommissionReportPayload,
  mapCommissionByBrandPayload,
  mapAuthUsersPayload,
  mapPurchaseHistoryPayload,
  mapUserAllowedBrandsPayload,
  mapLastPurchasePriceRow,
  mapClientItemPriceHistoryPayload,
} = require("./apiResponseMapper");

describe("apiResponseMapper", () => {
  test("mapProductResponse camelOnly remove snake_case", () => {
    const mapped = mapProductResponse(
      {
        id: 1,
        productcode: "ABC",
        brand_id: 2,
        tenant_id: 1,
        minstock: 5,
      },
      { camelOnly: true },
    );
    expect(mapped.productCode).toBe("ABC");
    expect(mapped.brandId).toBe(2);
    expect(mapped.tenantId).toBe(1);
    expect(mapped.productcode).toBeUndefined();
    expect(mapped.brand_id).toBeUndefined();
  });

  test("mapProductsPayload mapeia lista", () => {
    const payload = mapProductsPayload(
      { data: [{ id: 1, productcode: "X" }], total: 1 },
      { camelOnly: true },
    );
    expect(payload.data[0].productCode).toBe("X");
  });

  test("mapClientResponse normaliza companyName", () => {
    const mapped = mapClientResponse(
      { id: 1, companyname: "Empresa", tenant_id: 1 },
      { camelOnly: true },
    );
    expect(mapped.companyName).toBe("Empresa");
    expect(mapped.companyname).toBeUndefined();
  });

  test("mapClientsPayload mapeia array", () => {
    const rows = mapClientsPayload([{ id: 1, companyname: "A" }], { camelOnly: true });
    expect(rows[0].companyName).toBe("A");
  });

  test("mapOrderResponse inclui items mapeados", () => {
    const mapped = mapOrderResponse(
      {
        id: 10,
        clientid: 2,
        user_ref: 3,
        items: [{ product_id: 1, product_name: "P", quantity: 1, unit_price: 10 }],
        totalprice: 10,
        status: "Em aberto",
      },
      { camelOnly: true },
    );
    expect(mapped.clientId).toBe(2);
    expect(mapped.items[0].productName).toBe("P");
  });

  test("mapAuthUserResponse expõe tenantSlug", () => {
    const mapped = mapAuthUserResponse(
      {
        id: 1,
        username: "admin@test.com",
        role: "admin",
        tenantId: 1,
        tenantSlug: "default",
        isPlatformAdmin: true,
      },
      { camelOnly: true },
    );
    expect(mapped.tenantSlug).toBe("default");
    expect(mapped.isPlatformAdmin).toBe(true);
  });

  test("mapBrandsPayload mapeia marcas", () => {
    const mapped = mapBrandsPayload(
      [{ id: 1, name: "Marca", commission_rate: 5 }],
      { camelOnly: true },
    );
    expect(mapped[0].commissionRate).toBe(5);
  });

  test("mapOrdersPayload mapeia pedidos", () => {
    const mapped = mapOrdersPayload(
      [{ id: 1, clientid: 2, user_ref: 1, items: [], totalprice: 0, status: "x" }],
      { camelOnly: true },
    );
    expect(mapped[0].clientId).toBe(2);
  });

  test("mapSalesByRepPayload normaliza totais", () => {
    const mapped = mapSalesByRepPayload(
      [{ user_id: 1, seller_name: "João", total_sales: "100.5" }],
      { camelOnly: true },
    );
    expect(mapped[0].sellerName).toBe("João");
    expect(mapped[0].totalSales).toBe(100.5);
  });

  test("mapCommissionReportPayload", () => {
    const mapped = mapCommissionReportPayload(
      [{ user_ref: 1, total_commission: 10, total_orders: 2 }],
      { camelOnly: true },
    );
    expect(mapped[0].totalCommission).toBe(10);
  });

  test("mapCommissionByBrandPayload inclui items", () => {
    const mapped = mapCommissionByBrandPayload(
      [
        {
          order_id: 1,
          total_commission: 5,
          items: [{ commission_amount: 2, unit_price: 10, line_total: 10 }],
        },
      ],
      { camelOnly: true },
    );
    expect(mapped[0].orderId).toBe(1);
    expect(mapped[0].items[0].commissionAmount).toBe(2);
  });

  test("mapAuthUsersPayload", () => {
    const mapped = mapAuthUsersPayload(
      [{ id: 1, username: "a", role: "admin", tenant_id: 1 }],
      { camelOnly: true },
    );
    expect(mapped[0].tenantId).toBe(1);
  });

  test("mapPurchaseHistoryPayload", () => {
    const mapped = mapPurchaseHistoryPayload(
      [{ tenant_id: 1, purchase_price: 10, purchase_date: "2026-01-01" }],
      { camelOnly: true },
    );
    expect(mapped[0].purchasePrice).toBe(10);
  });

  test("mapUserAllowedBrandsPayload", () => {
    const mapped = mapUserAllowedBrandsPayload(
      { userId: 2, brandIds: [1, 2] },
      { camelOnly: true },
    );
    expect(mapped.brandIds).toEqual([1, 2]);
  });

  test("mapLastPurchasePriceRow", () => {
    const mapped = mapLastPurchasePriceRow(
      { product_id: 1, purchase_price: 9.5, purchase_date: "2026-01-01" },
      { camelOnly: true },
    );
    expect(mapped.purchasePrice).toBe(9.5);
    expect(mapped.purchaseDate).toBe("2026-01-01");
  });

  test("mapClientItemPriceHistoryPayload", () => {
    const mapped = mapClientItemPriceHistoryPayload(
      [
        {
          order_id: 1,
          unit_price: 10,
          line_discount: 1,
          payment_method: "pix",
          seller_name: "Ana",
        },
      ],
      { camelOnly: true },
    );
    expect(mapped[0].orderId).toBe(1);
    expect(mapped[0].sellerName).toBe("Ana");
  });
});
