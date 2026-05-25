import { Link } from "react-router-dom";
import OrderProductResultRow from "./OrderProductResultRow";

function ClientOptionRow({ opt, onSelect }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onSelect(opt)}
      className="flex w-full flex-col gap-1 border-b border-gray-100 bg-white px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-indigo-50 active:bg-indigo-100"
    >
      <span className="text-sm font-medium leading-snug text-gray-900">
        {opt.primary}
      </span>
      {opt.secondary ? (
        <span className="flex items-start gap-2 text-xs leading-snug text-gray-600">
          <svg
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
            />
          </svg>
          {opt.secondary}
        </span>
      ) : null}
    </button>
  );
}

export function OrderMobileProductPicker({
  open,
  onClose,
  selectedBrand,
  productSearch,
  onProductSearchChange,
  isSearching,
  searchResults,
  onProductSelect,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-white md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Buscar produto"
    >
      <div className="flex items-center gap-2 border-b border-gray-200 p-3 pt-[max(12px,env(safe-area-inset-top,0px))]">
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
        >
          Voltar
        </button>
        <div className="relative flex-1 min-w-0">
          <input
            type="search"
            placeholder={
              selectedBrand
                ? "Nome ou código do produto..."
                : "Selecione uma representada"
            }
            value={productSearch}
            onChange={(e) => onProductSearchChange(e.target.value)}
            disabled={!selectedBrand}
            className="w-full p-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            autoComplete="off"
            autoFocus
          />
          {isSearching ? (
            <div className="absolute right-3 top-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {!selectedBrand && (
          <p className="p-4 text-center text-gray-500">
            Selecione uma representada para buscar produtos.
          </p>
        )}
        {selectedBrand &&
          productSearch.trim().length > 0 &&
          productSearch.trim().length < 2 && (
            <p className="p-4 text-center text-gray-500">
              Digite pelo menos 2 caracteres.
            </p>
          )}
        {selectedBrand &&
          productSearch.trim().length >= 2 &&
          searchResults.map((product) => (
            <OrderProductResultRow
              key={product.id}
              product={product}
              onSelect={onProductSelect}
            />
          ))}
        {selectedBrand &&
          productSearch.trim().length >= 2 &&
          searchResults.length === 0 &&
          !isSearching && (
            <div className="p-6 text-center text-gray-500">
              Nenhum produto encontrado para &quot;{productSearch}&quot;
            </div>
          )}
      </div>
    </div>
  );
}

export function OrderMobileClientPicker({
  open,
  onClose,
  clientSearchTerm,
  onClientSearchChange,
  clientOptions,
  mobileClientDisplayList,
  browseCount,
  onSelectClient,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-white md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Buscar cliente"
    >
      <div className="flex items-center gap-2 border-b border-gray-200 p-3 pt-[max(12px,env(safe-area-inset-top,0px))]">
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
        >
          Voltar
        </button>
        <div className="relative flex-1 min-w-0">
          <input
            type="search"
            placeholder="Nome, fantasia ou CNPJ..."
            value={clientSearchTerm}
            onChange={(e) => onClientSearchChange(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoComplete="off"
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {!clientSearchTerm.trim() && clientOptions.length > 0 && (
          <p className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
            Mostrando os primeiros {browseCount} clientes em ordem alfabética.
            Digite para filtrar.
          </p>
        )}
        {clientSearchTerm.trim().length > 0 &&
          mobileClientDisplayList.length === 0 &&
          clientOptions.length > 0 && (
            <div className="p-6 text-center text-sm text-gray-500">
              Nenhum cliente encontrado para &quot;{clientSearchTerm}&quot;
            </div>
          )}
        {clientOptions.length === 0 && (
          <p className="p-6 text-center text-sm text-amber-800">
            Nenhum cliente cadastrado.
          </p>
        )}
        {mobileClientDisplayList.map((opt) => (
          <ClientOptionRow key={opt.id} opt={opt} onSelect={onSelectClient} />
        ))}
      </div>

      <Link
        to="/clients"
        className="flex shrink-0 items-center gap-2 border-t border-gray-200 px-4 py-3 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
        style={{
          paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))",
        }}
        onClick={onClose}
      >
        <span className="text-lg leading-none" aria-hidden>
          +
        </span>
        Cadastrar novo cliente
      </Link>
    </div>
  );
}
