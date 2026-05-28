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

/** Cliente, representada, pagamento, data, descrição e desconto geral. */
export default function OrderFormMetaSection({
  brands,
  clientId,
  clientOptions,
  clientSearchTerm,
  onClientSearchTermChange,
  onOpenMobileClientPicker,
  onResetClient,
  mobileClientPickerOpen,
  desktopClientListOpen,
  onDesktopClientListOpen,
  filteredClientOptions,
  onSelectClient,
  selectedBrandId,
  onBrandChange,
  paymentMethod,
  onPaymentMethodChange,
  orderDateTime,
  onOrderDateTimeChange,
  description,
  onDescriptionChange,
  discount,
  onDiscountChange,
  canApplyGeneralDiscount,
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 sm:p-5 md:p-6 space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-gray-800">
          Dados do pedido
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Preencha cliente, representada, pagamento e demais informações.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cliente *
          </label>

          <div className="md:hidden space-y-2">
            <button
              type="button"
              aria-expanded={mobileClientPickerOpen}
              aria-haspopup="dialog"
              onClick={onOpenMobileClientPicker}
              className="w-full min-h-12 p-3.5 border border-gray-300 rounded-lg text-base text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span
                className={
                  clientId ? "text-gray-900 line-clamp-2" : "text-gray-400"
                }
              >
                {clientId
                  ? (clientOptions.find((o) => o.id === String(clientId))
                      ?.label ?? "Cliente selecionado")
                  : "Toque para buscar cliente (nome ou CNPJ)"}
              </span>
            </button>
            {clientId ? (
              <button
                type="button"
                className="text-xs font-medium text-blue-700 hover:underline"
                onClick={onResetClient}
              >
                Limpar cliente
              </button>
            ) : null}
          </div>

          <div className="relative hidden md:block">
            <input
              type="text"
              autoComplete="off"
              value={clientSearchTerm}
              onChange={(e) => onClientSearchTermChange(e.target.value)}
              onFocus={() => onDesktopClientListOpen(true)}
              onBlur={() => {
                window.setTimeout(() => onDesktopClientListOpen(false), 180);
              }}
              placeholder="Nome, fantasia ou CNPJ..."
              className="w-full p-3.5 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {desktopClientListOpen &&
              clientSearchTerm.trim().length > 0 &&
              filteredClientOptions.length > 0 && (
                <div
                  className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto overscroll-contain rounded-lg border border-gray-200 bg-white shadow-xl"
                  role="listbox"
                >
                  {filteredClientOptions.map((opt) => (
                    <ClientOptionRow
                      key={opt.id}
                      opt={opt}
                      onSelect={onSelectClient}
                    />
                  ))}
                </div>
              )}
            {desktopClientListOpen &&
              clientSearchTerm.trim().length > 0 &&
              filteredClientOptions.length === 0 &&
              clientOptions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500 shadow-lg">
                  Nenhum cliente encontrado. Ajuste nome ou CNPJ.
                </div>
              )}
          </div>

          <p className="mt-1 text-xs text-gray-500">
            {clientOptions.length > 0
              ? "A lista mostra CNPJ e local (cidade/UF) quando estão no cadastro."
              : null}
          </p>
          {clientOptions.length === 0 && (
            <p className="mt-1 text-sm text-amber-700">
              Nenhum cliente cadastrado. Cadastre clientes em Clientes.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Representada *
          </label>
          <select
            value={selectedBrandId}
            onChange={(e) => onBrandChange(e.target.value)}
            className="w-full p-3.5 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione uma representada</option>
            {Array.isArray(brands) &&
              brands.map((brand) => (
                <option key={brand.id ?? brand.name} value={String(brand.id)}>
                  {brand.name}
                </option>
              ))}
          </select>
          {Array.isArray(brands) && brands.length === 0 && (
            <p className="mt-1 text-sm text-amber-700">
              Nenhuma representada cadastrada. Cadastre em Produtos.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Condição / forma de pagamento
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => onPaymentMethodChange(e.target.value)}
            className="w-full p-3.5 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione (opcional)</option>
            <option value="carteira">Carteira (não pago / em aberto)</option>
            <option value="boleto">Pagamento em boleto</option>
            <option value="pix">Pagamento via PIX</option>
            <option value="cheque">Pagamento via cheque</option>
            <option value="dinheiro">Pagamento em dinheiro</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Desconto geral só é permitido em PIX ou dinheiro.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data do pedido
          </label>
          <input
            type="datetime-local"
            value={orderDateTime}
            onChange={(e) => onOrderDateTimeChange(e.target.value)}
            className="w-full p-3.5 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Use esta data para lançar pedidos antigos no sistema.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descrição
          </label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={2}
            className="w-full p-3.5 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Descrição do pedido (opcional)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Desconto geral no pedido (%)
          </label>
          <input
            type="number"
            min="0"
            max={canApplyGeneralDiscount ? "2" : "0"}
            step="0.01"
            value={discount}
            onChange={(e) => {
              const raw = parseFloat(e.target.value) || 0;
              const capped = canApplyGeneralDiscount
                ? Math.min(2, Math.max(0, raw))
                : 0;
              onDiscountChange(capped);
            }}
            className="w-full p-3.5 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
            disabled={!canApplyGeneralDiscount}
          />
          <p className="mt-1 text-xs text-gray-500">
            Aplicado sobre o subtotal já com descontos por item.
          </p>
          {canApplyGeneralDiscount ? (
            <p className="mt-1 text-xs font-medium text-amber-700">
              Para PIX ou dinheiro, desconto geral limitado a 2%.
            </p>
          ) : (
            <p className="mt-1 text-xs font-medium text-gray-500">
              Para esta forma de pagamento, desconto geral deve ser 0%.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
