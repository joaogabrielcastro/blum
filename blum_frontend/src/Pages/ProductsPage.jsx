import { useState, useEffect } from "react";
import ProductsForm from "../components/ProductsForm";
import AddBrandForm from "../components/AddBrandForm";
import apiService from "../apiService";

const ProductsPage = ({ userRole, brands, setBrands }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBrandForm, setShowBrandForm] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState("all");

  // Buscar produtos e marcas no início
  useEffect(() => {
    const fetchProductsAndBrands = async () => {
      try {
        setLoading(true);
        const productsData = await apiService.getProducts(selectedBrand);
        setProducts(productsData);

        const brandsData = await apiService.getBrands(); // Busca as marcas do banco de dados
        setBrands(brandsData); // Atualiza o estado de marcas
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProductsAndBrands();
  }, [selectedBrand, setBrands]); // Adiciona setBrands na lista de dependências para evitar loop

  const toggleBrandForm = () => {
    setShowBrandForm(!showBrandForm);
    setShowForm(false);
  };

  const handleBrandAdded = () => {
    // Recarrega as marcas após adicionar uma nova
    apiService.getBrands().then(setBrands);
    setShowBrandForm(false);
  };

  const formatPrice = (price) => {
    if (price === null || price === undefined || isNaN(parseFloat(price))) {
      return "0.00";
    }
    return parseFloat(price).toFixed(2);
  };

  if (loading)
    return (
      <div className="p-8 text-center text-gray-500">
        Carregando produtos...
      </div>
    );

  if (showForm) {
    return (
      <div className="p-8">
        <ProductsForm
          onProductAdded={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
          brands={brands}
        />
      </div>
    );
  }

  if (showBrandForm && userRole === "admin") {
    return (
      <div className="p-8">
        <AddBrandForm
          onBrandAdded={handleBrandAdded}
          onCancel={toggleBrandForm}
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Catálogo de Produtos
        </h1>
        {userRole === "admin" && (
          <div className="flex space-x-4">
            <button
              onClick={toggleBrandForm}
              className="bg-purple-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-purple-700 transition duration-300 shadow-md"
            >
              + Adicionar Marca
            </button>
            <button
              onClick={() => {
                setShowForm(true);
                setShowBrandForm(false);
              }}
              className="bg-blue-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-300 shadow-md"
            >
              + Adicionar Produto
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center space-x-2 mb-8">
        <span className="font-semibold text-gray-700">Filtrar por Marca:</span>
        <button
          onClick={() => setSelectedBrand("all")}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
            selectedBrand === "all"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Todas
        </button>
        {(brands || []).map((brandName) => (
          <button
            key={brandName}
            onClick={() => setSelectedBrand(brandName)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
              selectedBrand === brandName
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {brandName}
          </button>
        ))}
      </div>
      <p className="text-gray-600 mb-8">
        Visualize e gerencie os produtos disponíveis.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.length > 0 ? (
          products.map((product) => (
            <div
              key={product.id}
              className="bg-white p-6 rounded-2xl shadow-md border border-gray-200"
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                {product.name}
              </h2>
              <p className="text-gray-500 text-sm mb-4">
                Código: {product.productCode}
              </p>
              <div className="flex justify-between items-center text-sm">
                <span className="text-blue-600 font-bold">
                  R$ {formatPrice(product.price)}
                </span>
                <span className="text-gray-600">
                  Estoque: {product.stock || 0}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Marca: {product.brand}
              </p>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center text-gray-500">
            Nenhum produto encontrado.
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsPage;
