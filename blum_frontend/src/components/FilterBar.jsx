/**
 * Busca de produtos dentro do catálogo (representada já escolhida).
 */
const FilterBar = ({ searchTerm, onSearchChange = () => {} }) => {
  return (
    <div className="mb-4 rounded-2xl border border-edge bg-surface p-4 shadow-soft">
      <label
        htmlFor="product-search"
        className="mb-1.5 block text-sm font-medium text-ink"
      >
        Buscar produtos
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg
            className="h-4 w-4 text-ink-muted"
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
          id="product-search"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Nome ou código (ex.: lamp 9w)"
          className="block w-full rounded-xl border border-edge bg-surface py-2.5 pl-10 pr-10 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        {searchTerm ? (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-muted hover:text-ink"
            aria-label="Limpar busca"
          >
            <svg
              className="h-4 w-4"
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
        ) : null}
      </div>
    </div>
  );
};

export default FilterBar;
