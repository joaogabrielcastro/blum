const productCatalogImportService = require("./productCatalogImportService");

describe("productCatalogImportService", () => {
  describe("normalizeImportItems", () => {
    test("rejeita lista vazia", () => {
      expect(() => productCatalogImportService.normalizeImportItems([])).toThrow(
        "Nenhum item válido",
      );
    });

    test("normaliza campos de preview", () => {
      const items = productCatalogImportService.normalizeImportItems([
        {
          productCode: " A1 ",
          description: "Produto A",
          quantity: 5,
          unitPrice: 12.5,
          minStock: 2,
        },
      ]);
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual({
        product_code: "A1",
        name: "Produto A",
        price: 12.5,
        stock: 5,
        minstock: 2,
      });
    });

    test("rejeita códigos duplicados", () => {
      expect(() =>
        productCatalogImportService.normalizeImportItems([
          { productCode: "X", description: "Um", quantity: 1, unitPrice: 1 },
          { productCode: "X", description: "Dois", quantity: 2, unitPrice: 2 },
        ]),
      ).toThrow("duplicados");
    });

    test("aceita estoque zero", () => {
      const items = productCatalogImportService.normalizeImportItems([
        {
          productCode: "FRT1",
          description: "Frete",
          quantity: 0,
          unitPrice: 145,
        },
      ]);
      expect(items[0].stock).toBe(0);
    });
  });
});
