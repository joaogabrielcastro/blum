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

  const proBadge = (allowed) => (allowed ? null : "Pro");

  const catalogMenuItems = isAdmin
    ? [
        {
          id: "price-batch",
          label: "Reajuste de preços",
          badge: proBadge(canPriceBatch),
          onClick: () =>
            canPriceBatch
              ? setShowBulkAdjust(true)
              : requestUpgrade("price-batch"),
        },
        {
          id: "export-csv",
          label: exportingFormat === "csv" ? "Exportando CSV…" : "Exportar CSV",
          badge: proBadge(canExport),
          disabled: exportingFormat != null,
          onClick: () =>
            canExport
              ? handleExportProducts("csv")
              : requestUpgrade("product-export"),
        },
        {
          id: "export-xlsx",
          label:
            exportingFormat === "xlsx" ? "Exportando Excel…" : "Exportar Excel",
          badge: proBadge(canExport),
          disabled: exportingFormat != null,
          onClick: () =>
            canExport
              ? handleExportProducts("xlsx")
              : requestUpgrade("product-export"),
        },
        {
          id: "new-brand",
          label: "Nova representada",
          onClick: () => setShowBrandForm(true),
        },
      ]
    : [];

  const importButton = isAdmin ? (
    <SecondaryButton
      type="button"
      onClick={() =>
        canImport ? setShowImport(true) : requestUpgrade("product-import")
      }
      title={canImport ? undefined : "Disponível no plano Profissional"}
    >
      Importar
      {!canImport ? " · Pro" : ""}
    </SecondaryButton>
  ) : null;

  const headerBlock = selectedBrand ? (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <button
          type="button"
          onClick={clearSelectedBrand}
          className="-ml-1 mb-1 inline-flex min-h-9 items-center gap-1 rounded-lg px-1 text-sm font-medium text-ink-muted transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m15 18-6-6 6-6" />
          </svg>
          Representadas
        </button>
        <h1 className="truncate text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">
          {selectedBrand}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">Catálogo da representada</p>
      </div>
      {isAdmin ? (
        <div className="flex flex-wrap items-center gap-2">
          {importButton}
          <KebabMenu
            triggerLabel="Mais ações"
            label="Mais ações do catálogo"
            items={catalogMenuItems}
          />
          <PrimaryButton
            type="button"
            onClick={() => {
              resetForms();
              setShowProductForm(true);
            }}
          >
            Novo produto
          </PrimaryButton>
        </div>
      ) : null}
    </div>
  ) : (
    <PageHeader
      title="Produtos"
      description="Escolha uma representada para gerenciar o catálogo"
      actions={importButton}
    />
  );

  if (!selectedBrand) {
    return (
      <div className="flex min-h-0 flex-col">
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
          onRequestDeleteBrand={(id, name) =>
            confirmDeleteAction("brand", id, name)
          }
          confirmDelete={confirmDelete}
          deleteType={deleteType}
          onConfirmDelete={() => {
            // Retorna a Promise: o modal fica "processando" e evita clique duplo.
            if (deleteType === "brand") {
              return handleDeleteBrand(deleteId);
            }
            return undefined;
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

        {isAdmin && showImport && canImport ? (
          <Drawer
            open={showImport}
            onClose={() => setShowImport(false)}
            title="Importar produtos"
            description="Escolha a representada e envie uma planilha Excel ou CSV"
            widthClass="max-w-4xl"
          >
            <ProductImportSection
              brands={brands}
              defaultBrandId=""
              onSuccess={() => toast.success("Produtos importados com sucesso.")}
              onClose={() => setShowImport(false)}
            />
          </Drawer>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col">
      {headerBlock}

      {error && <ErrorMessage message={error} onClose={() => setError(null)} />}

      <FilterBar searchTerm={searchTerm} onSearchChange={handleSearchChange} />

      {isAdmin && selectedProductIds.length > 0 ? (
        <div
          className="mb-3 flex flex-col gap-3 rounded-2xl border border-brand/25 bg-brand-50/90 px-4 py-3 shadow-soft sm:flex-row sm:items-center sm:justify-between"
          role="region"
          aria-label="Ações para produtos selecionados"
        >
          <div>
            <p className="text-sm font-semibold text-brand-900">
              {selectedProductIds.length} produto(s) selecionado(s)
            </p>
            <p className="text-xs text-brand-700">
              A seleção vale para os produtos exibidos nesta página.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
              Reajustar selecionados
              {!canPriceBatch ? " · Pro" : ""}
            </SecondaryButton>
            <SecondaryButton
              type="button"
              onClick={() => setSelectedProductIds([])}
            >
              Limpar seleção
            </SecondaryButton>
          </div>
        </div>
      ) : null}

      <div className="relative min-h-[200px] flex-grow overflow-hidden rounded-2xl border border-edge bg-surface/80 shadow-soft">
        {productsLoading && (
          <div className="absolute inset-0 z-10 overflow-auto bg-surface/70 p-2">
            <ListPageSkeleton variant="table" rows={6} />
          </div>
        )}

        {products.length > 0 ? (
          <>
            <div className="hidden max-h-[calc(100vh-16rem)] overflow-auto md:block">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 border-b border-edge bg-surface/90">
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
          widthClass="max-w-4xl"
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
