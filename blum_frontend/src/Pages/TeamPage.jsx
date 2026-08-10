import { useState, useEffect, useCallback } from "react";
import apiService from "../services/apiService";
import ErrorMessage from "../components/ErrorMessage";
import ConfirmationModal from "../components/ConfirmationModal";
import ListPageSkeleton from "../components/ListPageSkeleton";
import StatusBadge from "../components/ui/StatusBadge";
import FormField, { inputClassName } from "../components/ui/FormField";
import Surface, {
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
} from "../components/ui/Surface";
import { useToast } from "../context/ToastContext";
import { useAppData } from "../context/AppDataProvider";

const emptyForm = { username: "", password: "", name: "" };

const TeamPage = () => {
  const toast = useToast();
  const { brands } = useAppData();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newUser, setNewUser] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [brandModalUser, setBrandModalUser] = useState(null);
  const [selectedBrandIds, setSelectedBrandIds] = useState(new Set());
  const [savingBrands, setSavingBrands] = useState(false);
  const [pwdModalUser, setPwdModalUser] = useState(null);
  const [newPwd, setNewPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [deleteModalUser, setDeleteModalUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const u = await apiService.getUsers();
      setUsers(Array.isArray(u) ? u : []);
    } catch (e) {
      const msg = e.message || "Não foi possível carregar a equipe.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openBrandModal = async (user) => {
    if (user.role !== "salesperson") return;
    setError(null);
    setBrandModalUser(user);
    setSelectedBrandIds(new Set());
    try {
      const { brandIds } = await apiService.getUserAllowedBrands(user.id);
      setSelectedBrandIds(new Set(brandIds || []));
    } catch (e) {
      const msg =
        e.message || "Não foi possível carregar as representadas do vendedor.";
      setError(msg);
      toast.error(msg);
    }
  };

  const toggleBrand = (id) => {
    setSelectedBrandIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveBrands = async () => {
    if (!brandModalUser) return;
    setSavingBrands(true);
    setError(null);
    try {
      await apiService.setUserAllowedBrands(
        brandModalUser.id,
        Array.from(selectedBrandIds),
      );
      toast.success("Representadas atualizadas.");
      setBrandModalUser(null);
    } catch (e) {
      const msg = e.message || "Não foi possível guardar as representadas.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSavingBrands(false);
    }
  };

  const savePassword = async () => {
    if (!pwdModalUser || newPwd.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      toast.warning("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    setSavingPwd(true);
    setError(null);
    try {
      await apiService.adminResetUserPassword(pwdModalUser.id, newPwd);
      toast.success(`Senha de ${pwdModalUser.username} atualizada.`);
      setPwdModalUser(null);
      setNewPwd("");
    } catch (e) {
      const msg = e.message || "Não foi possível redefinir a senha.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSavingPwd(false);
    }
  };

  const createSalesperson = async (e) => {
    e.preventDefault();
    const u = newUser.username.trim();
    const p = newUser.password.trim();
    const n = newUser.name.trim() || u;
    if (u.length < 3 || p.length < 6) {
      const msg = "Usuário (mín. 3) e senha (mín. 6) são obrigatórios.";
      setError(msg);
      toast.warning(msg);
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await apiService.createUser({
        username: u,
        password: p,
        role: "salesperson",
        name: n,
      });
      toast.success("Vendedor criado.");
      setNewUser(emptyForm);
      await load();
    } catch (e) {
      const msg = e.message || "Não foi possível criar o vendedor.";
      setError(msg);
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteModalUser) return;
    const removedId = deleteModalUser.id;
    const removedUsername = deleteModalUser.username;
    setDeletingUser(true);
    setError(null);
    try {
      await apiService.deleteUser(removedId);
      toast.success(`Vendedor ${removedUsername} excluído.`);
      setDeleteModalUser(null);
      if (brandModalUser?.id === removedId) setBrandModalUser(null);
      await load();
    } catch (e) {
      const msg = e.message || "Não foi possível excluir o vendedor.";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeletingUser(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 md:p-8">
      <PageHeader
        title="Equipe"
        description="Crie vendedores, redefina senhas e limite representadas. Sem marcações, o vendedor vê todas."
      />

      {error ? (
        <ErrorMessage message={error} onClose={() => setError(null)} />
      ) : null}

      <Surface className="mb-6">
        <h2 className="mb-4 text-base font-semibold text-ink">
          Novo vendedor
        </h2>
        <form
          onSubmit={createSalesperson}
          className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <FormField label="Usuário" required>
            <input
              value={newUser.username}
              onChange={(e) =>
                setNewUser((s) => ({ ...s, username: e.target.value }))
              }
              className={inputClassName()}
              autoComplete="off"
            />
          </FormField>
          <FormField label="Senha" required>
            <input
              type="password"
              value={newUser.password}
              onChange={(e) =>
                setNewUser((s) => ({ ...s, password: e.target.value }))
              }
              className={inputClassName()}
            />
          </FormField>
          <FormField label="Nome exibido">
            <input
              value={newUser.name}
              onChange={(e) =>
                setNewUser((s) => ({ ...s, name: e.target.value }))
              }
              className={inputClassName()}
            />
          </FormField>
          <PrimaryButton type="submit" disabled={creating} className="w-full">
            {creating ? "A guardar…" : "Cadastrar vendedor"}
          </PrimaryButton>
        </form>
      </Surface>

      <Surface padded={false} className="overflow-hidden">
        <div className="border-b border-edge px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-ink">Usuários</h2>
        </div>
        {loading ? (
          <div className="p-4">
            <ListPageSkeleton variant="table" rows={4} />
          </div>
        ) : users.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">
            Nenhum usuário encontrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-edge bg-surface-muted/80 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Função</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-muted/60">
                    <td className="px-4 py-3 font-medium text-ink">
                      {u.username}
                    </td>
                    <td className="px-4 py-3 text-ink">{u.name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={
                          u.role === "admin" ? "Administrador" : "Vendedor"
                        }
                        tone={u.role === "admin" ? "info" : "neutral"}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1">
                        {u.role === "salesperson" ? (
                          <GhostButton
                            type="button"
                            onClick={() => openBrandModal(u)}
                            className="!px-2 !py-1.5 !text-sm text-brand"
                          >
                            Representadas
                          </GhostButton>
                        ) : null}
                        <GhostButton
                          type="button"
                          onClick={() => {
                            setPwdModalUser(u);
                            setNewPwd("");
                          }}
                          className="!px-2 !py-1.5 !text-sm"
                        >
                          Nova senha
                        </GhostButton>
                        {u.role === "salesperson" ? (
                          <GhostButton
                            type="button"
                            onClick={() => setDeleteModalUser(u)}
                            className="!px-2 !py-1.5 !text-sm !text-red-700"
                          >
                            Excluir
                          </GhostButton>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Surface>

      {brandModalUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-edge bg-surface p-5 shadow-soft">
            <h3 className="text-lg font-semibold text-ink">
              Representadas — {brandModalUser.username}
            </h3>
            <p className="mt-1 text-xs text-ink-muted">
              Marque as que este vendedor pode acessar. Nenhuma marcada = vê
              todas.
            </p>
            <ul className="mt-4 mb-6 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-edge p-3">
              {brands.map((b) => (
                <li key={b.id}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={selectedBrandIds.has(b.id)}
                      onChange={() => toggleBrand(b.id)}
                      className="h-4 w-4 rounded border-zinc-300 text-brand focus:ring-brand/30"
                    />
                    <span>{b.name}</span>
                    <span className="text-xs text-ink-muted">
                      ({b.commission_rate ?? 0}%)
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <SecondaryButton
                type="button"
                onClick={() => setBrandModalUser(null)}
              >
                Cancelar
              </SecondaryButton>
              <PrimaryButton
                type="button"
                onClick={saveBrands}
                disabled={savingBrands}
              >
                {savingBrands ? "A guardar…" : "Guardar"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      ) : null}

      {pwdModalUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-edge bg-surface p-5 shadow-soft">
            <h3 className="mb-3 text-lg font-semibold text-ink">
              Nova senha — {pwdModalUser.username}
            </h3>
            <FormField label="Nova senha" hint="Mínimo 6 caracteres">
              <input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="••••••••"
                className={inputClassName()}
              />
            </FormField>
            <div className="mt-4 flex justify-end gap-2">
              <SecondaryButton
                type="button"
                onClick={() => setPwdModalUser(null)}
              >
                Cancelar
              </SecondaryButton>
              <PrimaryButton
                type="button"
                onClick={savePassword}
                disabled={savingPwd}
              >
                {savingPwd ? "A guardar…" : "Guardar"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmationModal
        show={!!deleteModalUser}
        title="Excluir vendedor"
        tone="danger"
        confirmText={deletingUser ? "A excluir…" : "Excluir"}
        message={
          deleteModalUser
            ? `Tem certeza que deseja excluir ${deleteModalUser.username}? Esta ação não pode ser desfeita. Se houver pedidos vinculados, a exclusão será bloqueada.`
            : ""
        }
        onConfirm={confirmDeleteUser}
        onCancel={() => setDeleteModalUser(null)}
      />
    </div>
  );
};

export default TeamPage;
