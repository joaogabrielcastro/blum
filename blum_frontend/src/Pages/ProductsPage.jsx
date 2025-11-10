import { useState, useEffect, useCallback, useMemo } from "react";
import apiService from "../services/apiService";
import ProductRow from "../components/ProductRow";
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

  // ✅ VERIFICA SE É ADMIN
  const isAdmin = userRole === "admin";

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
          (product.subcode && product.subcode.toLowerCase().includes(term)) ||
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

        {/* ✅ BOTÕES CONDICIONAIS BASEADOS NA ROLE */}
        <div className="flex flex-wrap gap-2">
          {/* Botão Adicionar Representada - APENAS ADMIN */}
          {isAdmin && (
            <button
              onClick={() => setShowBrandForm(true)}
              className="bg-purple-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <span>+</span>
              <span>Adicionar Representada</span>
            </button>
          )}

          {/* Botão Adicionar Produto - TODOS OS USUÁRIOS */}
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
        onEditBrand={handleEditBrand}
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
        userRole={userRole} 
      />

      {/* ✅ LISTA DE PRODUTOS EM TABELA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-grow">
        {filteredProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                    Produto
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                    Marca
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                    Preço
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                    Estoque
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <ProductRow
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
                    userRole={userRole}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8">
            <EmptyState
              brandsCount={brands.length}
              hasSearchTerm={!!searchTerm}
              selectedBrand={selectedBrand}
            />
          </div>
        )}
      </div>

      {/* Modal para adicionar/editar produto */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-md my-8">
            <ProductsForm
              product={editingProduct} // ✅ AGORA PASSA O PRODUTO COMPLETO
              brands={brands}
              onSubmit={handleSaveProduct}
              onCancel={() => {
                setShowProductForm(false);
                setEditingProduct(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Modal para adicionar Representada - APENAS ADMIN */}
      {isAdmin && showBrandForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <BrandForm
              onSubmit={handleAddBrand}
              onCancel={() => setShowBrandForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;