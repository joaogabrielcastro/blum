import { useCallback, useEffect, useState } from "react";
import apiService from "../services/apiService";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import ConfirmationModal from "../components/ConfirmationModal";
import ListPageSkeleton from "../components/ListPageSkeleton";
import StatusBadge from "../components/ui/StatusBadge";
import Surface, {
  PageHeader,
  SecondaryButton,
  GhostButton,
} from "../components/ui/Surface";
import { useToast } from "../context/ToastContext";

const PlatformAdminPage = () => {
  const toast = useToast();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await apiService.listPlatformTenants();
      setTenants(data?.tenants || []);
    } catch (e) {
      const msg = e.message || "Não foi possível carregar as empresas.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleShowDetail = async (tenant) => {
    setDetailLoading(true);
    setError(null);
    try {
      const data = await apiService.getPlatformTenantDetail(tenant.id);
      setDetail(data?.tenant || null);
    } catch (e) {
      const msg = e.message || "Não foi possível carregar o detalhe.";
      setError(msg);
      toast.error(msg);
    } finally {
      setDetailLoading(false);
    }
  };

  const applyStatusToggle = async () => {
    if (!statusConfirm) return;
    const { tenant, next } = statusConfirm;
    setUpdatingId(tenant.id);
    setStatusConfirm(null);
    try {
      await apiService.updatePlatformTenantStatus(tenant.id, next);
      toast.success(
        next === "suspended"
          ? `Empresa "${tenant.name}" suspensa.`
          : `Empresa "${tenant.name}" reativada.`,
      );
      await load();
      if (detail?.id === tenant.id) {
        setDetail((prev) => (prev ? { ...prev, status: next } : prev));
      }
    } catch (e) {
      const msg = e.message || "Não foi possível atualizar a empresa.";
      setError(msg);
      toast.error(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <ListPageSkeleton variant="table" rows={6} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
      <PageHeader
        title="Plataforma"
        description="Gerencie todas as empresas cadastradas no Blum."
      />

      {error ? (
        <ErrorMessage message={error} onClose={() => setError(null)} />
      ) : null}

      <Surface padded={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-edge bg-surface-muted/80 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assinatura</th>
                <th className="px-4 py-3 text-right">Usuários</th>
                <th className="px-4 py-3 text-right">Pedidos</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-surface-muted/60">
                  <td className="px-4 py-3 font-medium text-ink">
                    {tenant.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                    {tenant.slug}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={tenant.status}
                      tone={
                        tenant.status === "active"
                          ? "success"
                          : tenant.status === "suspended"
                            ? "danger"
                            : "neutral"
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {tenant.planSlug || "—"}
                    {tenant.subscriptionStatus
                      ? ` (${tenant.subscriptionStatus})`
                      : ""}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink">
                    {tenant.userCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink">
                    {tenant.orderCount}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-1">
                      <SecondaryButton
                        type="button"
                        onClick={() => handleShowDetail(tenant)}
                        className="!min-h-10 !px-3 !py-1.5 !text-xs"
                      >
                        Detalhe
                      </SecondaryButton>
                      <SecondaryButton
                        type="button"
                        onClick={() =>
                          setStatusConfirm({
                            tenant,
                            next:
                              tenant.status === "active"
                                ? "suspended"
                                : "active",
                          })
                        }
                        disabled={updatingId === tenant.id}
                        className="!min-h-10 !px-3 !py-1.5 !text-xs"
                      >
                        {updatingId === tenant.id
                          ? "…"
                          : tenant.status === "active"
                            ? "Suspender"
                            : "Reativar"}
                      </SecondaryButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {tenants.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">
            Nenhuma empresa cadastrada.
          </p>
        ) : null}
      </Surface>

      {detail || detailLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-edge bg-surface p-5 shadow-soft sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold text-ink">
                Detalhe da empresa
              </h2>
              <GhostButton
                type="button"
                onClick={() => setDetail(null)}
                className="!px-2 !py-1"
              >
                Fechar
              </GhostButton>
            </div>
            {detailLoading ? (
              <LoadingSpinner message="A carregar…" />
            ) : detail ? (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <dt className="text-ink-muted">Nome</dt>
                <dd className="font-medium text-ink">{detail.name}</dd>
                <dt className="text-ink-muted">Slug</dt>
                <dd className="font-mono text-xs text-ink">{detail.slug}</dd>
                <dt className="text-ink-muted">Status</dt>
                <dd>
                  <StatusBadge
                    label={detail.status}
                    tone={
                      detail.status === "active" ? "success" : "danger"
                    }
                  />
                </dd>
                <dt className="text-ink-muted">Plano</dt>
                <dd className="text-ink">{detail.planSlug || "—"}</dd>
                <dt className="text-ink-muted">Assinatura</dt>
                <dd className="text-ink">
                  {detail.subscriptionStatus || "—"}
                </dd>
                <dt className="text-ink-muted">E-mail billing</dt>
                <dd className="break-all text-ink">
                  {detail.billingEmail || "—"}
                </dd>
                <dt className="text-ink-muted">Usuários</dt>
                <dd className="text-ink">{detail.userCount}</dd>
                <dt className="text-ink-muted">Pedidos</dt>
                <dd className="text-ink">{detail.orderCount}</dd>
                <dt className="text-ink-muted">Representadas</dt>
                <dd className="text-ink">{detail.brandCount}</dd>
                <dt className="text-ink-muted">Último login</dt>
                <dd className="text-ink">
                  {detail.lastLoginAt
                    ? new Date(detail.lastLoginAt).toLocaleString("pt-BR")
                    : "—"}
                </dd>
                <dt className="text-ink-muted">Criada em</dt>
                <dd className="text-ink">
                  {detail.createdAt
                    ? new Date(detail.createdAt).toLocaleString("pt-BR")
                    : "—"}
                </dd>
              </dl>
            ) : null}
          </div>
        </div>
      ) : null}

      <ConfirmationModal
        show={!!statusConfirm}
        title={
          statusConfirm?.next === "suspended"
            ? "Suspender empresa"
            : "Reativar empresa"
        }
        tone={statusConfirm?.next === "suspended" ? "danger" : "primary"}
        confirmText={
          statusConfirm?.next === "suspended" ? "Suspender" : "Reativar"
        }
        message={
          statusConfirm
            ? `Deseja ${
                statusConfirm.next === "suspended" ? "suspender" : "reativar"
              } a empresa "${statusConfirm.tenant.name}"?`
            : ""
        }
        onConfirm={applyStatusToggle}
        onCancel={() => setStatusConfirm(null)}
      />
    </div>
  );
};

export default PlatformAdminPage;
