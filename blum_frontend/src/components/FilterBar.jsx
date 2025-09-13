import { useState } from "react";

// Função para corrigir problemas de encoding
const fixEncoding = (str) => {
  if (!str || typeof str !== 'string') return '';
  
  try {
    return decodeURIComponent(escape(str));
  } catch (e) {
    return str;
  }
};

const FilterBar = ({
  brands,
  selectedBrand,
  onBrandSelect,
  searchTerm,
  onSearchChange,
  onDeleteBrand,
  confirmDelete,
  deleteType,
  deleteId,
  onConfirmDelete,
  onCancelDelete
}) => {
  const [showAllBrands, setShowAllBrands] = useState(false);
  
  // Limitar a exibição de marcas a 5 inicialmente
  const displayedBrands = showAllBrands ? brands : brands.slice(0, 5);
  
  return (
    <div className="mb-8 bg-white p-4 rounded-lg shadow">
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex-1">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Buscar produtos
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por nome, código ou marca..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <h2 className="font-semibold text-gray-700">Filtrar por Marca:</h2>
            {brands.length > 5 && (
              <button
                onClick={() => setShowAllBrands(!showAllBrands)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {showAllBrands ? 'Mostrar menos' : `Ver todas (${brands.length})`}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => onBrandSelect("all")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
                selectedBrand === "all"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Todas
            </button>

            {brands && brands.length > 0 ? (
              displayedBrands.map((brand, index) => (
                <div key={brand.id || `brand-${index}`} className="relative group">
                  <button
                    onClick={() => onBrandSelect(brand)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
                      selectedBrand === brand
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {fixEncoding(brand)}
                  </button>
                  <button
                    onClick={() => onDeleteBrand("brand", brand, brand)}
                    className="ml-1 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity absolute -right-2 -top-2 bg-white rounded-full p-1 shadow-md"
                    title="Excluir marca"
                  >
                    {confirmDelete === brand && deleteType === "brand" ? (
                      <span className="text-xs font-bold">✓</span>
                    ) : (
                      <span className="text-xs">✕</span>
                    )}
                  </button>
                </div>
              ))
            ) : (
              <span className="text-gray-500 text-sm ml-2">
                Nenhuma marca cadastrada
              </span>
            )}
          </div>

          {/* Mensagem de confirmação para exclusão de marca */}
          {confirmDelete && deleteType === "brand" && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm">
              <p className="text-yellow-800 font-medium">
                Confirmar exclusão da marca "{fixEncoding(confirmDelete)}"?
              </p>
              <p className="text-yellow-700 text-xs mt-1">
                Todos os produtos desta marca também serão excluídos.
              </p>
              <div className="flex space-x-2 mt-2">
                <button
                  onClick={onConfirmDelete}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                >
                  Confirmar Exclusão
                </button>
                <button
                  onClick={onCancelDelete}
                  className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;