import formatCurrency from "../../utils/format";
import { formatMonthYearLabel } from "../../utils/orderApiFields";
import SalesChart from "../SalesChart";

const ReportsSalesChartSection = ({
  selectedYear,
  selectedMonth,
  previousMonth,
  sellerFilterKey,
  selectedSellerLabel,
  brandFilterKey,
  selectedBrandLabel,
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
}) => {
  const scopeParts = [
    sellerFilterKey && selectedSellerLabel ? selectedSellerLabel : null,
    brandFilterKey && selectedBrandLabel ? selectedBrandLabel : null,
  ].filter(Boolean);

  return (
    <div className="mb-8 rounded-2xl border border-edge bg-surface p-6 shadow-soft">
      <div className="mb-4 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="mb-1 text-xl font-semibold text-ink">
            Evolução das Vendas —{" "}
            {formatMonthYearLabel(selectedYear, selectedMonth)}
            {scopeParts.length ? ` — ${scopeParts.join(" · ")}` : ""}
          </h2>
          <p className="text-sm text-ink-muted">
            Linha cinza: acumulado de{" "}
            {formatMonthYearLabel(previousMonth.year, previousMonth.month)}.
            {brandFilterKey
              ? " Valores da representada selecionada (pedidos multi-marca são rateados)."
              : ""}
          </p>
        </div>
        <div className="min-w-[260px] rounded-xl border border-edge bg-surface-muted p-4">
          <h3 className="mb-3 text-sm font-bold text-ink">
            Meta do mês
            {userRole === "admin" && !sellerFilterKey ? " (empresa)" : ""}
          </h3>
          <p className="mb-1 text-xs text-ink-muted">
            Mês anterior: {formatCurrency(previousMonthTotal)}
          </p>
          {suggestedTarget != null ? (
            <p className="mb-3 text-xs text-ink-muted">
              Sugestão (+10%): {formatCurrency(suggestedTarget)}
            </p>
          ) : null}
          <div className="mb-2 flex gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={targetDraft}
              onChange={(e) => onTargetDraftChange(e.target.value)}
              className="flex-1 rounded-xl border border-edge bg-surface px-3 py-2 text-sm text-ink"
              placeholder="Valor da meta"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedTarget != null ? (
              <button
                type="button"
                onClick={onApplySuggestedTarget}
                className="rounded-lg bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-200"
              >
                Usar sugestão
              </button>
            ) : null}
            <button
              type="button"
              onClick={onSaveTarget}
              disabled={savingTarget}
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {savingTarget ? "Salvando..." : "Salvar meta"}
            </button>
          </div>
          {salesTarget != null && salesTarget > 0 ? (
            <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
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
};

export default ReportsSalesChartSection;
