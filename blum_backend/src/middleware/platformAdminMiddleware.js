const { resolvePlatformAdminFlag } = require("../utils/platformAdmin");

function requirePlatformAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }
  if (!resolvePlatformAdminFlag(req.user)) {
    return res.status(403).json({ error: "Acesso restrito à plataforma" });
  }
  return next();
}

module.exports = { requirePlatformAdmin };
