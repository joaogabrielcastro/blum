const Stripe = require("stripe");
const {
  assertStripeConfigured,
  getStripeSecretKey,
} = require("../../config/stripe");

let stripeClient = null;

function getStripeClient() {
  if (stripeClient) return stripeClient;
  assertStripeConfigured();
  stripeClient = new Stripe(getStripeSecretKey());
  return stripeClient;
}

/** Permite injetar mock em testes. */
function setStripeClientForTests(client) {
  stripeClient = client;
}

function resetStripeClientForTests() {
  stripeClient = null;
}

function toIsoDate(unixSeconds) {
  if (unixSeconds == null) return null;
  const n = Number(unixSeconds);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000).toISOString();
}

function extractSubscriptionPriceId(subscription) {
  const item = subscription?.items?.data?.[0];
  return item?.price?.id || null;
}

function mapSubscriptionToBillingData(subscription, planSlug = null) {
  const priceId = extractSubscriptionPriceId(subscription);
  return {
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    planSlug,
    subscriptionStatus: subscription.status,
    trialEndsAt: toIsoDate(subscription.trial_end),
    subscriptionEndsAt: toIsoDate(subscription.ended_at || subscription.cancel_at),
    currentPeriodStart: toIsoDate(subscription.current_period_start),
    currentPeriodEnd: toIsoDate(subscription.current_period_end),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    paymentActionRequired: false,
  };
}

module.exports = {
  getStripeClient,
  setStripeClientForTests,
  resetStripeClientForTests,
  toIsoDate,
  extractSubscriptionPriceId,
  mapSubscriptionToBillingData,
};
