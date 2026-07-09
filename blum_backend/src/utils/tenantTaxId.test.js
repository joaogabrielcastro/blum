const {
  validateTenantTaxId,
  validateCpfDigits,
  validateCnpjDigits,
} = require("./tenantTaxId");

describe("tenantTaxId", () => {
  test("valida CPF conhecido", () => {
    expect(validateCpfDigits("52998224725")).toBe(true);
    const result = validateTenantTaxId("529.982.247-25");
    expect(result.ok).toBe(true);
    expect(result.type).toBe("cpf");
    expect(result.taxId).toBe("52998224725");
  });

  test("rejeita CPF inválido", () => {
    expect(validateTenantTaxId("111.111.111-11").ok).toBe(false);
    expect(validateTenantTaxId("123").ok).toBe(false);
  });

  test("valida CNPJ conhecido", () => {
    expect(validateCnpjDigits("11222333000181")).toBe(true);
    const result = validateTenantTaxId("11.222.333/0001-81");
    expect(result.ok).toBe(true);
    expect(result.type).toBe("cnpj");
  });

  test("rejeita CNPJ inválido", () => {
    expect(validateTenantTaxId("00.000.000/0000-00").ok).toBe(false);
  });
});
