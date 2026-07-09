const { sql } = require("../config/database");

async function findBySlug(slug) {
  const rows = await sql`
    SELECT
      id,
      slug,
      name,
      status,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_price_id,
      plan_slug,
      subscription_status,
      trial_ends_at,
      subscription_ends_at,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      payment_action_required,
      billing_email,
      onboarding_completed_at,
      created_at
    FROM tenants
    WHERE slug = ${slug}
    LIMIT 1
  `;
  return rows[0] || null;
}

async function slugExists(slug) {
  const rows = await sql`
    SELECT id FROM tenants WHERE slug = ${slug} LIMIT 1
  `;
  return rows.length > 0;
}

async function createTenant({ slug, name, billingEmail = null, status = "active" }) {
  const rows = await sql`
    INSERT INTO tenants (slug, name, status, billing_email, onboarding_completed_at)
    VALUES (${slug}, ${name}, ${status}, ${billingEmail}, NOW())
    RETURNING
      id,
      slug,
      name,
      status,
      billing_email,
      onboarding_completed_at,
      created_at
  `;
  return rows[0];
}

async function findBillingById(tenantId) {
  const rows = await sql`
    SELECT
      id,
      slug,
      name,
      status,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_price_id,
      plan_slug,
      subscription_status,
      trial_ends_at,
      subscription_ends_at,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      payment_action_required,
      billing_email,
      onboarding_completed_at
    FROM tenants
    WHERE id = ${tenantId}
    LIMIT 1
  `;
  return rows[0] || null;
}

async function findByStripeCustomerId(stripeCustomerId) {
  const rows = await sql`
    SELECT
      id,
      slug,
      name,
      status,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_price_id,
      plan_slug,
      subscription_status,
      trial_ends_at,
      subscription_ends_at,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      payment_action_required,
      billing_email
    FROM tenants
    WHERE stripe_customer_id = ${stripeCustomerId}
    LIMIT 1
  `;
  return rows[0] || null;
}

async function findByStripeSubscriptionId(stripeSubscriptionId) {
  const rows = await sql`
    SELECT
      id,
      slug,
      name,
      status,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_price_id,
      plan_slug,
      subscription_status,
      trial_ends_at,
      subscription_ends_at,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      payment_action_required,
      billing_email
    FROM tenants
    WHERE stripe_subscription_id = ${stripeSubscriptionId}
    LIMIT 1
  `;
  return rows[0] || null;
}

async function updateStripeCustomerId(tenantId, stripeCustomerId, billingEmail = null) {
  await sql`
    UPDATE tenants
    SET
      stripe_customer_id = ${stripeCustomerId},
      billing_email = COALESCE(${billingEmail}, billing_email)
    WHERE id = ${tenantId}
  `;
}

async function updateBillingFromSubscription(tenantId, data) {
  await sql`
    UPDATE tenants
    SET
      stripe_subscription_id = ${data.stripeSubscriptionId ?? null},
      stripe_price_id = ${data.stripePriceId ?? null},
      plan_slug = ${data.planSlug ?? null},
      subscription_status = ${data.subscriptionStatus ?? null},
      trial_ends_at = ${data.trialEndsAt ?? null},
      subscription_ends_at = ${data.subscriptionEndsAt ?? null},
      current_period_start = ${data.currentPeriodStart ?? null},
      current_period_end = ${data.currentPeriodEnd ?? null},
      cancel_at_period_end = ${data.cancelAtPeriodEnd ?? false},
      payment_action_required = ${data.paymentActionRequired ?? false}
    WHERE id = ${tenantId}
  `;
}

async function findAdminEmailForTenant(tenantId) {
  const rows = await sql`
    SELECT u.username
    FROM users u
    WHERE u.tenant_id = ${tenantId}
      AND u.role = 'admin'
    ORDER BY u.id ASC
    LIMIT 1
  `;
  return rows[0]?.username || null;
}

async function listAllTenants({ limit = 100, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  const rows = await sql`
    SELECT
      t.id,
      t.slug,
      t.name,
      t.status,
      t.plan_slug,
      t.subscription_status,
      t.billing_email,
      t.created_at,
      t.onboarding_completed_at,
      (SELECT COUNT(*)::int FROM users u WHERE u.tenant_id = t.id) AS user_count,
      (SELECT COUNT(*)::int FROM orders o WHERE o.tenant_id = t.id) AS order_count
    FROM tenants t
    ORDER BY t.created_at DESC
    LIMIT ${safeLimit} OFFSET ${safeOffset}
  `;
  return rows;
}

async function getTenantDetail(tenantId) {
  const rows = await sql`
    SELECT
      t.id,
      t.slug,
      t.name,
      t.status,
      t.plan_slug,
      t.subscription_status,
      t.billing_email,
      t.stripe_customer_id,
      t.stripe_subscription_id,
      t.current_period_end,
      t.cancel_at_period_end,
      t.onboarding_completed_at,
      t.created_at,
      (SELECT COUNT(*)::int FROM users u WHERE u.tenant_id = t.id) AS user_count,
      (SELECT COUNT(*)::int FROM orders o WHERE o.tenant_id = t.id) AS order_count,
      (SELECT COUNT(*)::int FROM brands b WHERE b.tenant_id = t.id) AS brand_count,
      (
        SELECT MAX(al.created_at)
        FROM audit_logs al
        WHERE al.tenant_id = t.id
          AND al.action IN ('auth.login', 'auth.login.success')
      ) AS last_login_at
    FROM tenants t
    WHERE t.id = ${tenantId}
    LIMIT 1
  `;
  return rows[0] || null;
}

async function updateTenantStatus(tenantId, status) {
  const rows = await sql`
    UPDATE tenants
    SET status = ${status}
    WHERE id = ${tenantId}
    RETURNING id, slug, name, status
  `;
  return rows[0] || null;
}

module.exports = {
  findBySlug,
  slugExists,
  createTenant,
  findBillingById,
  findByStripeCustomerId,
  findByStripeSubscriptionId,
  updateStripeCustomerId,
  updateBillingFromSubscription,
  findAdminEmailForTenant,
  listAllTenants,
  getTenantDetail,
  updateTenantStatus,
};
