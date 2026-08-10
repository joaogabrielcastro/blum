import { Link } from "react-router-dom";
import {
  formatBillingDate,
  formatPlanPrice,
  getSubscriptionStatusLabel,
  getSubscriptionStatusStyle,
} from "../../utils/billing";

function daysUntil(iso) {
  if (!iso) return null;
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return null;
  const ms = end.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

const CtaLink = ({ to = "/subscription", children }) => (
  <Link
    to={to}
    className="mt-3 inline-flex text-sm font-semibold underline underline-offset-2"
  >
    {children}
  </Link>
);

const SubscriptionStatusBanner = ({ subscription }) => {
  if (!subscription || subscription.isLegacy) {
    return null;
  }

  const { subscriptionStatus, paymentActionRequired, cancelAtPeriodEnd } =
    subscription;

  // Soft starter upgrade even when billing is not enforced
  if (
    String(subscription.planSlug || "").toLowerCase() === "starter" &&
    !subscription.accessBlocked &&
    subscriptionStatus === "active" &&
    !paymentActionRequired &&
    !cancelAtPeriodEnd
  ) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
        <p className="font-semibold">Você está no plano Starter</p>
        <p className="mt-1 text-sm">
          {subscription.pricePerMonthLabel ? (
            <>
              <strong>{formatPlanPrice(subscription)}</strong>
              {" · "}
            </>
          ) : null}
          Limite: 1 representada e até 3 usuários. Importações, Excel e
          reajuste em lote ficam no Profissional.
        </p>
        <CtaLink>Fazer upgrade</CtaLink>
      </div>
    );
  }

  if (!subscription.billingEnforced) {
    return null;
  }

  if (
    subscriptionStatus === "active" &&
    !paymentActionRequired &&
    !cancelAtPeriodEnd
  ) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-900">
        <p className="font-semibold">Assinatura ativa</p>
        <p className="mt-1 text-sm">
          {subscription.pricePerMonthLabel ? (
            <>
              <strong>{formatPlanPrice(subscription)}</strong>
              {" · "}
            </>
          ) : null}
          Próxima renovação em{" "}
          <strong>{formatBillingDate(subscription.currentPeriodEnd)}</strong>
          {subscription.planName ? ` — plano ${subscription.planName}` : ""}.
        </p>
      </div>
    );
  }

  if (subscriptionStatus === "trialing") {
    const days = daysUntil(subscription.trialEndsAt);
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
        <p className="font-semibold">Período de teste</p>
        <p className="mt-1 text-sm">
          {days != null ? (
            <>
              Restam <strong>{days} dia{days === 1 ? "" : "s"}</strong> — válido
              até{" "}
              <strong>{formatBillingDate(subscription.trialEndsAt)}</strong>.
            </>
          ) : (
            <>
              Teste válido até{" "}
              <strong>{formatBillingDate(subscription.trialEndsAt)}</strong>.
            </>
          )}{" "}
          Escolha um plano para continuar sem interrupção.
        </p>
        <CtaLink>Escolher plano / Assinar</CtaLink>
      </div>
    );
  }

  if (paymentActionRequired || subscriptionStatus === "past_due") {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-900">
        <p className="font-semibold">Ação de pagamento necessária</p>
        <p className="mt-1 text-sm">
          Houve um problema com o pagamento. Atualize o método de pagamento
          para evitar a suspensão do acesso.
        </p>
        <CtaLink>Atualizar pagamento</CtaLink>
      </div>
    );
  }

  if (cancelAtPeriodEnd && subscriptionStatus === "active") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
        <p className="font-semibold">Cancelamento agendado</p>
        <p className="mt-1 text-sm">
          O acesso continua até{" "}
          <strong>{formatBillingDate(subscription.currentPeriodEnd)}</strong>.
          Você pode reativar antes dessa data.
        </p>
        <CtaLink>Reativar assinatura</CtaLink>
      </div>
    );
  }

  if (
    subscription.accessBlocked ||
    subscriptionStatus === "canceled" ||
    subscriptionStatus === "unpaid"
  ) {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-900">
        <p className="font-semibold">Assinatura inativa</p>
        <p className="mt-1 text-sm">
          Escolha um plano ou regularize o pagamento para voltar a usar o
          sistema.
        </p>
        <CtaLink>Reativar / escolher plano</CtaLink>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border p-4 ${getSubscriptionStatusStyle(subscriptionStatus)}`}
    >
      <p className="font-semibold">
        Status: {getSubscriptionStatusLabel(subscriptionStatus)}
      </p>
    </div>
  );
};

export default SubscriptionStatusBanner;
