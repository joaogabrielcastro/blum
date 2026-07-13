const { getFrontendBaseUrl } = require("../../config/stripe");

function getCheckoutPaymentMethods() {
  const raw =
    process.env.STRIPE_CHECKOUT_PAYMENT_METHODS || "card,boleto,pix";
  return raw
    .split(",")
    .map((method) => method.trim().toLowerCase())
    .filter(Boolean);
}

function getBoletoExpiresAfterDays() {
  const parsed = parseInt(process.env.STRIPE_BOLETO_EXPIRES_DAYS, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
}

/**
 * Parâmetros do Stripe Checkout para assinatura no Brasil (cartão, boleto, Pix Automático).
 */
function buildSubscriptionCheckoutParams({
  customerId,
  priceId,
  tenantId,
  planSlug,
  baseUrl = getFrontendBaseUrl(),
}) {
  const paymentMethodTypes = getCheckoutPaymentMethods();

  const params = {
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/subscription?checkout=success`,
    cancel_url: `${baseUrl}/subscription?checkout=canceled`,
    client_reference_id: String(tenantId),
    locale: "pt-BR",
    payment_method_types: paymentMethodTypes,
    metadata: {
      tenant_id: String(tenantId),
      plan_slug: planSlug,
    },
    subscription_data: {
      metadata: {
        tenant_id: String(tenantId),
        plan_slug: planSlug,
      },
    },
    allow_promotion_codes: true,
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    customer_update: {
      name: "auto",
      address: "auto",
    },
  };

  const paymentMethodOptions = {};

  if (paymentMethodTypes.includes("boleto")) {
    paymentMethodOptions.boleto = {
      expires_after_days: getBoletoExpiresAfterDays(),
    };
  }

  // Pix em assinatura: Stripe não aceita mandate_options no modo subscription.
  // O método fica habilitado apenas via payment_method_types.

  if (Object.keys(paymentMethodOptions).length > 0) {
    params.payment_method_options = paymentMethodOptions;
  }

  return params;
}

module.exports = {
  getCheckoutPaymentMethods,
  buildSubscriptionCheckoutParams,
};
