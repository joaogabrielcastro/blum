import { useState } from "react";
import apiService from "../services/apiService";

const ClientsForm = ({ onClientAdded, onCancel }) => {
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleCnpjChange = async (e) => {
    const newCnpj = e.target.value.replace(/\D/g, "");
    setCnpj(newCnpj);

    if (newCnpj.length === 14) {
      setIsSearching(true);
      try {
        const data = await apiService.queryCNPJ(newCnpj);
        if (data.nome) {
          setCompanyName(data.nome);
          setPhone(data.telefone);
          setRegion(data.uf);
        } else {
          alert("CNPJ não encontrado. Por favor, preencha manualmente.");
        }
      } catch (error) {
        console.error("Erro ao buscar CNPJ:", error);
        alert("Falha ao consultar CNPJ. Preencha manualmente.");
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyName || !cnpj) {
      alert("Por favor, preencha o nome da empresa e o CNPJ.");
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
      alert("Cliente salvo com sucesso!");
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
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Adicionar Novo Cliente
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              className="block text-gray-700 text-sm font-medium mb-2"
              htmlFor="cnpj"
            >
              CNPJ
            </label>
            <input
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="text"
              id="cnpj"
              value={cnpj}
              onChange={handleCnpjChange}
              disabled={isSearching}
              required
            />
          </div>
          <div>
            <label
              className="block text-gray-700 text-sm font-medium mb-2"
              htmlFor="companyName"
            >
              Nome da Empresa
            </label>
            <input
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="text"
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>
          <div>
            <label
              className="block text-gray-700 text-sm font-medium mb-2"
              htmlFor="contactPerson"
            >
              Pessoa de Contato
            </label>
            <input
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="text"
              id="contactPerson"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
            />
          </div>
          <div>
            <label
              className="block text-gray-700 text-sm font-medium mb-2"
              htmlFor="phone"
            >
              Telefone
            </label>
            <input
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="col-span-1 md:col-span-2">
            <label
              className="block text-gray-700 text-sm font-medium mb-2"
              htmlFor="region"
            >
              Região
            </label>
            <input
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="text"
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end space-x-4 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-100 transition-colors duration-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition duration-300 shadow-md disabled:bg-blue-300"
            disabled={loading || isSearching}
          >
            {loading ? "Salvando..." : "Salvar Cliente"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClientsForm;
