/**
 * Testes de integração HTTP + PostgreSQL.
 *
 * Execução local (PostgreSQL acessível via DATABASE_URL):
 *   npm run test:integration --prefix blum_backend
 *
 * Variáveis opcionais:
 *   INTEGRATION_USER (default: admin)
 *   INTEGRATION_PASSWORD (default: BlumAdmin2025!)
 *   INTEGRATION_TENANT_SLUG (default: default)
 */

require("dotenv").config({ override: false });

const request = require("supertest");

const runIntegration =
  process.env.RUN_INTEGRATION === "1" && !!process.env.DATABASE_URL?.trim();

const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration("API v2 integration", () => {
  let app;
  const user = process.env.INTEGRATION_USER || "admin";
  const password = process.env.INTEGRATION_PASSWORD || "BlumAdmin2025!";
  const tenantSlug = process.env.INTEGRATION_TENANT_SLUG || "default";

  beforeAll(async () => {
    const { runMigrations } = require("../../src/db/migrate");
    const { seedDefaultUsers } = require("../../src/bootstrap/seedDefaultUsers");
    await runMigrations();
    await seedDefaultUsers({ onlyIfDatabaseEmpty: true });

    const { createApp } = require("../../src/createApp");
    app = createApp();
  });

  it("GET /api/v2/status inclui x-api-version", async () => {
    const res = await request(app).get("/api/v2/status").expect(200);
    expect(res.headers["x-api-version"]).toBe("v2");
    expect(res.body.status).toBe("online");
  });

  it("login v2 + verify + orders + refresh + logout", async () => {
    const loginRes = await request(app)
      .post("/api/v2/auth/login")
      .send({ username: user, password, tenantSlug })
      .expect(200);

    expect(loginRes.body.token).toBeTruthy();
    expect(loginRes.body.refreshToken).toBeTruthy();
    expect(loginRes.body.user?.tenantId).toBeDefined();

    const token = loginRes.body.token;
    const refreshToken = loginRes.body.refreshToken;

    const verifyRes = await request(app)
      .get("/api/v2/auth/verify")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(verifyRes.body.user?.username).toBeTruthy();

    const ordersRes = await request(app)
      .get("/api/v2/orders")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(ordersRes.body)).toBe(true);

    const refreshRes = await request(app)
      .post("/api/v2/auth/refresh")
      .send({ refreshToken })
      .expect(200);
    expect(refreshRes.body.token).toBeTruthy();
    expect(refreshRes.body.refreshToken).toBeTruthy();

    const token2 = refreshRes.body.token;
    const refreshToken2 = refreshRes.body.refreshToken;

    await request(app)
      .post("/api/v2/auth/logout")
      .set("Authorization", `Bearer ${token2}`)
      .send({ refreshToken: refreshToken2 })
      .expect(200);

    await request(app)
      .post("/api/v2/auth/refresh")
      .send({ refreshToken: refreshToken2 })
      .expect(401);
  });
});
