import { useState, useEffect, useCallback } from "react";
import apiService from "../services/apiService";
import ErrorMessage from "../components/ErrorMessage";
import { useToast } from "../context/ToastContext";

const emptyForm = { username: "", password: "", name: "" };

const TeamPage = () => {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [brands, setBrands] = useState([]);
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
      const [u, b] = await Promise.all([
        apiService.getUsers(),
        apiService.getBrands(),
      ]);
      setUsers(Array.isArray(u) ? u : []);
      setBrands(Array.isArray(b) ? b : []);
    } catch (e) {
      const msg = e.message || "Erro ao carregar equipe";
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
      const msg = e.message || "Erro ao carregar representadas do vendedor";
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
      const msg = e.message || "Erro ao salvar";
      setError(msg);
      toast.error(msg);
    } finally {
      setSavingBrands(false);
    }
  };

  const savePassword = async () => {
    if (!pwdModalUser || newPwd.length < 6) {
      setError("Senha deve ter no mínimo 6 caracteres");
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
      const msg = e.message || "Erro ao redefinir senha";
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
      setError("Usuário (mín. 3) e senha (mín. 6) são obrigatórios.");
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
      const msg = e.message || "Erro ao criar vendedor";
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
      const msg = e.message || "Erro ao excluir vendedor";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeletingUser(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Equipe</h1>
      <p className="text-gray-600 text-sm mb-6">
        Crie vendedores, redefina senhas e limite quais representadas cada um
        acessa. Se nenhuma representada estiver marcada para o vendedor, ele
        vê todas (comportamento padrão).
      </p>

      {error && (
        <ErrorMessage message={error} onClose={() => setError(null)} />
      )}

      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Novo vendedor
        </h2>
        <form
          onSubmit={createSalesperson}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end"
        >
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Usuário
            </label>
            <input
              value={newUser.username}
              onChange={(e) =>
                setNewUser((s) => ({ ...s, username: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Senha
            </label>
            <input
              type="password"
              value={newUser.password}
              onChange={(e) =>
                setNewUser((s) => ({ ...s, password: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nome exibido
            </label>
            <input
              value={newUser.name}
              onChange={(e) =>
                setNewUser((s) => ({ ...s, name: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {creating ? "A guardar…" : "Cadastrar vendedor"}
          </button>
        </form>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <h2 className="text-lg font-semibold text-gray-800 p-4 border-b border-gray-100">
          Usuários
        </h2>
        {loading ? (
          <p className="p-8 text-gray-500 text-center">Carregando…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Nome</th>
                  <th className="py-3 px-4">Função</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/80">
                    <td className="py-3 px-4 font-medium">{u.username}</td>
                    <td className="py-3 px-4">{u.name}</td>
                    <td className="py-3 px-4">
                      {u.role === "admin" ? "Administrador" : "Vendedor"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                        {u.role === "salesperson" && (
                          <button
                            type="button"
                            onClick={() => openBrandModal(u)}
                            className="text-purple-700 font-medium hover:underline"
                          >
                            Representadas
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setPwdModalUser(u);
                            setNewPwd("");
                          }}
                          className="text-blue-700 font-medium hover:underline"
                        >
                          Nova senha
                        </button>
                        {u.role === "salesperson" && (
                          <button
                            type="button"
                            onClick={() => setDeleteModalUser(u)}
                            className="text-red-600 font-medium hover:underline"
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {brandModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-5">
            <h3 className="font-semibold text-lg text-gray-900 mb-1">
              Representadas — {brandModalUser.username}
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              Marque as que este vendedor pode acessar. Nenhuma marcada = vê
              todas.
            </p>
            <ul className="space-y-2 mb-6 max-h-64 overflow-y-auto border rounded-lg p-3">
              {brands.map((b) => (
                <li key={b.id}>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={selectedBrandIds.has(b.id)}
                      onChange={() => toggleBrand(b.id)}
                      className="rounded border-gray-300"
                    />
                    <span>{b.name}</span>
                    <span className="text-gray-400 text-xs">
                      ({b.commission_rate ?? 0}%)
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBrandModalUser(null)}
                className="px-4 py-2 text-sm text-gray-700 border rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveBrands}
                disabled={savingBrands}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {savingBrands ? "A guardar…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5">
            <h3 className="font-semibold text-lg text-gray-900 mb-2">
              Excluir vendedor
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Tem certeza que deseja excluir{" "}
              <strong>{deleteModalUser.username}</strong>? Esta ação não pode ser
              desfeita. Se este vendedor tiver pedidos no sistema, a exclusão
              será bloqueada.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                className="px-4 py-2 text-sm border rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                disabled={deletingUser}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deletingUser ? "A excluir…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {pwdModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5">
            <h3 className="font-semibold text-lg text-gray-900 mb-3">
              Nova senha — {pwdModalUser.username}
            </h3>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full border rounded-lg px-3 py-2 text-sm mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPwdModalUser(null)}
                className="px-4 py-2 text-sm border rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={savePassword}
                disabled={savingPwd}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >
                {savingPwd ? "A guardar…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamPage;
