import {
  formatBillingDate,
  formatPlanPrice,
  getSubscriptionStatusLabel,
  getSubscriptionStatusStyle,
} from "../../utils/billing";

const SubscriptionStatusBanner = ({ subscription }) => {
  if (!subscription || subscription.isLegacy || !subscription.billingEnforced) {
    return null;
  }

  const { subscriptionStatus, paymentActionRequired, cancelAtPeriodEnd } =
    subscription;

  if (subscriptionStatus === "active" && !paymentActionRequired && !cancelAtPeriodEnd) {
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
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
        <p className="font-semibold">Período de teste</p>
        <p className="mt-1 text-sm">
          Teste válido até{" "}
          <strong>{formatBillingDate(subscription.trialEndsAt)}</strong>.
        </p>
      </div>
    );
  }

  if (paymentActionRequired || subscriptionStatus === "past_due") {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-900">
        <p className="font-semibold">Ação de pagamento necessária</p>
        <p className="mt-1 text-sm">
          Houve um problema com o pagamento. Atualize o método de pagamento no
          portal do cliente para evitar a suspensão do acesso.
        </p>
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
