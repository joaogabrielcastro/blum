import {
  formatTaxIdInput,
  validateTaxIdClient,
} from "./taxId";

describe("taxId utils", () => {
  test("formata CPF", () => {
    expect(formatTaxIdInput("52998224725")).toBe("529.982.247-25");
  });

  test("formata CNPJ", () => {
    expect(formatTaxIdInput("11222333000181")).toBe("11.222.333/0001-81");
  });

  test("valida CPF", () => {
    const result = validateTaxIdClient("529.982.247-25");
    expect(result.ok).toBe(true);
    expect(result.type).toBe("cpf");
  });

  test("rejeita documento incompleto", () => {
    expect(validateTaxIdClient("123").ok).toBe(false);
  });
});
