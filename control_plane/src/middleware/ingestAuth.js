const {
  findProjectByIngestToken,
  findProjectBySlug,
} = require("../services/projectService");

/**
 * Aceita token via:
 * - Authorization: Bearer <ingest_token>
 * - Header x-ingest-token
 * - Query ?token= (útil para Sentry webhook URL)
 */
async function requireIngestAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const bearer = header.startsWith("Bearer ")
      ? header.slice(7).trim()
      : "";
    const token =
      bearer ||
      req.headers["x-ingest-token"] ||
      req.query.token ||
      "";

    if (!token) {
      return res.status(401).json({ error: "Token de ingestão ausente" });
    }

    const project = await findProjectByIngestToken(token);
    if (!project) {
      return res.status(401).json({ error: "Token de ingestão inválido" });
    }

    if (req.params.projectSlug && req.params.projectSlug !== project.slug) {
      return res.status(403).json({ error: "Token não corresponde ao projeto" });
    }

    req.project = project;
    next();
  } catch (err) {
    next(err);
  }
}

/** Variante: resolve projeto pelo slug e valida token. */
async function requireIngestAuthForSlug(req, res, next) {
  try {
    const slug = req.params.projectSlug;
    const bySlug = await findProjectBySlug(slug);
    if (!bySlug || !bySlug.active) {
      return res.status(404).json({ error: "Projeto não encontrado" });
    }
    req.params.projectSlug = bySlug.slug;
    return requireIngestAuth(req, res, next);
  } catch (err) {
    next(err);
  }
}

module.exports = { requireIngestAuth, requireIngestAuthForSlug };
