import ProductRow from "../components/ProductRow";
import ProductsForm from "../components/ProductsForm";
import BrandForm from "../components/BrandForm";
import FilterBar from "../components/FilterBar";
import RepresentadaPicker from "../components/RepresentadaPicker";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";
import BulkPriceAdjustModal from "../components/products/BulkPriceAdjustModal";
import ProductImportSection from "../components/products/ProductImportSection";
import ListPageSkeleton from "../components/ListPageSkeleton";
import Drawer from "../components/ui/Drawer";
import KebabMenu from "../components/ui/KebabMenu";
import {
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from "../components/ui/Surface";
import { useProductsPage } from "../hooks/useProductsPage";
import { useToast } from "../context/ToastContext";
import {
  canUseFeature,
  PLAN_FEATURE_REQUIRED_EVENT,
} from "../utils/planFeatures";

const ProductsPage = ({ userRole, subscription }) => {
  const toast = useToast();
  const page = useProductsPage(userRole);
  const canImport = canUseFeature(subscription, "product-import");
  const canExport = canUseFeature(subscription, "product-export");
  const canPriceBatch = canUseFeature(subscription, "price-batch");

  const requestUpgrade = (feature) => {
    window.dispatchEvent(
      new CustomEvent(PLAN_FEATURE_REQUIRED_EVENT, {
        detail: { feature, requiredPlan: "professional" },
      }),
    );
  };

  const {
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
    clearDeleteConfirm,
    setSelectedProductIds,
  } = page;

  const headerBlock = (
    <PageHeader
      title={selectedBrand ? "Catálogo" : "Produtos"}
      description={
        selectedBrand
          ? `Representada: ${selectedBrand}`
          : "Escolha uma representada para gerir o catálogo"
      }
      actions={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          {selectedBrand ? (
            <SecondaryButton type="button" onClick={clearSelectedBrand}>
              Trocar representada
            </SecondaryButton>
          ) : null}
          {isAdmin && selectedBrand ? (
            <SecondaryButton
              type="button"
              onClick={() => setShowBrandForm(true)}
            >
              Nova representada
            </SecondaryButton>
          ) : null}
          {isAdmin && selectedBrand ? (
            <SecondaryButton
              type="button"
              onClick={() =>
                canPriceBatch
                  ? setShowBulkAdjust(true)
                  : requestUpgrade("price-batch")
              }
              title={
                canPriceBatch ? undefined : "Disponível no plano Profissional"
              }
            >
              Reajuste
              {!canPriceBatch ? " · Pro" : ""}
            </SecondaryButton>
          ) : null}
          {isAdmin && selectedBrand ? (
            <SecondaryButton
              type="button"
              onClick={() =>
                canImport
                  ? setShowImport(true)
                  : requestUpgrade("product-import")
              }
              title={
                canImport ? undefined : "Disponível no plano Profissional"
              }
            >
              Importar
              {!canImport ? " · Pro" : ""}
            </SecondaryButton>
          ) : null}
          {isAdmin && selectedBrand ? (
            <>
              <SecondaryButton
                type="button"
                onClick={() =>
                  canExport
                    ? handleExportProducts("csv")
                    : requestUpgrade("product-export")
                }
                disabled={exportingFormat != null}
                title={
                  canExport ? undefined : "Disponível no plano Profissional"
                }
              >
                {exportingFormat === "csv" ? "Exportando…" : "CSV"}
                {!canExport ? " · Pro" : ""}
              </SecondaryButton>
              <SecondaryButton
                type="button"
                onClick={() =>
                  canExport
                    ? handleExportProducts("xlsx")
                    : requestUpgrade("product-export")
                }
                disabled={exportingFormat != null}
                title={
                  canExport ? undefined : "Disponível no plano Profissional"
                }
              >
                {exportingFormat === "xlsx" ? "Exportando…" : "Excel"}
                {!canExport ? " · Pro" : ""}
              </SecondaryButton>
            </>
          ) : null}
          {isAdmin && selectedBrand ? (
            <PrimaryButton
              type="button"
              onClick={() => {
                resetForms();
                setShowProductForm(true);
              }}
            >
              Novo produto
            </PrimaryButton>
          ) : null}
        </div>
      }
    />
  );

  if (!selectedBrand) {
    return (
      <div className="flex min-h-0 flex-col bg-transparent p-2 sm:p-4 md:p-6">
        {headerBlock}
        {error && (
          <ErrorMessage message={error} onClose={() => setError(null)} />
        )}
        <RepresentadaPicker
          brands={brands}
          brandsRaw={brands}
          loading={brandsLoading}
          onSelect={openCatalogForBrand}
          onCadastrar={() => setShowBrandForm(true)}
          userRole={userRole}
          onEditBrand={handleEditBrand}
          onRequestDeleteBrand={(name) =>
            confirmDeleteAction("brand", name, name)
          }
          confirmDelete={confirmDelete}
          deleteType={deleteType}
          onConfirmDelete={() => {
            if (deleteType === "brand") {
              handleDeleteBrand(deleteId);
            }
          }}
          onCancelDelete={clearDeleteConfirm}
        />

        <Drawer
          open={showProductForm}
          onClose={() => {
            setShowProductForm(false);
            setEditingProduct(null);
          }}
          title={editingProduct ? "Editar produto" : "Novo produto"}
          description="Preencha os dados do item no catálogo"
          widthClass="max-w-lg"
        >
          <ProductsForm
            product={editingProduct}
            brands={brands}
            defaultBrand=""
            onSubmit={handleSaveProduct}
            onCancel={() => {
              setShowProductForm(false);
              setEditingProduct(null);
            }}
          />
        </Drawer>

        {isAdmin && (
          <Drawer
            open={showBrandForm}
            onClose={() => setShowBrandForm(false)}
            title="Nova representada"
            description="Cadastre uma marca/fornecedor"
            widthClass="max-w-md"
          >
            <BrandForm
              onSubmit={handleAddBrand}
              onCancel={() => setShowBrandForm(false)}
            />
          </Drawer>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col bg-transparent p-2 sm:p-4 md:p-6">
      {headerBlock}

      {error && <ErrorMessage message={error} onClose={() => setError(null)} />}

      <FilterBar searchTerm={searchTerm} onSearchChange={handleSearchChange} />

      <div className="relative min-h-[200px] flex-grow overflow-hidden rounded-2xl border border-edge bg-surface/80 shadow-soft backdrop-blur-md">
        {productsLoading && (
          <div className="absolute inset-0 z-10 overflow-auto bg-surface/70 p-2 backdrop-blur-[2px]">
            <ListPageSkeleton variant="table" rows={6} />
          </div>
        )}

        {products.length > 0 ? (
          <>
            <div className="hidden max-h-[calc(100vh-16rem)] overflow-auto md:block">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 border-b border-edge bg-surface/90 backdrop-blur-md">
                  <tr className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    {isAdmin ? (
                      <th className="w-10 px-3 py-3.5">
                        <input
                          type="checkbox"
                          checked={
                            products.length > 0 &&
                            products.every((p) =>
                              selectedProductIds.includes(String(p.id)),
                            )
                          }
                          onChange={toggleAllOnPage}
                          aria-label="Selecionar todos da página"
                          className="h-4 w-4 rounded border-zinc-300 text-brand focus:ring-brand/30"
                        />
                      </th>
                    ) : null}
                    <th className="px-4 py-3.5 text-left font-semibold">
                      Produto
                    </th>
                    <th className="px-4 py-3.5 text-left font-semibold">Marca</th>
                    <th className="px-4 py-3.5 text-right font-semibold">Preço</th>
                    <th className="px-4 py-3.5 text-right font-semibold">
                      Estoque
                    </th>
                    <th className="w-14 px-3 py-3.5 text-right font-semibold">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      onEdit={handleEditProduct}
                      onDelete={confirmDeleteAction}
                      confirmDelete={confirmDelete}
                      deleteType={deleteType}
                      deleteId={deleteId}
                      onConfirmDelete={handleDeleteProduct}
                      onCancelDelete={clearDeleteConfirm}
                      userRole={userRole}
                      selectable={isAdmin}
                      selected={selectedProductIds.includes(String(product.id))}
                      onToggleSelect={toggleProductSelection}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-edge md:hidden">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="p-4 transition-colors duration-200 hover:bg-surface-muted/50"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="mb-1 text-sm font-semibold text-ink">
                        {product.name}
                      </h3>
                      <p className="mb-1 font-mono text-xs text-ink-muted">
                        {product.productcode || product.productCode || "N/A"}
                      </p>
                      <p className="text-xs font-medium text-ink-muted">
                        {product.brand}
                      </p>
                    </div>
                    {isAdmin ? (
                    <KebabMenu
                      items={[
                        {
                          id: "edit",
                          label: "Editar",
                          onClick: () => handleEditProduct(product),
                        },
                        {
                          id: "delete",
                          label: "Excluir",
                          tone: "danger",
                          onClick: () =>
                            confirmDeleteAction(
                              "product",
                              product.id,
                              product.name,
                            ),
                        },
                      ]}
                    />
                    ) : null}
                  </div>

                  <div className="mt-3 flex items-center gap-6">
                    <div>
                      <p className="text-xs text-ink-muted">Preço</p>
                      <p className="text-sm font-semibold tabular-nums text-ink">
                        R$ {parseFloat(product.price || 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-muted">Estoque</p>
                      <p className="text-sm font-semibold tabular-nums text-ink">
                        {product.stock || 0}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          !productsLoading && (
            <div className="p-8">
              <EmptyState
                brandsCount={brands.length}
                hasSearchTerm={!!searchTerm}
                selectedBrand={selectedBrand}
                actionLabel={isAdmin ? "Novo produto" : undefined}
                onAction={
                  isAdmin
                    ? () => {
                        resetForms();
                        setShowProductForm(true);
                      }
                    : undefined
                }
              />
            </div>
          )
        )}

        {products.length > 0 && pagination.totalPages > 1 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={(pageNum) => setCurrentPage(pageNum)}
          />
        )}
      </div>

      <Drawer
        open={showProductForm}
        onClose={() => {
          setShowProductForm(false);
          setEditingProduct(null);
        }}
        title={editingProduct ? "Editar produto" : "Novo produto"}
        description="Preencha os dados do item no catálogo"
        widthClass="max-w-lg"
      >
        <ProductsForm
          product={editingProduct}
          brands={brands}
          defaultBrand={selectedBrand || ""}
          onSubmit={handleSaveProduct}
          onCancel={() => {
            setShowProductForm(false);
            setEditingProduct(null);
          }}
        />
      </Drawer>

      {isAdmin ? (
        <Drawer
          open={showBrandForm}
          onClose={() => setShowBrandForm(false)}
          title="Nova representada"
          description="Cadastre uma marca/fornecedor"
          widthClass="max-w-md"
        >
          <BrandForm
            onSubmit={handleAddBrand}
            onCancel={() => setShowBrandForm(false)}
          />
        </Drawer>
      ) : null}

      {isAdmin && showBulkAdjust && selectedBrand && canPriceBatch && (
        <BulkPriceAdjustModal
          brandName={selectedBrand}
          brandId={selectedBrandId}
          selectedProductIds={selectedProductIds}
          onClose={() => setShowBulkAdjust(false)}
          onSuccess={async (result) => {
            toast.success(
              `Reajuste aplicado em ${result.updated} produto(s).`,
            );
            setSelectedProductIds([]);
            await fetchProducts();
          }}
        />
      )}

      {isAdmin && showImport && canImport && (
        <Drawer
          open={showImport}
          onClose={() => setShowImport(false)}
          title="Importar produtos"
          description="Envie uma planilha Excel ou CSV"
          widthClass="max-w-5xl"
        >
          <ProductImportSection
            brands={brands}
            defaultBrandId={selectedBrandId}
            onSuccess={async () => {
              toast.success("Produtos importados com sucesso.");
              await fetchProducts();
            }}
            onClose={() => setShowImport(false)}
          />
        </Drawer>
      )}
    </div>
  );
};

export default ProductsPage;
