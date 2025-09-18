import { useState } from "react";

// Função para corrigir problemas de encoding
const fixEncoding = (str) => {
  if (!str || typeof str !== "string") return "";

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
  onEditBrand,
  confirmDelete,
  deleteType,
  deleteId,
  onConfirmDelete,
  onCancelDelete,
}) => {
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [editCommission, setEditCommission] = useState("");

  // Limitar a exibição de Representadas a 5 inicialmente
  const displayedBrands = showAllBrands ? brands : brands.slice(0, 5);

  const handleEditClick = (brand, e) => {
    e.stopPropagation();
    setEditingBrand(brand.name);
    setEditCommission(brand.commission_rate?.toString() || "0");
  };

  const handleSaveEdit = async (brandName, e) => {
    e.stopPropagation();
    try {
      await onEditBrand(brandName, {
        name: brandName,
        commission_rate: parseFloat(editCommission),
      });
      setEditingBrand(null);
      setEditCommission("");
    } catch (error) {
      console.error("Erro ao editar Representada:", error);
    }
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingBrand(null);
    setEditCommission("");
  };

  const handleCommissionChange = (e) => {
    const value = e.target.value;
    // Permitir apenas números e ponto decimal
    if (
      /^\d*\.?\d*$/.test(value) &&
      (value === "" || parseFloat(value) <= 100)
    ) {
      setEditCommission(value);
    }
  };

  return (
    <div className="mb-8 bg-white p-4 rounded-lg shadow">
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex-1">
          <label
            htmlFor="search"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Buscar produtos
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por nome, código ou Representada..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg
                  className="h-4 w-4 text-gray-400 hover:text-gray-600"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <h2 className="font-semibold text-gray-700">
              Filtrar por Representada:
            </h2>
            {brands.length > 5 && (
              <button
                onClick={() => setShowAllBrands(!showAllBrands)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {showAllBrands
                  ? "Mostrar menos"
                  : `Ver todas (${brands.length})`}
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
              displayedBrands.map((brand) => (
                <div key={brand.name} className="relative group">
                  <button
                    onClick={() => onBrandSelect(brand.name)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 relative ${
                      selectedBrand === brand.name
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {fixEncoding(brand.name)}
                    {/* Badge de comissão */}
                    <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                      {brand.commission_rate}%
                    </span>
                  </button>

                  {/* Botões de ação */}
                  <div className="absolute -right-2 -top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleEditClick(brand, e)}
                      className="bg-blue-500 text-white rounded-full p-1 shadow-md hover:bg-blue-600"
                      title="Editar Representada"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteBrand("brand", brand.name, brand.name);
                      }}
                      className="bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                      title="Excluir Representada"
                    >
                      {confirmDelete === brand.name &&
                      deleteType === "brand" ? (
                        <span className="text-xs font-bold">✓</span>
                      ) : (
                        <span className="text-xs">✕</span>
                      )}
                    </button>
                  </div>

                  {/* Modal de edição inline */}
                  {editingBrand === brand.name && (
                    <div className="absolute top-full left-0 mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-64">
                      <h4 className="font-semibold text-sm mb-2">
                        Editar Comissão
                      </h4>
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={editCommission}
                          onChange={handleCommissionChange}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="0.00"
                        />
                        <span className="text-gray-600">%</span>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={handleCancelEdit}
                          className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={(e) => handleSaveEdit(brand.name, e)}
                          className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <span className="text-gray-500 text-sm ml-2">
                Nenhuma Representada cadastrada
              </span>
            )}
          </div>

          {/* Mensagem de confirmação para exclusão de Representada */}
          {confirmDelete && deleteType === "brand" && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm">
              <p className="text-yellow-800 font-medium">
                Confirmar exclusão da Representada "{fixEncoding(confirmDelete)}
                "?
              </p>
              <p className="text-yellow-700 text-xs mt-1">
                Todos os produtos desta Representada também serão excluídos.
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
