const {
  isWebhookSigningSecret,
  readWebhookSecretFromEnv,
  WEBHOOK_EVENTS,
} = require("./setup-stripe-billing");

describe("setup-stripe-billing webhook helpers", () => {
  const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    } else {
      process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
    }
  });

  test("isWebhookSigningSecret aceita apenas whsec_", () => {
    expect(isWebhookSigningSecret("whsec_abc")).toBe(true);
    expect(isWebhookSigningSecret("we_123")).toBe(false);
    expect(isWebhookSigningSecret("")).toBe(false);
    expect(isWebhookSigningSecret(null)).toBe(false);
  });

  test("readWebhookSecretFromEnv ignora endpoint id e vazio", () => {
    process.env.STRIPE_WEBHOOK_SECRET = "we_existing_endpoint";
    expect(readWebhookSecretFromEnv()).toBeNull();

    process.env.STRIPE_WEBHOOK_SECRET = "whsec_from_env";
    expect(readWebhookSecretFromEnv()).toBe("whsec_from_env");
  });

  test("WEBHOOK_EVENTS inclui eventos de billing", () => {
    expect(WEBHOOK_EVENTS).toEqual(
      expect.arrayContaining([
        "checkout.session.completed",
        "invoice.payment_failed",
      ]),
    );
  });
});
