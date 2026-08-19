const STEPS = [
  { id: 1, label: "Cliente" },
  { id: 2, label: "Itens" },
  { id: 3, label: "Pagamento" },
];

export default function OrderFormStepper({ step, onStepSelect }) {
  return (
    <nav aria-label="Etapas do pedido" className="mb-5 sm:mb-6">
      <ol className="flex items-center gap-1 sm:gap-2">
        {STEPS.map((s, index) => {
          const done = step > s.id;
          const current = step === s.id;
          return (
            <li key={s.id} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => onStepSelect?.(s.id)}
                aria-current={current ? "step" : undefined}
                className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-2 text-left sm:px-3 ${
                  current
                    ? "bg-brand-50 text-brand-700"
                    : done
                      ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                      : "bg-transparent text-zinc-500 hover:bg-surface-muted"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                    current
                      ? "bg-brand text-white"
                      : done
                        ? "bg-zinc-300 text-zinc-800"
                        : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {done ? (
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    s.id
                  )}
                </span>
                <span className="truncate text-xs font-semibold sm:text-sm">
                  {s.label}
                </span>
              </button>
              {index < STEPS.length - 1 ? (
                <div
                  className={`h-px w-2 shrink-0 sm:w-4 ${
                    step > s.id ? "bg-brand/40" : "bg-zinc-200"
                  }`}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
