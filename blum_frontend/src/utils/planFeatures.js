/** Feature IDs alinhados ao backend (planFeatures) e planComparison.js */

export const PRO_FEATURE_IDS = [
  "product-import",
  "product-export",
  "purchase-import",
  "price-batch",
  "brand-comparison",
  "excel-export",
  "commission-pdf",
];

export const FEATURE_LABELS = {
  "product-import": "Importação de produtos (Excel/CSV)",
  "product-export": "Exportação do catálogo",
  "purchase-import": "Importação de compras",
  "price-batch": "Reajuste de preços em lote",
  "brand-comparison": "Comparativo entre representadas",
  "excel-export": "Exportação Excel de relatórios",
  "commission-pdf": "PDF de comissões",
};

export const PLAN_FEATURE_REQUIRED_EVENT = "blum:plan-feature-required";

/**
 * @param {object|null|undefined} subscription
 * @param {string} featureId
 */
export function canUseFeature(subscription, featureId) {
  if (!featureId) return true;
  if (!subscription) return true;
  if (subscription.isLegacy) return true;
  if (!subscription.planSlug) return true;

  if (Array.isArray(subscription.features)) {
    return subscription.features.includes(featureId);
  }

  const slug = String(subscription.planSlug).toLowerCase();
  if (slug === "professional" || slug === "enterprise") return true;
  if (slug === "starter") return false;
  return true;
}

export function featureLabel(featureId) {
  return FEATURE_LABELS[featureId] || featureId || "este recurso";
}
