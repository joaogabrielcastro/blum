const { requireTenantId, tenantIdFromAuth } = require("./tenantContext");

describe("tenantContext", () => {
  test("requireTenantId aceita inteiro válido", () => {
    expect(requireTenantId(5)).toBe(5);
    expect(requireTenantId("3")).toBe(3);
  });

  test("requireTenantId rejeita inválido", () => {
    expect(() => requireTenantId(0)).toThrow(/obrigatório/i);
    expect(() => requireTenantId("x")).toThrow(/obrigatório/i);
  });

  test("tenantIdFromAuth exige tenant no user", () => {
    expect(() => tenantIdFromAuth(null)).toThrow(/ausente/i);
    expect(tenantIdFromAuth({ tenantId: 2 })).toBe(2);
  });
});
