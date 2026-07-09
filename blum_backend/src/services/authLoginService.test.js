jest.mock("../repositories/authRepository", () => ({
  findUserByUsernameAndTenantSlug: jest.fn(),
  findUsersByUsername: jest.fn(),
}));

jest.mock("bcrypt", () => ({
  compare: jest.fn(),
}));

const bcrypt = require("bcrypt");
const authRepository = require("../repositories/authRepository");
const {
  normalizeTenantSlug,
  resolveLoginTenantSlug,
  findUsersForLogin,
  matchUsersByPassword,
  buildTenantChoicePayload,
} = require("./authLoginService");

describe("authLoginService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("normalizeTenantSlug trata vazio como null", () => {
    expect(normalizeTenantSlug("")).toBeNull();
    expect(normalizeTenantSlug("  ")).toBeNull();
    expect(normalizeTenantSlug("blu1m")).toBe("blu1m");
  });

  test("findUsersForLogin com slug usa busca por tenant", async () => {
    authRepository.findUserByUsernameAndTenantSlug.mockResolvedValue([{ id: 1 }]);
    const rows = await findUsersForLogin("eduardo", "blu1m");
    expect(authRepository.findUserByUsernameAndTenantSlug).toHaveBeenCalledWith(
      "eduardo",
      "blu1m",
    );
    expect(rows).toHaveLength(1);
  });

  test("findUsersForLogin sem slug busca global", async () => {
    authRepository.findUsersByUsername.mockResolvedValue([{ id: 2 }]);
    const rows = await findUsersForLogin("eduardo", null);
    expect(authRepository.findUsersByUsername).toHaveBeenCalledWith("eduardo");
    expect(rows).toHaveLength(1);
  });

  test("matchUsersByPassword ignora tenant suspenso", async () => {
    bcrypt.compare.mockResolvedValue(true);
    const { matched, suspendedValid } = await matchUsersByPassword(
      [
        { id: 1, tenant_status: "suspended", password_hash: "h" },
        { id: 2, tenant_status: "active", password_hash: "h" },
      ],
      "secret",
    );
    expect(matched).toHaveLength(1);
    expect(matched[0].id).toBe(2);
    expect(suspendedValid).toHaveLength(1);
  });

  test("resolveLoginTenantSlug ignora default do body (frontend legado)", () => {
    expect(resolveLoginTenantSlug("default", undefined)).toBeNull();
    expect(resolveLoginTenantSlug("default", "default")).toBe("default");
    expect(resolveLoginTenantSlug("blu1m", undefined)).toBe("blu1m");
  });

  test("buildTenantChoicePayload expõe slug, nome e role", () => {
    expect(
      buildTenantChoicePayload({
        tenant_slug: "blu1m",
        tenant_name: "Blu1m",
        role: "salesperson",
      }),
    ).toEqual({
      slug: "blu1m",
      name: "Blu1m",
      role: "salesperson",
    });
  });
});
