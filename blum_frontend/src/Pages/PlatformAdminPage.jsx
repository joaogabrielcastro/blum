import { useCallback, useEffect, useState } from "react";
import apiService from "../services/apiService";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

const STATUS_STYLES = {
  active: "bg-emerald-100 text-emerald-800",
  suspended: "bg-red-100 text-red-800",
};

const PlatformAdminPage = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await apiService.listPlatformTenants();
      setTenants(data?.tenants || []);
    } catch (e) {
      setError(e.message || "Erro ao carregar empresas");
    } finally {
      setLoading(false);
    }
  }, []);

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
      setError(e.message || "Erro ao carregar detalhe");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleToggleStatus = async (tenant) => {
    const next = tenant.status === "active" ? "suspended" : "active";
    const label = next === "suspended" ? "suspender" : "reativar";
    if (!window.confirm(`Deseja ${label} a empresa "${tenant.name}"?`)) return;

    setUpdatingId(tenant.id);
    try {
      await apiService.updatePlatformTenantStatus(tenant.id, next);
      await load();
    } catch (e) {
      setError(e.message || "Erro ao atualizar empresa");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Administração da plataforma</h1>
        <p className="mt-2 text-sm text-gray-600">
          Gerencie todas as empresas cadastradas no Blum.
        </p>
      </div>

      {error ? <ErrorMessage message={error} className="mb-4" /> : null}

      <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Empresa</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Slug</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Assinatura</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Usuários</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Pedidos</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tenants.map((tenant) => (
                <tr key={tenant.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{tenant.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{tenant.slug}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        STATUS_STYLES[tenant.status] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {tenant.planSlug || "—"}
                    {tenant.subscriptionStatus ? ` (${tenant.subscriptionStatus})` : ""}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{tenant.userCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{tenant.orderCount}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => handleShowDetail(tenant)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Detalhe
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(tenant)}
                      disabled={updatingId === tenant.id}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      {updatingId === tenant.id
                        ? "…"
                        : tenant.status === "active"
                          ? "Suspender"
                          : "Reativar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {tenants.length === 0 ? (
          <p className="p-6 text-center text-gray-500">Nenhuma empresa cadastrada.</p>
        ) : null}
      </div>

      {detail || detailLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-gray-200">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2 className="text-lg font-bold text-gray-900">Detalhe da empresa</h2>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="text-gray-500 hover:text-gray-800"
              >
                Fechar
              </button>
            </div>
            {detailLoading ? (
              <LoadingSpinner />
            ) : detail ? (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <dt className="text-gray-500">Nome</dt>
                <dd className="font-medium">{detail.name}</dd>
                <dt className="text-gray-500">Slug</dt>
                <dd className="font-mono text-xs">{detail.slug}</dd>
                <dt className="text-gray-500">Status</dt>
                <dd>{detail.status}</dd>
                <dt className="text-gray-500">Plano</dt>
                <dd>{detail.planSlug || "—"}</dd>
                <dt className="text-gray-500">Assinatura</dt>
                <dd>{detail.subscriptionStatus || "—"}</dd>
                <dt className="text-gray-500">E-mail billing</dt>
                <dd>{detail.billingEmail || "—"}</dd>
                <dt className="text-gray-500">Usuários</dt>
                <dd>{detail.userCount}</dd>
                <dt className="text-gray-500">Pedidos</dt>
                <dd>{detail.orderCount}</dd>
                <dt className="text-gray-500">Representadas</dt>
                <dd>{detail.brandCount}</dd>
                <dt className="text-gray-500">Último login</dt>
                <dd>
                  {detail.lastLoginAt
                    ? new Date(detail.lastLoginAt).toLocaleString("pt-BR")
                    : "—"}
                </dd>
                <dt className="text-gray-500">Criada em</dt>
                <dd>
                  {detail.createdAt
                    ? new Date(detail.createdAt).toLocaleString("pt-BR")
                    : "—"}
                </dd>
              </dl>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PlatformAdminPage;
