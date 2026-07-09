jest.mock("../repositories/tenantRepository");
jest.mock("../config/database", () => ({
  runWithDbContext: jest.fn((ctx, fn) => fn()),
}));

const tenantRepository = require("../repositories/tenantRepository");
const { runWithDbContext } = require("../config/database");
const { tenantDbContextMiddleware } = require("./tenantDbContextMiddleware");

describe("tenantDbContextMiddleware", () => {
  beforeEach(() => jest.clearAllMocks());

  test("bypass RLS em signup", async () => {
    const req = { originalUrl: "/api/v2/tenants/signup", body: {} };
    const next = jest.fn();
    await new Promise((resolve) => {
      tenantDbContextMiddleware(req, {}, () => {
        next();
        resolve();
      });
    });
    expect(runWithDbContext).toHaveBeenCalledWith(
      { bypassRls: true },
      expect.any(Function),
    );
    expect(next).toHaveBeenCalled();
  });

  test("usa tenantId do JWT quando autenticado", async () => {
    const req = {
      originalUrl: "/api/v2/clients",
      user: { tenantId: 7 },
      body: {},
      headers: {},
    };
    const next = jest.fn();
    await new Promise((resolve) => {
      tenantDbContextMiddleware(req, {}, () => {
        next();
        resolve();
      });
    });
    expect(runWithDbContext).toHaveBeenCalledWith(
      { tenantId: 7 },
      expect.any(Function),
    );
  });

  test("resolve tenantId do slug no login", async () => {
    tenantRepository.findBySlug.mockResolvedValue({ id: 3, slug: "acme" });
    const req = {
      originalUrl: "/api/v2/auth/login",
      body: { tenantSlug: "acme" },
      headers: {},
    };
    const next = jest.fn();
    await new Promise((resolve) => {
      tenantDbContextMiddleware(req, {}, () => {
        next();
        resolve();
      });
    });
    expect(tenantRepository.findBySlug).toHaveBeenCalledWith("acme");
    expect(runWithDbContext).toHaveBeenCalledWith(
      { tenantId: 3 },
      expect.any(Function),
    );
  });
});
