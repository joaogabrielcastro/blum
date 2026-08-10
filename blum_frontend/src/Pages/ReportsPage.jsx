import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import apiService from "../services/apiService";
import ReportsMonthFilter from "../components/reports/ReportsMonthFilter";
import ReportsSummaryCards from "../components/reports/ReportsSummaryCards";
import ReportsSalesChartSection from "../components/reports/ReportsSalesChartSection";
import ReportsMonthlyHistoryTable from "../components/reports/ReportsMonthlyHistoryTable";
import ReportsBrandComparison from "../components/reports/ReportsBrandComparison";
import ReportsOrdersTable from "../components/reports/ReportsOrdersTable";
import ReportsCommissionsTable from "../components/reports/ReportsCommissionsTable";
import Tabs, { TabPanel } from "../components/ui/Tabs";
import Surface, { PageHeader } from "../components/ui/Surface";
import ListPageSkeleton from "../components/ListPageSkeleton";
import {
  orderSellerUserKey,
  formatOrderDateLabel,
  monthYearKey,
  orderFinishedAt,
  orderTotalPrice,
  orderTotalCommission,
  orderClientId,
} from "../utils/orderApiFields";
import {
  buildAllRepresentativesCommissionPdf,
  buildRepresentativeCommissionPdf,
} from "../utils/commissionReportPdf";
import { buildPdfFile, downloadPdfFile } from "../utils/pdfDownload";
import { useToast } from "../context/ToastContext";
import { useReportsData, defaultMonthKey } from "../hooks/useReportsData";
import { useReportsMetrics } from "../hooks/useReportsMetrics";
import {
  canUseFeature,
  PLAN_FEATURE_REQUIRED_EVENT,
} from "../utils/planFeatures";

const TAB_SUMMARY = "resumo";
const TAB_ORDERS = "pedidos";
const TAB_COMMISSIONS = "comissoes";
const TAB_BRANDS = "comparativos";

