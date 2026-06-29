const PAYMENT_LABELS = {
  carteira: "Carteira (em aberto)",
  boleto: "Boleto",
  pix: "PIX",
  cheque: "Cheque",
  dinheiro: "Dinheiro",
};

const PAYMENT_BADGE_CLASS = {
  carteira: "bg-amber-50 text-amber-950 border-amber-400 ring-amber-200",
  boleto: "bg-blue-50 text-blue-950 border-blue-500 ring-blue-200",
  pix: "bg-emerald-50 text-emerald-950 border-emerald-500 ring-emerald-200",
  cheque: "bg-purple-50 text-purple-950 border-purple-500 ring-purple-200",
  dinheiro: "bg-lime-50 text-lime-950 border-lime-500 ring-lime-200",
  default: "bg-gray-50 text-gray-800 border-gray-400 ring-gray-200",
};

export function paymentMethodLabel(method) {
  if (!method) return "Pagamento não informado";
  return PAYMENT_LABELS[method] || method;
}

export default function PaymentMethodBadge({ method, prominent = false }) {
  const label = paymentMethodLabel(method);
  const colorClass =
    PAYMENT_BADGE_CLASS[method] || PAYMENT_BADGE_CLASS.default;

  if (prominent) {
    return (
      <span
        className={`inline-flex items-center rounded-lg border-2 px-3.5 py-1.5 text-sm font-bold shadow-sm ring-2 ring-inset ${colorClass}`}
        title="Forma de pagamento"
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}
      title="Forma de pagamento"
    >
      {label}
    </span>
  );
}
