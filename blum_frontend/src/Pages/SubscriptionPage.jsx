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
import Surface, {
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from "../components/ui/Surface";
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
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6 md:p-8">
      <PageHeader
        title="Assinatura"
        description="Planos mensais. Gerencie pagamentos, renovação e forma de pagamento."
      />

      {error ? <ErrorMessage message={error} /> : null}

      {isOnboarding && !hasActiveSub ? (
        <div className="rounded-2xl border border-brand/20 bg-brand-50 px-5 py-4 text-sm text-brand-700">
          <p className="font-semibold">Bem-vindo ao Blum</p>
          <p className="mt-1">
            {actionLoading
              ? `A abrir o pagamento do plano ${onboardingPlanSlug}…`
              : "Sua empresa foi criada. Em instantes você será redirecionado para concluir a assinatura."}
          </p>
        </div>
      ) : null}

      <SubscriptionStatusBanner subscription={subscription} />

      {subscription ? (
        <Surface>
          <h2 className="text-base font-semibold text-ink">Resumo</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-ink-muted">Empresa</dt>
              <dd className="font-medium text-ink">
                {subscription.tenantName || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink-muted">Plano</dt>
              <dd className="font-medium text-ink">
                {subscription.planName || "Nenhum plano ativo"}
                {subscription.pricePerMonthLabel ? (
                  <span className="block text-sm font-normal text-ink-muted">
                    {formatPlanPrice(subscription)}
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink-muted">Cobrança</dt>
              <dd className="font-medium text-ink">
                {subscription.billingLabel || "Mensal"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink-muted">Status</dt>
              <dd>
                <span
                  className={`inline-flex rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${getSubscriptionStatusStyle(subscription.subscriptionStatus)}`}
                >
                  {getSubscriptionStatusLabel(subscription.subscriptionStatus)}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink-muted">Próxima renovação</dt>
              <dd className="font-medium text-ink">
                {formatBillingDate(subscription.currentPeriodEnd)}
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            {subscription.stripeCustomerId ? (
              <SecondaryButton
                type="button"
                onClick={handlePortal}
                disabled={Boolean(actionLoading)}
              >
                {actionLoading === "portal" ? "A abrir…" : "Portal do cliente"}
              </SecondaryButton>
            ) : null}
            {canReactivate ? (
              <PrimaryButton
                type="button"
                onClick={handleReactivate}
                disabled={Boolean(actionLoading)}
              >
                {actionLoading === "reactivate"
                  ? "A processar…"
                  : "Reativar assinatura"}
              </PrimaryButton>
            ) : null}
            {canCancel ? (
              <SecondaryButton
                type="button"
                onClick={() => setShowCancelModal(true)}
                disabled={Boolean(actionLoading)}
                className="!border-red-200 !text-red-700 hover:!bg-red-50"
              >
                Cancelar assinatura
              </SecondaryButton>
            ) : null}
          </div>
        </Surface>
      ) : null}

      <div>
        <h2 className="text-base font-semibold text-ink">
          {hasActiveSub ? "Alterar plano" : "Escolha um plano mensal"}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
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
        title="Cancelar assinatura"
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
