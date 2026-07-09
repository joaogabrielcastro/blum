const DEFAULT_AMOUNT_CENTS = {
  STRIPE_PRICE_STARTER: 9900,
  STRIPE_PRICE_PROFESSIONAL: 19900,
  STRIPE_PRICE_ENTERPRISE: 39900,
};

function getPlanAmountCentsFromEnv(envPriceKey, defaultAmountCents = null) {
  const amountKey = `${envPriceKey}_AMOUNT`;
  const parsed = parseInt(process.env[amountKey], 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  if (Number.isFinite(defaultAmountCents) && defaultAmountCents > 0) {
    return defaultAmountCents;
  }
  return DEFAULT_AMOUNT_CENTS[envPriceKey] ?? null;
}

function formatMoney(amountCents, currency = "brl") {
  if (amountCents == null || !Number.isFinite(amountCents)) {
    return null;
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

function getBillingIntervalLabel(interval, intervalCount = 1) {
  if (interval === "month" && intervalCount === 1) {
    return { interval: "month", intervalCount: 1, billingLabel: "Cobrança mensal" };
  }
  if (interval === "year" && intervalCount === 1) {
    return { interval: "year", intervalCount: 1, billingLabel: "Cobrança anual" };
  }
  return {
    interval: interval || "month",
    intervalCount,
    billingLabel: `A cada ${intervalCount} ${interval || "month"}`,
  };
}

function buildPlanPricingFromStripePrice(price) {
  const recurring = price?.recurring || {};
  const intervalInfo = getBillingIntervalLabel(
    recurring.interval,
    recurring.interval_count || 1,
  );
  const amountCents = price?.unit_amount ?? null;
  const currency = price?.currency || "brl";

  return {
    currency,
    amountCents,
    priceLabel: formatMoney(amountCents, currency),
    pricePerMonthLabel: formatMoney(amountCents, currency),
    ...intervalInfo,
  };
}

function buildPlanPricingFromEnv(envPriceKey, defaultAmountCents = null) {
  const amountCents = getPlanAmountCentsFromEnv(envPriceKey, defaultAmountCents);
  const currency = (process.env.STRIPE_SETUP_CURRENCY || "brl").toLowerCase();
  const intervalInfo = getBillingIntervalLabel("month", 1);

  return {
    currency,
    amountCents,
    priceLabel: formatMoney(amountCents, currency),
    pricePerMonthLabel: formatMoney(amountCents, currency),
    ...intervalInfo,
  };
}

module.exports = {
  DEFAULT_AMOUNT_CENTS,
  getPlanAmountCentsFromEnv,
  formatMoney,
  getBillingIntervalLabel,
  buildPlanPricingFromStripePrice,
  buildPlanPricingFromEnv,
};
