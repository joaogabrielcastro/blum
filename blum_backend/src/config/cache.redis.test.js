describe("cache com Redis", () => {
  const redisMock = {
    get: jest.fn(),
    set: jest.fn(),
    scan: jest.fn(),
    del: jest.fn(),
    on: jest.fn(),
  };

  beforeEach(() => {
    jest.resetModules();
    jest.doMock("ioredis", () => jest.fn(() => redisMock));
    process.env.REDIS_URL = "redis://localhost:6379";
    redisMock.get.mockReset();
    redisMock.set.mockReset();
    redisMock.scan.mockReset();
    redisMock.del.mockReset();
  });

  afterEach(() => {
    delete process.env.REDIS_URL;
    jest.resetModules();
  });

  test("cacheGet lê do Redis", async () => {
    redisMock.get.mockResolvedValue(JSON.stringify({ cached: true }));
    const { cacheGet } = require("./cache");
    const value = await cacheGet("products:1:{}");
    expect(value).toEqual({ cached: true });
    expect(redisMock.get).toHaveBeenCalledWith("products:1:{}");
  });

  test("cacheGet faz fallback para memória se Redis falhar", async () => {
    redisMock.set.mockRejectedValue(new Error("redis down"));
    redisMock.get.mockRejectedValue(new Error("redis down"));
    const { cacheGet, cacheSet } = require("./cache");
    await cacheSet("fallback-key", { ok: true }, 60);
    const value = await cacheGet("fallback-key");
    expect(value).toEqual({ ok: true });
  });

  test("cacheSet grava no Redis", async () => {
    redisMock.set.mockResolvedValue("OK");
    const { cacheSet } = require("./cache");
    await cacheSet("redis-key", { a: 1 }, 120);
    expect(redisMock.set).toHaveBeenCalledWith(
      "redis-key",
      JSON.stringify({ a: 1 }),
      "EX",
      120,
    );
  });

  test("invalidateProductsCache remove chaves via scan no Redis", async () => {
    redisMock.scan
      .mockResolvedValueOnce(["5", ["products:3:a", "products:3:b"]])
      .mockResolvedValueOnce(["0", []]);
    redisMock.del.mockResolvedValue(2);

    const { invalidateProductsCache } = require("./cache");
    await invalidateProductsCache(3);
    expect(redisMock.del).toHaveBeenCalledWith("products:3:a", "products:3:b");
  });

  test("invalidateProductsCache faz fallback se scan falhar", async () => {
    redisMock.scan.mockRejectedValue(new Error("scan failed"));
    const { cacheSet, cacheGet, invalidateProductsCache, cacheKeyProducts } = require("./cache");
    const key = cacheKeyProducts(4, { x: 1 });
    await cacheSet(key, { keep: false });
    await invalidateProductsCache(4);
    expect(await cacheGet(key)).toBeNull();
  });
});
