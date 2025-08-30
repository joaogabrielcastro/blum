import { useState } from "react";
import apiService from "../apiService";

const AddBrandForm = ({ onBrandAdded, onCancel }) => {
  const [brandName, setBrandName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = brandName.trim();
    if (!trimmedName) {
      alert("O nome da marca não pode ser vazio.");
      return;
    }

    setLoading(true);

    try {
      await apiService.createBrand({ name: trimmedName });
      alert("Marca salva com sucesso!");
      setBrandName("");
      onBrandAdded();
    } catch (error) {
      console.error("Erro ao adicionar marca:", error);
      alert("Não foi possível salvar a marca. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Adicionar Nova Marca
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="brandName"
            className="block text-gray-700 text-sm font-medium mb-2"
          >
            Nome da Marca
          </label>
          <input
            id="brandName"
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Digite o nome da nova marca"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>
        <div className="flex justify-end space-x-4 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-100 transition-colors duration-200"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={`px-6 py-3 font-bold rounded-lg shadow-md transition-colors duration-300 
              ${loading ? "bg-blue-300 text-white cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}`}
            disabled={loading}
          >
            {loading ? "Salvando..." : "Salvar Marca"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddBrandForm;
