import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiService from "../services/apiService";
import ClientsForm from "../components/ClientsForm";
import SearchBar from "../components/SearchBar";
import ListPageSkeleton from "../components/ListPageSkeleton";
import EmptyState from "../components/EmptyState";
import Drawer from "../components/ui/Drawer";
import KebabMenu from "../components/ui/KebabMenu";
import Avatar from "../components/ui/Avatar";
import Surface, {
  PageHeader,
  PrimaryButton,
} from "../components/ui/Surface";
import { getClientDisplayName } from "../utils/clients";
import { useToast } from "../context/ToastContext";
import { useAppData } from "../context/AppDataProvider";

const ClientsPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { clientsList, isLoadingClients, clientsError, invalidateClients } =
    useAppData();
  const [filteredClients, setFilteredClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loading = isLoadingClients;
  const loadError = clientsError?.message ?? null;
  const clients = clientsList;

  useEffect(() => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const filtered = clients.filter((client) => {
        const blob = [
          getClientDisplayName(client),
          client.companyName,
          client.nomeFantasia,
          client.nome_fantasia,
          client.contactPerson,
          client.phone,
          client.region,
          client.cnpj,
          client.email,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const words = term.split(/\s+/).filter(Boolean);
        return words.every((word) => blob.includes(word));
      });
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  }, [searchTerm, clients]);

  const handleClientAdded = () => {
    setShowForm(false);
    setEditingClient(null);
    invalidateClients();
  };

  const handleEditClient = (client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingClient(null);
    setShowForm(false);
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  const handleDeleteClient = async (clientId) => {
    setDeleting(true);
    try {
      await apiService.deleteClient(clientId);
      setDeleteConfirm(null);
      toast.success("Cliente removido com sucesso.");
      await invalidateClients();
    } catch (error) {
      console.error("Erro ao deletar cliente:", error);
      const errorMessage =
        error.message?.includes("404") ||
        error.message?.includes("não encontrado")
          ? "Cliente não encontrado. A lista será atualizada."
          : "Falha ao excluir cliente. Tente novamente.";
      toast.error(errorMessage);
      await invalidateClients();
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const openDeleteConfirm = (client) => {
    setDeleteConfirm(client);
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm(null);
  };

  return (
    <div className="flex min-h-full flex-col bg-zinc-50/70">
      <div className="flex-shrink-0 border-b border-zinc-200/80 bg-white/70 px-4 py-4 backdrop-blur-md sm:px-6">
        <PageHeader
          title="Clientes"
          description="Cadastro e contacto das empresas da sua operação"
          meta={
            !loading && filteredClients.length > 0 ? (
              <span className="inline-flex items-center rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-2.5 py-1 text-xs font-medium text-zinc-600">
                {filteredClients.length} cliente
                {filteredClients.length === 1 ? "" : "s"}
                {searchTerm ? " encontrado" : ""}
                {searchTerm && filteredClients.length !== 1 ? "s" : ""}
              </span>
            ) : null
          }
          actions={
            <>
              {!loading && clients.length > 0 ? (
                <div className="w-full sm:w-64">
                  <SearchBar
                    placeholder="Buscar clientes…"
                    value={searchTerm}
                    onChange={handleSearch}
                    onClear={handleClearSearch}
                  />
                </div>
              ) : null}
              <PrimaryButton
                onClick={() => {
                  setEditingClient(null);
                  setShowForm(true);
                }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Novo cliente
              </PrimaryButton>
            </>
          }
        />
      </div>

      {loadError ? (
        <div className="flex-shrink-0 px-4 py-2 sm:px-6">
          <div className="rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-800">
            {loadError}
          </div>
        </div>
      ) : null}

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="mx-auto max-w-7xl">
          {loading ? (
            <ListPageSkeleton variant="table" rows={8} />
          ) : filteredClients.length === 0 ? (
            <Surface>
              <EmptyState
                title={
                  searchTerm
                    ? "Nenhum cliente encontrado"
                    : "Nenhum cliente cadastrado"
                }
                message={
                  searchTerm
                    ? "Tente ajustar os termos da sua busca."
                    : "Adicione o primeiro cliente para começar a operar."
                }
                actionLabel={searchTerm ? undefined : "Novo cliente"}
                onAction={
                  searchTerm
                    ? undefined
                    : () => {
                        setEditingClient(null);
                        setShowForm(true);
                      }
                }
              />
            </Surface>
          ) : (
            <>
              {/* Desktop table */}
              <Surface padded={false} className="hidden overflow-hidden md:block">
                <div className="max-h-[calc(100vh-13rem)] overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 z-10 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
                      <tr className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        <th className="px-5 py-3.5 font-semibold">Cliente</th>
                        <th className="px-4 py-3.5 font-semibold">Contacto</th>
                        <th className="px-4 py-3.5 font-semibold">Telefone</th>
                        <th className="px-4 py-3.5 font-semibold">Região</th>
                        <th className="w-14 px-3 py-3.5 text-right font-semibold">
                          <span className="sr-only">Ações</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filteredClients.map((client) => {
                        const name = getClientDisplayName(client) || "—";
                        return (
                          <tr
                            key={client.id}
                            className="transition-colors duration-200 ease-in-out hover:bg-zinc-50/50"
                          >
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <Avatar name={name} size="md" />
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-zinc-900">
                                    {name}
                                  </p>
                                  <p className="truncate font-mono text-xs text-zinc-400">
                                    {client.cnpj
                                      ? formatCNPJ(client.cnpj)
                                      : "CNPJ não informado"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <p className="truncate text-zinc-700">
                                {client.contactPerson || "—"}
                              </p>
                              <p className="truncate text-xs text-zinc-400">
                                {client.email || "Sem e-mail"}
                              </p>
                            </td>
                            <td className="px-4 py-3.5 tabular-nums text-zinc-600">
                              {client.phone
                                ? formatPhone(client.phone)
                                : "—"}
                            </td>
                            <td className="px-4 py-3.5 text-zinc-600">
                              {client.region || "—"}
                            </td>
                            <td className="px-3 py-3.5 text-right">
                              <KebabMenu
                                items={[
                                  {
                                    id: "history",
                                    label: "Histórico",
                                    onClick: () =>
                                      navigate(`/clients/${client.id}/history`),
                                  },
                                  {
                                    id: "edit",
                                    label: "Editar",
                                    onClick: () => handleEditClient(client),
                                  },
                                  {
                                    id: "delete",
                                    label: "Excluir",
                                    tone: "danger",
                                    onClick: () => openDeleteConfirm(client),
                                  },
                                ]}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Surface>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {filteredClients.map((client) => {
                  const name = getClientDisplayName(client) || "—";
                  return (
                    <Surface
                      key={client.id}
                      className="transition-all duration-200 ease-in-out active:scale-[0.99]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar name={name} />
                          <div className="min-w-0">
                            <p className="font-semibold text-zinc-900">{name}</p>
                            <p className="font-mono text-xs text-zinc-400">
                              {client.cnpj
                                ? formatCNPJ(client.cnpj)
                                : "Sem CNPJ"}
                            </p>
                          </div>
                        </div>
                        <KebabMenu
                          items={[
                            {
                              id: "history",
                              label: "Histórico",
                              onClick: () =>
                                navigate(`/clients/${client.id}/history`),
                            },
                            {
                              id: "edit",
                              label: "Editar",
                              onClick: () => handleEditClient(client),
                            },
                            {
                              id: "delete",
                              label: "Excluir",
                              tone: "danger",
                              onClick: () => openDeleteConfirm(client),
                            },
                          ]}
                        />
                      </div>
                      <dl className="mt-4 space-y-1.5 text-sm">
                        <div className="flex justify-between gap-2">
                          <dt className="text-zinc-400">Contacto</dt>
                          <dd className="truncate text-zinc-700">
                            {client.contactPerson || "—"}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-zinc-400">Telefone</dt>
                          <dd className="tabular-nums text-zinc-700">
                            {client.phone ? formatPhone(client.phone) : "—"}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-zinc-400">Região</dt>
                          <dd className="text-zinc-700">{client.region || "—"}</dd>
                        </div>
                      </dl>
                    </Surface>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <Drawer
        open={showForm}
        onClose={handleCancelEdit}
        title={editingClient ? "Editar cliente" : "Novo cliente"}
        description={
          editingClient
            ? "Atualize os dados cadastrais"
            : "Preencha CNPJ e dados da empresa"
        }
        widthClass="max-w-2xl"
      >
        <ClientsForm
          variant="drawer"
          client={editingClient}
          onClientAdded={handleClientAdded}
          onCancel={handleCancelEdit}
        />
      </Drawer>

      {deleteConfirm ? (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white/95 p-6 shadow-glass backdrop-blur-md animate-fade-in">
            <h3 className="text-lg font-semibold text-zinc-900">
              Excluir cliente?
            </h3>
            <p className="mt-2 text-sm text-zinc-500">
              Tem certeza que deseja excluir{" "}
              <strong className="font-semibold text-zinc-800">
                {getClientDisplayName(deleteConfirm)}
              </strong>
              {deleteConfirm.cnpj
                ? ` (CNPJ: ${formatCNPJ(deleteConfirm.cnpj)})`
                : ""}
              ? Esta ação não pode ser desfeita.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                disabled={deleting}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition-all duration-200 hover:bg-zinc-50 active:scale-[0.98] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteClient(deleteConfirm.id)}
                disabled={deleting}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98] disabled:opacity-50"
              >
                {deleting ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const formatCNPJ = (cnpj) => {
  if (!cnpj) return "";
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
};

const formatPhone = (phone) => {
  if (!phone) return "";
  const cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length === 11) {
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  if (cleanPhone.length === 10) {
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return phone;
};

export default ClientsPage;
