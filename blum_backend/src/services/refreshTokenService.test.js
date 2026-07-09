jest.mock("../config/database", () => ({
  sql: jest.fn().mockResolvedValue([]),
}));

jest.mock("../config/env", () => ({
  getJwtSecret: () => "test-jwt-secret-32-characters-min",
}));

const jwt = require("jsonwebtoken");
const { sql } = require("../config/database");
const refreshTokenService = require("./refreshTokenService");

describe("refreshTokenService", () => {
  beforeEach(() => jest.clearAllMocks());

  test("issueRefreshToken persiste hash no banco", async () => {
    const token = await refreshTokenService.issueRefreshToken({
      tenantId: 1,
      userId: 2,
      userAgent: "jest",
      ipAddress: "127.0.0.1",
    });
    expect(typeof token).toBe("string");
    expect(sql).toHaveBeenCalled();
    const decoded = jwt.decode(token);
    expect(decoded.tenantId).toBe(1);
    expect(decoded.userId).toBe(2);
  });

  test("rotateRefreshToken rejeita token inválido", async () => {
    await expect(
      refreshTokenService.rotateRefreshToken({ refreshToken: "invalid" }),
    ).rejects.toThrow();
  });

  test("rotateRefreshToken renova token válido", async () => {
    const issued = await refreshTokenService.issueRefreshToken({
      tenantId: 1,
      userId: 2,
    });
    sql.mockResolvedValueOnce([
      {
        id: 99,
        tenant_id: 1,
        user_id: 2,
      },
    ]);
    sql.mockResolvedValueOnce([]);

    const rotated = await refreshTokenService.rotateRefreshToken({
      refreshToken: issued,
    });
    expect(rotated.refreshToken).toBeTruthy();
    expect(rotated.tenantId).toBe(1);
  });

  test("revokeRefreshToken ignora token inválido", async () => {
    await expect(
      refreshTokenService.revokeRefreshToken("bad-token"),
    ).rejects.toThrow();
  });
});
