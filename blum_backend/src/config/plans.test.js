const {
  getPlanBySlug,
  getPlanByStripePriceId,
  getStripePriceIdForPlan,
  listAvailablePlans,
  assertPlanAvailable,
} = require("./plans");

describe("plans config", () => {
  const origStarter = process.env.STRIPE_PRICE_STARTER;

  beforeEach(() => {
    process.env.STRIPE_PRICE_STARTER = "price_starter_test";
    process.env.STRIPE_PRICE_STARTER_AMOUNT = "9900";
  });

  afterEach(() => {
    if (origStarter === undefined) delete process.env.STRIPE_PRICE_STARTER;
    else process.env.STRIPE_PRICE_STARTER = origStarter;
  });

  test("getPlanBySlug normaliza slug", () => {
    expect(getPlanBySlug("STARTER")?.name).toBe("Starter");
    expect(getPlanBySlug("invalid")).toBeNull();
  });

  test("getPlanByStripePriceId resolve pelo env", () => {
    expect(getPlanByStripePriceId("price_starter_test")?.slug).toBe("starter");
  });

  test("getStripePriceIdForPlan lê env", () => {
    expect(getStripePriceIdForPlan("starter")).toBe("price_starter_test");
  });

  test("listAvailablePlans filtra planos com price id", () => {
    const plans = listAvailablePlans();
    expect(plans.some((p) => p.slug === "starter")).toBe(true);
  });

  test("assertPlanAvailable lança para slug inválido", () => {
    expect(() => assertPlanAvailable("nope")).toThrow(/inválido/i);
  });

  test("assertPlanAvailable retorna plan e priceId", () => {
    const { plan, priceId } = assertPlanAvailable("starter");
    expect(plan.slug).toBe("starter");
    expect(priceId).toBe("price_starter_test");
  });
});
