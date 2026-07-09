const {
  enrichOrder,
  representadasFromItems,
  mapOrderItemsWithProducts,
} = require("./orderMapper");

describe("orderMapper", () => {
  test("enrichOrder mapeia user_ref", () => {
    const row = enrichOrder({ id: 1, user_ref: 5 });
    expect(row.userId).toBe(5);
    expect(row.userid).toBe("5");
  });

  test("representadasFromItems agrega marcas únicas", () => {
    const text = representadasFromItems([
      { brand: "B" },
      { brand: "A" },
      { brand: "B" },
      { brand: "" },
    ]);
    expect(text).toBe("A, B");
  });

  test("mapOrderItemsWithProducts normaliza linhas", () => {
    const items = mapOrderItemsWithProducts([
      {
        product_id: 1,
        product_name: "Prod",
        brand: "Marca",
        brand_id: 2,
        quantity: 2,
        unit_price: "10.5",
        line_discount: "1",
        commission_rate: "5",
        commission_amount: "0.5",
        productcode: "ABC",
      },
    ]);
    expect(items[0].productName).toBe("Prod");
    expect(items[0].brandId).toBe(2);
    expect(items[0].price).toBe(10.5);
  });
});
