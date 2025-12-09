import { useState, useEffect, useCallback } from "react";
import apiService from "../services/apiService";
import ClientsForm from "../components/ClientsForm";
import SearchBar from "../components/SearchBar";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";

const ClientsPage = ({ onNavigateToClientHistory }) => {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  // Filtra clientes baseado no termo de busca
  useEffect(() => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const filtered = clients.filter(
        (client) =>
          client.companyName?.toLowerCase().includes(term) ||
          client.contactPerson?.toLowerCase().includes(term) ||
          client.phone?.includes(term) ||
          client.region?.toLowerCase().includes(term) ||
          client.cnpj?.includes(term) ||
          client.email?.toLowerCase().includes(term)
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  }, [searchTerm, clients]);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const clientsData = await apiService.getClients();
      setClients(clientsData);
      setFilteredClients(clientsData);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      setError("Falha ao carregar clientes. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleClientAdded = () => {
    setShowForm(false);
    setEditingClient(null);
    fetchClients();
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

      setClients((prev) => prev.filter((client) => client.id !== clientId));
      setFilteredClients((prev) =>
        prev.filter((client) => client.id !== clientId)
      );

      setDeleteConfirm(null);
      setError(null);

      setError({ type: "success", message: "Cliente excluído com sucesso!" });
      setTimeout(() => setError(null), 3000);
    } catch (error) {
      console.error("Erro ao deletar cliente:", error);
      const errorMessage =
        error.message?.includes("404") ||
        error.message?.includes("não encontrado")
          ? "Cliente não encontrado. A lista será atualizada."
          : "Falha ao excluir cliente. Tente novamente.";
      setError({
        type: "error",
        message: errorMessage,
      });
      // Atualiza a lista mesmo com erro
      await fetchClients();
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

  if (loading) {
    return <LoadingSpinner message="Carregando clientes..." />;
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header Fixo */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
              <p className="text-gray-600 text-sm">
                Gerencie seu cadastro de clientes
              </p>
            </div>

            {/* Contador */}
            {!showForm && filteredClients.length > 0 && (
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {filteredClients.length} cliente(s)
                {searchTerm && ` encontrado(s)`}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Barra de pesquisa */}
            {!showForm && clients.length > 0 && (
              <div className="w-full sm:w-64">
                <SearchBar
                  placeholder="Buscar clientes..."
                  value={searchTerm}
                  onChange={handleSearch}
                  onClear={handleClearSearch}
                />
              </div>
            )}

            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300 shadow-md flex items-center gap-2 whitespace-nowrap"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Novo Cliente
            </button>
          </div>
        </div>
      </div>

      {/* Mensagens de Feedback */}
      {error && (
        <div className="flex-shrink-0 px-6 py-2">
          <div
            className={`p-3 border rounded-lg ${
              error.type === "success"
                ? "bg-green-100 border-green-200 text-green-700"
                : "bg-red-100 border-red-200 text-red-700"
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {error.type === "success" ? (
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                <span className="text-sm">{error.message}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="hover:opacity-70 text-sm"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Principal - Ocupa todo o espaço restante */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto h-full flex flex-col">
          {showForm ? (
            <div className="flex-1 h-full flex flex-col">
              <ClientsForm
                client={editingClient}
                onClientAdded={handleClientAdded}
                onCancel={handleCancelEdit}
              />
            </div>
          ) : (
            <div className="flex-1 h-full flex flex-col">
              {filteredClients.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <EmptyState
                    title={
                      searchTerm
                        ? "Nenhum cliente encontrado"
                        : "Nenhum cliente cadastrado"
                    }
                    message={
                      searchTerm
                        ? "Tente ajustar os termos da sua busca"
                        : "Adicione clientes para começar"
                    }
                    icon="👥"
                  />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredClients.map((client) => (
                      <div
                        key={client.id}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow h-fit"
                      >
                        {/* Header do Card */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                              {client.companyName?.charAt(0) || "C"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-gray-900 text-lg leading-tight truncate">
                                {client.companyName}
                              </h3>
                              <p className="text-gray-500 text-sm font-mono truncate">
                                {client.cnpj
                                  ? formatCNPJ(client.cnpj)
                                  : "CNPJ não informado"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Informações do Cliente */}
                        <div className="space-y-3 mb-6">
                          <div className="flex items-center gap-2 text-gray-700">
                            <svg
                              className="w-4 h-4 text-gray-400 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                            <span className="text-sm truncate">
                              {client.contactPerson || "Contato não informado"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-gray-700">
                            <svg
                              className="w-4 h-4 text-gray-400 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                              />
                            </svg>
                            <span className="text-sm truncate">
                              {client.phone
                                ? formatPhone(client.phone)
                                : "Telefone não informado"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-gray-700">
                            <svg
                              className="w-4 h-4 text-gray-400 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                              />
                            </svg>
                            <span className="text-sm truncate">
                              {client.email || "Email não informado"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-gray-700">
                            <svg
                              className="w-4 h-4 text-gray-400 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            <span className="text-sm">
                              {client.region || "Região não informada"}
                            </span>
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="flex gap-2 pt-4 border-t border-gray-100">
                          <button
                            onClick={() => onNavigateToClientHistory(client.id)}
                            className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 py-2 px-3 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-1"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                              />
                            </svg>
                            Histórico
                          </button>
                          <button
                            onClick={() => handleEditClient(client)}
                            className="flex-1 bg-green-50 text-green-700 hover:bg-green-100 py-2 px-3 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-1"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                            Editar
                          </button>
                          <button
                            onClick={() => openDeleteConfirm(client)}
                            className="flex-1 bg-red-50 text-red-700 hover:bg-red-100 py-2 px-3 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-1"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">
                Confirmar Exclusão
              </h3>
            </div>

            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir o cliente{" "}
              <strong>"{deleteConfirm.companyName}"</strong>?
              {deleteConfirm.cnpj &&
                ` (CNPJ: ${formatCNPJ(deleteConfirm.cnpj)})`}
              <br />
              <span className="text-red-600 font-medium">
                Esta ação não pode ser desfeita.
              </span>
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteClient(deleteConfirm.id)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Excluindo...
                  </>
                ) : (
                  "Excluir Cliente"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Função para formatar CNPJ
const formatCNPJ = (cnpj) => {
  if (!cnpj) return "";
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
};

// Função para formatar telefone
const formatPhone = (phone) => {
  if (!phone) return "";
  const cleanPhone = phone.replace(/\D/g, "");

  if (cleanPhone.length === 11) {
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  } else if (cleanPhone.length === 10) {
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }

  return phone;
};

export default ClientsPage;
