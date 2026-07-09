const { requirePlatformAdmin } = require("./platformAdminMiddleware");

describe("platformAdminMiddleware", () => {
  test("bloqueia sem user", () => {
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    requirePlatformAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("bloqueia user sem flag admin", () => {
    const req = { user: { username: "vendedor@test.com" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    requirePlatformAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("permite platform admin", () => {
    const req = { user: { isPlatformAdmin: true } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    requirePlatformAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
