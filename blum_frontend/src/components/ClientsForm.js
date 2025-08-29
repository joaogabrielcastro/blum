import { useState } from 'react';
import apiService from '../apiService';
import { validateCNPJ } from '../utils/validations';

const ClientsForm = ({ onClientAdded, onCancel }) => {
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateCNPJ(cnpj)) {
      alert('Por favor, insira um CNPJ válido.');
      return;
    }

    setLoading(true);
    try {
      const newClient = {
        companyName,
        contactPerson,
        phone,
        region,
        cnpj,
      };
      await apiService.createClient(newClient);
      alert('Cliente salvo com sucesso!');
      onClientAdded();
    } catch (error) {
      console.error("Erro ao adicionar cliente:", error);
      alert("Falha ao adicionar cliente. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Adicionar Novo Cliente</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ... (resto do formulário igual) ... */}
      </form>
    </div>
  );
};

export default ClientsForm;