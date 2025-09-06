import { useState, useEffect } from "react";
import apiService from "../services/apiService";
import ClientsForm from "../components/ClientsForm";

// O componente agora recebe a função de navegação como uma prop
const ClientsPage = ({ onNavigateToClientHistory }) => {
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const clientsData = await apiService.getClients();
      setClients(clientsData);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      alert("Falha ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  };

  const handleClientAdded = () => {
    setShowForm(false);
    fetchClients();
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Clientes</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300 shadow-md"
        >
          + Adicionar Cliente
        </button>
      </div>

      {showForm ? (
        <ClientsForm
          onClientAdded={handleClientAdded}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">Carregando clientes...</div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum cliente encontrado.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Região
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CNPJ
                  </th>
                  {/* Nova coluna para as ações */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.companyName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.contactPerson}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.region}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.cnpj}
                    </td>
                    {/* Botão para ver o histórico de compras */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => onNavigateToClientHistory(client.id)}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        Ver Histórico
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default ClientsPage;
