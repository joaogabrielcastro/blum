const tenantRepository = require("../repositories/tenantRepository");
const { runWithDbContext } = require("../config/database");

const BYPASS_PATH_PREFIXES = [
  "/api/v2/platform/",
  "/api/v2/tenants/signup",
  "/api/v2/billing/webhook",
];

function pathBypassesRls(path) {
  const p = String(path || "");
  return BYPASS_PATH_PREFIXES.some((prefix) => p.startsWith(prefix));
}

function requestSlug(req) {
  return String(
    req.headers["x-tenant-slug"] || req.body?.tenantSlug || "",
  ).trim();
}

async function resolveTenantIdFromSlug(req) {
  const slug = requestSlug(req);
  if (!slug) return null;
  const tenant = await tenantRepository.findBySlug(slug);
  return tenant?.id ?? null;
}

function tenantMismatchError() {
  const err = new Error(
    "Identificador da empresa não corresponde à sessão autenticada.",
  );
  err.statusCode = 403;
  return err;
}

function tenantDbContextMiddleware(req, res, next) {
  const run = async () => {
    const path = req.originalUrl || req.url || "";

    if (pathBypassesRls(path)) {
      return runWithDbContext({ bypassRls: true }, () => next());
    }

    if (req.user?.isPlatformAdmin && path.includes("/platform/")) {
      return runWithDbContext({ bypassRls: true }, () => next());
    }

    // Sessão autenticada: tenant vem exclusivamente do JWT.
    if (req.user?.tenantId) {
      const headerSlug = requestSlug(req);
      if (
        headerSlug &&
        req.user.tenantSlug &&
        headerSlug !== req.user.tenantSlug
      ) {
        throw tenantMismatchError();
      }
      return runWithDbContext(
        { tenantId: req.user.tenantId },
        () => next(),
      );
    }

    // Rotas públicas (ex.: login): resolve tenant pelo slug enviado.
    const tenantId = await resolveTenantIdFromSlug(req);
    const ctx = tenantId ? { tenantId } : {};
    return runWithDbContext(ctx, () => next());
  };

  run().catch(next);
}

module.exports = { tenantDbContextMiddleware };
