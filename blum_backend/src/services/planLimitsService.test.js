jest.mock("../config/database", () => ({
  sql: jest.fn(),
}));
jest.mock("../repositories/tenantRepository");

const { sql } = require("../config/database");
const tenantRepository = require("../repositories/tenantRepository");
const {
  assertCanAddUser,
  assertCanAddBrand,
  limitsForPlanSlug,
} = require("./planLimitsService");

describe("planLimitsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("limitsForPlanSlug starter tem limites", () => {
    const limits = limitsForPlanSlug("starter");
    expect(limits.maxUsers).toBe(3);
    expect(limits.maxBrands).toBe(1);
  });

  test("limitsForPlanSlug professional é ilimitado", () => {
    const limits = limitsForPlanSlug("professional");
    expect(limits.maxUsers).toBeNull();
    expect(limits.maxBrands).toBeNull();
  });

  test("assertCanAddUser bloqueia quando no limite", async () => {
    tenantRepository.findBillingById.mockResolvedValue({
      plan_slug: "starter",
    });
    sql.mockResolvedValueOnce([{ count: 3 }]);

    await expect(assertCanAddUser(1)).rejects.toMatchObject({
      statusCode: 403,
      message: expect.stringMatching(/3 usuários/i),
    });
  });

  test("assertCanAddBrand bloqueia quando no limite", async () => {
    tenantRepository.findBillingById.mockResolvedValue({
      plan_slug: "starter",
    });
    sql.mockResolvedValueOnce([{ count: 1 }]);

    await expect(assertCanAddBrand(1)).rejects.toMatchObject({
      statusCode: 403,
      message: expect.stringMatching(/representada/i),
    });
  });

  test("assertCanAddUser permite abaixo do limite", async () => {
    tenantRepository.findBillingById.mockResolvedValue({
      plan_slug: "starter",
    });
    sql.mockResolvedValueOnce([{ count: 1 }]);
    await expect(assertCanAddUser(1)).resolves.toBeUndefined();
  });
});
