import { persistAuthSession } from "./authSession";

jest.mock("../constants/tenantStorage", () => ({
  setStoredTenantSlug: jest.fn(),
}));

const { setStoredTenantSlug } = require("../constants/tenantStorage");

describe("authSession", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("persiste token, user e refreshToken", () => {
    const user = persistAuthSession({
      token: "jwt",
      refreshToken: "refresh",
      user: { id: 1, username: "a@test.com", tenantSlug: "acme" },
    });
    expect(localStorage.getItem("token")).toBe("jwt");
    expect(localStorage.getItem("refreshToken")).toBe("refresh");
    expect(JSON.parse(localStorage.getItem("user")).username).toBe("a@test.com");
    expect(setStoredTenantSlug).toHaveBeenCalledWith("acme");
    expect(user.tenantSlug).toBe("acme");
  });

  it("rejeita resposta inválida", () => {
    expect(() => persistAuthSession({ token: "x" })).toThrow(/inválida/i);
  });
});
