const clientMapper = require("./clientMapper");

describe("clientMapper", () => {
  test("normalizeClientBody mapeia campos principais", () => {
    const body = clientMapper.normalizeClientBody({
      companyname: "Empresa LTDA",
      nome_fantasia: "Fantasia",
      email: " contato@test.com ",
      cnpj: "12.345.678/0001-90",
      phone: "41999999999",
      region: "PR",
    });
    expect(body.companyName).toBe("Empresa LTDA");
    expect(body.nomeFantasia).toBe("Fantasia");
    expect(body.email).toBe("contato@test.com");
    expect(body.cnpj).toBe("12345678000190");
  });

  test("normalizeClientBody rejeita payload inválido", () => {
    expect(() => clientMapper.normalizeClientBody(null)).toThrow(/inválidos/i);
  });

  test("mapClientRow monta displayName e endereço", () => {
    const row = clientMapper.mapClientRow({
      id: 1,
      razao_social: "Empresa SA",
      nome_fantasia: "Fantasia",
      contact_person: "João",
      logradouro: "Rua A",
      numero: "10",
      bairro: "Centro",
      cidade: "Curitiba",
      cep: "80000-000",
      created_at: "2026-01-01",
    });
    expect(row.displayName).toBe("Empresa SA");
    expect(row.street).toBe("Rua A");
    expect(row.zipcode).toBe("80000-000");
    expect(row.createdAt).toBe("2026-01-01");
  });

  test("mapClientRow usa CNPJ como fallback de displayName", () => {
    const row = clientMapper.mapClientRow({ cnpj: "12345678000190" });
    expect(row.displayName).toBe("CNPJ 12345678000190");
  });

  test("mapClients mapeia lista", () => {
    const rows = clientMapper.mapClients([{ companyname: "A" }, { companyname: "B" }]);
    expect(rows).toHaveLength(2);
    expect(rows[0].companyName).toBe("A");
  });
});
