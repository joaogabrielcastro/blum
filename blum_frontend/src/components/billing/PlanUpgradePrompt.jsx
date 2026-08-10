import { Link } from "react-router-dom";
import { featureLabel } from "../../utils/planFeatures";

/**
 * Modal de upgrade quando o plano atual não inclui a feature.
 */
export default function PlanUpgradePrompt({ open, feature, requiredPlan, onClose }) {
  if (!open) return null;

  const label = featureLabel(feature);
  const planName =
    requiredPlan === "enterprise" ? "Enterprise" : "Profissional";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-upgrade-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="plan-upgrade-title"
          className="text-lg font-bold text-gray-900"
        >
          Recurso do plano {planName}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          <strong>{label}</strong> está disponível a partir do plano{" "}
          {planName}. Faça upgrade em Assinatura para liberar importações,
          exportações avançadas e mais.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Agora não
          </button>
          <Link
            to="/subscription"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Ver planos
          </Link>
        </div>
      </div>
    </div>
  );
}
