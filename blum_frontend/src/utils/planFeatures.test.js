import { canUseFeature } from "./planFeatures";

describe("planFeatures canUseFeature", () => {
  it("libera sem subscription ou legado", () => {
    expect(canUseFeature(null, "product-import")).toBe(true);
    expect(canUseFeature({ isLegacy: true }, "product-import")).toBe(true);
    expect(canUseFeature({ planSlug: null }, "excel-export")).toBe(true);
  });

  it("bloqueia Starter", () => {
    expect(
      canUseFeature(
        { planSlug: "starter", features: [] },
        "product-import",
      ),
    ).toBe(false);
  });

  it("libera Pro via features array", () => {
    expect(
      canUseFeature(
        { planSlug: "professional", features: ["product-import"] },
        "product-import",
      ),
    ).toBe(true);
  });
});
