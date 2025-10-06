import { useState, useEffect, useCallback, useMemo } from "react";
import apiService from "../services/apiService";
import ProductCard from "../components/ProductCard";
import ProductsForm from "../components/ProductsForm";
import BrandForm from "../components/BrandForm";
import FilterBar from "../components/FilterBar";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";

const ProductsPage = ({ userRole }) => {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [showBrandForm, setShowBrandForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Estado para o formulário de produto
  const [productForm, setProductForm] = useState({
    name: "",
    productcode: "",
    price: "",
    brand: "",
    stock: "",
    minstock: "",
  });

  // Carregar dados iniciais
  useEffect(() => {
    fetchData();
  }, [selectedBrand]);

  // Função para buscar dados com useCallback para evitar recriações desnecessárias
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar produtos com filtro de Representada
      const productsData = await apiService.getProducts(
        selectedBrand !== "all" ? selectedBrand : "all"
      );

      // Buscar Representadas apenas se necessário
      if (brands.length === 0) {
        const brandsData = await apiService.getBrands();
        setBrands(brandsData);
      }

      setProducts(productsData);
    } catch (err) {
      setError("Erro ao carregar dados. Tente novamente.");
      console.error("Erro ao buscar dados:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedBrand, brands.length]);

  // Carregar Representadas separadamente
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const brandsData = await apiService.getBrands();
        setBrands(brandsData);
      } catch (err) {
        console.error("Erro ao buscar Representadas:", err);
      }
    };

    fetchBrands();
  }, []);

  // Filtrar produtos com useMemo para otimização
  const filteredProducts = useMemo(() => {
    let filtered =
      selectedBrand === "all"
        ? products
        : products.filter((product) => product.brand === selectedBrand);

    // Aplicar filtro de busca se houver termo
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(term) ||
          (product.productcode &&
            product.productcode.toLowerCase().includes(term)) ||
          product.brand.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [products, selectedBrand, searchTerm]);

  const handleAddBrand = async (brandData) => {
    if (brandData.name && brandData.name.trim()) {
      try {
        setError(null);
        await apiService.createBrand(brandData);
        setShowBrandForm(false);

        // Recarregar Representadas
        const brandsData = await apiService.getBrands();
        setBrands(brandsData);
      } catch (err) {
        setError("Erro ao adicionar Representada. Tente novamente.");
        console.error("Erro ao adicionar Representada:", err);
      }
    }
  };

  const handleSaveProduct = async (productData) => {
    try {
      setError(null);

      if (editingProduct) {
        // Editar produto existente
        await apiService.updateProduct(editingProduct.id, productData);
      } else {
        // Adicionar novo produto
        await apiService.createProduct(productData);
      }

      // Limpar formulário e recarregar dados
      setEditingProduct(null);
      setShowProductForm(false);
      await fetchData();
    } catch (err) {
      setError("Erro ao salvar produto. Tente novamente.");
      console.error("Erro ao salvar produto:", err);
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      productcode: product.productcode || "",
      price: product.price.toString(),
      brand: product.brand,
      stock: product.stock.toString(),
      minstock: product.minstock ? product.minstock.toString() : "0",
    });
    setShowProductForm(true);
  };

  const handleDeleteProduct = async (productId) => {
    try {
      setError(null);
      await apiService.deleteProduct(productId);
      await fetchData();
      setDeleteType(null);
      setDeleteId(null);
    } catch (err) {
      setError("Erro ao excluir produto. Tente novamente.");
      console.error("Erro ao excluir produto:", err);
    }
  };

  const handleEditBrand = async (brandName, brandData) => {
    try {
      setError(null);
      await apiService.updateBrand(brandName, brandData);

      // Recarregar Representadas
      const brandsData = await apiService.getBrands();
      setBrands(brandsData);
    } catch (err) {
      setError("Erro ao editar Representada. Tente novamente.");
      console.error("Erro ao editar Representada:", err);
    }
  };

  const handleDeleteBrand = async (brandName) => {
    try {
      setError(null);
      await apiService.deleteBrand(brandName);
      setConfirmDelete(null);
      await fetchData();

      // Se a Representada selecionada foi deletada, voltar para "Todas"
      if (selectedBrand === brandName) {
        setSelectedBrand("all");
      }
    } catch (err) {
      setError(err.message || "Erro ao excluir Representada. Tente novamente.");
      console.error("Erro ao excluir Representada:", err);
    }
  };

  const confirmDeleteAction = (type, id, name) => {
    setDeleteType(type);
    setDeleteId(id);
    setConfirmDelete(name);

    // Resetar a confirmação após 5 segundos
    setTimeout(() => {
      setConfirmDelete(null);
      setDeleteType(null);
      setDeleteId(null);
    }, 5000);
  };

  const resetForms = () => {
    setProductForm({
      name: "",
      productcode: "",
      price: "",
      brand: "",
      stock: "",
      minstock: "",
    });
    setEditingProduct(null);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Catálogo de Produtos
          </h1>
          <p className="text-gray-600 mt-2">
            Gerencie seu inventário de produtos e Representadas
          </p>
        </div>
        {userRole === "admin" && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowBrandForm(true)}
            className="bg-purple-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <span>+</span>
            <span>Adicionar Representada</span>
          </button>
          <button
            onClick={() => {
              resetForms();
              setShowProductForm(true);
            }}
            className="bg-blue-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span>+</span>
            <span>Adicionar Produto</span>
          </button>
        </div>
        )}
      </div>

      {error && <ErrorMessage message={error} onClose={() => setError(null)} />}

      {/* Barra de filtros e busca */}
      <FilterBar
        brands={brands}
        selectedBrand={selectedBrand}
        onBrandSelect={setSelectedBrand}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onDeleteBrand={confirmDeleteAction}
        onEditBrand={handleEditBrand} // ← Nova prop
        confirmDelete={confirmDelete}
        deleteType={deleteType}
        deleteId={deleteId}
        onConfirmDelete={() => {
          if (deleteType === "brand") {
            handleDeleteBrand(deleteId);
          }
        }}
        onCancelDelete={() => {
          setConfirmDelete(null);
          setDeleteType(null);
          setDeleteId(null);
        }}
      />

      {/* Resumo de resultados */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center">
          <p className="text-gray-600">
            {filteredProducts.length} produto(s) encontrado(s)
            {selectedBrand !== "all" && ` para a Representada "${selectedBrand}"`}
            {searchTerm && ` contendo "${searchTerm}"`}
          </p>
          <div className="text-sm text-gray-500">
            Total de Representadas: {brands.length}
          </div>
        </div>
      </div>

      {/* Lista de Produtos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 flex-grow">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={handleEditProduct}
              onDelete={confirmDeleteAction}
              confirmDelete={confirmDelete}
              deleteType={deleteType}
              deleteId={deleteId}
              onConfirmDelete={handleDeleteProduct}
              onCancelDelete={() => {
                setConfirmDelete(null);
                setDeleteType(null);
                setDeleteId(null);
              }}
            />
          ))
        ) : (
          <EmptyState
            brandsCount={brands.length}
            hasSearchTerm={!!searchTerm}
            selectedBrand={selectedBrand}
          />
        )}
      </div>

      {/* Modal para adicionar/editar produto */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-md my-8">
            <ProductsForm
              product={editingProduct}
              brands={brands}
              initialData={productForm}
              onSubmit={handleSaveProduct}
              onCancel={() => {
                setShowProductForm(false);
                setEditingProduct(null);
                resetForms();
              }}
            />
          </div>
        </div>
      )}

      {/* Modal para adicionar Representada */}
      {showBrandForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <BrandForm
              onSubmit={handleAddBrand}
              onCancel={() => setShowBrandForm(false)}
            />
          </div>
        </div>
      )}

      {/* Rodapé */}
      <footer className="mt-8 pt-4 border-t border-gray-200 text-center text-gray-500 text-sm">
        Sistema de Gerenciamento de Produtos • {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default ProductsPage;
