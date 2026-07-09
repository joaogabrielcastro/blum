const { normalizeTenantSlug, validateTenantSlug } = require("./tenantSlug");

describe("tenantSlug", () => {
  test("normalizeTenantSlug removes accents and spaces", () => {
    expect(normalizeTenantSlug("Minha Empresa LTDA")).toBe("minha-empresa-ltda");
    expect(normalizeTenantSlug("  São Paulo  ")).toBe("sao-paulo");
  });

  test("validateTenantSlug rejects reserved slugs", () => {
    const result = validateTenantSlug("admin");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/reservado/i);
  });

  test("validateTenantSlug rejects short slug", () => {
    const result = validateTenantSlug("ab");
    expect(result.ok).toBe(false);
  });

  test("normalizeTenantSlug collapses hyphens", () => {
    expect(normalizeTenantSlug("foo---bar")).toBe("foo-bar");
  });
});
