const tenantRepository = require("../repositories/tenantRepository");
const { isBillingEnforced } = require("../config/stripe");
const {
  hasSubscriptionAccess,
  mapSubscriptionSummary,
  requiresSubscriptionCheck,
} = require("../utils/subscriptionAccess");
const { listAvailablePlans } = require("../config/plans");

exports.requireActiveSubscription = async (req, res, next) => {
  if (!isBillingEnforced()) {
    return next();
  }

  if (!req.user?.tenantId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  try {
    const tenant = await tenantRepository.findBillingById(req.user.tenantId);
    if (!tenant) {
      return res.status(403).json({ error: "Empresa não encontrada" });
    }

    req.tenantBilling = mapSubscriptionSummary(tenant, listAvailablePlans());

    if (!requiresSubscriptionCheck(tenant)) {
      return next();
    }

    if (hasSubscriptionAccess(tenant)) {
      return next();
    }

    return res.status(402).json({
      error: "Assinatura inativa ou inadimplente",
      code: "SUBSCRIPTION_REQUIRED",
      subscription: req.tenantBilling,
    });
  } catch (error) {
    console.error("subscription middleware error:", error);
    return res.status(500).json({ error: "Erro ao verificar assinatura" });
  }
};
