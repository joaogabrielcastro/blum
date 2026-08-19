import FormField, { inputClassName } from "../ui/FormField";
import PaymentMethodPicker from "./PaymentMethodPicker";

function ClientOptionRow({ opt, onSelect }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onSelect(opt)}
      className="flex w-full flex-col gap-1 border-b border-edge bg-surface px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-brand-50 active:bg-brand-100"
    >
      <span className="text-sm font-medium leading-snug text-ink">
        {opt.primary}
      </span>
      {opt.secondary ? (
        <span className="flex items-start gap-2 text-xs leading-snug text-ink-muted">
          <svg
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted"
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

function ClientBrandFields({
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
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
      <FormField label="Cliente" required>
        <div className="space-y-2 md:hidden">
          <button
            type="button"
            aria-expanded={mobileClientPickerOpen}
            aria-haspopup="dialog"
            onClick={onOpenMobileClientPicker}
            className={`${inputClassName()} min-h-12 text-left`}
          >
            <span
              className={
                clientId ? "line-clamp-2 text-ink" : "text-ink-muted"
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
              className="text-xs font-medium text-brand hover:underline"
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
            placeholder="Nome, fantasia ou CNPJ…"
            className={inputClassName()}
          />
          {desktopClientListOpen &&
            clientSearchTerm.trim().length > 0 &&
            filteredClientOptions.length > 0 && (
              <div
                className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto overscroll-contain rounded-xl border border-edge bg-surface shadow-soft"
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
              <div className="absolute left-0 right-0 z-50 mt-1 rounded-xl border border-edge bg-surface p-4 text-sm text-ink-muted shadow-soft">
                Nenhum cliente encontrado. Ajuste nome ou CNPJ.
              </div>
            )}
        </div>
        {clientOptions.length === 0 ? (
          <p className="mt-1 text-sm text-amber-700">
            Nenhum cliente cadastrado. Cadastre em Clientes.
          </p>
        ) : (
          <p className="mt-1 text-xs text-ink-muted">
            A lista mostra CNPJ e local quando estão no cadastro.
          </p>
        )}
      </FormField>

      <FormField label="Representada" required>
        <select
          value={selectedBrandId}
          onChange={(e) => onBrandChange(e.target.value)}
          className={inputClassName()}
        >
          <option value="">Selecione uma representada</option>
          {Array.isArray(brands) &&
            brands.map((brand) => (
              <option key={brand.id ?? brand.name} value={String(brand.id)}>
                {brand.name}
              </option>
            ))}
        </select>
        {Array.isArray(brands) && brands.length === 0 ? (
          <p className="mt-1 text-sm text-amber-700">
            Nenhuma representada cadastrada. Cadastre em Produtos.
          </p>
        ) : null}
      </FormField>
    </div>
  );
}

function ConditionsFields({
  paymentMethod,
  onPaymentMethodChange,
  paymentRequired = false,
  orderDateTime,
  onOrderDateTimeChange,
  description,
  onDescriptionChange,
  discount,
  onDiscountChange,
  canApplyGeneralDiscount,
  showAdvanced,
  onToggleAdvanced,
}) {
  return (
    <div className="space-y-5">
      <FormField
        label="Forma de pagamento"
        required={paymentRequired}
        hint={
          paymentRequired
            ? "Toque na opção. Obrigatório neste pedido. Desconto geral só em PIX ou dinheiro."
            : "Toque na opção. Pode definir agora ou ao virar o orçamento em pedido."
        }
      >
        <PaymentMethodPicker
          value={paymentMethod}
          onChange={onPaymentMethodChange}
        />
      </FormField>

      <FormField
        label="Desconto geral (%)"
        hint={
          canApplyGeneralDiscount
            ? "Para PIX ou dinheiro, máximo 2%."
            : "Para esta forma de pagamento, desconto geral deve ser 0%."
        }
      >
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
            className={inputClassName()}
            disabled={!canApplyGeneralDiscount && !(parseFloat(discount) > 0)}
          />
          {!canApplyGeneralDiscount && parseFloat(discount) > 0 ? (
            <button
              type="button"
              className="mt-2 text-xs font-medium text-brand hover:underline"
              onClick={() => onDiscountChange(0)}
            >
              Zerar desconto para usar outra forma de pagamento
            </button>
          ) : null}
        </FormField>

      <div>
        <button
          type="button"
          onClick={onToggleAdvanced}
          className="text-sm font-medium text-brand hover:underline"
        >
          {showAdvanced ? "Ocultar opções avançadas" : "Mais opções"}
        </button>
        {showAdvanced ? (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label="Data do pedido"
              hint="Use para lançar pedidos antigos."
            >
              <input
                type="datetime-local"
                value={orderDateTime}
                onChange={(e) => onOrderDateTimeChange(e.target.value)}
                className={inputClassName()}
              />
            </FormField>
            <FormField label="Observação">
              <textarea
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                rows={2}
                className={inputClassName()}
                placeholder="Opcional"
              />
            </FormField>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * @param {"basics"|"conditions"|"all"} variant
 */
export default function OrderFormMetaSection({
  variant = "all",
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
  paymentRequired = false,
  orderDateTime,
  onOrderDateTimeChange,
  description,
  onDescriptionChange,
  discount,
  onDiscountChange,
  canApplyGeneralDiscount,
  showAdvanced = false,
  onToggleAdvanced,
}) {
  const showBasics = variant === "basics" || variant === "all";
  const showConditions = variant === "conditions" || variant === "all";

  const title =
    variant === "basics"
      ? "Cliente e representada"
      : variant === "conditions"
        ? "Pagamento"
        : "Dados do pedido";
  const subtitle =
    variant === "basics"
      ? "Comece escolhendo para quem e qual marca."
      : variant === "conditions"
        ? "Pagamento, desconto e detalhes finais."
        : "Preencha cliente, representada, pagamento e demais informações.";

  return (
    <section className="min-w-0 space-y-5 rounded-2xl border border-edge bg-surface-muted/60 p-3 sm:space-y-6 sm:p-4 md:p-5">
      <div>
        <h3 className="text-base font-semibold text-ink sm:text-lg">
          {title}
        </h3>
        <p className="mt-1 text-xs text-ink-muted sm:text-sm">{subtitle}</p>
      </div>

      {showBasics ? (
        <ClientBrandFields
          brands={brands}
          clientId={clientId}
          clientOptions={clientOptions}
          clientSearchTerm={clientSearchTerm}
          onClientSearchTermChange={onClientSearchTermChange}
          onOpenMobileClientPicker={onOpenMobileClientPicker}
          onResetClient={onResetClient}
          mobileClientPickerOpen={mobileClientPickerOpen}
          desktopClientListOpen={desktopClientListOpen}
          onDesktopClientListOpen={onDesktopClientListOpen}
          filteredClientOptions={filteredClientOptions}
          onSelectClient={onSelectClient}
          selectedBrandId={selectedBrandId}
          onBrandChange={onBrandChange}
        />
      ) : null}

      {showConditions ? (
        <ConditionsFields
          paymentMethod={paymentMethod}
          onPaymentMethodChange={onPaymentMethodChange}
          paymentRequired={paymentRequired}
          orderDateTime={orderDateTime}
          onOrderDateTimeChange={onOrderDateTimeChange}
          description={description}
          onDescriptionChange={onDescriptionChange}
          discount={discount}
          onDiscountChange={onDiscountChange}
          canApplyGeneralDiscount={canApplyGeneralDiscount}
          showAdvanced={showAdvanced}
          onToggleAdvanced={onToggleAdvanced}
        />
      ) : null}
    </section>
  );
}
