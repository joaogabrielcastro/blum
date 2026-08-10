jest.mock("../repositories/tenantRepository");

const tenantRepository = require("../repositories/tenantRepository");
const { requirePlanFeature } = require("./planFeatureMiddleware");

function mockReqRes(user = { tenantId: 1, role: "admin" }) {
  const req = { user };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

describe("planFeatureMiddleware", () => {
  beforeEach(() => jest.clearAllMocks());

  test("401 sem user", async () => {
    const { req, res, next } = mockReqRes();
    req.user = null;
    await requirePlanFeature("product-import")(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("403 Starter bloqueia product-import", async () => {
    tenantRepository.findBillingById.mockResolvedValue({
      id: 1,
      plan_slug: "starter",
      subscription_status: "active",
      stripe_customer_id: "cus_1",
      stripe_subscription_id: "sub_1",
    });
    const { req, res, next } = mockReqRes();
    await requirePlanFeature("product-import")(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "PLAN_FEATURE_REQUIRED",
        feature: "product-import",
        requiredPlan: "professional",
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("Professional passa", async () => {
    tenantRepository.findBillingById.mockResolvedValue({
      id: 1,
      plan_slug: "professional",
      subscription_status: "active",
      stripe_customer_id: "cus_1",
      stripe_subscription_id: "sub_1",
    });
    const { req, res, next } = mockReqRes();
    await requirePlanFeature("product-import")(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test("legado passa", async () => {
    tenantRepository.findBillingById.mockResolvedValue({
      id: 1,
      plan_slug: null,
      subscription_status: null,
      stripe_customer_id: null,
      stripe_subscription_id: null,
    });
    const { req, res, next } = mockReqRes();
    await requirePlanFeature("excel-export")(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
