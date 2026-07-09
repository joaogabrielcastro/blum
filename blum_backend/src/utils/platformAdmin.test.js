const {
  parsePlatformAdminEmails,
  isPlatformAdminEmail,
  resolvePlatformAdminFlag,
} = require("./platformAdmin");

describe("platformAdmin", () => {
  const orig = process.env.PLATFORM_ADMIN_EMAILS;

  afterEach(() => {
    if (orig === undefined) delete process.env.PLATFORM_ADMIN_EMAILS;
    else process.env.PLATFORM_ADMIN_EMAILS = orig;
  });

  test("parsePlatformAdminEmails normaliza lista", () => {
    process.env.PLATFORM_ADMIN_EMAILS = " Admin@JW.com , other@test.com ";
    expect(parsePlatformAdminEmails()).toEqual([
      "admin@jw.com",
      "other@test.com",
    ]);
  });

  test("isPlatformAdminEmail compara case-insensitive", () => {
    process.env.PLATFORM_ADMIN_EMAILS = "admin@jwsoftware.com.br";
    expect(isPlatformAdminEmail("Admin@JWSoftware.com.br")).toBe(true);
    expect(isPlatformAdminEmail("other@test.com")).toBe(false);
  });

  test("resolvePlatformAdminFlag usa flag ou email", () => {
    process.env.PLATFORM_ADMIN_EMAILS = "admin@test.com";
    expect(resolvePlatformAdminFlag({ isPlatformAdmin: true })).toBe(true);
    expect(resolvePlatformAdminFlag({ username: "admin@test.com" })).toBe(true);
    expect(resolvePlatformAdminFlag({ username: "vendedor@test.com" })).toBe(false);
  });
});
