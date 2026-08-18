import { PAYMENT_METHOD_OPTIONS } from "../../utils/paymentMethods";

export default function PaymentMethodPicker({
  value,
  onChange,
  options = PAYMENT_METHOD_OPTIONS,
  disabled = false,
}) {
  return (
    <div
      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
      role="radiogroup"
      aria-label="Forma de pagamento"
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`min-h-12 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition-colors touch-manipulation ${
              selected
                ? "border-brand bg-brand-50 text-brand-700 ring-2 ring-brand/30"
                : "border-edge bg-surface text-ink hover:bg-surface-muted"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
