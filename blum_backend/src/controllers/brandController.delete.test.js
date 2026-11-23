jest.mock("../config/database", () => {
  const client = { query: jest.fn(), release: jest.fn() };
  return {
    sql: jest.fn(),
    pool: { connect: jest.fn(async () => client) },
    beginTenantTransaction: jest.fn((c) => c.query("BEGIN")),
    __client: client,
  };
});
jest.mock("../services/brandAccessService", () => ({}));
jest.mock("../services/planLimitsService", () => ({}));

const db = require("../config/database");
const { deleteBrand } = require("./brandController");

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function req(query = {}) {
  return { params: { id: "7" }, query, user: { tenantId: 3 } };
}

beforeEach(() => {
  jest.clearAllMocks();
  db.sql
    .mockResolvedValueOnce([{ id: 7, name: "Durin" }])
    .mockResolvedValueOnce([{ count: "1500" }]);
});

test("sem withProducts: bloqueia e informa a quantidade", async () => {
  const res = mockRes();
  await deleteBrand(req(), res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({ code: "BRAND_HAS_PRODUCTS", productCount: 1500 }),
  );
  expect(db.pool.connect).not.toHaveBeenCalled();
});

test("withProducts=1: apaga produtos e representada na mesma transação", async () => {
  const c = db.__client;
  c.query.mockImplementation(async (text) => {
    if (/DELETE FROM products/.test(text)) return { rowCount: 1500 };
    if (/DELETE FROM brands/.test(text)) return { rowCount: 1 };
    return {};
  });
  const res = mockRes();
  await deleteBrand(req({ withProducts: "1" }), res);

  const statements = c.query.mock.calls.map(([text]) => text.trim().split(/\s+/).slice(0, 3).join(" "));
  expect(statements).toEqual([
    "BEGIN",
    "DELETE FROM products",
    "DELETE FROM brands",
    "COMMIT",
  ]);
  expect(c.query.mock.calls[1][1]).toEqual([3, 7, "Durin"]);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({ deletedProducts: 1500 }),
  );
  expect(c.release).toHaveBeenCalled();
});

test("withProducts=1: falha desfaz tudo (ROLLBACK)", async () => {
  const c = db.__client;
  c.query.mockImplementation(async (text) => {
    if (/DELETE FROM brands/.test(text)) throw new Error("boom");
    return { rowCount: 10 };
  });
  const res = mockRes();
  await deleteBrand(req({ withProducts: "1" }), res);
  const texts = c.query.mock.calls.map(([t]) => t);
  expect(texts).toContain("ROLLBACK");
  expect(texts).not.toContain("COMMIT");
  expect(res.status).toHaveBeenCalledWith(500);
  expect(c.release).toHaveBeenCalled();
});
