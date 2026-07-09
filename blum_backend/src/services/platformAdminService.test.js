jest.mock("../repositories/tenantRepository");
jest.mock("./auditService", () => ({ logAuditEvent: jest.fn() }));

const tenantRepository = require("../repositories/tenantRepository");
const { logAuditEvent } = require("./auditService");
const platformAdminService = require("./platformAdminService");

describe("platformAdminService", () => {
  beforeEach(() => jest.clearAllMocks());

  test("listTenants mapeia campos", async () => {
    tenantRepository.listAllTenants.mockResolvedValue([
      {
        id: 1,
        slug: "acme",
        name: "Acme",
        status: "active",
        plan_slug: "starter",
        subscription_status: "active",
        billing_email: "a@test.com",
        user_count: 2,
        order_count: 5,
        created_at: "2026-01-01",
        onboarding_completed_at: null,
      },
    ]);

    const rows = await platformAdminService.listTenants({});
    expect(rows[0]).toMatchObject({
      slug: "acme",
      userCount: 2,
      orderCount: 5,
    });
  });

  test("getTenantDetail 404 quando ausente", async () => {
    tenantRepository.getTenantDetail.mockResolvedValue(null);
    await expect(platformAdminService.getTenantDetail(99)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  test("updateTenantStatus valida status", async () => {
    await expect(
      platformAdminService.updateTenantStatus({
        tenantId: 1,
        status: "invalid",
        actorUserId: 1,
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("updateTenantStatus suspende tenant", async () => {
    tenantRepository.findBillingById.mockResolvedValue({
      id: 1,
      slug: "acme",
      status: "active",
    });
    tenantRepository.updateTenantStatus.mockResolvedValue({
      id: 1,
      slug: "acme",
      name: "Acme",
      status: "suspended",
    });

    const result = await platformAdminService.updateTenantStatus({
      tenantId: 1,
      status: "suspended",
      actorUserId: 10,
      requestId: "req-1",
    });

    expect(result.status).toBe("suspended");
    expect(logAuditEvent).toHaveBeenCalled();
  });
});
