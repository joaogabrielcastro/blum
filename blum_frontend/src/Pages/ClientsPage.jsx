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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);

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
    fetchClients();
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  if (loading) {
    return <LoadingSpinner message="Carregando clientes..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Clientes</h1>
            <p className="text-gray-600 mt-2">
              Gerencie seu cadastro de clientes
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300 shadow-md flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
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
              Adicionar Cliente
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg">
            <div className="flex justify-between items-center">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-700 hover:text-red-900"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Barra de pesquisa */}
        {!showForm && clients.length > 0 && (
          <div className="mb-6">
            <SearchBar
              placeholder="Buscar clientes por nome, CNPJ, região..."
              value={searchTerm}
              onChange={handleSearch}
              onClear={handleClearSearch}
            />
          </div>
        )}

        {showForm ? (
          <ClientsForm
            onClientAdded={handleClientAdded}
            onCancel={() => setShowForm(false)}
          />
        ) : (
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            {filteredClients.length === 0 ? (
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
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Empresa
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contato
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Telefone
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Região
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CNPJ
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredClients.map((client) => (
                      <tr
                        key={client.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">
                            {client.companyName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {client.contactPerson || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {client.phone || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {client.email || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {client.region || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {client.cnpj ? (
                            <span className="font-mono">
                              {formatCNPJ(client.cnpj)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => onNavigateToClientHistory(client.id)}
                            className="text-blue-600 hover:text-blue-900 font-medium flex items-center gap-1"
                            title="Ver histórico de compras"
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Contador de resultados */}
            {filteredClients.length > 0 && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  {filteredClients.length} cliente(s) encontrado(s)
                  {searchTerm && ` para "${searchTerm}"`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Função para formatar CNPJ
const formatCNPJ = (cnpj) => {
  if (!cnpj) return "";
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
};

export default ClientsPage;
