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

async function resolveTenantIdFromSlug(req) {
  const slug = String(
    req.headers["x-tenant-slug"] || req.body?.tenantSlug || "",
  ).trim();
  if (!slug) return null;
  const tenant = await tenantRepository.findBySlug(slug);
  return tenant?.id ?? null;
}

function buildDbContext(req) {
  if (pathBypassesRls(req.originalUrl || req.url)) {
    return { bypassRls: true };
  }

  if (req.user?.isPlatformAdmin && (req.originalUrl || req.url || "").includes("/platform/")) {
    return { bypassRls: true };
  }

  if (req.user?.tenantId) {
    return { tenantId: req.user.tenantId };
  }

  return {};
}

function tenantDbContextMiddleware(req, res, next) {
  const run = async () => {
    const ctx = buildDbContext(req);

    if (!ctx.tenantId && !ctx.bypassRls) {
      const tenantId = await resolveTenantIdFromSlug(req);
      if (tenantId) {
        ctx.tenantId = tenantId;
      }
    }

    return runWithDbContext(ctx, () => next());
  };

  run().catch(next);
}

module.exports = { tenantDbContextMiddleware };
