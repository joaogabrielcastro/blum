import { useMemo, useState } from "react";
import { normalizeBrand } from "../utils/brandUtils";

/**
 * Primeira etapa da tela de produtos: escolher representada antes do catálogo.
 */
const RepresentadaPicker = ({ brands = [], loading, onSelect }) => {
  const [query, setQuery] = useState("");

  const normalized = useMemo(
    () => (brands || []).map(normalizeBrand),
    [brands],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter((b) => b.displayName.toLowerCase().includes(q));
  }, [normalized, query]);

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
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-1">
        Escolha uma representada
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        O catálogo é exibido por representada. Você pode buscar pelo nome abaixo.
      </p>

      <label htmlFor="pick-brand-search" className="sr-only">
        Buscar representada
      </label>
      <div className="relative mb-5">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
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
          id="pick-brand-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar representada pelo nome…"
          className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          autoComplete="off"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-500 py-8 text-sm">
          Nenhuma representada encontrada para &quot;{query.trim()}&quot;.
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[min(60vh,520px)] overflow-y-auto pr-1">
          {filtered.map((brand) => (
            <li key={brand.id}>
              <button
                type="button"
                onClick={() => onSelect(brand.displayName)}
                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50/60 transition-colors flex items-start justify-between gap-2 group"
              >
                <span className="font-medium text-gray-900 text-sm leading-snug group-hover:text-blue-900">
                  {brand.displayName}
                </span>
                <span className="shrink-0 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                  {brand.commission}%
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RepresentadaPicker;
