const {
  buildSubscriptionCheckoutParams,
  getCheckoutPaymentMethods,
} = require("./checkoutSessionBuilder");

describe("checkoutSessionBuilder", () => {
  const origMethods = process.env.STRIPE_CHECKOUT_PAYMENT_METHODS;

  afterEach(() => {
    if (origMethods === undefined) {
      delete process.env.STRIPE_CHECKOUT_PAYMENT_METHODS;
    } else {
      process.env.STRIPE_CHECKOUT_PAYMENT_METHODS = origMethods;
    }
  });

  it("inclui cartão, boleto e pix por padrão", () => {
    delete process.env.STRIPE_CHECKOUT_PAYMENT_METHODS;
    expect(getCheckoutPaymentMethods()).toEqual(["card", "boleto", "pix"]);
  });

  it("monta checkout com locale pt-BR e CPF/CNPJ", () => {
    const params = buildSubscriptionCheckoutParams({
      customerId: "cus_1",
      priceId: "price_1",
      tenantId: 1,
      planSlug: "starter",
      baseUrl: "http://localhost:3000",
    });

    expect(params.payment_method_types).toEqual(["card", "boleto", "pix"]);
    expect(params.locale).toBe("pt-BR");
    expect(params.tax_id_collection).toEqual({ enabled: true });
    expect(params.customer_update).toEqual({ name: "auto", address: "auto" });
    expect(params.payment_method_options.boleto.expires_after_days).toBe(3);
    expect(params.payment_method_options.pix).toBeUndefined();
  });
});
