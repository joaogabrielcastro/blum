jest.mock("../../config/database", () => ({
  sql: jest.fn(),
  pool: { connect: jest.fn() },
  beginTenantTransaction: jest.fn(),
}));
jest.mock("../../config/cache", () => ({ invalidateProductsCache: jest.fn() }));

const { sql } = require("../../config/database");
const { matchItems } = require("./purchaseInvoiceService");

const BRAND_A = { id: 4, name: "Blumenau A" };
const nfe = {
  emitter: { cnpj: "79416459000120" },
  items: [
    { itemNumber: 1, supplierCode: "03507016", ean: "7899269598587" },
    { itemNumber: 2, supplierCode: "80323004", ean: null },
  ],
};

function product(id, code, brandId, brand) {
  return { id, productcode: code, brand_id: brandId, brand, stock: 10, price: "20", cost_price: null, last_cost: null };
}

/** sql é chamado nesta ordem: vínculos, EAN, código, produtos. */
function mockQueries({ links = [], eans = [], codes = [], products = [] }) {
  sql
    .mockResolvedValueOnce(links)
    .mockResolvedValueOnce(eans)
    .mockResolvedValueOnce(codes)
    .mockResolvedValueOnce(products);
}

beforeEach(() => sql.mockReset());

test("vínculo salvo de outra representada cede ao produto da representada da nota", async () => {
  mockQueries({
    links: [{ supplier_code: "03507016", product_id: 900, conversion_factor: "1" }],
    codes: [{ id: 10, productcode: "03507016", brand_id: 4 }, { id: 11, productcode: "80323004", brand_id: 4 }],
    products: [
      product(900, "03507016", 9, "Blumenau B"),
      product(10, "03507016", 4, "Blumenau A"),
      product(11, "80323004", 4, "Blumenau A"),
    ],
  });
  const [m1, m2] = await matchItems({ tenantId: 1, nfe, brand: BRAND_A });
  expect(m1.product.id).toBe(10);
  expect(m1.otherBrand).toBe(false);
  expect(m2.product.id).toBe(11);
});

test("EAN de outra representada cede ao EAN da representada da nota", async () => {
  mockQueries({
    eans: [
      { id: 900, ean: "7899269598587", brand_id: 9, brand: "Blumenau B" },
      { id: 10, ean: "7899269598587", brand_id: 4, brand: "Blumenau A" },
    ],
    products: [product(900, "03507016", 9, "Blumenau B"), product(10, "03507016", 4, "Blumenau A")],
  });
  const [m1] = await matchItems({ tenantId: 1, nfe, brand: BRAND_A });
  expect(m1.product.id).toBe(10);
});

test("sem produto na representada da nota: mantém o vínculo e sinaliza otherBrand", async () => {
  mockQueries({
    links: [{ supplier_code: "03507016", product_id: 900, conversion_factor: "12" }],
    products: [product(900, "03507016", 9, "Blumenau B")],
  });
  const [m1, m2] = await matchItems({ tenantId: 1, nfe, brand: BRAND_A });
  expect(m1.product.id).toBe(900);
  expect(m1.otherBrand).toBe(true);
  expect(m1.conversionFactor).toBe(12);
  expect(m2.product).toBeNull();
});
