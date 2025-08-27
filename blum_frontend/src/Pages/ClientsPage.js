import { useState, useEffect } from 'react';
import apiService from './services/apiService';

const ClientsPage = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const data = await apiService.getClients();
        setClients(data);
      } catch (error) {
        console.error('Falha ao buscar clientes:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando clientes...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestão de Clientes</h1>
      <p className="text-gray-600 mb-8">Lista e detalhes dos clientes cadastrados.</p>
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
        {clients.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {clients.map(client => (
              <li key={client.id} className="py-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">{client.companyName}</h2>
                    <p className="text-sm text-gray-500">Contato: {client.contactPerson}</p>
                  </div>
                  <div className="mt-2 sm:mt-0 text-right">
                    <p className="text-sm text-gray-700">{client.phone}</p>
                    <p className="text-sm text-gray-500">Região: {client.region}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center text-gray-500">Nenhum cliente encontrado.</div>
        )}
      </div>
    </div>
  );
};

export default ClientsPage;