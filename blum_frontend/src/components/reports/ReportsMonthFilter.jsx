import { defaultMonthKey } from "../../hooks/useReportsData";

const ReportsMonthFilter = ({
  selectedMonthKey,
  onMonthChange,
  monthOptions,
  previousMonth,
  onGoToPreviousMonth,
  onGoToCurrentMonth,
  userRole,
  sellerFilterKey,
  onSellerFilterChange,
  sellerOptions,
  selectedSellerLabel,
}) => (
  <>
    <div className="flex flex-col lg:flex-row lg:items-end gap-3 mb-8">
      <div className="flex flex-col gap-2">
        <span className="font-semibold text-gray-700">Mês calendário:</span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onGoToCurrentMonth}
            className={`min-w-fit px-4 py-2 rounded-full text-sm font-semibold ${
              selectedMonthKey === defaultMonthKey
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Mês atual
          </button>
          <button
            type="button"
            onClick={onGoToPreviousMonth}
            className="min-w-fit px-4 py-2 rounded-full text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            Mês anterior
          </button>
          <select
            value={selectedMonthKey}
            onChange={(e) => onMonthChange(e.target.value)}
            className="min-h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800"
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
    </div>

    {userRole === "admin" ? (
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-8 flex-wrap">
        <span className="font-semibold text-gray-700 shrink-0">
          Representante:
        </span>
        <select
          value={sellerFilterKey}
          onChange={(e) => onSellerFilterChange(e.target.value)}
          aria-label="Filtrar pedidos por representante"
          className="w-full sm:w-auto min-w-[200px] max-w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="">Todos os representantes</option>
          {sellerOptions.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
        {sellerFilterKey ? (
          <span className="text-sm text-gray-600">
            Exibindo apenas pedidos de{" "}
            <span className="font-semibold text-gray-800">
              {selectedSellerLabel}
            </span>
            .
          </span>
        ) : null}
      </div>
    ) : null}
  </>
);

export default ReportsMonthFilter;
