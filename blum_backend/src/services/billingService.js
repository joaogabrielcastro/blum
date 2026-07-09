const tenantRepository = require("../repositories/tenantRepository");
const { logAuditEvent } = require("./auditService");
const {
  getPlanByStripePriceId,
  assertPlanAvailable,
  getStripePriceIdForPlan,
  listAvailablePlans,
} = require("../config/plans");
const {
  getStripeClient,
  mapSubscriptionToBillingData,
} = require("./stripe/stripeClientService");
const { buildSubscriptionCheckoutParams } = require("./stripe/checkoutSessionBuilder");
const {
  assertStripeConfigured,
  getFrontendBaseUrlForTenant,
} = require("../config/stripe");
const {
  mapSubscriptionSummary,
  hasSubscriptionAccess,
} = require("../utils/subscriptionAccess");
const {
  listBillingPlansWithPricing,
  getPricingForStripePriceId,
} = require("./stripe/planPricingService");

function isValidEmail(value) {
  if (!value || typeof value !== "string") return false;
  const email = value.trim();
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function resolveCustomerEmail(tenant, adminUsername) {
  if (isValidEmail(tenant?.billing_email)) {
    return tenant.billing_email.trim();
  }
  if (isValidEmail(adminUsername)) {
    return adminUsername.trim();
  }
  return undefined;
}

async function getOrCreateStripeCustomer(tenantId) {
  const tenant = await tenantRepository.findBillingById(tenantId);
  if (!tenant) {
    const err = new Error("Empresa não encontrada");
    err.status = 404;
    err.expose = true;
    throw err;
  }

  if (tenant.stripe_customer_id) {
    return { tenant, customerId: tenant.stripe_customer_id };
  }

  const stripe = getStripeClient();
  const adminUsername = await tenantRepository.findAdminEmailForTenant(tenantId);
  const customerEmail = resolveCustomerEmail(tenant, adminUsername);

  const customerPayload = {
    name: tenant.name,
    metadata: {
      tenant_id: String(tenantId),
      tenant_slug: tenant.slug,
    },
  };
  if (customerEmail) {
    customerPayload.email = customerEmail;
  }

  const customer = await stripe.customers.create(customerPayload);

  await tenantRepository.updateStripeCustomerId(
    tenantId,
    customer.id,
    customerEmail || null,
  );

  return {
    tenant: { ...tenant, stripe_customer_id: customer.id },
    customerId: customer.id,
  };
}

async function getSubscriptionSummary(tenantId) {
  const tenant = await tenantRepository.findBillingById(tenantId);
  if (!tenant) {
    const err = new Error("Empresa não encontrada");
    err.status = 404;
    err.expose = true;
    throw err;
  }

  const plans = await listBillingPlansWithPricing();
  const summary = mapSubscriptionSummary(tenant, plans);

  const pricing =
    (tenant.stripe_price_id &&
      (await getPricingForStripePriceId(
        tenant.stripe_price_id,
        tenant.plan_slug,
      ))) ||
    plans.find((p) => p.slug === tenant.plan_slug);

  if (pricing) {
    summary.priceLabel = pricing.priceLabel;
    summary.pricePerMonthLabel = pricing.pricePerMonthLabel;
    summary.amountCents = pricing.amountCents;
    summary.currency = pricing.currency;
    summary.billingLabel = pricing.billingLabel || "Cobrança mensal";
    summary.interval = pricing.interval || "month";
    summary.intervalCount = pricing.intervalCount || 1;
  }

  return summary;
}

async function listBillingPlans() {
  return listBillingPlansWithPricing();
}

async function createCheckoutSession({ tenantId, planSlug, userId, requestId }) {
  assertStripeConfigured();
  const { plan, priceId } = assertPlanAvailable(planSlug);
  const { customerId, tenant } = await getOrCreateStripeCustomer(tenantId);
  const stripe = getStripeClient();
  const billingTenant = tenant || (await tenantRepository.findBillingById(tenantId));
  const baseUrl = getFrontendBaseUrlForTenant(billingTenant?.slug);
  const hasActiveSub =
    billingTenant?.stripe_subscription_id &&
    ["active", "trialing", "past_due"].includes(
      String(billingTenant?.subscription_status || "").toLowerCase(),
    );

  if (hasActiveSub) {
    const err = new Error(
      "Já existe uma assinatura ativa. Use a opção de alterar plano ou o portal do cliente.",
    );
    err.status = 409;
    err.expose = true;
    throw err;
  }

  const session = await stripe.checkout.sessions.create(
    buildSubscriptionCheckoutParams({
      customerId,
      priceId,
      tenantId,
      planSlug: plan.slug,
      baseUrl,
    }),
  );

  await logAuditEvent({
    tenantId,
    actorUserId: userId,
    action: "billing.checkout.created",
    resourceType: "plan",
    resourceId: plan.slug,
    requestId,
    metadata: { sessionId: session.id },
  });

  return { url: session.url, sessionId: session.id };
}

async function createCustomerPortalSession({ tenantId, userId, requestId }) {
  assertStripeConfigured();
  const { customerId, tenant } = await getOrCreateStripeCustomer(tenantId);
  const stripe = getStripeClient();
  const baseUrl = getFrontendBaseUrlForTenant(tenant?.slug);

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/subscription`,
  });

  await logAuditEvent({
    tenantId,
    actorUserId: userId,
    action: "billing.portal.opened",
    resourceType: "stripe_customer",
    resourceId: customerId,
    requestId,
  });

  return { url: session.url };
}

async function changePlan({ tenantId, planSlug, userId, requestId }) {
  assertStripeConfigured();
  const { plan, priceId } = assertPlanAvailable(planSlug);
  const tenant = await tenantRepository.findBillingById(tenantId);

  if (!tenant?.stripe_subscription_id) {
    const err = new Error("Nenhuma assinatura ativa para alterar o plano");
    err.status = 400;
    err.expose = true;
    throw err;
  }

  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(
    tenant.stripe_subscription_id,
  );
  const itemId = subscription.items?.data?.[0]?.id;

  if (!itemId) {
    const err = new Error("Assinatura inválida no Stripe");
    err.status = 500;
    err.expose = true;
    throw err;
  }

  const updated = await stripe.subscriptions.update(tenant.stripe_subscription_id, {
    items: [{ id: itemId, price: priceId }],
    proration_behavior: "create_prorations",
    metadata: {
      tenant_id: String(tenantId),
      plan_slug: plan.slug,
    },
  });

  const billingData = mapSubscriptionToBillingData(updated, plan.slug);
  await tenantRepository.updateBillingFromSubscription(tenantId, billingData);

  await logAuditEvent({
    tenantId,
    actorUserId: userId,
    action: "billing.plan.changed",
    resourceType: "plan",
    resourceId: plan.slug,
    requestId,
    metadata: { subscriptionId: updated.id },
  });

  return getSubscriptionSummary(tenantId);
}

async function cancelSubscription({ tenantId, userId, requestId }) {
  assertStripeConfigured();
  const tenant = await tenantRepository.findBillingById(tenantId);

  if (!tenant?.stripe_subscription_id) {
    const err = new Error("Nenhuma assinatura ativa para cancelar");
    err.status = 400;
    err.expose = true;
    throw err;
  }

  const stripe = getStripeClient();
  const updated = await stripe.subscriptions.update(tenant.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  const plan = getPlanByStripePriceId(extractPriceFromSub(updated));
  const billingData = mapSubscriptionToBillingData(
    updated,
    plan?.slug || tenant.plan_slug,
  );
  await tenantRepository.updateBillingFromSubscription(tenantId, billingData);

  await logAuditEvent({
    tenantId,
    actorUserId: userId,
    action: "billing.subscription.cancel_scheduled",
    resourceType: "subscription",
    resourceId: updated.id,
    requestId,
  });

  return getSubscriptionSummary(tenantId);
}

async function reactivateSubscription({ tenantId, userId, requestId }) {
  assertStripeConfigured();
  const tenant = await tenantRepository.findBillingById(tenantId);

  if (!tenant?.stripe_subscription_id) {
    const err = new Error("Nenhuma assinatura para reativar");
    err.status = 400;
    err.expose = true;
    throw err;
  }

  const stripe = getStripeClient();
  const current = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id);

  if (current.status === "canceled") {
    if (!tenant.plan_slug) {
      const err = new Error(
        "Assinatura cancelada. Escolha um plano para assinar novamente.",
      );
      err.status = 400;
      err.expose = true;
      throw err;
    }
    const priceId = getStripePriceIdForPlan(tenant.plan_slug);
    if (!priceId) {
      const err = new Error("Plano anterior não está mais disponível");
      err.status = 400;
      err.expose = true;
      throw err;
    }
    const { customerId, tenant: billingTenant } = await getOrCreateStripeCustomer(tenantId);
    const baseUrl = getFrontendBaseUrlForTenant(billingTenant?.slug);
    const session = await stripe.checkout.sessions.create(
      buildSubscriptionCheckoutParams({
        customerId,
        priceId,
        tenantId,
        planSlug: billingTenant.plan_slug,
        baseUrl,
      }),
    );
    return { requiresCheckout: true, url: session.url };
  }

  const updated = await stripe.subscriptions.update(tenant.stripe_subscription_id, {
    cancel_at_period_end: false,
  });

  const plan = getPlanByStripePriceId(extractPriceFromSub(updated));
  const billingData = mapSubscriptionToBillingData(
    updated,
    plan?.slug || tenant.plan_slug,
  );
  await tenantRepository.updateBillingFromSubscription(tenantId, billingData);

  await logAuditEvent({
    tenantId,
    actorUserId: userId,
    action: "billing.subscription.reactivated",
    resourceType: "subscription",
    resourceId: updated.id,
    requestId,
  });

  return {
    requiresCheckout: false,
    subscription: await getSubscriptionSummary(tenantId),
  };
}

function extractPriceFromSub(subscription) {
  return subscription?.items?.data?.[0]?.price?.id || null;
}

async function assertTenantHasAccess(tenantId) {
  const tenant = await tenantRepository.findBillingById(tenantId);
  if (!hasSubscriptionAccess(tenant)) {
    const summary = mapSubscriptionSummary(tenant, listAvailablePlans());
    const err = new Error("Assinatura inativa ou inadimplente");
    err.status = 402;
    err.expose = true;
    err.code = "SUBSCRIPTION_REQUIRED";
    err.subscription = summary;
    throw err;
  }
  return tenant;
}

module.exports = {
  getOrCreateStripeCustomer,
  getSubscriptionSummary,
  listBillingPlans,
  createCheckoutSession,
  createCustomerPortalSession,
  changePlan,
  cancelSubscription,
  reactivateSubscription,
  assertTenantHasAccess,
};
