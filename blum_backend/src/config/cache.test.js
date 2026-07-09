jest.mock("ioredis", () => jest.fn());

const { cacheGet, cacheSet, cacheKeyProducts, invalidateProductsCache } = require("./cache");

describe("cache", () => {
  beforeEach(async () => {
    await invalidateProductsCache(1);
    await invalidateProductsCache(2);
  });

  test("cacheKeyProducts inclui tenantId no prefixo", () => {
    const key = cacheKeyProducts(42, { brand: "x" });
    expect(key).toMatch(/^products:42:/);
    expect(key).toContain("brand");
  });

  test("cacheKeyProducts usa unknown para tenant inválido", () => {
    const key = cacheKeyProducts(null, {});
    expect(key).toMatch(/^products:unknown:/);
  });

  test("cacheSet e cacheGet em memória", async () => {
    const key = cacheKeyProducts(1, { test: true });
    await cacheSet(key, { ok: true }, 60);
    const value = await cacheGet(key);
    expect(value).toEqual({ ok: true });
  });

  test("invalidateProductsCache remove só chaves do tenant", async () => {
    const k1 = cacheKeyProducts(1, { a: 1 });
    const k2 = cacheKeyProducts(2, { b: 2 });
    await cacheSet(k1, { tenant: 1 });
    await cacheSet(k2, { tenant: 2 });
    await invalidateProductsCache(1);
    expect(await cacheGet(k1)).toBeNull();
    expect(await cacheGet(k2)).toEqual({ tenant: 2 });
  });
});
