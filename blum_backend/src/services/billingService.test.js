jest.mock("../repositories/tenantRepository");
jest.mock("../services/auditService", () => ({
  logAuditEvent: jest.fn(),
}));
jest.mock("./stripe/stripeClientService", () => {
  const actual = jest.requireActual("./stripe/stripeClientService");
  return {
    ...actual,
    getStripeClient: jest.fn(),
  };
});

const tenantRepository = require("../repositories/tenantRepository");
const billingService = require("./billingService");
const {
  getStripeClient,
  setStripeClientForTests,
  resetStripeClientForTests,
} = require("./stripe/stripeClientService");

describe("billingService", () => {
  const origStarter = process.env.STRIPE_PRICE_STARTER;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_mock";
    process.env.STRIPE_PRICE_STARTER = "price_starter_test";
    process.env.FRONTEND_URL = "http://localhost:3000";
  });

  afterEach(() => {
    resetStripeClientForTests();
    if (origStarter === undefined) {
      delete process.env.STRIPE_PRICE_STARTER;
    } else {
      process.env.STRIPE_PRICE_STARTER = origStarter;
    }
  });

  it("cria checkout session para tenant sem assinatura", async () => {
    tenantRepository.findBillingById.mockResolvedValue({
      id: 1,
      name: "Acme",
      slug: "acme",
      stripe_customer_id: "cus_1",
      stripe_subscription_id: null,
      subscription_status: null,
    });

    getStripeClient.mockReturnValue({
      checkout: {
        sessions: {
          create: jest.fn().mockResolvedValue({
            id: "cs_1",
            url: "https://checkout.stripe.com/test",
          }),
        },
      },
    });

    const result = await billingService.createCheckoutSession({
      tenantId: 1,
      planSlug: "starter",
      userId: 10,
    });

    expect(result.url).toContain("checkout.stripe.com");
    expect(getStripeClient().checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer: "cus_1",
      }),
    );
  });

  it("cancela assinatura com cancel_at_period_end", async () => {
    tenantRepository.findBillingById
      .mockResolvedValueOnce({
        id: 1,
        stripe_subscription_id: "sub_1",
        plan_slug: "starter",
        subscription_status: "active",
      })
      .mockResolvedValueOnce({
        id: 1,
        stripe_subscription_id: "sub_1",
        plan_slug: "starter",
        subscription_status: "active",
        cancel_at_period_end: true,
        name: "Acme",
      });

    getStripeClient.mockReturnValue({
      subscriptions: {
        update: jest.fn().mockResolvedValue({
          id: "sub_1",
          status: "active",
          cancel_at_period_end: true,
          current_period_start: 1700000000,
          current_period_end: 1702592000,
          items: { data: [{ price: { id: "price_starter_test" } }] },
        }),
      },
    });

    const summary = await billingService.cancelSubscription({
      tenantId: 1,
      userId: 10,
    });

    expect(getStripeClient().subscriptions.update).toHaveBeenCalledWith(
      "sub_1",
      { cancel_at_period_end: true },
    );
    expect(summary.cancelAtPeriodEnd).toBe(true);
  });

  it("altera plano via subscription update", async () => {
    process.env.STRIPE_PRICE_PROFESSIONAL = "price_pro_test";

    tenantRepository.findBillingById
      .mockResolvedValueOnce({
        id: 1,
        stripe_subscription_id: "sub_1",
        plan_slug: "starter",
      })
      .mockResolvedValueOnce({
        id: 1,
        name: "Acme",
        stripe_subscription_id: "sub_1",
        plan_slug: "professional",
        subscription_status: "active",
        cancel_at_period_end: false,
      });

    getStripeClient.mockReturnValue({
      subscriptions: {
        retrieve: jest.fn().mockResolvedValue({
          id: "sub_1",
          items: { data: [{ id: "si_1", price: { id: "price_starter_test" } }] },
        }),
        update: jest.fn().mockResolvedValue({
          id: "sub_1",
          status: "active",
          cancel_at_period_end: false,
          current_period_start: 1700000000,
          current_period_end: 1702592000,
          items: { data: [{ price: { id: "price_pro_test" } }] },
          metadata: { plan_slug: "professional" },
        }),
      },
    });

    const summary = await billingService.changePlan({
      tenantId: 1,
      planSlug: "professional",
      userId: 10,
    });

    expect(summary.planSlug).toBe("professional");
  });

  it("assertTenantHasAccess lança 402 quando inadimplente", async () => {
    process.env.BILLING_ENFORCE = "true";
    tenantRepository.findBillingById.mockResolvedValue({
      id: 1,
      name: "Acme",
      stripe_customer_id: "cus_1",
      stripe_subscription_id: "sub_1",
      subscription_status: "past_due",
    });

    await expect(billingService.assertTenantHasAccess(1)).rejects.toMatchObject({
      status: 402,
      code: "SUBSCRIPTION_REQUIRED",
    });

    delete process.env.BILLING_ENFORCE;
  });

  it("getSubscriptionSummary mapeia tenant", async () => {
    tenantRepository.findBillingById.mockResolvedValue({
      id: 1,
      name: "Acme",
      slug: "acme",
      subscription_status: "active",
      plan_slug: "starter",
      stripe_customer_id: "cus_1",
      cancel_at_period_end: false,
    });

    const summary = await billingService.getSubscriptionSummary(1);
    expect(summary.planSlug).toBe("starter");
    expect(summary.accessBlocked).toBe(false);
  });

  it("listBillingPlans retorna planos disponíveis", async () => {
    const plans = await billingService.listBillingPlans();
    expect(Array.isArray(plans)).toBe(true);
  });

  it("createCustomerPortalSession retorna URL", async () => {
    tenantRepository.findBillingById.mockResolvedValue({
      id: 1,
      slug: "acme",
      stripe_customer_id: "cus_1",
    });
    getStripeClient.mockReturnValue({
      billingPortal: {
        sessions: {
          create: jest.fn().mockResolvedValue({ url: "https://billing.stripe.com/portal" }),
        },
      },
    });

    const result = await billingService.createCustomerPortalSession({
      tenantId: 1,
      userId: 10,
    });
    expect(result.url).toContain("stripe.com");
  });

  it("reactivateSubscription remove cancel_at_period_end", async () => {
    tenantRepository.findBillingById
      .mockResolvedValueOnce({
        id: 1,
        slug: "acme",
        stripe_subscription_id: "sub_1",
        plan_slug: "starter",
        subscription_status: "active",
        cancel_at_period_end: true,
      })
      .mockResolvedValueOnce({
        id: 1,
        name: "Acme",
        slug: "acme",
        stripe_subscription_id: "sub_1",
        plan_slug: "starter",
        subscription_status: "active",
        cancel_at_period_end: false,
      });

    getStripeClient.mockReturnValue({
      subscriptions: {
        retrieve: jest.fn().mockResolvedValue({
          id: "sub_1",
          status: "active",
          cancel_at_period_end: true,
          current_period_start: 1700000000,
          current_period_end: 1702592000,
          items: { data: [{ price: { id: "price_starter_test" } }] },
        }),
        update: jest.fn().mockResolvedValue({
          id: "sub_1",
          status: "active",
          cancel_at_period_end: false,
          current_period_start: 1700000000,
          current_period_end: 1702592000,
          items: { data: [{ price: { id: "price_starter_test" } }] },
        }),
      },
    });

    const result = await billingService.reactivateSubscription({
      tenantId: 1,
      userId: 10,
    });
    expect(result.requiresCheckout).toBe(false);
  });

  it("getOrCreateStripeCustomer cria customer quando ausente", async () => {
    tenantRepository.findBillingById.mockResolvedValue({
      id: 2,
      name: "Beta",
      slug: "beta",
      stripe_customer_id: null,
      billing_email: "billing@beta.com",
    });
    tenantRepository.findAdminEmailForTenant.mockResolvedValue("admin@beta.com");
    tenantRepository.updateStripeCustomerId.mockResolvedValue();

    const createCustomer = jest.fn().mockResolvedValue({ id: "cus_new" });
    getStripeClient.mockReturnValue({
      customers: { create: createCustomer },
    });

    const result = await billingService.getOrCreateStripeCustomer(2);
    expect(result.customerId).toBe("cus_new");
    expect(createCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ email: "billing@beta.com" }),
    );
  });

  it("getOrCreateStripeCustomer retorna 404 se tenant ausente", async () => {
    tenantRepository.findBillingById.mockResolvedValue(null);
    await expect(billingService.getOrCreateStripeCustomer(99)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("createCheckoutSession rejeita assinatura ativa existente", async () => {
    tenantRepository.findBillingById.mockResolvedValue({
      id: 1,
      slug: "acme",
      stripe_customer_id: "cus_1",
      stripe_subscription_id: "sub_active",
      subscription_status: "active",
    });

    await expect(
      billingService.createCheckoutSession({
        tenantId: 1,
        planSlug: "starter",
        userId: 10,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("changePlan rejeita sem assinatura", async () => {
    tenantRepository.findBillingById.mockResolvedValue({
      id: 1,
      stripe_subscription_id: null,
    });

    await expect(
      billingService.changePlan({ tenantId: 1, planSlug: "starter", userId: 10 }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("changePlan rejeita assinatura inválida no Stripe", async () => {
    tenantRepository.findBillingById.mockResolvedValue({
      id: 1,
      stripe_subscription_id: "sub_bad",
    });
    getStripeClient.mockReturnValue({
      subscriptions: {
        retrieve: jest.fn().mockResolvedValue({
          id: "sub_bad",
          items: { data: [] },
        }),
      },
    });

    await expect(
      billingService.changePlan({ tenantId: 1, planSlug: "starter", userId: 10 }),
    ).rejects.toMatchObject({ status: 500 });
  });

  it("cancelSubscription rejeita sem assinatura", async () => {
    tenantRepository.findBillingById.mockResolvedValue({
      id: 1,
      stripe_subscription_id: null,
    });

    await expect(
      billingService.cancelSubscription({ tenantId: 1, userId: 10 }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("reactivateSubscription redireciona para checkout quando cancelada", async () => {
    tenantRepository.findBillingById
      .mockResolvedValueOnce({
        id: 1,
        slug: "acme",
        stripe_subscription_id: "sub_old",
        plan_slug: "starter",
      })
      .mockResolvedValueOnce({
        id: 1,
        slug: "acme",
        stripe_customer_id: "cus_1",
        plan_slug: "starter",
      });

    getStripeClient.mockReturnValue({
      subscriptions: {
        retrieve: jest.fn().mockResolvedValue({
          id: "sub_old",
          status: "canceled",
        }),
      },
      checkout: {
        sessions: {
          create: jest.fn().mockResolvedValue({
            url: "https://checkout.stripe.com/reactivate",
          }),
        },
      },
    });

    const result = await billingService.reactivateSubscription({
      tenantId: 1,
      userId: 10,
    });
    expect(result.requiresCheckout).toBe(true);
    expect(result.url).toContain("checkout.stripe.com");
  });

  it("getSubscriptionSummary retorna 404 para tenant ausente", async () => {
    tenantRepository.findBillingById.mockReset();
    tenantRepository.findBillingById.mockResolvedValue(null);
    await expect(billingService.getSubscriptionSummary(99)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("assertTenantHasAccess permite tenant ativo", async () => {
    tenantRepository.findBillingById.mockResolvedValue({
      id: 1,
      subscription_status: "active",
      stripe_subscription_id: "sub_1",
    });

    const tenant = await billingService.assertTenantHasAccess(1);
    expect(tenant.id).toBe(1);
  });
});
