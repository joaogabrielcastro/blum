const {
  tenantHasFeature,
  listFeaturesForTenant,
  requiredPlanForFeature,
  PRO_FEATURE_IDS,
} = require("./planFeatures");

describe("planFeatures", () => {
  test("Starter não tem entitlements Pro+", () => {
    const tenant = {
      plan_slug: "starter",
      subscription_status: "active",
      stripe_customer_id: "cus_1",
      stripe_subscription_id: "sub_1",
    };
    expect(listFeaturesForTenant(tenant)).toEqual([]);
    expect(tenantHasFeature(tenant, "product-import")).toBe(false);
    expect(tenantHasFeature(tenant, "excel-export")).toBe(false);
  });

  test("Professional e Enterprise têm todas as features Pro+", () => {
    for (const slug of ["professional", "enterprise"]) {
      const tenant = {
        plan_slug: slug,
        subscription_status: "active",
        stripe_customer_id: "cus_1",
        stripe_subscription_id: "sub_1",
      };
      expect(listFeaturesForTenant(tenant)).toEqual(PRO_FEATURE_IDS);
      expect(tenantHasFeature(tenant, "product-import")).toBe(true);
      expect(tenantHasFeature(tenant, "commission-pdf")).toBe(true);
    }
  });

  test("tenant legado (sem Stripe) tem features liberadas", () => {
    const tenant = { id: 1, name: "Legacy Co", plan_slug: null };
    expect(listFeaturesForTenant(tenant)).toEqual(PRO_FEATURE_IDS);
    expect(tenantHasFeature(tenant, "price-batch")).toBe(true);
  });

  test("requiredPlanForFeature aponta para professional", () => {
    expect(requiredPlanForFeature("product-import")).toBe("professional");
    expect(requiredPlanForFeature("unknown")).toBeNull();
  });
});
