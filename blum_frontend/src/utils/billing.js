const STATUS_LABELS = {
  active: "Ativa",
  trialing: "Período de teste",
  past_due: "Pagamento em atraso",
  unpaid: "Não paga",
  canceled: "Cancelada",
  incomplete: "Incompleta",
  incomplete_expired: "Expirada",
  paused: "Pausada",
  legacy: "Legado (sem cobrança)",
};

const STATUS_STYLES = {
  active: "bg-green-100 text-green-800",
  trialing: "bg-blue-100 text-blue-800",
  past_due: "bg-red-100 text-red-800",
  unpaid: "bg-red-100 text-red-800",
  canceled: "bg-gray-100 text-gray-800",
  incomplete: "bg-amber-100 text-amber-800",
  incomplete_expired: "bg-gray-100 text-gray-700",
  paused: "bg-amber-100 text-amber-800",
  legacy: "bg-gray-100 text-gray-700",
};

export function getSubscriptionStatusLabel(status) {
  return STATUS_LABELS[status] || status || "Desconhecido";
}

export function getSubscriptionStatusStyle(status) {
  return STATUS_STYLES[status] || "bg-gray-100 text-gray-700";
}

export function formatPlanPrice(plan) {
  if (!plan) return "—";
  if (plan.pricePerMonthLabel) {
    return `${plan.pricePerMonthLabel}/mês`;
  }
  if (plan.priceLabel) {
    return plan.billingLabel?.toLowerCase().includes("mensal")
      ? `${plan.priceLabel}/mês`
      : plan.priceLabel;
  }
  return "—";
}

export function formatBillingDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function isSubscriptionHealthy(subscription) {
  if (!subscription) return true;
  if (subscription.isLegacy) return true;
  if (!subscription.billingEnforced) return true;
  return subscription.hasAccess === true;
}
