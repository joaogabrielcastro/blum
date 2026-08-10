import { Link } from "react-router-dom";

/** Soft upgrade para Starter (visível mesmo com BILLING_ENFORCE=false). */
export default function StarterUpgradeBanner({ subscription }) {
  if (!subscription || subscription.isLegacy) return null;
  if (String(subscription.planSlug || "").toLowerCase() !== "starter") {
    return null;
  }
  if (subscription.accessBlocked) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-3 py-2.5 text-center text-sm text-amber-950 sm:px-4">
      <span className="font-semibold">Plano Starter</span>
      <span className="mx-1.5">·</span>
      <span>
        1 representada, até 3 usuários — importações e Excel no Profissional.
      </span>
      <Link
        to="/subscription"
        className="ml-2 font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-700"
      >
        Fazer upgrade
      </Link>
    </div>
  );
}
