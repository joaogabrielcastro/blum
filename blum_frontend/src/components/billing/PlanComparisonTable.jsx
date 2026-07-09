import { useMemo, useState } from "react";
import {
  PLAN_COMPARISON_SECTIONS,
  PLAN_SLUGS,
} from "../../config/planComparison";

function ChevronIcon({ open }) {
  return (
    <svg
      className={`h-5 w-5 shrink-0 text-white transition-transform ${open ? "rotate-180" : ""}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function AvailabilityCell({ value, planName }) {
  if (typeof value === "string") {
    return (
      <span className="text-sm font-medium text-gray-800" title={planName}>
        {value}
      </span>
    );
  }

  if (value === true) {
    return (
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-green-50 text-green-600"
        aria-label={`Incluído no plano ${planName}`}
        title="Incluído"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    );
  }

  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-red-500"
      aria-label={`Não incluído no plano ${planName}`}
      title="Não incluído"
    >
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
      </svg>
    </span>
  );
}

function FeatureLabel({ feature }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-gray-800">{feature.label}</span>
      {feature.isNew ? (
        <span className="rounded bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          Novo
        </span>
      ) : null}
      {feature.hint ? (
        <span
          className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-gray-300 text-[10px] font-bold text-gray-500"
          title={feature.hint}
          aria-label={feature.hint}
        >
          i
        </span>
      ) : null}
    </div>
  );
}

function ComparisonSection({ section, plans, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 bg-gray-700 px-4 py-3 text-left text-sm font-semibold text-white hover:bg-gray-800"
        aria-expanded={open}
      >
        <span>{section.title}</span>
        <ChevronIcon open={open} />
      </button>

      {open ? (
        <div className="divide-y divide-gray-100">
          {section.features.map((feature, rowIndex) => (
            <div
              key={feature.id}
              className={`grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-4 sm:items-center sm:gap-4 ${
                rowIndex % 2 === 0 ? "bg-gray-50/80" : "bg-white"
              }`}
            >
              <div className="sm:col-span-1">
                <FeatureLabel feature={feature} />
              </div>
              <div className="grid grid-cols-3 gap-2 sm:col-span-3 sm:grid-cols-3 sm:justify-items-center">
                {plans.map((plan) => {
                  const value = feature.availability[plan.slug];
                  return (
                    <div
                      key={`${feature.id}-${plan.slug}`}
                      className="flex flex-col items-center gap-1 sm:gap-0"
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 sm:hidden">
                        {plan.name}
                      </span>
                      <AvailabilityCell value={value} planName={plan.name} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const PlanComparisonTable = ({ plans = [], currentPlanSlug = null }) => {
  const orderedPlans = useMemo(() => {
    const bySlug = Object.fromEntries(plans.map((p) => [p.slug, p]));
    return PLAN_SLUGS.map((slug) => bySlug[slug]).filter(Boolean);
  }, [plans]);

  if (orderedPlans.length === 0) return null;

  return (
    <section className="space-y-4" aria-labelledby="plan-comparison-heading">
      <div>
        <h2
          id="plan-comparison-heading"
          className="text-lg font-semibold text-gray-900"
        >
          Compare os planos
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Veja o que cada plano inclui para escolher o melhor para sua equipe.
          {currentPlanSlug ? (
            <span className="ml-1 font-medium text-blue-700">
              Seu plano atual está destacado.
            </span>
          ) : null}
        </p>
      </div>

      {/* Cabeçalho das colunas — visível em telas maiores */}
      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm sm:block">
        <div className="grid grid-cols-4 gap-4 border-b border-gray-200 bg-gray-100 px-4 py-3">
          <div className="text-sm font-semibold text-gray-600">Funcionalidade</div>
          {orderedPlans.map((plan) => {
            const isCurrent = currentPlanSlug === plan.slug;
            return (
              <div
                key={plan.slug}
                className={`text-center text-sm font-bold ${
                  isCurrent ? "text-blue-700" : "text-gray-900"
                }`}
              >
                {plan.name}
                {isCurrent ? (
                  <span className="mt-0.5 block text-xs font-semibold text-blue-600">
                    Atual
                  </span>
                ) : null}
                {plan.pricePerMonthLabel ? (
                  <span className="mt-0.5 block text-xs font-normal text-gray-500">
                    {plan.pricePerMonthLabel}/mês
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {PLAN_COMPARISON_SECTIONS.map((section, index) => (
          <ComparisonSection
            key={section.id}
            section={section}
            plans={orderedPlans}
            defaultOpen={index === 0}
          />
        ))}
      </div>

      <p className="text-xs text-gray-500">
        Limites de usuários e representadas são aplicados automaticamente na conta.
        Recursos marcados como integrações personalizadas são negociados no plano
        Enterprise.
      </p>
    </section>
  );
};

export default PlanComparisonTable;
