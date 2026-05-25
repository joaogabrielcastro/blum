import OrderProductResultRow from "./OrderProductResultRow";

export default function OrderFormProductSearch({
  selectedBrand,
  productSearch,
  onProductSearchChange,
  isSearching,
  searchResults,
  onResetSearch,
  onOpenMobilePicker,
  onProductSelect,
}) {
  return (
    <div className="space-y-5 pt-1">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Buscar produto (várias palavras, sem precisar igual ao cadastro)
        </label>

        <button
          type="button"
          className="md:hidden w-full min-h-12 p-3.5 border border-gray-300 rounded-lg text-base text-left focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
          disabled={!selectedBrand}
          onClick={onOpenMobilePicker}
        >
          <span
            className={
              productSearch.trim() ? "text-gray-900" : "text-gray-400"
            }
          >
            {productSearch.trim()
              ? productSearch
              : "Toque para buscar e adicionar produto"}
          </span>
        </button>

        <div className="relative hidden md:block">
          <div className="relative">
            <input
              type="text"
              placeholder="Digite nome ou código do produto..."
              value={productSearch}
              onChange={(e) => onProductSearchChange(e.target.value)}
              disabled={!selectedBrand}
              className="w-full p-3.5 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              autoComplete="off"
            />
            {isSearching ? (
              <div className="absolute right-3 top-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
              </div>
            ) : null}
            {productSearch && !isSearching ? (
              <button
                type="button"
                onClick={onResetSearch}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                aria-label="Limpar busca"
              >
                ✕
              </button>
            ) : null}
          </div>

          {searchResults.length > 0 ? (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((product) => (
                <OrderProductResultRow
                  key={product.id}
                  product={product}
                  onSelect={onProductSelect}
                />
              ))}
            </div>
          ) : null}

          {productSearch && searchResults.length === 0 && !isSearching ? (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
              <div className="text-center text-gray-500">
                Nenhum produto encontrado para &quot;{productSearch}&quot;
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
