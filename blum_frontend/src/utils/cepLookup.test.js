/**
 * @jest-environment node
 */
import { formatCepDisplay } from "./cepLookup";

describe("cepLookup", () => {
  it("formata CEP para exibição", () => {
    expect(formatCepDisplay("80010000")).toBe("80010-000");
    expect(formatCepDisplay("80010")).toBe("80010");
    expect(formatCepDisplay("")).toBe("");
  });
});
