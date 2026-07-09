const tenantRepository = require("../repositories/tenantRepository");
const { logAuditEvent } = require("./auditService");
const { requireTenantId } = require("../utils/tenantContext");

const ALLOWED_STATUSES = new Set(["active", "suspended"]);

async function listTenants(query = {}) {
  const limit = query.limit;
  const offset = query.offset;
  const rows = await tenantRepository.listAllTenants({ limit, offset });
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    planSlug: row.plan_slug,
    subscriptionStatus: row.subscription_status,
    billingEmail: row.billing_email,
    userCount: row.user_count,
    orderCount: row.order_count,
    createdAt: row.created_at,
    onboardingCompletedAt: row.onboarding_completed_at,
  }));
}

async function getTenantDetail(tenantId) {
  const id = requireTenantId(tenantId);
  const row = await tenantRepository.getTenantDetail(id);
  if (!row) {
    const err = new Error("Empresa não encontrada");
    err.statusCode = 404;
    throw err;
  }
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    planSlug: row.plan_slug,
    subscriptionStatus: row.subscription_status,
    billingEmail: row.billing_email,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    onboardingCompletedAt: row.onboarding_completed_at,
    createdAt: row.created_at,
    userCount: row.user_count,
    orderCount: row.order_count,
    brandCount: row.brand_count,
    lastLoginAt: row.last_login_at,
  };
}

async function updateTenantStatus({
  tenantId,
  status,
  actorUserId,
  requestId,
}) {
  const id = requireTenantId(tenantId);
  const normalized = String(status || "").trim().toLowerCase();
  if (!ALLOWED_STATUSES.has(normalized)) {
    const err = new Error('Status inválido. Use "active" ou "suspended".');
    err.statusCode = 400;
    throw err;
  }

  const tenant = await tenantRepository.findBillingById(id);
  if (!tenant) {
    const err = new Error("Empresa não encontrada");
    err.statusCode = 404;
    throw err;
  }

  const updated = await tenantRepository.updateTenantStatus(id, normalized);
  if (!updated) {
    const err = new Error("Empresa não encontrada");
    err.statusCode = 404;
    throw err;
  }

  await logAuditEvent({
    tenantId: id,
    actorUserId,
    action: "platform.tenant.status.update",
    resourceType: "tenant",
    resourceId: String(id),
    requestId,
    metadata: { status: normalized, slug: updated.slug },
  });

  return {
    id: updated.id,
    slug: updated.slug,
    name: updated.name,
    status: updated.status,
  };
}

module.exports = {
  listTenants,
  getTenantDetail,
  updateTenantStatus,
};
