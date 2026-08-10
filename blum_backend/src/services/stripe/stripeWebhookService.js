const tenantRepository = require("../../repositories/tenantRepository");
const stripeWebhookRepository = require("../../repositories/stripeWebhookRepository");
const { logAuditEvent } = require("../auditService");
const { getPlanByStripePriceId } = require("../../config/plans");
const {
  getStripeClient,
  mapSubscriptionToBillingData,
} = require("./stripeClientService");

async function resolveTenantFromSubscription(subscription) {
  const subId = subscription?.id;
  if (subId) {
    const bySub = await tenantRepository.findByStripeSubscriptionId(subId);
    if (bySub) return bySub;
  }

  const customerId =
    typeof subscription?.customer === "string"
      ? subscription.customer
      : subscription?.customer?.id;

  if (customerId) {
    const byCustomer = await tenantRepository.findByStripeCustomerId(customerId);
    if (byCustomer) return byCustomer;
  }

  const tenantIdMeta = subscription?.metadata?.tenant_id;
  if (tenantIdMeta) {
    const tenant = await tenantRepository.findBillingById(Number(tenantIdMeta));
    if (tenant) return tenant;
  }

  return null;
}

async function resolveTenantFromCustomerId(customerId) {
  if (!customerId) return null;
  return tenantRepository.findByStripeCustomerId(customerId);
}

async function syncSubscriptionToTenant(subscription, options = {}) {
  const tenant = await resolveTenantFromSubscription(subscription);
  if (!tenant) {
    console.warn(
      JSON.stringify({
        level: "warn",
        message: "Stripe subscription sem tenant correspondente",
        subscriptionId: subscription?.id,
      }),
    );
    return null;
  }

  const priceId = subscription?.items?.data?.[0]?.price?.id;
  const plan =
    getPlanByStripePriceId(priceId) ||
    (subscription.metadata?.plan_slug
      ? { slug: subscription.metadata.plan_slug }
      : null);

  const billingData = mapSubscriptionToBillingData(
    subscription,
    plan?.slug || tenant.plan_slug,
  );

  if (options.paymentActionRequired != null) {
    billingData.paymentActionRequired = options.paymentActionRequired;
  }

  await tenantRepository.updateBillingFromSubscription(tenant.id, billingData);

  if (options.auditAction) {
    await logAuditEvent({
      tenantId: tenant.id,
      action: options.auditAction,
      resourceType: "subscription",
      resourceId: subscription.id,
      metadata: {
        status: subscription.status,
        planSlug: billingData.planSlug,
      },
    });
  }

  return tenant.id;
}

async function resolveTenantBillingEmail(tenantId, tenantRow = null) {
  const tenant = tenantRow || (await tenantRepository.findBillingById(tenantId));
  if (!tenant) return { tenant: null, to: null };
  const to =
    tenant.billing_email ||
    (await tenantRepository.findAdminEmailForTenant(tenantId));
  return { tenant, to };
}

