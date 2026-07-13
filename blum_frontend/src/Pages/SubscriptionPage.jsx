import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import apiService from "../services/apiService";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import PlanCard from "../components/billing/PlanCard";
import PlanComparisonTable from "../components/billing/PlanComparisonTable";
import SubscriptionStatusBanner from "../components/billing/SubscriptionStatusBanner";
import ConfirmationModal from "../components/ConfirmationModal";
import { useToast } from "../context/ToastContext";
import {
  formatBillingDate,
  formatPlanPrice,
  getSubscriptionStatusLabel,
  getSubscriptionStatusStyle,
} from "../utils/billing";

const SubscriptionPage = () => {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const onboardingToastShown = useRef(false);
  const autoCheckoutStarted = useRef(false);

  const onboardingPlanSlug =
    process.env.REACT_APP_ONBOARDING_PLAN_SLUG || "starter";

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [plansRes, sub] = await Promise.all([
        apiService.getBillingPlans(),
        apiService.getSubscription(),
      ]);
      setPlans(plansRes?.plans || []);
      setSubscription(sub);
    } catch (e) {
      const msg = e.message || "Erro ao carregar assinatura";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loading || autoCheckoutStarted.current) return;
    if (searchParams.get("onboarding") !== "1") return;
    // Não reabrir checkout se o usuário acabou de cancelar no Stripe
    if (searchParams.get("checkout") === "canceled") return;
    if (subscription?.stripeSubscriptionId) return;

    const targetPlan = plans.find((plan) => plan.slug === onboardingPlanSlug);
    if (!targetPlan) return;

    autoCheckoutStarted.current = true;
    setActionLoading(onboardingPlanSlug);

    apiService
      .createCheckoutSession(onboardingPlanSlug)
      .then(({ url }) => {
        if (url) window.location.href = url;
      })
      .catch((e) => {
        autoCheckoutStarted.current = false;
        setActionLoading(null);
        const msg = e.message || "Erro ao iniciar pagamento";
        setError(msg);
        toast.error(msg);
      });
  }, [loading, plans, subscription, searchParams, onboardingPlanSlug, toast]);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const onboarding = searchParams.get("onboarding");
    if (checkout === "success") {
      toast.success("Pagamento recebido! A assinatura será atualizada em instantes.");
      setSearchParams({}, { replace: true });
      load();
    } else if (checkout === "canceled") {
      toast.warning("Checkout cancelado. Nenhuma cobrança foi feita.");
      // Limpa onboarding para não redirecionar de volta ao Stripe
      setSearchParams({}, { replace: true });
    } else if (onboarding === "1" && !onboardingToastShown.current) {
      onboardingToastShown.current = true;
      toast.info(
        `Redirecionando para o pagamento do plano ${onboardingPlanSlug}…`,
      );
    }
  }, [searchParams, setSearchParams, toast, load, onboardingPlanSlug]);

  const redirectToUrl = (url) => {
    if (url) window.location.href = url;
  };

  const handleSubscribe = async (planSlug) => {
    setActionLoading(planSlug);
    setError(null);
    try {
      if (subscription?.stripeSubscriptionId && subscription?.hasAccess) {
        const updated = await apiService.changeBillingPlan(planSlug);
        setSubscription(updated);
        toast.success("Plano alterado com sucesso.");
        return;
      }
      const { url } = await apiService.createCheckoutSession(planSlug);
      redirectToUrl(url);
    } catch (e) {
      const msg = e.message || "Erro ao iniciar assinatura";
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePortal = async () => {
    setActionLoading("portal");
    setError(null);
    try {
      const { url } = await apiService.createBillingPortalSession();
      redirectToUrl(url);
    } catch (e) {
      const msg = e.message || "Erro ao abrir portal";
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    setActionLoading("cancel");
    setError(null);
    try {
      const updated = await apiService.cancelSubscription();
      setSubscription(updated);
      setShowCancelModal(false);
      toast.success("Cancelamento agendado para o fim do período atual.");
    } catch (e) {
      const msg = e.message || "Erro ao cancelar";
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async () => {
    setActionLoading("reactivate");
    setError(null);
    try {
      const result = await apiService.reactivateSubscription();
      if (result.requiresCheckout && result.url) {
        redirectToUrl(result.url);
        return;
      }
      setSubscription(result.subscription);
      toast.success("Assinatura reativada.");
    } catch (e) {
      const msg = e.message || "Erro ao reativar";
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Carregando assinatura..." />;
  }

  const hasActiveSub =
    subscription?.hasAccess && subscription?.stripeSubscriptionId;
  const isOnboarding = searchParams.get("onboarding") === "1";
  const canCancel =
    hasActiveSub &&
    !subscription?.cancelAtPeriodEnd &&
    subscription?.subscriptionStatus !== "canceled";
  const canReactivate =
    subscription?.cancelAtPeriodEnd &&
    subscription?.subscriptionStatus === "active";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Assinatura
        </h1>
        <p className="mt-2 text-gray-600">
          Planos com cobrança mensal. Gerencie pagamentos, renovação e forma de
          pagamento (cartão, Pix ou boleto).
        </p>
      </div>

      {error ? <ErrorMessage message={error} /> : null}

      {isOnboarding && !hasActiveSub ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-900">
          <p className="font-semibold">Bem-vindo ao Blum!</p>
          <p className="mt-1">
            {actionLoading
              ? `A abrir o pagamento do plano ${onboardingPlanSlug} no Stripe…`
              : "Sua empresa foi criada. Em instantes você será redirecionado para concluir a assinatura."}
          </p>
        </div>
      ) : null}

      <SubscriptionStatusBanner subscription={subscription} />

      {subscription ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Resumo</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-gray-500">Empresa</dt>
              <dd className="font-medium text-gray-900">
                {subscription.tenantName || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Plano</dt>
              <dd className="font-medium text-gray-900">
                {subscription.planName || "Nenhum plano ativo"}
                {subscription.pricePerMonthLabel ? (
                  <span className="block text-sm font-normal text-gray-600">
                    {formatPlanPrice(subscription)}
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Cobrança</dt>
              <dd className="font-medium text-gray-900">
                {subscription.billingLabel || "Mensal"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Status</dt>
              <dd>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getSubscriptionStatusStyle(subscription.subscriptionStatus)}`}
                >
                  {getSubscriptionStatusLabel(subscription.subscriptionStatus)}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Próxima renovação</dt>
              <dd className="font-medium text-gray-900">
                {formatBillingDate(subscription.currentPeriodEnd)}
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            {subscription.stripeCustomerId ? (
              <button
                type="button"
                onClick={handlePortal}
                disabled={Boolean(actionLoading)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
              >
                {actionLoading === "portal" ? "A abrir…" : "Portal do cliente"}
              </button>
            ) : null}
            {canReactivate ? (
              <button
                type="button"
                onClick={handleReactivate}
                disabled={Boolean(actionLoading)}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {actionLoading === "reactivate"
                  ? "A processar…"
                  : "Reativar assinatura"}
              </button>
            ) : null}
            {canCancel ? (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                disabled={Boolean(actionLoading)}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
              >
                Cancelar assinatura
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          {hasActiveSub ? "Alterar plano" : "Escolha um plano mensal"}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Valores por mês, renovados automaticamente. Pagamento via Stripe
          Checkout — cartão, Pix ou boleto.
        </p>

        {plans.length === 0 ? (
          <p className="mt-4 text-gray-600">
            Nenhum plano configurado no servidor. Contacte o suporte.
          </p>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.slug}
                plan={plan}
                isCurrent={subscription?.planSlug === plan.slug}
                onSelect={handleSubscribe}
                loading={actionLoading === plan.slug}
                actionLabel={hasActiveSub ? "Mudar para este plano" : "Assinar"}
              />
            ))}
          </div>
        )}
      </div>

      {plans.length > 0 ? (
        <PlanComparisonTable
          plans={plans}
          currentPlanSlug={subscription?.planSlug}
        />
      ) : null}

      <ConfirmationModal
        show={showCancelModal}
        message="O acesso continuará até o fim do período já pago. Deseja agendar o cancelamento?"
        confirmText={
          actionLoading === "cancel" ? "A processar…" : "Sim, cancelar"
        }
        onConfirm={handleCancel}
        onCancel={() => setShowCancelModal(false)}
      />
    </div>
  );
};

export default SubscriptionPage;
