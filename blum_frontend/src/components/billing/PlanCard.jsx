const PlanCard = ({
  plan,
  isCurrent,
  onSelect,
  loading,
  actionLabel = "Assinar",
}) => (
  <div
    className={`relative flex flex-col rounded-2xl border p-6 shadow-sm transition-shadow hover:shadow-md ${
      plan.highlighted
        ? "border-blue-500 ring-2 ring-blue-100 bg-white"
        : "border-gray-200 bg-white"
    }`}
  >
    {plan.highlighted ? (
      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
        Mais popular
      </span>
    ) : null}

    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>

    <div className="mt-3">
      <p className="text-3xl font-bold text-gray-900">
        {plan.pricePerMonthLabel || plan.priceLabel || "—"}
        <span className="text-base font-semibold text-gray-500">/mês</span>
      </p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-blue-600">
        {plan.billingLabel || "Assinatura mensal"}
      </p>
    </div>

    <p className="mt-3 text-sm text-gray-600 min-h-[2.5rem]">{plan.description}</p>

    <ul className="mt-6 flex-grow space-y-2 text-sm text-gray-700">
      {(plan.features || []).map((feature) => (
        <li key={feature} className="flex items-start gap-2">
          <span className="mt-0.5 text-green-600" aria-hidden>
            ✓
          </span>
          <span>{feature}</span>
        </li>
      ))}
    </ul>

    <button
      type="button"
      disabled={loading || isCurrent}
      onClick={() => onSelect(plan.slug)}
      className={`mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
        isCurrent
          ? "bg-gray-100 text-gray-500 cursor-default"
          : plan.highlighted
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-900 text-white hover:bg-gray-800"
      } disabled:opacity-60`}
    >
      {isCurrent ? "Plano atual" : loading ? "A processar…" : actionLabel}
    </button>
  </div>
);

export default PlanCard;
