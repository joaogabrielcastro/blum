/**
 * @jest-environment jsdom
 */
import { resolveTenantSlugFromHost, getTenantLoginUrl } from "./tenantHost";

describe("tenantHost", () => {
  const base = "blum.jwsoftware.com.br";

  test("resolveTenantSlugFromHost em subdomínio produção", () => {
    expect(resolveTenantSlugFromHost("acme.blum.jwsoftware.com.br", base)).toBe("acme");
    expect(resolveTenantSlugFromHost("blum.jwsoftware.com.br", base)).toBeNull();
    expect(resolveTenantSlugFromHost("www.blum.jwsoftware.com.br", base)).toBeNull();
  });

  test("resolveTenantSlugFromHost ignora subdomínios reservados", () => {
    expect(resolveTenantSlugFromHost("api.blum.jwsoftware.com.br", base)).toBeNull();
  });

  test("resolveTenantSlugFromHost suporta acme.localhost", () => {
    expect(resolveTenantSlugFromHost("acme.localhost", base)).toBe("acme");
  });

  test("getTenantLoginUrl monta URL por slug", () => {
    expect(getTenantLoginUrl("acme")).toContain("acme.blum");
    expect(getTenantLoginUrl("default")).toContain("blum.jwsoftware.com.br/login");
  });
});
