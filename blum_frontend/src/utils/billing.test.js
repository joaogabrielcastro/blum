import {
  formatBillingDate,
  formatPlanPrice,
  getSubscriptionStatusLabel,
  getSubscriptionStatusStyle,
  isSubscriptionHealthy,
} from "./billing";

describe("billing utils", () => {
  it("mapeia status conhecidos", () => {
    expect(getSubscriptionStatusLabel("active")).toBe("Ativa");
    expect(getSubscriptionStatusStyle("active")).toContain("green");
    expect(getSubscriptionStatusLabel("unknown")).toBe("unknown");
  });

  it("formata preço do plano", () => {
    expect(formatPlanPrice(null)).toBe("—");
    expect(formatPlanPrice({ pricePerMonthLabel: "R$ 99,00" })).toBe(
      "R$ 99,00/mês",
    );
    expect(
      formatPlanPrice({ priceLabel: "R$ 99,00", billingLabel: "Cobrança mensal" }),
    ).toBe("R$ 99,00/mês");
  });

  it("formata data de cobrança", () => {
    expect(formatBillingDate(null)).toBe("—");
    expect(formatBillingDate("invalid")).toBe("—");
    expect(formatBillingDate("2026-03-15T12:00:00.000Z")).toMatch(/2026/);
  });

  it("avalia saúde da assinatura", () => {
    expect(isSubscriptionHealthy(null)).toBe(true);
    expect(isSubscriptionHealthy({ isLegacy: true })).toBe(true);
    expect(
      isSubscriptionHealthy({ billingEnforced: true, hasAccess: false }),
    ).toBe(false);
    expect(
      isSubscriptionHealthy({ billingEnforced: true, hasAccess: true }),
    ).toBe(true);
  });
});
