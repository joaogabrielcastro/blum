const {
  hasSubscriptionAccess,
  isLegacyTenant,
  requiresSubscriptionCheck,
  mapSubscriptionSummary,
} = require("./subscriptionAccess");

describe("subscriptionAccess", () => {
  const origEnforce = process.env.BILLING_ENFORCE;

  afterEach(() => {
    if (origEnforce === undefined) {
      delete process.env.BILLING_ENFORCE;
    } else {
      process.env.BILLING_ENFORCE = origEnforce;
    }
  });

  const legacyTenant = {
    id: 1,
    name: "Legacy Co",
    stripe_customer_id: null,
    stripe_subscription_id: null,
    subscription_status: null,
  };

  const activeTenant = {
    id: 2,
    name: "Active Co",
    stripe_customer_id: "cus_123",
    stripe_subscription_id: "sub_123",
    subscription_status: "active",
    plan_slug: "starter",
    current_period_end: "2030-01-01T00:00:00.000Z",
    cancel_at_period_end: false,
  };

  it("legacy tenant não exige assinatura mesmo com enforce", () => {
    process.env.BILLING_ENFORCE = "true";
    expect(isLegacyTenant(legacyTenant)).toBe(true);
    expect(requiresSubscriptionCheck(legacyTenant)).toBe(false);
    expect(hasSubscriptionAccess(legacyTenant)).toBe(true);
  });

  it("permite active e trialing", () => {
    process.env.BILLING_ENFORCE = "true";
    expect(hasSubscriptionAccess(activeTenant)).toBe(true);
    expect(
      hasSubscriptionAccess({ ...activeTenant, subscription_status: "trialing" }),
    ).toBe(true);
  });

  it("bloqueia past_due e canceled", () => {
    process.env.BILLING_ENFORCE = "true";
    expect(
      hasSubscriptionAccess({ ...activeTenant, subscription_status: "past_due" }),
    ).toBe(false);
    expect(
      hasSubscriptionAccess({ ...activeTenant, subscription_status: "canceled" }),
    ).toBe(false);
  });

  it("sem enforce libera qualquer tenant", () => {
    delete process.env.BILLING_ENFORCE;
    expect(
      hasSubscriptionAccess({ ...activeTenant, subscription_status: "canceled" }),
    ).toBe(true);
  });

  it("mapSubscriptionSummary indica accessBlocked", () => {
    process.env.BILLING_ENFORCE = "true";
    const summary = mapSubscriptionSummary({
      ...activeTenant,
      subscription_status: "unpaid",
    });
    expect(summary.accessBlocked).toBe(true);
    expect(summary.hasAccess).toBe(false);
  });
});