function formatDatePt(isoOrUnix) {
  if (isoOrUnix == null) return null;
  const d =
    typeof isoOrUnix === "number"
      ? new Date(isoOrUnix * 1000)
      : new Date(isoOrUnix);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

async function handleCheckoutSessionCompleted(session) {
  const tenantId = Number(
    session.metadata?.tenant_id || session.client_reference_id,
  );
  if (!tenantId) {
    console.warn("checkout.session.completed sem tenant_id");
    return;
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  if (customerId) {
    await tenantRepository.updateStripeCustomerId(
      tenantId,
      customerId,
      session.customer_details?.email || null,
    );
  }

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (subscriptionId) {
    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await syncSubscriptionToTenant(subscription, {
      auditAction: "billing.webhook.checkout_completed",
    });

    const status = String(subscription.status || "").toLowerCase();
    if (status === "active" || status === "trialing") {
      const { sendSubscriptionActivatedEmail } = require("../emailService");
      const { getPlanBySlug } = require("../../config/plans");
      const { tenant, to } = await resolveTenantBillingEmail(tenantId);
      const planSlug =
        subscription.metadata?.plan_slug || tenant?.plan_slug;
      const planName = getPlanBySlug(planSlug)?.name || planSlug;
      if (to && tenant?.name) {
        sendSubscriptionActivatedEmail({
          to,
          companyName: tenant.name,
          planName,
        }).catch((err) =>
          console.warn("[email] subscription_activated:", err.message),
        );
      }
    }
  }
}

async function handleSubscriptionEvent(subscription, auditAction) {
  const tenantId = await syncSubscriptionToTenant(subscription, { auditAction });

  if (auditAction === "billing.webhook.subscription_deleted" && tenantId) {
    const { sendSubscriptionCanceledEmail } = require("../emailService");
    const { tenant, to } = await resolveTenantBillingEmail(tenantId);
    if (to && tenant?.name) {
      sendSubscriptionCanceledEmail({
        to,
        companyName: tenant.name,
        endsAtLabel: formatDatePt(
          subscription.canceled_at || subscription.ended_at,
        ),
      }).catch((err) =>
        console.warn("[email] subscription_canceled:", err.message),
      );
    }
  }
}

async function handleTrialWillEnd(subscription) {
  const tenant = await resolveTenantFromSubscription(subscription);
  if (!tenant) return;

  await logAuditEvent({
    tenantId: tenant.id,
    action: "billing.webhook.trial_will_end",
    resourceType: "subscription",
    resourceId: subscription.id,
    metadata: {
      trialEnd: subscription.trial_end,
    },
  });

  const { sendTrialEndingEmail } = require("../emailService");
  const { to } = await resolveTenantBillingEmail(tenant.id, tenant);
  if (to && tenant.name) {
    sendTrialEndingEmail({
      to,
      companyName: tenant.name,
      trialEndsAtLabel: formatDatePt(subscription.trial_end),
    }).catch((err) => console.warn("[email] trial_ending:", err.message));
  }
}

async function handleInvoicePaid(invoice) {
  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;

  if (!subscriptionId) return;

  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await syncSubscriptionToTenant(subscription, {
    paymentActionRequired: false,
    auditAction: "billing.webhook.invoice_paid",
  });
}

async function handleInvoicePaymentFailed(invoice) {
  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;

  if (!subscriptionId) return;

  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const tenantId = await syncSubscriptionToTenant(subscription, {
    paymentActionRequired: false,
    auditAction: "billing.webhook.invoice_payment_failed",
  });

  if (tenantId) {
    const { sendPaymentFailedEmail } = require("../emailService");
    const { tenant, to } = await resolveTenantBillingEmail(tenantId);
    if (to && tenant?.name) {
      sendPaymentFailedEmail({ to, companyName: tenant.name }).catch((err) =>
        console.warn("[email] payment_failed:", err.message),
      );
    }
  }
}

async function handleInvoicePaymentActionRequired(invoice) {
  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;

  if (!subscriptionId) return;

  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await syncSubscriptionToTenant(subscription, {
    paymentActionRequired: true,
    auditAction: "billing.webhook.payment_action_required",
  });
}

async function handleInvoiceFinalized(invoice) {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;
  const tenant = await resolveTenantFromCustomerId(customerId);
  if (!tenant) return;

  await logAuditEvent({
    tenantId: tenant.id,
    action: "billing.webhook.invoice_finalized",
    resourceType: "invoice",
    resourceId: invoice.id,
    metadata: {
      amountDue: invoice.amount_due,
      currency: invoice.currency,
    },
  });
}

const EVENT_HANDLERS = {
  "checkout.session.completed": handleCheckoutSessionCompleted,
  "customer.subscription.created": (sub) =>
    handleSubscriptionEvent(sub, "billing.webhook.subscription_created"),
  "customer.subscription.updated": (sub) =>
    handleSubscriptionEvent(sub, "billing.webhook.subscription_updated"),
  "customer.subscription.deleted": (sub) =>
    handleSubscriptionEvent(sub, "billing.webhook.subscription_deleted"),
  "customer.subscription.trial_will_end": handleTrialWillEnd,
  "invoice.paid": handleInvoicePaid,
  "invoice.payment_failed": handleInvoicePaymentFailed,
  "invoice.finalized": handleInvoiceFinalized,
  "invoice.payment_action_required": handleInvoicePaymentActionRequired,
};

async function processWebhookEvent(event) {
  const eventId = event.id;
  const eventType = event.type;

  if (await stripeWebhookRepository.hasProcessedEvent(eventId)) {
    return { duplicate: true };
  }

  const handler = EVENT_HANDLERS[eventType];
  if (!handler) {
    await stripeWebhookRepository.markEventProcessed(eventId, eventType);
    return { ignored: true, type: eventType };
  }

  const payload = event.data?.object;
  await handler(payload);
  await stripeWebhookRepository.markEventProcessed(eventId, eventType);

  return { processed: true, type: eventType };
}

module.exports = {
  processWebhookEvent,
  syncSubscriptionToTenant,
  resolveTenantFromSubscription,
};
