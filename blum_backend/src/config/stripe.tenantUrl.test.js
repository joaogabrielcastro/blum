const {
  getFrontendBaseUrl,
  getFrontendBaseUrlForTenant,
} = require("../config/stripe");

describe("stripe tenant frontend URLs", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("usa FRONTEND_URL para tenant default", () => {
    process.env.FRONTEND_URL = "https://blum.jwsoftware.com.br";
    process.env.TENANT_BASE_DOMAIN = "blum.jwsoftware.com.br";
    expect(getFrontendBaseUrlForTenant("default")).toBe(
      "https://blum.jwsoftware.com.br",
    );
  });

  it("monta subdomínio para tenant com slug", () => {
    process.env.FRONTEND_URL = "https://blum.jwsoftware.com.br";
    process.env.TENANT_BASE_DOMAIN = "blum.jwsoftware.com.br";
    expect(getFrontendBaseUrlForTenant("acme")).toBe(
      "https://acme.blum.jwsoftware.com.br",
    );
  });

  it("respeita TENANT_SUBDOMAIN_ENABLED=false", () => {
    process.env.FRONTEND_URL = "https://blum.jwsoftware.com.br";
    process.env.TENANT_SUBDOMAIN_ENABLED = "false";
    expect(getFrontendBaseUrlForTenant("acme")).toBe(
      getFrontendBaseUrl(),
    );
  });
});
