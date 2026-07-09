const jwt = require("jsonwebtoken");
const { authenticate, authorize, optionalAuth } = require("./authMiddleware");

jest.mock("../config/env", () => ({
  getJwtSecret: () => "test-jwt-secret-32-characters-min",
}));

function mockReqRes(headers = {}) {
  const req = { headers };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

describe("authMiddleware", () => {
  test("authenticate rejeita sem header", () => {
    const { req, res, next } = mockReqRes();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("authenticate aceita token válido com tenant", () => {
    const token = jwt.sign(
      {
        userId: 1,
        username: "admin@test.com",
        role: "admin",
        tenantId: 1,
        tenantSlug: "default",
      },
      "test-jwt-secret-32-characters-min",
    );
    const { req, res, next } = mockReqRes({
      authorization: `Bearer ${token}`,
    });
    authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.tenantId).toBe(1);
    expect(req.user.isPlatformAdmin).toBe(false);
  });

  test("authenticate rejeita token sem tenantId", () => {
    const token = jwt.sign(
      { userId: 1, username: "x", role: "admin" },
      "test-jwt-secret-32-characters-min",
    );
    const { req, res, next } = mockReqRes({
      authorization: `Bearer ${token}`,
    });
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("authorize bloqueia role incorreta", () => {
    const { req, res, next } = mockReqRes();
    req.user = { role: "salesperson" };
    authorize("admin")(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("authorize permite role correta", () => {
    const { req, res, next } = mockReqRes();
    req.user = { role: "admin" };
    authorize("admin")(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test("authenticate rejeita token expirado", () => {
    const token = jwt.sign(
      { userId: 1, username: "x", role: "admin", tenantId: 1 },
      "test-jwt-secret-32-characters-min",
      { expiresIn: -10 },
    );
    const { req, res, next } = mockReqRes({
      authorization: `Bearer ${token}`,
    });
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/expirado/i) }),
    );
  });

  test("optionalAuth popula user com token válido", () => {
    const token = jwt.sign(
      { userId: 1, username: "x", role: "admin", tenantId: 1 },
      "test-jwt-secret-32-characters-min",
    );
    const { req, res, next } = mockReqRes({
      authorization: `Bearer ${token}`,
    });
    optionalAuth(req, res, next);
    expect(req.user.tenantId).toBe(1);
    expect(next).toHaveBeenCalled();
  });

  test("authenticate rejeita formato inválido do header", () => {
    const { req, res, next } = mockReqRes({ authorization: "Token xyz" });
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("authenticate rejeita token mal assinado", () => {
    const { req, res, next } = mockReqRes({
      authorization: "Bearer not-a-valid-jwt",
    });
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/inválido/i) }),
    );
  });

  test("authorize exige usuário autenticado", () => {
    const { req, res, next } = mockReqRes();
    authorize("admin")(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("optionalAuth continua sem header", () => {
    const { req, res, next } = mockReqRes();
    optionalAuth(req, res, next);
    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalled();
  });

  test("optionalAuth ignora token inválido", () => {
    const { req, res, next } = mockReqRes({
      authorization: "Bearer bad-token",
    });
    optionalAuth(req, res, next);
    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalled();
  });
});
