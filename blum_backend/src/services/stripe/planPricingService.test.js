jest.mock("./stripeClientService", () => ({
  getStripeClient: jest.fn(),
}));

const { getStripeClient } = require("./stripeClientService");
const {
  listBillingPlansWithPricing,
  getPricingForStripePriceId,
  enrichPlanWithPricing,
} = require("./planPricingService");

describe("planPricingService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test";
    process.env.STRIPE_PRICE_STARTER = "price_starter";
    process.env.STRIPE_PRICE_STARTER_AMOUNT = "9900";
  });

  test("enrichPlanWithPricing usa fallback sem stripePriceId", async () => {
    const plan = await enrichPlanWithPricing({
      slug: "starter",
      name: "Starter",
      stripePriceId: null,
    });
    expect(plan.amountCents).toBe(9900);
  });

  test("enrichPlanWithPricing busca preço no Stripe", async () => {
    getStripeClient.mockReturnValue({
      prices: {
        retrieve: jest.fn().mockResolvedValue({
          unit_amount: 12000,
          currency: "brl",
          recurring: { interval: "month" },
        }),
      },
    });

    const plan = await enrichPlanWithPricing({
      slug: "starter",
      stripePriceId: "price_starter",
    });
    expect(plan.amountCents).toBe(12000);
  });

  test("getPricingForStripePriceId retorna null sem id", async () => {
    const result = await getPricingForStripePriceId(null);
    expect(result).toBeNull();
  });

  test("listBillingPlansWithPricing retorna planos", async () => {
    const plans = await listBillingPlansWithPricing();
    expect(Array.isArray(plans)).toBe(true);
  });
});
