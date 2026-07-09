const billingService = require("../services/billingService");

exports.getPlans = async (req, res) => {
  try {
    const plans = await billingService.listBillingPlans();
    res.json({ plans, billingNote: "Todos os planos são cobrados mensalmente." });
  } catch (error) {
    console.error("getPlans error:", error);
    res.status(500).json({ error: "Erro ao listar planos" });
  }
};

exports.getSubscription = async (req, res) => {
  try {
    const summary = await billingService.getSubscriptionSummary(req.user.tenantId);
    res.json(summary);
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error("getSubscription error:", error);
    res.status(status).json({ error: error.message || "Erro ao carregar assinatura" });
  }
};

exports.createCheckout = async (req, res) => {
  try {
    const planSlug = String(req.body.planSlug || "").trim();
    if (!planSlug) {
      return res.status(400).json({ error: "planSlug é obrigatório" });
    }

    const result = await billingService.createCheckoutSession({
      tenantId: req.user.tenantId,
      planSlug,
      userId: req.user.userId,
      requestId: req.requestId,
    });

    res.json(result);
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error("createCheckout error:", error);
    res.status(status).json({ error: error.message || "Erro ao iniciar pagamento" });
  }
};

exports.createPortal = async (req, res) => {
  try {
    const result = await billingService.createCustomerPortalSession({
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      requestId: req.requestId,
    });
    res.json(result);
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error("createPortal error:", error);
    res.status(status).json({ error: error.message || "Erro ao abrir portal" });
  }
};

exports.changePlan = async (req, res) => {
  try {
    const planSlug = String(req.body.planSlug || "").trim();
    if (!planSlug) {
      return res.status(400).json({ error: "planSlug é obrigatório" });
    }

    const summary = await billingService.changePlan({
      tenantId: req.user.tenantId,
      planSlug,
      userId: req.user.userId,
      requestId: req.requestId,
    });

    res.json(summary);
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error("changePlan error:", error);
    res.status(status).json({ error: error.message || "Erro ao alterar plano" });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const summary = await billingService.cancelSubscription({
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      requestId: req.requestId,
    });
    res.json(summary);
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error("cancelSubscription error:", error);
    res.status(status).json({ error: error.message || "Erro ao cancelar assinatura" });
  }
};

exports.reactivateSubscription = async (req, res) => {
  try {
    const result = await billingService.reactivateSubscription({
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      requestId: req.requestId,
    });
    res.json(result);
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error("reactivateSubscription error:", error);
    res.status(status).json({ error: error.message || "Erro ao reativar assinatura" });
  }
};
