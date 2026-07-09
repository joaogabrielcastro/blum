const { isBillingEnforced } = require("../config/stripe");

/** Status Stripe que permitem uso do sistema. */
const ACCESS_GRANTED_STATUSES = new Set(["active", "trialing"]);

/** Status que bloqueiam acesso imediato. */
const ACCESS_BLOCKED_STATUSES = new Set([
  "past_due",
  "unpaid",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "paused",
]);

function isLegacyTenant(tenant) {
  if (!tenant) return false;
  return (
    !tenant.subscription_status &&
    !tenant.stripe_subscription_id &&
    !tenant.stripe_customer_id
  );
}

function requiresSubscriptionCheck(tenant) {
  if (!isBillingEnforced()) return false;
  if (!tenant) return false;
  if (isLegacyTenant(tenant)) return false;
  return true;
}

function hasSubscriptionAccess(tenant) {
  if (!tenant) return false;
  if (!requiresSubscriptionCheck(tenant)) return true;

  const status = String(tenant.subscription_status || "").toLowerCase();
  if (!status) return false;

  if (ACCESS_GRANTED_STATUSES.has(status)) {
    if (status === "canceled" && tenant.subscription_ends_at) {
      const endsAt = new Date(tenant.subscription_ends_at);
      if (!Number.isNaN(endsAt.getTime()) && endsAt.getTime() <= Date.now()) {
        return false;
      }
    }
    return true;
  }

  return false;
}

function isAccessBlockedStatus(status) {
  return ACCESS_BLOCKED_STATUSES.has(String(status || "").toLowerCase());
}

function mapSubscriptionSummary(tenant, plans = []) {
  if (!tenant) return null;

  const plan =
    plans.find((p) => p.slug === tenant.plan_slug) ||
    (tenant.plan_slug ? { slug: tenant.plan_slug, name: tenant.plan_slug } : null);

  const legacy = isLegacyTenant(tenant);
  const hasAccess = hasSubscriptionAccess(tenant);

  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    planSlug: tenant.plan_slug || null,
    planName: plan?.name || null,
    subscriptionStatus: tenant.subscription_status || (legacy ? "legacy" : null),
    stripeCustomerId: tenant.stripe_customer_id || null,
    stripeSubscriptionId: tenant.stripe_subscription_id || null,
    stripePriceId: tenant.stripe_price_id || null,
    trialEndsAt: tenant.trial_ends_at || null,
    subscriptionEndsAt: tenant.subscription_ends_at || null,
    currentPeriodStart: tenant.current_period_start || null,
    currentPeriodEnd: tenant.current_period_end || null,
    cancelAtPeriodEnd: Boolean(tenant.cancel_at_period_end),
    paymentActionRequired: Boolean(tenant.payment_action_required),
    billingEnforced: isBillingEnforced(),
    isLegacy: legacy,
    hasAccess,
    accessBlocked: requiresSubscriptionCheck(tenant) && !hasAccess,
  };
}

module.exports = {
  ACCESS_GRANTED_STATUSES,
  ACCESS_BLOCKED_STATUSES,
  isLegacyTenant,
  requiresSubscriptionCheck,
  hasSubscriptionAccess,
  isAccessBlockedStatus,
  mapSubscriptionSummary,
};
