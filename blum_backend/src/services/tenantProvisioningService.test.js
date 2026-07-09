jest.mock("../repositories/tenantRepository");
jest.mock("../utils/tenantSlug");
jest.mock("./auditService", () => ({ logAuditEvent: jest.fn() }));
jest.mock("./emailService", () => ({ sendWelcomeEmail: jest.fn().mockResolvedValue({}) }));
jest.mock("../config/database", () => ({
  pool: {
    connect: jest.fn(),
  },
}));

const bcrypt = require("bcrypt");
const { pool } = require("../config/database");
const tenantRepository = require("../repositories/tenantRepository");
const { validateTenantSlug } = require("../utils/tenantSlug");
const tenantProvisioningService = require("./tenantProvisioningService");

describe("tenantProvisioningService", () => {
  let client;

  beforeEach(() => {
    jest.clearAllMocks();
    client = {
      query: jest.fn(),
      release: jest.fn(),
    };
    pool.connect.mockResolvedValue(client);
    client.query.mockResolvedValue({ rows: [] });
  });

  test("checkSlugAvailability delega validação", async () => {
    validateTenantSlug.mockReturnValue({ ok: true, slug: "acme" });
    tenantRepository.slugExists.mockResolvedValue(false);
    const result = await tenantProvisioningService.checkSlugAvailability("acme");
    expect(result.available).toBe(true);
  });

  test("provisionTenant rejeita signup desativado", async () => {
    process.env.TENANT_SIGNUP_ENABLED = "false";
    await expect(
      tenantProvisioningService.provisionTenant({
        companyName: "X",
        slug: "x",
        adminEmail: "a@test.com",
        adminPassword: "123456",
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
    process.env.TENANT_SIGNUP_ENABLED = "true";
  });

  test("provisionTenant valida email", async () => {
    await expect(
      tenantProvisioningService.provisionTenant({
        companyName: "Acme",
        slug: "acme",
        adminEmail: "invalid",
        adminPassword: "123456",
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("provisionTenant cria tenant e admin", async () => {
    validateTenantSlug.mockReturnValue({ ok: true, slug: "acme" });
    tenantRepository.slugExists.mockResolvedValue(false);

    client.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // set_config
      .mockResolvedValueOnce({
        rows: [
          {
            id: 5,
            slug: "acme",
            name: "Acme",
            status: "active",
            billing_email: "admin@acme.com",
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] }) // existing user
      .mockResolvedValueOnce({
        rows: [
          {
            id: 10,
            username: "admin@acme.com",
            role: "admin",
            name: "Acme",
            tenant_id: 5,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const result = await tenantProvisioningService.provisionTenant({
      companyName: "Acme",
      slug: "acme",
      adminEmail: "admin@acme.com",
      adminPassword: "123456",
      adminName: "Admin",
    });

    expect(result.tenant.slug).toBe("acme");
    expect(result.admin.username).toBe("admin@acme.com");
    expect(client.query).toHaveBeenCalledWith("COMMIT");
  });

  test("getCurrentTenantSummary retorna resumo", async () => {
    tenantRepository.findBillingById.mockResolvedValue({
      id: 1,
      slug: "acme",
      name: "Acme",
      status: "active",
      plan_slug: "starter",
      subscription_status: "active",
      onboarding_completed_at: null,
    });

    const summary = await tenantProvisioningService.getCurrentTenantSummary(1);
    expect(summary.slug).toBe("acme");
    expect(summary.planSlug).toBe("starter");
  });

  test("getCurrentTenantSummary 404 quando ausente", async () => {
    tenantRepository.findBillingById.mockResolvedValue(null);
    await expect(
      tenantProvisioningService.getCurrentTenantSummary(99),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
