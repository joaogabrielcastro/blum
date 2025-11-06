import { useState, useEffect } from "react";

const ProductForm = ({ product, brands, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: "",
    productcode: "",
    subcode: "", // ✅ NOVO CAMPO: subcode
    price: "",
    brand: "",
    stock: "",
    minstock: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debug: verifique o que está recebendo
  console.log("Brands no formulário:", brands);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        productcode: product.productcode || "",
        subcode: product.subcode || "", // ✅ INICIALIZA O SUBCÓDIGO
        price: product.price?.toString() || "",
        brand: product.brand || "",
        stock: product.stock?.toString() || "",
        minstock: product.minstock?.toString() || "",
      });
    }
  }, [product]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = "Nome é obrigatório";
    if (!formData.productcode.trim())
      newErrors.productcode = "Código é obrigatório";
    if (!formData.subcode.trim()) // ✅ VALIDAÇÃO DO SUBCÓDIGO
      newErrors.subcode = "Subcódigo é obrigatório";
    if (!formData.price || parseFloat(formData.price) <= 0)
      newErrors.price = "Preço deve ser maior que zero";
    if (!formData.brand) newErrors.brand = "Representada é obrigatória";
    if (!formData.stock || parseInt(formData.stock) < 0)
      newErrors.stock = "Estoque não pode ser negativo";
    if (!formData.minstock || parseInt(formData.minstock) < 0)
      newErrors.minstock = "Estoque mínimo não pode ser negativo";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const productData = {
        name: formData.name.trim(),
        productcode: formData.productcode.trim(),
        subcode: formData.subcode.trim(), // ✅ INCLUI SUBCÓDIGO NO PAYLOAD
        price: parseFloat(formData.price.replace(',', '.')) || 0,
        brand: formData.brand,
        stock: parseInt(formData.stock),
        minstock: parseInt(formData.minstock),
      };

      await onSubmit(productData);
    } catch (error) {
      console.error("Erro no formulário:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Limpar erro do campo quando usuário começar a digitar
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Função para extrair o nome da Representada (se for objeto ou string)
  const getBrandName = (brand) => {
    if (typeof brand === "object" && brand !== null) {
      return brand.name || brand;
    }
    return brand;
  };

  // Função para extrair o valor da Representada (se for objeto ou string)
  const getBrandValue = (brand) => {
    if (typeof brand === "object" && brand !== null) {
      return brand.name || brand;
    }
    return brand;
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">
        {product ? "Editar Produto" : "Adicionar Novo Produto"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-2">Nome do Produto:</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Digite o nome do produto"
          />
          {errors.name && (
            <p className="text-red-500 text-xs mt-1">{errors.name}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 mb-2">Código do Produto:</label>
            <input
              type="text"
              name="productcode"
              value={formData.productcode}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.productcode ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Código do fabricante"
            />
            {errors.productcode && (
              <p className="text-red-500 text-xs mt-1">{errors.productcode}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Subcódigo *</label>
            <input
              type="text"
              name="subcode"
              value={formData.subcode}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.subcode ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Código interno"
            />
            {errors.subcode ? (
              <p className="text-red-500 text-xs mt-1">{errors.subcode}</p>
            ) : (
              <p className="text-gray-500 text-xs mt-1">
                Código único para identificação interna
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Preço:</label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="price"
            value={formData.price}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.price ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Digite o preço do produto"
          />
          {errors.price && (
            <p className="text-red-500 text-xs mt-1">{errors.price}</p>
          )}
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Representada:</label>
          <select
            name="brand"
            value={formData.brand}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.brand ? "border-red-500" : "border-gray-300"
            }`}
            disabled={!brands || brands.length === 0}
          >
            <option value="">Selecione uma Representada</option>
            {brands &&
              brands.map((brand, index) => (
                <option key={index} value={getBrandValue(brand)}>
                  {getBrandName(brand)}
                </option>
              ))}
          </select>
          {errors.brand && (
            <p className="text-red-500 text-xs mt-1">{errors.brand}</p>
          )}
          {(!brands || brands.length === 0) && (
            <p className="text-red-500 text-xs mt-1">
              Você precisa adicionar uma Representada primeiro
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 mb-2">Estoque:</label>
            <input
              type="number"
              min="0"
              name="stock"
              value={formData.stock}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.stock ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Quantidade em estoque"
            />
            {errors.stock && (
              <p className="text-red-500 text-xs mt-1">{errors.stock}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Estoque Mínimo:</label>
            <input
              type="number"
              min="0"
              name="minstock"
              value={formData.minstock}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.minstock ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Estoque mínimo"
            />
            {errors.minstock && (
              <p className="text-red-500 text-xs mt-1">{errors.minstock}</p>
            )}
          </div>
        </div>

        {/* ✅ SEÇÃO DE INFORMAÇÕES IMPORTANTES */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-800">Informações sobre os códigos</h4>
              <ul className="text-sm text-blue-700 mt-1 space-y-1">
                <li>• <strong>Código do Produto:</strong> Código do fabricante/fornecedor</li>
                <li>• <strong>Subcódigo:</strong> Código único interno do seu atacado (obrigatório)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !brands || brands.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Salvando...
              </div>
            ) : product ? (
              "Atualizar Produto"
            ) : (
              "Adicionar Produto"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;