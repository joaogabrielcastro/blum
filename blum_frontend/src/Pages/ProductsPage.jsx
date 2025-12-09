import { useState, useEffect, useCallback, useMemo } from "react";
import apiService from "../services/apiService";
import ProductRow from "../components/ProductRow";
import ProductsForm from "../components/ProductsForm";
import BrandForm from "../components/BrandForm";
import FilterBar from "../components/FilterBar";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";

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
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, totalPages: 0 });
  const [currentPage, setCurrentPage] = useState(1);

  // ✅ VERIFICA SE É ADMIN
  const isAdmin = userRole === "admin";

  // Carregar dados iniciais
  useEffect(() => {
    fetchData();
  }, [selectedBrand, currentPage]);

  // Função para buscar dados com paginação
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar produtos com filtro de Representada e paginação
      const response = await apiService.getProducts(
        selectedBrand !== "all" ? selectedBrand : "all",
        currentPage,
        50
      );

      // Se a resposta tem estrutura de paginação
      if (response.data && response.pagination) {
        setProducts(response.data);
        setPagination(response.pagination);
      } else {
        // Fallback para API antiga sem paginação
        setProducts(response);
        setPagination({ total: response.length, page: 1, limit: 50, totalPages: 1 });
      }

      // Buscar Representadas apenas se necessário
      if (brands.length === 0) {
        const brandsData = await apiService.getBrands();
        setBrands(brandsData);
      }
    } catch (err) {
      setError("Erro ao carregar dados. Tente novamente.");
      console.error("Erro ao buscar dados:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedBrand, currentPage, brands.length]);

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
      const errorMessage = err.message.includes('404') || err.message.includes('não encontrado')
        ? "Produto não encontrado. A lista será atualizada."
        : "Erro ao excluir produto. Tente novamente.";
      setError(errorMessage);
      console.error("Erro ao excluir produto:", err);
      // Atualiza a lista mesmo com erro para remover produtos inexistentes
      await fetchData();
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
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 gap-3 md:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Catálogo de Produtos
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">
            Gerencie seu inventário de produtos e Representadas
          </p>
        </div>

        {/* ✅ BOTÕES CONDICIONAIS - RESPONSIVOS */}
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
          {/* Botão Adicionar Representada - APENAS ADMIN */}
          {isAdmin && (
            <button
              onClick={() => setShowBrandForm(true)}
              className="bg-purple-600 text-white font-bold px-4 py-2.5 md:py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
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
            className="bg-blue-600 text-white font-bold px-4 py-2.5 md:py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
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
        onBrandSelect={(brand) => {
          setSelectedBrand(brand);
          setCurrentPage(1); // Reset para página 1 ao trocar filtro
        }}
        searchTerm={searchTerm}
        onSearchChange={(term) => {
          setSearchTerm(term);
          setCurrentPage(1); // Reset para página 1 ao buscar
        }}
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

      {/* ✅ LISTA DE PRODUTOS - RESPONSIVA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-grow">
        {filteredProducts.length > 0 ? (
          <>
            {/* Tabela Desktop - Esconde em mobile */}
            <div className="hidden md:block overflow-x-auto">
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

            {/* Cards Mobile - Mostra apenas em mobile */}
            <div className="md:hidden divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <div key={product.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm mb-1">
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-500 mb-1">
                        Código: {product.productcode || "N/A"}
                        {product.subcode && ` | Sub: ${product.subcode}`}
                      </p>
                      <p className="text-xs text-blue-600 font-medium">
                        {product.brand}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Preço</p>
                        <p className="text-sm font-bold text-green-600">
                          R$ {parseFloat(product.price || 0).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Estoque</p>
                        <p className="text-sm font-semibold text-gray-700">
                          {product.stock || 0}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      
                      {isAdmin && (
                        <button
                          onClick={() => confirmDeleteAction("product", product.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-8">
            <EmptyState
              brandsCount={brands.length}
              hasSearchTerm={!!searchTerm}
              selectedBrand={selectedBrand}
            />
          </div>
        )}

        {/* Componente de Paginação */}
        {filteredProducts.length > 0 && pagination.totalPages > 1 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={(page) => setCurrentPage(page)}
          />
        )}
      </div>

      {/* Modal para adicionar/editar produto - Responsivo */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md my-8 max-h-[90vh] overflow-y-auto">
            <ProductsForm
              product={editingProduct}
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

      {/* Modal para adicionar Representada - APENAS ADMIN - Responsivo */}
      {isAdmin && showBrandForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md">
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