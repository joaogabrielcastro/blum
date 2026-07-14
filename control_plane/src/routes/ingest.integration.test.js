/**
 * Integração leve: requer Postgres + CONTROL_PLANE_ADMIN_TOKEN.
 * Rodar: RUN_INTEGRATION=1 DATABASE_URL=... npm test -- ingest.integration.test.js
 */
const request = require("supertest");

const run = process.env.RUN_INTEGRATION === "1";

(run ? describe : describe.skip)("control plane ingest integration", () => {
  let app;
  let adminToken;
  let ingestToken;
  let projectSlug;

  beforeAll(async () => {
    process.env.CONTROL_PLANE_ADMIN_TOKEN =
      process.env.CONTROL_PLANE_ADMIN_TOKEN || "test-admin-token";
    process.env.SEED_PROJECT_SLUG = "";
    delete process.env.REDIS_URL;

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL obrigatório para integração");
    }

    const { ensureDatabase } = require("../db/ensureDatabase");
    const { runMigrations } = require("../db/migrate");
    const {
      ensureDefaultTenant,
      createProject,
    } = require("../services/projectService");
    const { createApp } = require("../createApp");

    await ensureDatabase();
    await runMigrations();

    adminToken = process.env.CONTROL_PLANE_ADMIN_TOKEN;
    projectSlug = `test-${Date.now().toString(36)}`;
    const tenantId = await ensureDefaultTenant();
    const created = await createProject({
      tenantId,
      slug: projectSlug,
      name: "Test Project",
    });
    ingestToken = created.ingestToken;
    app = createApp();
  }, 60000);

  test("ingesta evento genérico e deduplica", async () => {
    const payload = {
      title: "Integration boom",
      message: "something failed",
      exceptionType: "Error",
      culprit: "/api/v2/test",
      filename: "test.js",
      functionName: "handler",
      environment: "test",
      severity: "error",
    };

    const first = await request(app)
      .post(`/api/v1/ingest/${projectSlug}`)
      .set("Authorization", `Bearer ${ingestToken}`)
      .send(payload);

    expect([200, 201]).toContain(first.status);
    expect(first.body.accepted).toBe(true);
    expect(first.body.created).toBe(true);

    const second = await request(app)
      .post(`/api/v1/ingest/${projectSlug}`)
      .set("Authorization", `Bearer ${ingestToken}`)
      .send(payload);

    expect(second.status).toBe(200);
    expect(second.body.created).toBe(false);
    expect(second.body.incident.eventCount).toBeGreaterThanOrEqual(2);

    const list = await request(app)
      .get("/api/v1/incidents")
      .query({ projectSlug })
      .set("Authorization", `Bearer ${adminToken}`);

    expect(list.status).toBe(200);
    expect(list.body.incidents.length).toBeGreaterThanOrEqual(1);
    expect(list.body.incidents[0].title).toContain("Integration boom");
  });

  test("admin token inválido é rejeitado", async () => {
    const res = await request(app)
      .get("/api/v1/projects")
      .set("Authorization", "Bearer wrong");
    expect(res.status).toBe(401);
  });
});
