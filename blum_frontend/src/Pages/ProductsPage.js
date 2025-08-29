import { useState, useEffect } from 'react';
import apiService from '../apiService';
import ProductsForm from '../components/ProductsForm';

const ProductsPage = ({ userRole }) => {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, [selectedBrand]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const productsData = await apiService.getProducts(selectedBrand);
      setProducts(productsData);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      alert("Falha ao carregar produtos.");
    } finally {
      setLoading(false);
    }
  };

  const handleProductAdded = () => {
    setShowForm(false);
    fetchProducts();
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Produtos</h1>
        {userRole === 'admin' && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300 shadow-md"
          >
            + Adicionar Produto
          </button>
        )}
      </div>

      <div className="mb-6">
        <label className="block text-gray-700 text-sm font-medium mb-2">Filtrar por Marca:</label>
        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="p-2 border border-gray-300 rounded-lg"
        >
          <option value="all">Todas as Marcas</option>
          <option value="Blumenau">Blumenau</option>
          <option value="Zagonel">Zagonel</option>
          <option value="Padova">Padova</option>
        </select>
      </div>

      {showForm ? (
        <ProductsForm onProductAdded={handleProductAdded} onCancel={() => setShowForm(false)} />
      ) : (
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">Carregando produtos...</div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Nenhum produto encontrado.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preço</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estoque</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{product.productCode}</td>
                    <td className="px-6 py-4 whitespace-nowrap">R$ {product.price.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{product.stock}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{product.brand}</td>
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

export default ProductsPage;