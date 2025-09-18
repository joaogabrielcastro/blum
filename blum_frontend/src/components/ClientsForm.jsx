import { useState } from "react";
import apiService from "../services/apiService";

const ClientsForm = ({ onClientAdded, onCancel }) => {
  const [formData, setFormData] = useState({
    companyName: "",
    contactPerson: "",
    phone: "",
    region: "",
    cnpj: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [errors, setErrors] = useState({});

  const handleCnpjChange = async (e) => {
    const newCnpj = e.target.value.replace(/\D/g, "");
    setFormData((prev) => ({ ...prev, cnpj: newCnpj }));
    setErrors((prev) => ({ ...prev, cnpj: "" }));

    if (newCnpj.length === 14) {
      setIsSearching(true);
      try {
        const data = await apiService.queryCNPJ(newCnpj);
        if (data.nome) {
          setFormData((prev) => ({
            ...prev,
            companyName: data.nome,
            phone: data.telefone || "",
            region: data.uf || "",
          }));
        } else {
          setErrors((prev) => ({ ...prev, cnpj: "CNPJ não encontrado" }));
        }
      } catch (error) {
        console.error("Erro ao buscar CNPJ:", error);
        setErrors((prev) => ({ ...prev, cnpj: "Falha ao consultar CNPJ" }));
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.companyName.trim())
      newErrors.companyName = "Nome da empresa é obrigatório";
    if (!formData.cnpj.trim()) newErrors.cnpj = "CNPJ é obrigatório";
    if (formData.cnpj.length !== 14)
      newErrors.cnpj = "CNPJ deve ter 14 dígitos";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      await apiService.createClient(formData);
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
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Adicionar Novo Cliente
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-gray-700 text-sm font-medium mb-2">
              CNPJ *
            </label>
            <input
              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.cnpj ? "border-red-500" : "border-gray-300"
              }`}
              type="text"
              value={formData.cnpj}
              onChange={handleCnpjChange}
              disabled={isSearching}
              placeholder="00.000.000/0000-00"
              maxLength={14}
            />
            {errors.cnpj && (
              <p className="text-red-500 text-xs mt-1">{errors.cnpj}</p>
            )}
            {isSearching && (
              <p className="text-blue-500 text-xs mt-1">
                Buscando dados do CNPJ...
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Nome da Empresa *
            </label>
            <input
              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.companyName ? "border-red-500" : "border-gray-300"
              }`}
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              required
            />
            {errors.companyName && (
              <p className="text-red-500 text-xs mt-1">{errors.companyName}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Pessoa de Contato
            </label>
            <input
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="text"
              name="contactPerson"
              value={formData.contactPerson}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Telefone
            </label>
            <input
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Email
            </label>
            <input
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Região
            </label>
            <input
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="text"
              name="region"
              value={formData.region}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