const ReportsPage = ({ userRole, userId, subscription }) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState(TAB_SUMMARY);
  const [exportingPdf, setExportingPdf] = useState(null);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [brandFilterKey, setBrandFilterKey] = useState("");
  const canExcel = canUseFeature(subscription, "excel-export");
  const canCommissionPdf = canUseFeature(subscription, "commission-pdf");
  const canBrandCompare = canUseFeature(subscription, "brand-comparison");

  const requestUpgrade = (feature) => {
    window.dispatchEvent(
      new CustomEvent(PLAN_FEATURE_REQUIRED_EVENT, {
        detail: { feature, requiredPlan: "professional" },
      }),
    );
  };

  const data = useReportsData({ userRole, userId });
  const {
    allOrders,
    monthlySummaries,
    loading,
    selectedMonthKey,
    setSelectedMonthKey,
    salesTarget,
    targetDraft,
    setTargetDraft,
    savingTarget,
    sellerFilterKey,
    setSellerFilterKey,
    clients,
    usersById,
    selectedYear,
    selectedMonth,
    previousMonth,
    saveSalesTarget,
  } = data;

  const {
    monthOptions,
    sellerOptions,
    brandOptions,
    ordersToDisplay,
    chartData,
    totalSales,
    totalCommissions,
    brandBars,
    mediaPorRepresentada,
    commissionsByRep,
    suggestedTarget,
    periodLabel,
    showRepresentantesSummaryTable,
    previousMonthTotal,
  } = useReportsMetrics({
    allOrders,
    monthlySummaries,
    selectedMonthKey,
    selectedYear,
    selectedMonth,
    previousMonth,
    sellerFilterKey,
    brandFilterKey,
    userRole,
    userId,
    usersById,
  });

  const selectedSellerLabel =
    sellerOptions.find((o) => o.key === sellerFilterKey)?.label ?? "";
  const selectedBrandLabel =
    brandOptions.find((o) => o.key === brandFilterKey)?.label ?? "";

  useEffect(() => {
    if (
      brandFilterKey &&
      !brandOptions.some((o) => o.key === brandFilterKey)
    ) {
      setBrandFilterKey("");
    }
  }, [brandFilterKey, brandOptions]);

  const formatRepLabel = (sale) => {
    if (!sale) return "N/A";
    const u = sale.username?.trim();
    if (sale.displayName && u) return `${sale.displayName} (@${u})`;
    return sale.displayName || sale.userId || "N/A";
  };

  const downloadBuiltPdf = async (built) => {
    const file = buildPdfFile(built.doc, built.filename);
    await downloadPdfFile(file);
  };

  const handleExportSalesExcel = async () => {
    if (userRole !== "admin") return;
    if (!canExcel) {
      requestUpgrade("excel-export");
      return;
    }
    try {
      setExportingExcel(true);
      const blob = await apiService.downloadSalesByRepExcel();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "blum-vendas-por-representante.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel exportado.");
    } catch (error) {
      console.error(error);
      toast.error(
        error?.code === "PLAN_FEATURE_REQUIRED"
          ? error.message
          : "Não foi possível exportar o Excel. Tente novamente.",
      );
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportAllCommissionsPdf = async () => {
    if (!canCommissionPdf) {
      requestUpgrade("commission-pdf");
      return;
    }
    if (!commissionsByRep.length) {
      toast.warning("Não há comissões para exportar neste período.");
      return;
    }
    try {
      setExportingPdf("all");
      const built = buildAllRepresentativesCommissionPdf({
        periodLabel,
        rows: commissionsByRep,
        totals: {
          orderCount: ordersToDisplay.length,
          totalSales,
          totalCommissions,
          avgTicket:
            ordersToDisplay.length > 0
              ? totalSales / ordersToDisplay.length
              : 0,
          effectiveRate:
            totalSales > 0
              ? `${((totalCommissions / totalSales) * 100).toFixed(2)}%`
              : "0.00%",
        },
      });
      await downloadBuiltPdf(built);
      toast.success("PDF de comissões gerado.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setExportingPdf(null);
    }
  };

  const handleExportRepCommissionPdf = async (sale) => {
    if (!canCommissionPdf) {
      requestUpgrade("commission-pdf");
      return;
    }
    const repOrders = ordersToDisplay.filter(
      (order) => orderSellerUserKey(order) === sale.userId,
    );
    if (!repOrders.length) {
      toast.warning("Este representante não tem pedidos no período.");
      return;
    }
    try {
      setExportingPdf(sale.userId);
      const built = buildRepresentativeCommissionPdf({
        rep: sale,
        orders: repOrders,
        clients,
        periodLabel,
        formatRepLabel,
        formatOrderDateLabel,
        orderFinishedAt,
        orderTotalPrice,
        orderTotalCommission,
        orderClientId,
      });
      await downloadBuiltPdf(built);
      toast.success(`PDF de ${sale.displayName} gerado.`);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setExportingPdf(null);
    }
  };

  const goToPreviousMonth = () => {
    setSelectedMonthKey(
      monthYearKey(previousMonth.year, previousMonth.month),
    );
  };

  const goToCurrentMonth = () => {
    setSelectedMonthKey(defaultMonthKey);
  };

  const handleSaveTarget = async () => {
    const amount = parseFloat(String(targetDraft).replace(",", "."));
    if (!Number.isFinite(amount) || amount < 0) return;
    try {
      await saveSalesTarget(amount);
      toast.success("Meta salva.");
    } catch (error) {
      console.error("Erro ao salvar meta:", error);
      toast.error("Não foi possível salvar a meta.");
    }
  };

  const applySuggestedTarget = () => {
    if (suggestedTarget == null) return;
    setTargetDraft(String(suggestedTarget));
  };

  const tabs = [
    { id: TAB_SUMMARY, label: "Resumo" },
    { id: TAB_ORDERS, label: "Pedidos", badge: ordersToDisplay.length },
    {
      id: TAB_COMMISSIONS,
      label: "Comissões",
      badge: commissionsByRep.length || undefined,
    },
    { id: TAB_BRANDS, label: "Comparativos" },
  ];

  if (loading) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <ListPageSkeleton variant="list" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <PageHeader
        title="Relatórios"
        description={`Período: ${periodLabel}`}
      />

      <Surface className="mb-5" padded>
        <ReportsMonthFilter
          selectedMonthKey={selectedMonthKey}
          onMonthChange={setSelectedMonthKey}
          monthOptions={monthOptions}
          onGoToPreviousMonth={goToPreviousMonth}
          onGoToCurrentMonth={goToCurrentMonth}
          userRole={userRole}
          sellerFilterKey={sellerFilterKey}
          onSellerFilterChange={(value) => {
            setSellerFilterKey(value);
            setBrandFilterKey("");
          }}
          sellerOptions={sellerOptions}
          selectedSellerLabel={selectedSellerLabel}
          brandFilterKey={brandFilterKey}
          onBrandFilterChange={setBrandFilterKey}
          brandOptions={brandOptions}
          selectedBrandLabel={selectedBrandLabel}
        />
      </Surface>

      <Tabs
        tabs={tabs}
        value={activeTab}
        onChange={setActiveTab}
        className="mb-5"
      />

      <TabPanel id={TAB_SUMMARY} activeId={activeTab} className="space-y-6">
        <ReportsSummaryCards
          orderCount={ordersToDisplay.length}
          totalSales={totalSales}
          totalCommissions={totalCommissions}
        />
        <ReportsSalesChartSection
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          previousMonth={previousMonth}
          sellerFilterKey={sellerFilterKey}
          selectedSellerLabel={selectedSellerLabel}
          brandFilterKey={brandFilterKey}
          selectedBrandLabel={selectedBrandLabel}
          userRole={userRole}
          previousMonthTotal={previousMonthTotal}
          suggestedTarget={suggestedTarget}
          targetDraft={targetDraft}
          onTargetDraftChange={setTargetDraft}
          onApplySuggestedTarget={applySuggestedTarget}
          onSaveTarget={handleSaveTarget}
          savingTarget={savingTarget}
          salesTarget={salesTarget}
          chartData={chartData}
          totalSales={totalSales}
        />
        <ReportsMonthlyHistoryTable monthlySummaries={monthlySummaries} />
      </TabPanel>

      <TabPanel id={TAB_ORDERS} activeId={activeTab}>
        <ReportsOrdersTable
          ordersToDisplay={ordersToDisplay}
          clients={clients}
          usersById={usersById}
          sellerFilterKey={sellerFilterKey}
        />
      </TabPanel>

      <TabPanel id={TAB_COMMISSIONS} activeId={activeTab}>
        <ReportsCommissionsTable
          userRole={userRole}
          periodLabel={periodLabel}
          showRepresentantesSummaryTable={showRepresentantesSummaryTable}
          commissionsByRep={commissionsByRep}
          ordersToDisplay={ordersToDisplay}
          totalSales={totalSales}
          totalCommissions={totalCommissions}
          exportingExcel={exportingExcel}
          exportingPdf={exportingPdf}
          formatRepLabel={formatRepLabel}
          onExportSalesExcel={handleExportSalesExcel}
          onExportAllCommissionsPdf={handleExportAllCommissionsPdf}
          onExportRepCommissionPdf={handleExportRepCommissionPdf}
          canExcel={canExcel}
          canCommissionPdf={canCommissionPdf}
        />
      </TabPanel>

      <TabPanel id={TAB_BRANDS} activeId={activeTab}>
        {canBrandCompare ? (
          <ReportsBrandComparison
            brandBars={brandBars}
            totalSales={totalSales}
            mediaPorRepresentada={mediaPorRepresentada}
          />
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
            <h2 className="text-lg font-semibold">
              Comparativo entre representadas
            </h2>
            <p className="mt-1 text-sm">
              Disponível no plano Profissional. Compare vendas por marca e
              identifique o mix da operação.
            </p>
            <Link
              to="/subscription"
              className="mt-3 inline-block text-sm font-semibold text-brand underline underline-offset-2"
            >
              Ver planos
            </Link>
          </div>
        )}
      </TabPanel>
    </div>
  );
};

export default ReportsPage;
