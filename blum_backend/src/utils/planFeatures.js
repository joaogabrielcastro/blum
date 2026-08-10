/**
 * Feature entitlements por plano — IDs alinhados a planComparison.js (frontend).
 */

const { getPlanBySlug } = require("../config/plans");

/** Features gated (Pro+). Starter não inclui. */
const PRO_FEATURE_IDS = [
  "product-import",
  "product-export",
  "purchase-import",
  "price-batch",
  "brand-comparison",
  "excel-export",
  "commission-pdf",
];

const PLAN_RANK = {
  starter: 1,
  professional: 2,
  enterprise: 3,
};

function isLegacyBillingTenant(tenant) {
  if (!tenant) return false;
  return (
    !tenant.subscription_status &&
    !tenant.stripe_subscription_id &&
    !tenant.stripe_customer_id
  );
}

function entitlementsForPlanSlug(planSlug) {
  const plan = getPlanBySlug(planSlug);
  if (!plan) return [];
  return Array.isArray(plan.entitlements) ? plan.entitlements : [];
}

/**
 * Tenant legado (sem Stripe/plan) ou sem plan_slug: tudo liberado.
 * plan_slug conhecido: só entitlements do plano.
 */
function listFeaturesForTenant(tenant) {
  if (!tenant) return [];
  if (isLegacyBillingTenant(tenant) || !tenant.plan_slug) {
    return [...PRO_FEATURE_IDS];
  }
  return entitlementsForPlanSlug(tenant.plan_slug);
}

function tenantHasFeature(tenant, featureId) {
  if (!featureId) return true;
  const features = listFeaturesForTenant(tenant);
  return features.includes(featureId);
}

function requiredPlanForFeature(featureId) {
  if (!PRO_FEATURE_IDS.includes(featureId)) return null;
  return "professional";
}

function planAtLeast(planSlug, minSlug) {
  const a = PLAN_RANK[String(planSlug || "").toLowerCase()] || 0;
  const b = PLAN_RANK[String(minSlug || "").toLowerCase()] || 0;
  return a >= b;
}

module.exports = {
  PRO_FEATURE_IDS,
  PLAN_RANK,
  entitlementsForPlanSlug,
  listFeaturesForTenant,
  tenantHasFeature,
  requiredPlanForFeature,
  planAtLeast,
};
