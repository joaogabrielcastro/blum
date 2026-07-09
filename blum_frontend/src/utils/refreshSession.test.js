import { refreshAccessToken } from "../services/auth/refreshSession";

jest.mock("../utils/authSession", () => ({
  persistAuthSession: jest.fn((payload) => payload.user),
}));

global.fetch = jest.fn();

describe("refreshAccessToken", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("renova token e persiste sessão", async () => {
    localStorage.setItem("refreshToken", "rt_old");
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "jwt_new",
        refreshToken: "rt_new",
        user: { id: 1, username: "a@test.com", role: "admin" },
      }),
    });

    const token = await refreshAccessToken();
    expect(token).toBe("jwt_new");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/refresh"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("falha sem refresh token armazenado", async () => {
    await expect(refreshAccessToken()).rejects.toThrow(/expirada/i);
  });
});
