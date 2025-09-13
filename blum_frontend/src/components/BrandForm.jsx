import { useState } from "react";

const BrandForm = ({ onSubmit, onCancel }) => {
  const [brandName, setBrandName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedName = brandName.trim();
    if (!trimmedName) {
      setError("Nome da marca é obrigatório");
      return;
    }
    
    if (trimmedName.length < 2) {
      setError("Nome da marca deve ter pelo menos 2 caracteres");
      return;
    }
    
    setIsSubmitting(true);
    setError("");
    
    try {
      await onSubmit(trimmedName);
      setBrandName("");
    } catch (err) {
      setError("Erro ao adicionar marca. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Adicionar Nova Marca</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Nome da Marca:</label>
          <input
            type="text"
            value={brandName}
            onChange={(e) => {
              setBrandName(e.target.value);
              if (error) setError("");
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Digite o nome da marca"
            disabled={isSubmitting}
          />
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !brandName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Adicionando..." : "Adicionar"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BrandForm;