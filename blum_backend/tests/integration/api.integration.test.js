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

  it("GET /api/v2/products/by-code retorna 404 para código inexistente", async () => {
    const loginRes = await request(app)
      .post("/api/v2/auth/login")
      .send({ username: user, password, tenantSlug })
      .expect(200);

    const token = loginRes.body.token;

    await request(app)
      .get(
        "/api/v2/products/by-code?productcode=__codigo_inexistente_teste__",
      )
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  async function loginToken() {
    const loginRes = await request(app)
      .post("/api/v2/auth/login")
      .send({ username: user, password, tenantSlug })
      .expect(200);
    return {
      token: loginRes.body.token,
      userId: loginRes.body.user?.id,
    };
  }

  it("GET /api/v2/products/search filtra por brandId no servidor", async () => {
    const { token } = await loginToken();
    const brandsRes = await request(app)
      .get("/api/v2/brands")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const brands = Array.isArray(brandsRes.body) ? brandsRes.body : [];
    if (brands.length === 0) return;

    const brand = brands[0];
    const catalogRes = await request(app)
      .get(`/api/v2/products?brandId=${brand.id}&limit=5`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const catalog = catalogRes.body.data ?? catalogRes.body;
    if (!Array.isArray(catalog) || catalog.length === 0) return;

    const term = String(catalog[0].name || "")
      .trim()
      .split(/\s+/)[0]
      .slice(0, 6);
    if (term.length < 2) return;

    const searchRes = await request(app)
      .get(
        `/api/v2/products/search?q=${encodeURIComponent(term)}&brandId=${brand.id}`,
      )
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(searchRes.body)).toBe(true);
    expect(searchRes.body.length).toBeGreaterThan(0);
    for (const product of searchRes.body) {
      const matchesId =
        product.brandId != null && Number(product.brandId) === Number(brand.id);
      const matchesName = String(product.brand || "") === String(brand.name);
      expect(matchesId || matchesName).toBe(true);
    }
  });

  it("POST /api/v2/orders persiste brand_id nas linhas do pedido", async () => {
    const { token, userId } = await loginToken();
    expect(userId).toBeTruthy();

    const brandsRes = await request(app)
      .get("/api/v2/brands")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const brands = Array.isArray(brandsRes.body) ? brandsRes.body : [];
    if (brands.length === 0) return;

    const brand = brands[0];

    const clientsRes = await request(app)
      .get("/api/v2/clients")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const clients = Array.isArray(clientsRes.body) ? clientsRes.body : [];
    if (clients.length === 0) return;

    const client = clients[0];

    const productsRes = await request(app)
      .get(`/api/v2/products?brandId=${brand.id}&limit=20`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const products = productsRes.body.data ?? productsRes.body;
    const product = (Array.isArray(products) ? products : []).find(
      (p) => Number(p.stock) > 0,
    );
    if (!product) return;

    const price = parseFloat(product.price) || 10;

    const createRes = await request(app)
      .post("/api/v2/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        clientid: client.id,
        userid: userId,
        description: "integration brand_id order_items",
        items: [
          {
            productId: product.id,
            productName: product.name,
            brand: brand.name,
            brandId: brand.id,
            quantity: 1,
            price,
            lineDiscount: 0,
          },
        ],
        discount: 0,
      })
      .expect(201);

    const orderId = createRes.body.id;
    expect(orderId).toBeTruthy();

    const getRes = await request(app)
      .get(`/api/v2/orders/${orderId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(getRes.body.items?.length).toBeGreaterThan(0);
    expect(Number(getRes.body.items[0].brandId)).toBe(Number(brand.id));

    const { sql } = require("../../src/config/database");
    const rows = await sql`
      SELECT brand_id FROM order_items
      WHERE order_id = ${orderId}
      LIMIT 1
    `;
    expect(Number(rows[0].brand_id)).toBe(Number(brand.id));
  });
});
