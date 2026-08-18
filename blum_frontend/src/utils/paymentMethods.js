export const PAYMENT_METHOD_OPTIONS = [
  { value: "carteira", label: "Carteira (em aberto)" },
  { value: "boleto", label: "Boleto" },
  { value: "pix", label: "PIX" },
  { value: "cheque", label: "Cheque" },
  { value: "dinheiro", label: "Dinheiro" },
];

export const SETTLED_PAYMENT_METHODS = PAYMENT_METHOD_OPTIONS.filter(
  (opt) => opt.value !== "carteira",
);

export function hasPaymentMethod(method) {
  return Boolean(method && String(method).trim());
}

/** Pedido convertido sem pagamento, ou ainda em carteira. */
export function needsPaymentRegistration(method) {
  return !hasPaymentMethod(method) || method === "carteira";
}

export function canFinalizeDelivery(order) {
  if (!order) return false;
  const doc = order.documentType ?? order.document_type;
  const status = order.status;
  if (doc === "orcamento") return false;
  if (status === "Entregue") return false;
  if (!hasPaymentMethod(order.paymentMethod ?? order.payment_method)) {
    return false;
  }
  if (order.hasStockWarning || order.has_stock_warning) return false;
  return true;
}

export function paymentOptionsForOrder(order) {
  const discount = parseFloat(order?.discount) || 0;
  const current = order?.paymentMethod ?? order?.payment_method;
  const settling = current === "carteira";
  let options = settling ? SETTLED_PAYMENT_METHODS : PAYMENT_METHOD_OPTIONS;
  if (discount > 0) {
    options = options.filter(
      (opt) => opt.value === "pix" || opt.value === "dinheiro",
    );
  }
  return options;
}

export function finalizeDeliveryBlockReason(order) {
  if (!order) return "Pedido inválido.";
  const doc = order.documentType ?? order.document_type;
  if (doc === "orcamento") {
    return "Converta o orçamento em pedido antes de finalizar a entrega.";
  }
  if (order.status === "Entregue") return "Este pedido já foi finalizado.";
  if (!hasPaymentMethod(order.paymentMethod ?? order.payment_method)) {
    return "Defina a forma de pagamento antes de finalizar a entrega.";
  }
  if (order.hasStockWarning || order.has_stock_warning) {
    return "Este pedido tem itens sem estoque. A entrega fica bloqueada até haver estoque.";
  }
  return null;
}

