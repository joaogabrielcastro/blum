const { getStripeClient } = require("../services/stripe/stripeClientService");
const { getStripeWebhookSecret } = require("../config/stripe");
const stripeWebhookService = require("../services/stripe/stripeWebhookService");

exports.handleWebhook = async (req, res) => {
  const signature = req.headers["stripe-signature"];
  const webhookSecret = getStripeWebhookSecret();

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET não configurado");
    return res.status(503).json({ error: "Webhook não configurado" });
  }

  if (!signature) {
    return res.status(400).json({ error: "Assinatura Stripe ausente" });
  }

  let event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error) {
    console.warn(
      JSON.stringify({
        level: "warn",
        message: "Webhook Stripe com assinatura inválida",
        detail: error.message,
      }),
    );
    return res.status(400).json({ error: "Assinatura do webhook inválida" });
  }

  try {
    const result = await stripeWebhookService.processWebhookEvent(event);
    return res.status(200).json({ received: true, ...result });
  } catch (error) {
    console.error("stripe webhook handler error:", error);
    return res.status(500).json({ error: "Falha ao processar webhook" });
  }
};
