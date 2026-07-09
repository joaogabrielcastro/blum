import {
  brandIdFromSelection,
  brandNameFromSelection,
  findBrandById,
  findBrandByName,
} from "./brandSelection";

const brands = [
  { id: 1, name: "Marca A" },
  { id: 2, name: "Marca B" },
];

describe("brandSelection", () => {
  it("encontra marca por id ou nome", () => {
    expect(findBrandById(brands, 1)?.name).toBe("Marca A");
    expect(findBrandByName(brands, "Marca B")?.id).toBe(2);
    expect(findBrandById(brands, null)).toBeNull();
  });

  it("resolve seleção por id ou nome", () => {
    expect(brandNameFromSelection(brands, { brandId: 2 })).toBe("Marca B");
    expect(brandNameFromSelection(brands, { brandName: "Marca A" })).toBe(
      "Marca A",
    );
    expect(brandIdFromSelection(brands, { brandName: "Marca B" })).toBe("2");
    expect(brandIdFromSelection(brands, { brandId: 1 })).toBe("1");
  });
});
