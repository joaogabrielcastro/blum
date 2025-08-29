import { useState, useEffect } from 'react';
import apiService from '../apiService';
import ProductsForm from '../components/ProductsForm';

const ProductsPage = ({ userRole }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('all');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await apiService.getProducts(selectedBrand);
        setProducts(data);
      } catch (error) {
        console.error("Erro ao buscar produtos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [selectedBrand]);

  // Função segura para formatar preço
  const formatPrice = (price) => {
    if (price === null || price === undefined || isNaN(parseFloat(price))) {
      return '0.00';
    }
    return parseFloat(price).toFixed(2);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando produtos...</div>;
  if (showForm) {
    return (
      <div className="p-8">
        <ProductsForm onProductAdded={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Catálogo de Produtos</h1>
        {userRole === 'admin' && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-300 shadow-md"
          >
            + Adicionar Produto
          </button>
        )}
      </div>
      <div className="flex items-center space-x-2 mb-8">
        <span className="font-semibold text-gray-700">Filtrar por Marca:</span>
        <button
          onClick={() => setSelectedBrand('all')}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${selectedBrand === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          Todas
        </button>
        <button
          onClick={() => setSelectedBrand('Blumenau')}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${selectedBrand === 'Blumenau' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          Blumenau
        </button>
        <button
          onClick={() => setSelectedBrand('Zagonel')}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${selectedBrand === 'Zagonel' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          Zagonel
        </button>
        <button
          onClick={() => setSelectedBrand('Padova')}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${selectedBrand === 'Padova' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          Padova
        </button>
      </div>
      <p className="text-gray-600 mb-8">Visualize e gerencie os produtos disponíveis.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.length > 0 ? (
          products.map(product => (
            <div key={product.id} className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">{product.name}</h2>
              <p className="text-gray-500 text-sm mb-4">Código: {product.productCode}</p>
              <div className="flex justify-between items-center text-sm">
                {/* USAR formatPrice EM VEZ DE toFixed DIRETAMENTE */}
                <span className="text-blue-600 font-bold">
                  R$ {formatPrice(product.price)}
                </span>
                <span className="text-gray-600">Estoque: {product.stock || 0}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Marca: {product.brand}</p>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center text-gray-500">Nenhum produto encontrado.</div>
        )}
      </div>
    </div>
  );
};

export default ProductsPage;