/**
 * Planos disponíveis — Price IDs vêm do Stripe via variáveis de ambiente.
 * `features` = copy de marketing; `entitlements` = IDs gated (API/UI).
 */

const { buildPlanPricingFromEnv } = require("../utils/planPricing");

const PRO_ENTITLEMENTS = [
  "product-import",
  "product-export",
  "purchase-import",
  "price-batch",
  "brand-comparison",
  "excel-export",
  "commission-pdf",
];

const PLAN_DEFINITIONS = [
  {
    slug: "starter",
    name: "Starter",
    description: "Ideal para equipes pequenas começando com o Blum.",
    envPriceKey: "STRIPE_PRICE_STARTER",
    defaultAmountCents: 9900,
    limits: { maxUsers: 3, maxBrands: 1 },
    entitlements: [],
    features: [
      "Até 3 usuários",
      "1 representada",
      "Orçamentos e clientes ilimitados",
      "Relatórios básicos de vendas",
      "Modo offline",
    ],
    sortOrder: 1,
  },
  {
    slug: "professional",
    name: "Profissional",
    description: "Para equipes comerciais em crescimento.",
    envPriceKey: "STRIPE_PRICE_PROFESSIONAL",
    defaultAmountCents: 19900,
    limits: { maxUsers: null, maxBrands: null },
    entitlements: [...PRO_ENTITLEMENTS],
    features: [
      "Usuários ilimitados",
      "Representadas ilimitadas",
      "Importação de produtos e compras",
      "Relatórios avançados e Excel",
      "Suporte prioritário",
    ],
    sortOrder: 2,
    highlighted: true,
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    description:
      "Para operações grandes que precisam de acompanhamento próximo e integrações sob medida.",
    envPriceKey: "STRIPE_PRICE_ENTERPRISE",
    defaultAmountCents: 39900,
    limits: { maxUsers: null, maxBrands: null },
    entitlements: [...PRO_ENTITLEMENTS],
    features: [
      "Tudo do Profissional",
      "Onboarding assistido da equipe",
      "Suporte dedicado com canal direto",
      "Integrações personalizadas (ERP/CRM/API)",
      "Prioridade na evolução do produto",
    ],
    sortOrder: 3,
  },
];

function getPlanBySlug(slug) {
  const normalized = String(slug || "").trim().toLowerCase();
  return PLAN_DEFINITIONS.find((p) => p.slug === normalized) || null;
}

function getPlanByStripePriceId(priceId) {
  const id = String(priceId || "").trim();
  if (!id) return null;
  return (
    PLAN_DEFINITIONS.find(
      (p) => process.env[p.envPriceKey] && process.env[p.envPriceKey] === id,
    ) || null
  );
}

function getStripePriceIdForPlan(slug) {
  const plan = getPlanBySlug(slug);
  if (!plan) return null;
  const priceId = process.env[plan.envPriceKey];
  return priceId && String(priceId).trim() ? String(priceId).trim() : null;
}

function listAvailablePlans() {
  return PLAN_DEFINITIONS.map((plan) => {
    const stripePriceId = process.env[plan.envPriceKey] || null;
    const envPricing = buildPlanPricingFromEnv(plan.envPriceKey, plan.defaultAmountCents);
    return {
      slug: plan.slug,
      name: plan.name,
      description: plan.description,
      features: plan.features,
      highlighted: Boolean(plan.highlighted),
      available: Boolean(stripePriceId),
      stripePriceId: stripePriceId || undefined,
      sortOrder: plan.sortOrder,
      ...envPricing,
    };
  })
    .filter((p) => p.available)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function assertPlanAvailable(slug) {
  const plan = getPlanBySlug(slug);
  if (!plan) {
    const err = new Error("Plano inválido");
    err.status = 400;
    err.expose = true;
    throw err;
  }
  const priceId = getStripePriceIdForPlan(slug);
  if (!priceId) {
    const err = new Error(`Plano "${plan.name}" não está configurado no servidor`);
    err.status = 503;
    err.expose = true;
    throw err;
  }
  return { plan, priceId };
}

module.exports = {
  PLAN_DEFINITIONS,
  PRO_ENTITLEMENTS,
  getPlanBySlug,
  getPlanByStripePriceId,
  getStripePriceIdForPlan,
  listAvailablePlans,
  assertPlanAvailable,
};
