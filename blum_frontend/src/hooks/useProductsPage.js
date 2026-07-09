import { useState, useEffect, useCallback } from "react";
import apiService from "../services/apiService";
import { useToast } from "../context/ToastContext";
import { useAppData } from "../context/AppDataProvider";

const EMPTY_PAGINATION = {
  total: 0,
  page: 1,
  limit: 50,
  totalPages: 0,
};

/** Estado e ações da página de produtos / catálogo por representada. */
export function useProductsPage(userRole) {
  const toast = useToast();
  const { brands, isLoadingBrands, invalidateBrands } = useAppData();

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [showBrandForm, setShowBrandForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedBrandId, setSelectedBrandId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [showBulkAdjust, setShowBulkAdjust] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [exportingFormat, setExportingFormat] = useState(null);

  const isAdmin = userRole === "admin";
  const brandsLoading = isLoadingBrands;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchProducts = useCallback(async () => {
    if (!selectedBrand) {
      setProducts([]);
      setPagination(EMPTY_PAGINATION);
      return;
    }

    try {
      setProductsLoading(true);
      setError(null);

      const response = await apiService.getProducts(
        selectedBrand,
        currentPage,
        50,
        debouncedSearch,
        selectedBrandId,
      );

      if (response.data && response.pagination) {
        setProducts(response.data);
        setPagination(response.pagination);
      } else {
        setProducts(Array.isArray(response) ? response : []);
        setPagination({
          total: Array.isArray(response) ? response.length : 0,
          page: 1,
          limit: 50,
          totalPages: 1,
        });
      }
    } catch (err) {
      const msg = err?.message || "Erro ao carregar dados. Tente novamente.";
      setError(msg);
      toast.error(msg);
      console.error("Erro ao buscar produtos:", err);
    } finally {
      setProductsLoading(false);
    }
  }, [selectedBrand, selectedBrandId, currentPage, debouncedSearch, toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setSelectedProductIds([]);
  }, [selectedBrand, selectedBrandId, currentPage, debouncedSearch]);

  const toggleProductSelection = (productId) => {
    setSelectedProductIds((prev) => {
      const id = String(productId);
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  };

  const toggleAllOnPage = () => {
    const pageIds = products.map((p) => String(p.id));
    const allSelected =
      pageIds.length > 0 && pageIds.every((id) => selectedProductIds.includes(id));
    if (allSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedProductIds((prev) => [...new Set([...prev, ...pageIds])]);
    }
  };

  const handleAddBrand = async (brandData) => {
    if (brandData.name && brandData.name.trim()) {
      try {
        setError(null);
        await apiService.createBrand(brandData);
        setShowBrandForm(false);
        await invalidateBrands();
        toast.success("Representada criada com sucesso.");
      } catch (err) {
        const msg = err?.message || "Erro ao adicionar Representada.";
        setError(msg);
        toast.error(msg);
        console.error("Erro ao adicionar Representada:", err);
      }
    }
  };

  const handleSaveProduct = async (productData) => {
    const wasEditing = !!editingProduct;
    try {
      setError(null);

      if (editingProduct) {
        await apiService.updateProduct(editingProduct.id, productData);
      } else {
        await apiService.createProduct(productData);
      }

      setEditingProduct(null);
      setShowProductForm(false);
      await fetchProducts();
      toast.success(
        wasEditing ? "Produto atualizado." : "Produto criado com sucesso.",
      );
    } catch (err) {
      const msg = err?.message || "Erro ao salvar produto.";
      setError(msg);
      toast.error(msg);
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
      await fetchProducts();
      setDeleteType(null);
      setDeleteId(null);
      toast.success("Produto excluído.");
    } catch (err) {
      const errorMessage =
        err.message.includes("404") || err.message.includes("não encontrado")
          ? "Produto não encontrado. A lista será atualizada."
          : "Erro ao excluir produto. Tente novamente.";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Erro ao excluir produto:", err);
      await fetchProducts();
    }
  };

  const handleEditBrand = async (brandName, brandData) => {
    try {
      setError(null);
      await apiService.updateBrand(brandName, brandData);
      await invalidateBrands();
      toast.success("Representada atualizada.");
    } catch (err) {
      const msg = err?.message || "Erro ao editar Representada.";
      setError(msg);
      toast.error(msg);
      console.error("Erro ao editar Representada:", err);
    }
  };

  const handleDeleteBrand = async (brandId) => {
    try {
      setError(null);
      await apiService.deleteBrand(brandId);
      setConfirmDelete(null);
      setDeleteType(null);
      setDeleteId(null);
      await invalidateBrands();

      if (String(selectedBrandId) === String(brandId)) {
        setSelectedBrand(null);
        setSelectedBrandId(null);
        setSearchTerm("");
        setCurrentPage(1);
      } else {
        await fetchProducts();
      }
      toast.success("Representada excluída.");
    } catch (err) {
      const msg = err.message || "Erro ao excluir Representada.";
      setError(msg);
      toast.error(msg);
      console.error("Erro ao excluir Representada:", err);
    }
  };

  const confirmDeleteAction = (type, id, name) => {
    setDeleteType(type);
    setDeleteId(id);
    setConfirmDelete(name);

    setTimeout(() => {
      setConfirmDelete(null);
      setDeleteType(null);
      setDeleteId(null);
    }, 5000);
  };

  const resetForms = () => {
    setEditingProduct(null);
  };

  const handleExportProducts = async (format) => {
    if (!selectedBrandId) {
      toast.warning("Selecione uma representada para exportar.");
      return;
    }
    try {
      setExportingFormat(format);
      const blob = await apiService.downloadProductsExport(format, {
        brandId: selectedBrandId,
        q: debouncedSearch,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        format === "xlsx" ? "blum-produtos.xlsx" : "blum-produtos.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success(
        format === "xlsx" ? "Excel exportado." : "CSV exportado.",
      );
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Não foi possível exportar produtos.");
    } finally {
      setExportingFormat(null);
    }
  };

  const openCatalogForBrand = (brand) => {
    const name =
      typeof brand === "string"
        ? brand
        : brand?.displayName || brand?.name || "";
    const id =
      typeof brand === "object" && brand?.id != null
        ? String(brand.id)
        : brands.find((b) => String(b.name) === String(name))?.id;
    setSelectedBrand(name);
    setSelectedBrandId(id != null ? String(id) : null);
    setSearchTerm("");
    setCurrentPage(1);
  };

  const clearSelectedBrand = () => {
    setSelectedBrand(null);
    setSelectedBrandId(null);
    setSearchTerm("");
    setCurrentPage(1);
    setProducts([]);
  };

  const handleSearchChange = (term) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  return {
    brands,
    brandsLoading,
    products,
    productsLoading,
    showBrandForm,
    setShowBrandForm,
    showProductForm,
    setShowProductForm,
    selectedBrand,
    selectedBrandId,
    confirmDelete,
    error,
    setError,
    editingProduct,
    setEditingProduct,
    deleteType,
    deleteId,
    searchTerm,
    pagination,
    currentPage,
    setCurrentPage,
    selectedProductIds,
    showBulkAdjust,
    setShowBulkAdjust,
    showImport,
    setShowImport,
    exportingFormat,
    isAdmin,
    fetchProducts,
    toggleProductSelection,
    toggleAllOnPage,
    handleAddBrand,
    handleSaveProduct,
    handleEditProduct,
    handleDeleteProduct,
    handleEditBrand,
    handleDeleteBrand,
    confirmDeleteAction,
    resetForms,
    handleExportProducts,
    openCatalogForBrand,
    clearSelectedBrand,
    handleSearchChange,
    clearDeleteConfirm: () => {
      setConfirmDelete(null);
      setDeleteType(null);
      setDeleteId(null);
    },
    setSelectedProductIds,
  };
}
