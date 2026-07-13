/**
 * Matriz de funcionalidades por plano — alinhada a plans.js e limites reais (usuários/representadas).
 * starter | professional | enterprise
 */

export const PLAN_SLUGS = ["starter", "professional", "enterprise"];

/** @typedef {'starter'|'professional'|'enterprise'} PlanSlug */
/** @typedef {Record<PlanSlug, boolean|string>} PlanAvailability */

/**
 * @param {boolean} starter
 * @param {boolean} professional
 * @param {boolean} enterprise
 * @returns {PlanAvailability}
 */
function tiers(starter, professional, enterprise) {
  return { starter, professional, enterprise };
}

/**
 * @param {string} starter
 * @param {string} professional
 * @param {string} enterprise
 * @returns {PlanAvailability}
 */
function tierLabels(starter, professional, enterprise) {
  return { starter, professional, enterprise };
}

export const PLAN_COMPARISON_SECTIONS = [
  {
    id: "operations",
    title: "Organize sua operação comercial",
    features: [
      {
        id: "orders",
        label: "Orçamentos e pedidos",
        hint: "Crie, edite e acompanhe orçamentos com histórico completo.",
        availability: tiers(true, true, true),
      },
      {
        id: "offline",
        label: "Modo offline (orçamentos e catálogo)",
        hint: "Baixe clientes e produtos para usar sem internet e sincronize depois.",
        availability: tiers(true, true, true),
      },
      {
        id: "clients",
        label: "Cadastro de clientes ilimitado",
        availability: tiers(true, true, true),
      },
      {
        id: "products",
        label: "Catálogo de produtos com busca",
        availability: tiers(true, true, true),
      },
      {
        id: "product-import",
        label: "Importação de produtos (Excel/CSV)",
        hint: "Sincronize o catálogo direto da planilha do ERP, sem conversão manual.",
        availability: tiers(false, true, true),
        isNew: true,
      },
      {
        id: "product-export",
        label: "Exportação do catálogo (CSV/Excel)",
        availability: tiers(false, true, true),
      },
      {
        id: "purchase-import",
        label: "Importação de compras (CSV/PDF)",
        hint: "Atualize estoque e preços a partir de notas e planilhas de fornecedor.",
        availability: tiers(false, true, true),
      },
      {
        id: "price-batch",
        label: "Reajuste de preços em lote",
        availability: tiers(false, true, true),
      },
      {
        id: "brands",
        label: "Representadas (marcas)",
        availability: tierLabels("1 representada", "Ilimitadas", "Ilimitadas"),
      },
    ],
  },
  {
    id: "reports",
    title: "Relatórios e indicadores",
    features: [
      {
        id: "sales-report",
        label: "Relatório de vendas por representante",
        availability: tiers(true, true, true),
      },
      {
        id: "commission-report",
        label: "Relatório de comissões",
        availability: tiers(true, true, true),
      },
      {
        id: "sales-targets",
        label: "Metas de vendas mensais",
        availability: tiers(true, true, true),
      },
      {
        id: "brand-comparison",
        label: "Comparativo entre representadas",
        availability: tiers(false, true, true),
      },
      {
        id: "excel-export",
        label: "Exportação Excel de relatórios",
        availability: tiers(false, true, true),
      },
      {
        id: "commission-pdf",
        label: "PDF de comissões por representante",
        availability: tiers(false, true, true),
      },
    ],
  },
  {
    id: "team",
    title: "Equipe e permissões",
    features: [
      {
        id: "users",
        label: "Usuários na equipe",
        availability: tierLabels("Até 3", "Ilimitados", "Ilimitados"),
      },
      {
        id: "seller-permissions",
        label: "Vendedores com acesso por representada",
        availability: tiers(true, true, true),
      },
      {
        id: "admin-panel",
        label: "Painel administrativo",
        availability: tiers(true, true, true),
      },
    ],
  },
  {
    id: "platform",
    title: "Plataforma e suporte",
    features: [
      {
        id: "workspace",
        label: "Workspace exclusivo da empresa",
        hint: "Ambiente isolado com login próprio e subdomínio opcional.",
        availability: tiers(true, true, true),
      },
      {
        id: "billing",
        label: "Assinatura mensal (cartão, Pix ou boleto)",
        availability: tiers(true, true, true),
      },
      {
        id: "priority-support",
        label: "Suporte prioritário",
        availability: tiers(false, true, true),
      },
      {
        id: "onboarding",
        label: "Onboarding assistido da equipe",
        hint: "Configuração guiada, treinamento inicial e boas práticas com a operação.",
        availability: tiers(false, false, true),
      },
      {
        id: "dedicated-support",
        label: "Suporte dedicado com canal direto",
        hint: "Atendimento próximo para dúvidas, ajustes e acompanhamento da operação.",
        availability: tiers(false, false, true),
      },
      {
        id: "integrations",
        label: "Integrações personalizadas (ERP/CRM/API)",
        hint: "Conectores sob medida com sistemas da empresa — negociados com nossa equipe.",
        availability: tiers(false, false, true),
      },
      {
        id: "roadmap-priority",
        label: "Prioridade na evolução do produto",
        hint: "Feedback da operação entra com prioridade no roadmap do Blum.",
        availability: tiers(false, false, true),
      },
    ],
  },
];

export function isTruthyAvailability(value) {
  if (value === true) return true;
  if (value === false || value == null) return false;
  return String(value).trim().length > 0;
}
