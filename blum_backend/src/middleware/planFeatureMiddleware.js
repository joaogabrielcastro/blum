const tenantRepository = require("../repositories/tenantRepository");
const {
  tenantHasFeature,
  requiredPlanForFeature,
  listFeaturesForTenant,
} = require("../utils/planFeatures");

/**
 * Exige feature de plano (Pro+). Não depende de BILLING_ENFORCE.
 * Legado / sem plan_slug: liberado.
 */
function requirePlanFeature(featureId) {
  return async (req, res, next) => {
    if (!req.user?.tenantId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    try {
      const tenant =
        req.tenantBillingRow ||
        (await tenantRepository.findBillingById(req.user.tenantId));

      if (!tenant) {
        return res.status(403).json({ error: "Empresa não encontrada" });
      }

      req.tenantBillingRow = tenant;

      if (tenantHasFeature(tenant, featureId)) {
        return next();
      }

      const requiredPlan = requiredPlanForFeature(featureId) || "professional";

      return res.status(403).json({
        error: "Recurso disponível no plano Profissional ou superior",
        code: "PLAN_FEATURE_REQUIRED",
        feature: featureId,
        requiredPlan,
        planSlug: tenant.plan_slug || null,
        features: listFeaturesForTenant(tenant),
      });
    } catch (error) {
      console.error("plan feature middleware error:", error);
      return res.status(500).json({ error: "Erro ao verificar plano" });
    }
  };
}

module.exports = { requirePlanFeature };
