import { useMemo, useState } from "react";
import { normalizeBrand } from "../utils/brandUtils";

const BuildingIcon = ({ className = "h-7 w-7" }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    aria-hidden
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008V11.25m0 3h.008v.008h-.008V15.75m0 3h.008v.008h-.008V19.5M4.5 19.5h15A2.25 2.25 0 0021.75 17.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
    />
  </svg>
);

/**
 * Primeira etapa: lista de representadas (estilo gestão) → ao entrar, abre o catálogo.
 */
const RepresentadaPicker = ({
  brands = [],
  loading,
  onSelect,
  onCadastrar,
  userRole,
  brandsRaw = [],
  onEditBrand,
  onRequestDeleteBrand,
  confirmDelete,
  deleteType,
  onConfirmDelete,
  onCancelDelete,
}) => {
  const [query, setQuery] = useState("");
  const [editingBrandId, setEditingBrandId] = useState(null);
  const [editCommission, setEditCommission] = useState("");

  const isAdmin = userRole === "admin";

  const normalized = useMemo(
    () => (brands || []).map(normalizeBrand),
    [brands],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter((b) => {
      const idStr = String(b.id ?? "").toLowerCase();
      return (
        b.displayName.toLowerCase().includes(q) ||
        (idStr && idStr.includes(q))
      );
    });
  }, [normalized, query]);

  const handleEditClick = (brand, e) => {
    e.stopPropagation();
    setEditingBrandId(brand.id);
    setEditCommission(String(brand.commission ?? ""));
  };

  const handleSaveEdit = async (brandId, e) => {
    e.preventDefault();
    const original = brandsRaw.find((b) => {
      const n = normalizeBrand(b);
      return n.id === brandId;
    });
    if (original) {
      await onEditBrand(original.name, {
        name: original.name,
        commission_rate: parseFloat(editCommission) || 0,
      });
    }
    setEditingBrandId(null);
    setEditCommission("");
  };

  const handleCommissionChange = (e) => {
    const value = e.target.value;
    if (
      /^\d*\.?\d*$/.test(value) &&
      (value === "" || parseFloat(value) <= 100)
    ) {
      setEditCommission(value);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-pulse text-gray-500">
          Carregando representadas…
        </div>
      </div>
    );
  }

  if (normalized.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center text-gray-600">
        <p className="text-lg font-medium text-gray-800">
          Nenhuma representada cadastrada
        </p>
        <p className="mt-2 text-sm">
          Cadastre uma representada para começar a usar o catálogo de produtos.
        </p>
        {isAdmin && onCadastrar && (
          <button
            type="button"
            onClick={onCadastrar}
            className="mt-6 inline-flex items-center gap-2 bg-purple-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-purple-700"
          >
            + Cadastrar representada
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/80">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="shrink-0 text-purple-600">
              <BuildingIcon className="h-8 w-8" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-tight text-gray-900 uppercase">
                Representadas
              </h2>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end flex-1 lg:max-w-2xl">
            {isAdmin && onCadastrar && (
              <button
                type="button"
                onClick={onCadastrar}
                className="shrink-0 inline-flex items-center justify-center gap-2 bg-purple-600 text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-purple-700 text-sm sm:text-base"
              >
                + Cadastrar representada
              </button>
            )}
            <div className="relative flex-1 min-w-[160px] max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-4 w-4 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtrar…"
                aria-label="Filtrar representadas"
                className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm bg-white"
                autoComplete="off"
              />
            </div>
          </div>
        </div>
      </div>

      {isAdmin && confirmDelete && deleteType === "brand" && (
        <div className="mx-4 sm:mx-5 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
          <p className="text-amber-900 font-medium">
            Confirmar exclusão da representada &quot;{confirmDelete}&quot;?
          </p>
          <p className="text-amber-800 text-xs mt-1">
            Produtos vinculados a esta representada podem ser afetados.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              onClick={onConfirmDelete}
              className="bg-red-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-red-700"
            >
              Confirmar exclusão
            </button>
            <button
              type="button"
              onClick={onCancelDelete}
              className="bg-gray-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-gray-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <ul className="divide-y divide-gray-100 max-h-[min(65vh,560px)] overflow-y-auto">
        {filtered.length === 0 ? (
          <li className="px-5 py-12 text-center text-gray-500 text-sm">
            Nenhuma representada encontrada para &quot;{query.trim()}&quot;.
          </li>
        ) : (
          filtered.map((brand) => (
            <li
              key={brand.id}
              className="relative px-4 sm:px-5 py-4 hover:bg-gray-50/80 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="shrink-0 w-14 h-14 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200 flex items-center justify-center text-purple-700 font-bold text-lg">
                    {(brand.displayName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-purple-700 text-base truncate">
                      {brand.displayName}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Comissão {brand.commission}%
                      {brand.raw?.id != null && (
                        <span className="text-gray-400">
                          {" "}
                          · ID {brand.raw.id}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelect(brand.displayName)}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm"
                  >
                    Abrir catálogo
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => handleEditClick(brand, e)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-white"
                      >
                        <svg
                          className="w-4 h-4"
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
                        Alterar
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRequestDeleteBrand(brand.displayName);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Excluir
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isAdmin && editingBrandId === brand.id && (
                <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg shadow-md max-w-sm">
                  <h4 className="font-semibold text-sm text-gray-800 mb-2">
                    Editar comissão — {brand.displayName}
                  </h4>
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="text"
                      value={editCommission}
                      onChange={handleCommissionChange}
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                      placeholder="0"
                    />
                    <span className="text-gray-600 text-sm">%</span>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBrandId(null);
                        setEditCommission("");
                      }}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleSaveEdit(brand.id, e)}
                      className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default RepresentadaPicker;
