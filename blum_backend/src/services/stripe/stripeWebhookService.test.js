jest.mock("../../repositories/tenantRepository");
jest.mock("../../repositories/stripeWebhookRepository");
jest.mock("../auditService", () => ({
  logAuditEvent: jest.fn(),
}));
jest.mock("./stripeClientService", () => ({
  getStripeClient: jest.fn(),
  mapSubscriptionToBillingData: jest.requireActual(
    "./stripeClientService",
  ).mapSubscriptionToBillingData,
}));

const tenantRepository = require("../../repositories/tenantRepository");
const stripeWebhookRepository = require("../../repositories/stripeWebhookRepository");
const stripeWebhookService = require("./stripeWebhookService");
const { getStripeClient } = require("./stripeClientService");

describe("stripeWebhookService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_PRICE_STARTER = "price_starter";
    stripeWebhookRepository.hasProcessedEvent.mockResolvedValue(false);
    stripeWebhookRepository.markEventProcessed.mockResolvedValue();
    tenantRepository.updateBillingFromSubscription.mockResolvedValue();
  });

  it("ignora eventos duplicados", async () => {
    stripeWebhookRepository.hasProcessedEvent.mockResolvedValue(true);
    const result = await stripeWebhookService.processWebhookEvent({
      id: "evt_dup",
      type: "invoice.paid",
      data: { object: {} },
    });
    expect(result.duplicate).toBe(true);
    expect(tenantRepository.updateBillingFromSubscription).not.toHaveBeenCalled();
  });

  it("processa customer.subscription.updated", async () => {
    tenantRepository.findByStripeSubscriptionId.mockResolvedValue({
      id: 1,
      plan_slug: "starter",
    });

    const subscription = {
      id: "sub_1",
      customer: "cus_1",
      status: "active",
      current_period_start: 1700000000,
      current_period_end: 1702592000,
      cancel_at_period_end: false,
      items: { data: [{ price: { id: "price_starter" } }] },
      metadata: { tenant_id: "1", plan_slug: "starter" },
    };

    const result = await stripeWebhookService.processWebhookEvent({
      id: "evt_sub_upd",
      type: "customer.subscription.updated",
      data: { object: subscription },
    });

    expect(result.processed).toBe(true);
    expect(tenantRepository.updateBillingFromSubscription).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        stripeSubscriptionId: "sub_1",
        subscriptionStatus: "active",
      }),
    );
  });

  it("processa invoice.payment_failed", async () => {
    tenantRepository.findByStripeSubscriptionId.mockResolvedValue({ id: 2 });
    getStripeClient.mockReturnValue({
      subscriptions: {
        retrieve: jest.fn().mockResolvedValue({
          id: "sub_2",
          status: "past_due",
          customer: "cus_2",
          current_period_start: 1700000000,
          current_period_end: 1702592000,
          cancel_at_period_end: false,
          items: { data: [{ price: { id: "price_pro" } }] },
          metadata: { plan_slug: "professional" },
        }),
      },
    });

    await stripeWebhookService.processWebhookEvent({
      id: "evt_inv_fail",
      type: "invoice.payment_failed",
      data: { object: { subscription: "sub_2" } },
    });

    expect(tenantRepository.updateBillingFromSubscription).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ subscriptionStatus: "past_due" }),
    );
  });

  it("marca payment_action_required em invoice.payment_action_required", async () => {
    tenantRepository.findByStripeSubscriptionId.mockResolvedValue({ id: 3 });
    getStripeClient.mockReturnValue({
      subscriptions: {
        retrieve: jest.fn().mockResolvedValue({
          id: "sub_3",
          status: "past_due",
          customer: "cus_3",
          current_period_start: 1700000000,
          current_period_end: 1702592000,
          cancel_at_period_end: false,
          items: { data: [{ price: { id: "price_pro" } }] },
        }),
      },
    });

    await stripeWebhookService.processWebhookEvent({
      id: "evt_action",
      type: "invoice.payment_action_required",
      data: { object: { subscription: "sub_3" } },
    });

    expect(tenantRepository.updateBillingFromSubscription).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ paymentActionRequired: true }),
    );
  });

  it("processa checkout.session.completed", async () => {
    tenantRepository.updateStripeCustomerId.mockResolvedValue();
    tenantRepository.findByStripeSubscriptionId.mockResolvedValue({
      id: 5,
      plan_slug: "starter",
    });
    getStripeClient.mockReturnValue({
      subscriptions: {
        retrieve: jest.fn().mockResolvedValue({
          id: "sub_new",
          status: "active",
          customer: "cus_5",
          current_period_start: 1700000000,
          current_period_end: 1702592000,
          cancel_at_period_end: false,
          items: { data: [{ price: { id: "price_starter" } }] },
          metadata: { plan_slug: "starter" },
        }),
      },
    });

    await stripeWebhookService.processWebhookEvent({
      id: "evt_checkout",
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_5",
          subscription: "sub_new",
          metadata: { tenant_id: "5" },
          client_reference_id: "5",
        },
      },
    });

    expect(tenantRepository.updateStripeCustomerId).toHaveBeenCalled();
    expect(tenantRepository.updateBillingFromSubscription).toHaveBeenCalled();
  });

  it("processa invoice.paid", async () => {
    tenantRepository.findByStripeSubscriptionId.mockResolvedValue({ id: 6 });
    getStripeClient.mockReturnValue({
      subscriptions: {
        retrieve: jest.fn().mockResolvedValue({
          id: "sub_6",
          status: "active",
          customer: "cus_6",
          current_period_start: 1700000000,
          current_period_end: 1702592000,
          cancel_at_period_end: false,
          items: { data: [{ price: { id: "price_starter" } }] },
        }),
      },
    });

    await stripeWebhookService.processWebhookEvent({
      id: "evt_paid",
      type: "invoice.paid",
      data: { object: { subscription: "sub_6" } },
    });

    expect(tenantRepository.updateBillingFromSubscription).toHaveBeenCalled();
  });

  it("processa invoice.finalized com audit", async () => {
    tenantRepository.findByStripeCustomerId.mockResolvedValue({ id: 7, name: "Co" });
    const { logAuditEvent } = require("../auditService");

    await stripeWebhookService.processWebhookEvent({
      id: "evt_final",
      type: "invoice.finalized",
      data: { object: { id: "in_1", customer: "cus_7", amount_due: 9900, currency: "brl" } },
    });

    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 7, action: "billing.webhook.invoice_finalized" }),
    );
  });

  it("ignora subscription sem tenant correspondente", async () => {
    tenantRepository.findByStripeSubscriptionId.mockResolvedValue(null);
    tenantRepository.findByStripeCustomerId.mockResolvedValue(null);
    tenantRepository.findBillingById.mockResolvedValue(null);

    const result = await stripeWebhookService.processWebhookEvent({
      id: "evt_orphan",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_orphan",
          customer: "cus_orphan",
          status: "active",
          items: { data: [{ price: { id: "price_starter" } }] },
        },
      },
    });

    expect(result.processed).toBe(true);
    expect(tenantRepository.updateBillingFromSubscription).not.toHaveBeenCalled();
  });

  it("processa customer.subscription.deleted", async () => {
    tenantRepository.findByStripeSubscriptionId.mockResolvedValue({ id: 8, plan_slug: "starter" });

    await stripeWebhookService.processWebhookEvent({
      id: "evt_deleted",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_8",
          status: "canceled",
          customer: "cus_8",
          current_period_start: 1700000000,
          current_period_end: 1702592000,
          cancel_at_period_end: false,
          items: { data: [{ price: { id: "price_starter" } }] },
        },
      },
    });

    expect(tenantRepository.updateBillingFromSubscription).toHaveBeenCalledWith(
      8,
      expect.objectContaining({ subscriptionStatus: "canceled" }),
    );
  });
});
