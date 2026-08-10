import { defaultMonthKey } from "../../hooks/useReportsData";

const pillClass = (active) =>
  `min-w-fit rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
    active
      ? "bg-brand text-white"
      : "bg-surface-muted text-ink hover:bg-zinc-200 dark:hover:bg-zinc-700"
  }`;

const selectClass =
  "min-h-10 w-full rounded-xl border border-edge bg-surface px-3 py-2 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand/30";

const ReportsMonthFilter = ({
  selectedMonthKey,
  onMonthChange,
  monthOptions,
  onGoToPreviousMonth,
  onGoToCurrentMonth,
  userRole,
  sellerFilterKey,
  onSellerFilterChange,
  sellerOptions,
  selectedSellerLabel,
  brandFilterKey,
  onBrandFilterChange,
  brandOptions,
  selectedBrandLabel,
}) => (
  <div className="space-y-4">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink">Período</span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onGoToCurrentMonth}
            className={pillClass(selectedMonthKey === defaultMonthKey)}
          >
            Mês atual
          </button>
          <button
            type="button"
            onClick={onGoToPreviousMonth}
            className={pillClass(false)}
          >
            Mês anterior
          </button>
          <select
            value={selectedMonthKey}
            onChange={(e) => onMonthChange(e.target.value)}
            className={`${selectClass} sm:w-auto`}
            aria-label="Selecionar mês"
          >
            {monthOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:max-w-2xl">
        {userRole === "admin" ? (
          <div className="flex min-w-0 flex-col gap-2">
            <label
              htmlFor="reports-seller-filter"
              className="text-sm font-medium text-ink"
            >
              Representante
            </label>
            <select
              id="reports-seller-filter"
              value={sellerFilterKey}
              onChange={(e) => onSellerFilterChange(e.target.value)}
              aria-label="Filtrar por representante"
              className={selectClass}
            >
              <option value="">Todos os representantes</option>
              {sellerOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
            {sellerFilterKey ? (
              <p className="text-xs text-ink-muted">
                Pedidos de{" "}
                <span className="font-semibold text-ink">
                  {selectedSellerLabel}
                </span>
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex min-w-0 flex-col gap-2">
          <label
            htmlFor="reports-brand-filter"
            className="text-sm font-medium text-ink"
          >
            Representada
          </label>
          <select
            id="reports-brand-filter"
            value={brandFilterKey}
            onChange={(e) => onBrandFilterChange(e.target.value)}
            aria-label="Filtrar por representada"
            className={selectClass}
          >
            <option value="">Todas as representadas</option>
            {brandOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
          {brandFilterKey ? (
            <p className="text-xs text-ink-muted">
              Vendas de{" "}
              <span className="font-semibold text-ink">
                {selectedBrandLabel}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  </div>
);

export default ReportsMonthFilter;
