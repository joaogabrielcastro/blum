jest.mock("../repositories/tenantRepository");
jest.mock("../config/stripe", () => ({
  isBillingEnforced: jest.fn(),
}));

const tenantRepository = require("../repositories/tenantRepository");
const { isBillingEnforced } = require("../config/stripe");
const { requireActiveSubscription } = require("./subscriptionMiddleware");

function mockReqRes(user = { tenantId: 1, role: "admin" }) {
  const req = { user };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

describe("subscriptionMiddleware", () => {
  beforeEach(() => jest.clearAllMocks());

  test("passa quando billing não está enforced", async () => {
    isBillingEnforced.mockReturnValue(false);
    const { req, res, next } = mockReqRes();
    await requireActiveSubscription(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test("retorna 401 sem user", async () => {
    isBillingEnforced.mockReturnValue(true);
    const { req, res, next } = mockReqRes(null);
    req.user = null;
    await requireActiveSubscription(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("retorna 402 sem assinatura ativa", async () => {
    isBillingEnforced.mockReturnValue(true);
    tenantRepository.findBillingById.mockResolvedValue({
      id: 1,
      slug: "acme",
      stripe_customer_id: "cus_1",
      subscription_status: "canceled",
      plan_slug: "starter",
    });
    const { req, res, next } = mockReqRes();
    await requireActiveSubscription(req, res, next);
    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "SUBSCRIPTION_REQUIRED" }),
    );
  });

  test("passa com assinatura active", async () => {
    isBillingEnforced.mockReturnValue(true);
    tenantRepository.findBillingById.mockResolvedValue({
      id: 1,
      slug: "default",
      subscription_status: "active",
      plan_slug: "starter",
    });
    const { req, res, next } = mockReqRes();
    await requireActiveSubscription(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
