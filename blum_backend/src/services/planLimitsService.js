const { sql } = require("../config/database");
const tenantRepository = require("../repositories/tenantRepository");
const { getPlanBySlug } = require("../config/plans");

const DEFAULT_LIMITS = { maxUsers: null, maxBrands: null };

function limitsForPlanSlug(planSlug) {
  const plan = getPlanBySlug(planSlug);
  if (!plan) return DEFAULT_LIMITS;
  return plan.limits || DEFAULT_LIMITS;
}

async function getTenantPlanLimits(tenantId) {
  const tenant = await tenantRepository.findBillingById(tenantId);
  if (!tenant) {
    const err = new Error("Empresa não encontrada");
    err.statusCode = 404;
    throw err;
  }
  return {
    planSlug: tenant.plan_slug,
    limits: limitsForPlanSlug(tenant.plan_slug),
  };
}

async function countTenantUsers(tenantId) {
  const rows = await sql`
    SELECT COUNT(*)::int AS count FROM users WHERE tenant_id = ${tenantId}
  `;
  return rows[0]?.count ?? 0;
}

async function countTenantBrands(tenantId) {
  const rows = await sql`
    SELECT COUNT(*)::int AS count FROM brands WHERE tenant_id = ${tenantId}
  `;
  return rows[0]?.count ?? 0;
}

function limitError(message, statusCode = 403) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.expose = true;
  return err;
}

async function assertCanAddUser(tenantId) {
  const { planSlug, limits } = await getTenantPlanLimits(tenantId);
  const maxUsers = limits.maxUsers;
  if (maxUsers == null) return;

  const count = await countTenantUsers(tenantId);
  if (count >= maxUsers) {
    throw limitError(
      `O plano ${planSlug || "atual"} permite até ${maxUsers} usuários. Faça upgrade em Assinatura.`,
    );
  }
}

async function assertCanAddBrand(tenantId) {
  const { planSlug, limits } = await getTenantPlanLimits(tenantId);
  const maxBrands = limits.maxBrands;
  if (maxBrands == null) return;

  const count = await countTenantBrands(tenantId);
  if (count >= maxBrands) {
    throw limitError(
      `O plano ${planSlug || "atual"} permite até ${maxBrands} representada(s). Faça upgrade em Assinatura.`,
    );
  }
}

module.exports = {
  limitsForPlanSlug,
  getTenantPlanLimits,
  assertCanAddUser,
  assertCanAddBrand,
};
