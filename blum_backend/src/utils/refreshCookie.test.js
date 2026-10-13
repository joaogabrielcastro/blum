const {
  COOKIE_NAME,
  readRefreshCookie,
  setRefreshCookie,
  clearRefreshCookie,
} = require("./refreshCookie");

describe("refreshCookie", () => {
  test("lê o token do cookie sem expor outros cookies", () => {
    const req = { headers: { cookie: `theme=dark; ${COOKIE_NAME}=token%20seguro` } };
    expect(readRefreshCookie(req)).toBe("token seguro");
  });

  test("define cookie HttpOnly e SameSite", () => {
    const res = { cookie: jest.fn(), clearCookie: jest.fn() };
    setRefreshCookie(res, "token");
    expect(res.cookie).toHaveBeenCalledWith(
      COOKIE_NAME,
      "token",
      expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
    );
    clearRefreshCookie(res);
    expect(res.clearCookie).toHaveBeenCalledWith(
      COOKIE_NAME,
      expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
    );
  });
});
