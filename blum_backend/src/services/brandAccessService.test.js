jest.mock("../config/database", () => ({
  sql: jest.fn(),
}));

const { sql } = require("../config/database");
const brandAccessService = require("./brandAccessService");

describe("brandAccessService", () => {
  beforeEach(() => jest.clearAllMocks());

  test("admin não tem restrição de marcas", async () => {
    const result = await brandAccessService.getRestrictedBrandNamesOrNull(1, "admin", 1);
    expect(result).toBeNull();
    expect(sql).not.toHaveBeenCalled();
  });

  test("vendedor sem linhas = sem restrição", async () => {
    sql.mockResolvedValueOnce([]);
    const result = await brandAccessService.getRestrictedBrandNamesOrNull(2, "salesperson", 1);
    expect(result).toBeNull();
  });

  test("vendedor com marcas retorna nomes", async () => {
    sql.mockResolvedValueOnce([{ name: "Marca A" }, { name: "Marca B" }]);
    const result = await brandAccessService.getRestrictedBrandNamesOrNull(2, "salesperson", 1);
    expect(result).toEqual(["Marca A", "Marca B"]);
  });

  test("setAllowedBrandIdsForUser substitui marcas", async () => {
    sql.mockResolvedValue([]);
    await brandAccessService.setAllowedBrandIdsForUser(2, [1, 2, 2], 1);
    expect(sql).toHaveBeenCalled();
  });
});
