import { useState } from 'react';
import apiService from '../apiService';

const ProductsForm = ({ onProductAdded, onCancel }) => {
  const [name, setName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [brand, setBrand] = useState('Blumenau');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !productCode || !brand || isNaN(parseFloat(price)) || parseFloat(price) <= 0 || isNaN(parseInt(stock, 10)) || parseInt(stock, 10) < 0) {
      alert('Por favor, preencha todos os campos corretamente.');
      return;
    }

    setLoading(true);
    try {
      const newProduct = {
        name,
        productCode,
        price: parseFloat(price),
        stock: parseInt(stock, 10),
        brand,
      };
      await apiService.createProduct(newProduct);
      onProductAdded();
    } catch (error) {
      console.error("Erro ao adicionar produto:", error);
      alert("Falha ao adicionar produto. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Adicionar Novo Produto</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="name">Nome do Produto</label>
            <input
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="price">Preço (R$)</label>
            <input
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="number"
              id="price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              step="0.01"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="stock">Estoque</label>
            <input
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="number"
              id="stock"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="productCode">Código do Produto</label>
            <input
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="text"
              id="productCode"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              required
            />
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="brand">Marca</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              id="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              required
            >
              <option value="Blumenau">Blumenau</option>
              <option value="Zagonel">Zagonel</option>
              <option value="Padova">Padova</option>
            </select>
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
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Salvar Produto'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductsForm;