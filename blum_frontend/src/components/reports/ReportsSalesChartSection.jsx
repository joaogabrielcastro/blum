import formatCurrency from "../../utils/format";
import { formatMonthYearLabel } from "../../utils/orderApiFields";
import SalesChart from "../SalesChart";

const ReportsSalesChartSection = ({
  selectedYear,
  selectedMonth,
  previousMonth,
  sellerFilterKey,
  selectedSellerLabel,
  userRole,
  previousMonthTotal,
  suggestedTarget,
  targetDraft,
  onTargetDraftChange,
  onApplySuggestedTarget,
  onSaveTarget,
  savingTarget,
  salesTarget,
  chartData,
  totalSales,
}) => (
  <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 mb-8">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-1">
          Evolução das Vendas — {formatMonthYearLabel(selectedYear, selectedMonth)}
          {sellerFilterKey && selectedSellerLabel
            ? ` — ${selectedSellerLabel}`
            : ""}
        </h2>
        <p className="text-sm text-gray-600">
          Linha cinza: acumulado de{" "}
          {formatMonthYearLabel(previousMonth.year, previousMonth.month)}.
        </p>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 min-w-[260px]">
        <h3 className="text-sm font-bold text-gray-800 mb-3">
          Meta do mês
          {userRole === "admin" && !sellerFilterKey ? " (empresa)" : ""}
        </h3>
        <p className="text-xs text-gray-600 mb-1">
          Mês anterior: {formatCurrency(previousMonthTotal)}
        </p>
        {suggestedTarget != null ? (
          <p className="text-xs text-gray-600 mb-3">
            Sugestão (+10%): {formatCurrency(suggestedTarget)}
          </p>
        ) : null}
        <div className="flex gap-2 mb-2">
          <input
            type="number"
            min="0"
            step="0.01"
            value={targetDraft}
            onChange={(e) => onTargetDraftChange(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Valor da meta"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestedTarget != null ? (
            <button
              type="button"
              onClick={onApplySuggestedTarget}
              className="text-xs px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-800 font-semibold hover:bg-indigo-200"
            >
              Usar sugestão
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSaveTarget}
            disabled={savingTarget}
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {savingTarget ? "Salvando..." : "Salvar meta"}
          </button>
        </div>
        {salesTarget != null && salesTarget > 0 ? (
          <p className="text-xs text-green-700 mt-2 font-medium">
            Meta salva: {formatCurrency(salesTarget)}
          </p>
        ) : null}
      </div>
    </div>
    <SalesChart
      data={chartData}
      monthlyTarget={salesTarget}
      filterPeriod="monthly"
      totalSales={totalSales}
      showComparison
    />
  </div>
);

export default ReportsSalesChartSection;
