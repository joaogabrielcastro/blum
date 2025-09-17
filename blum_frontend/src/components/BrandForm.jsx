import { useState } from "react";

const BrandForm = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    name: "",
    commission_rate: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Se houver dados iniciais (para edição), preencher o formulário
  useState(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        commission_rate: initialData.commission_rate?.toString() || "0",
      });
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Nome da marca é obrigatório";
    }
    
    if (formData.commission_rate === "" || formData.commission_rate === null) {
      newErrors.commission_rate = "Taxa de comissão é obrigatória";
    } else {
      const commission = parseFloat(formData.commission_rate);
      if (isNaN(commission) || commission < 0 || commission > 100) {
        newErrors.commission_rate = "Taxa deve ser entre 0% e 100%";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const brandData = {
        name: formData.name.trim(),
        commission_rate: parseFloat(formData.commission_rate),
      };
      
      await onSubmit(brandData);
    } catch (error) {
      console.error("Erro no formulário:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">
        {initialData ? "Editar Marca" : "Adicionar Nova Marca"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-2">
            Nome da Marca:
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
              errors.name ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Digite o nome da marca"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-gray-700 mb-2">
            Taxa de Comissão (%):
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              name="commission_rate"
              value={formData.commission_rate}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.commission_rate ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="0.00"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-500">%</span>
            </div>
          </div>
          {errors.commission_rate && (
            <p className="text-red-500 text-xs mt-1">{errors.commission_rate}</p>
          )}
          <p className="text-gray-600 text-xs mt-1">
            Percentual de comissão que será aplicado aos produtos desta marca
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Salvando..." : initialData ? "Atualizar" : "Adicionar"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BrandForm;