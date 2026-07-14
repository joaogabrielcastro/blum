function getAdminToken() {
  return process.env.CONTROL_PLANE_ADMIN_TOKEN || "";
}

function requireAdmin(req, res, next) {
  const expected = getAdminToken();
  if (!expected) {
    return res.status(503).json({
      error: "CONTROL_PLANE_ADMIN_TOKEN não configurado",
    });
  }

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7).trim()
    : req.headers["x-admin-token"];

  if (!token || token !== expected) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  next();
}

module.exports = { requireAdmin, getAdminToken };
