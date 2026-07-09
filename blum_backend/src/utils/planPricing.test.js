const {
  formatMoney,
  getBillingIntervalLabel,
  buildPlanPricingFromEnv,
} = require("./planPricing");

describe("planPricing", () => {
  it("formata preço em BRL", () => {
    expect(formatMoney(19900, "brl")).toMatch(/199/);
  });

  it("retorna cobrança mensal", () => {
    expect(getBillingIntervalLabel("month", 1).billingLabel).toBe(
      "Cobrança mensal",
    );
  });

  it("usa valores padrão do env para starter", () => {
    process.env.STRIPE_PRICE_STARTER_AMOUNT = "9900";
    const pricing = buildPlanPricingFromEnv("STRIPE_PRICE_STARTER");
    expect(pricing.amountCents).toBe(9900);
    expect(pricing.billingLabel).toBe("Cobrança mensal");
  });
});
