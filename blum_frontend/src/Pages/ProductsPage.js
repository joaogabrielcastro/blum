import { useState, useEffect } from 'react';
import apiService from './services/apiService';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await apiService.getProducts();
        setProducts(data);
      } catch (error) {
        console.error('Falha ao buscar produtos:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando produtos...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Catálogo de Produtos</h1>
      <p className="text-gray-600 mb-8">Visualize e gerencie os produtos disponíveis.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.length > 0 ? (
          products.map(product => (
            <div key={product.id} className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">{product.name}</h2>
              <p className="text-gray-500 text-sm mb-4">{product.description}</p>
              <div className="flex justify-between items-center text-sm">
                <span className="text-blue-600 font-bold">R$ {product.price.toFixed(2)}</span>
                <span className="text-gray-600">Estoque: {product.stock}</span>
              </div>
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
