const { listAvailablePlans } = require("../../config/plans");
const { getStripeClient } = require("./stripeClientService");
const {
  buildPlanPricingFromStripePrice,
  buildPlanPricingFromEnv,
} = require("../../utils/planPricing");
const { PLAN_DEFINITIONS } = require("../../config/plans");

async function enrichPlanWithPricing(plan) {
  const definition = PLAN_DEFINITIONS.find((p) => p.slug === plan.slug);
  const fallback = definition
    ? buildPlanPricingFromEnv(
        definition.envPriceKey,
        definition.defaultAmountCents,
      )
    : {};

  const withFallback = { ...plan, ...fallback };

  if (!plan.stripePriceId) {
    return withFallback;
  }

  try {
    const stripe = getStripeClient();
    const price = await stripe.prices.retrieve(plan.stripePriceId);
    return {
      ...withFallback,
      ...buildPlanPricingFromStripePrice(price),
    };
  } catch (error) {
    console.warn(
      JSON.stringify({
        level: "warn",
        message: "Falha ao buscar preço no Stripe — usando valor padrão",
        priceId: plan.stripePriceId,
        detail: error.message,
      }),
    );
    return withFallback;
  }
}

async function listBillingPlansWithPricing() {
  const plans = listAvailablePlans();
  return Promise.all(plans.map(enrichPlanWithPricing));
}

async function getPricingForStripePriceId(stripePriceId, planSlug = null) {
  if (!stripePriceId) return null;

  try {
    const stripe = getStripeClient();
    const price = await stripe.prices.retrieve(stripePriceId);
    return buildPlanPricingFromStripePrice(price);
  } catch (error) {
    if (planSlug) {
      const definition = PLAN_DEFINITIONS.find((p) => p.slug === planSlug);
      if (definition) {
        return buildPlanPricingFromEnv(
          definition.envPriceKey,
          definition.defaultAmountCents,
        );
      }
    }
    return null;
  }
}

module.exports = {
  listBillingPlansWithPricing,
  getPricingForStripePriceId,
  enrichPlanWithPricing,
};
