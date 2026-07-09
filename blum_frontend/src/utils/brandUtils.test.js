import { fixEncoding, normalizeBrand } from "./brandUtils";

describe("brandUtils", () => {
  it("fixEncoding retorna string vazia para valores inválidos", () => {
    expect(fixEncoding(null)).toBe("");
    expect(fixEncoding(123)).toBe("");
  });

  it("normalizeBrand mapeia comissão e logo", () => {
    const brand = normalizeBrand({
      id: 1,
      name: "Marca X",
      commission_rate: "5,5",
      logo_url: " https://cdn/logo.png ",
    });
    expect(brand.displayName).toBe("Marca X");
    expect(brand.commission).toBe(5.5);
    expect(brand.logoUrl).toBe("https://cdn/logo.png");
  });

  it("normalizeBrand aceita nome em objeto", () => {
    const brand = normalizeBrand({
      name: { label: "Objeto" },
      commissionRate: 10,
    });
    expect(brand.displayName).toBe("Objeto");
    expect(brand.commission).toBe(10);
  });
});
