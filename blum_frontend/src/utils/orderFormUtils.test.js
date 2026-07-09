import {
  allowsDecimalQuantityBrand,
  parseQuantityByBrand,
  safeToFixed,
  toDateTimeLocalValue,
} from "./orderFormUtils";

describe("orderFormUtils", () => {
  it("permite quantidade decimal para marcas específicas", () => {
    expect(allowsDecimalQuantityBrand("Solo Fino")).toBe(true);
    expect(allowsDecimalQuantityBrand("Outra")).toBe(false);
  });

  it("parseQuantityByBrand arredonda conforme marca", () => {
    expect(parseQuantityByBrand("2,5", "solo fino")).toBe(2.5);
    expect(parseQuantityByBrand("2,4", "outra")).toBe(2);
    expect(parseQuantityByBrand("0", "outra")).toBe(0);
  });

  it("toDateTimeLocalValue formata data válida", () => {
    const value = toDateTimeLocalValue("2026-06-15T14:30:00");
    expect(value).toMatch(/^2026-06-15T14:30$/);
    expect(toDateTimeLocalValue("invalid")).toBe("");
  });

  it("safeToFixed trata valores inválidos", () => {
    expect(safeToFixed("abc")).toBe("0.00");
    expect(safeToFixed(10.567, 1)).toBe("10.6");
  });
});
