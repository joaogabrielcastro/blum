/**
 * Vocabulário único de status de pedido/orçamento para UI.
 * Aceita valores legados EN e labels PT já normalizados.
 */

const STATUS_META = {
  Entregue: {
    label: "Entregue",
    tone: "success",
  },
  Pendente: {
    label: "Pendente",
    tone: "warning",
  },
  Processando: {
    label: "Processando",
    tone: "info",
  },
  Cancelado: {
    label: "Cancelado",
    tone: "danger",
  },
  Aberto: {
    label: "Aberto",
    tone: "neutral",
  },
};

const ALIASES = {
  entregue: "Entregue",
  completed: "Entregue",
  complete: "Entregue",
  pending: "Pendente",
  pendente: "Pendente",
  "em aberto": "Pendente",
  processing: "Processando",
  processando: "Processando",
  cancelled: "Cancelado",
  canceled: "Cancelado",
  cancelado: "Cancelado",
  open: "Aberto",
  aberto: "Aberto",
};

export function normalizeOrderStatus(status) {
  if (status == null || status === "") return "Aberto";
  const raw = String(status).trim();
  if (STATUS_META[raw]) return raw;
  const mapped = ALIASES[raw.toLowerCase()];
  return mapped || raw;
}

export function getOrderStatusMeta(status) {
  const key = normalizeOrderStatus(status);
  return (
    STATUS_META[key] || {
      label: key,
      tone: "neutral",
    }
  );
}
