const { assertProductionConfig, getJwtSecret } = require("./env");

describe("env", () => {
  const origEnv = process.env.NODE_ENV;
  const origJwt = process.env.JWT_SECRET;
  const origDb = process.env.DATABASE_URL;

  const prodJwt =
    "0123456789abcdef0123456789abcdef"; /* 32 chars */
  const prodDb = "postgresql://u:p@localhost:5432/blum";

  afterEach(() => {
    process.env.NODE_ENV = origEnv;
    if (origJwt === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = origJwt;
    }
    if (origDb === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = origDb;
    }
  });

  describe("assertProductionConfig", () => {
    it("não lança em desenvolvimento sem JWT_SECRET", () => {
      process.env.NODE_ENV = "development";
      delete process.env.JWT_SECRET;
      expect(() => assertProductionConfig()).not.toThrow();
    });

    it("lança em produção sem JWT_SECRET", () => {
      process.env.NODE_ENV = "production";
      delete process.env.JWT_SECRET;
      process.env.DATABASE_URL = prodDb;
      expect(() => assertProductionConfig()).toThrow(/JWT_SECRET/);
    });

    it("lança em produção com JWT_SECRET curto", () => {
      process.env.NODE_ENV = "production";
      process.env.JWT_SECRET = "curto";
      process.env.DATABASE_URL = prodDb;
      expect(() => assertProductionConfig()).toThrow(/32/);
    });

    it("lança em produção sem DATABASE_URL", () => {
      process.env.NODE_ENV = "production";
      process.env.JWT_SECRET = prodJwt;
      delete process.env.DATABASE_URL;
      expect(() => assertProductionConfig()).toThrow(/DATABASE_URL/);
    });

    it("não lança em produção com JWT e DATABASE_URL válidos", () => {
      process.env.NODE_ENV = "production";
      process.env.JWT_SECRET = prodJwt;
      process.env.DATABASE_URL = prodDb;
      expect(() => assertProductionConfig()).not.toThrow();
    });
  });

  describe("getJwtSecret", () => {
    it("em produção devolve JWT_SECRET", () => {
      process.env.NODE_ENV = "production";
      process.env.JWT_SECRET = prodJwt;
      expect(getJwtSecret()).toBe(prodJwt);
    });

    it("em desenvolvimento usa fallback se JWT_SECRET ausente", () => {
      process.env.NODE_ENV = "development";
      delete process.env.JWT_SECRET;
      expect(getJwtSecret()).toContain("blum-dev");
    });
  });
});
