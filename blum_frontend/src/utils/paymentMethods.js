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
