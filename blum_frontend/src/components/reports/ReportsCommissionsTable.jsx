import formatCurrency from "../../utils/format";

const ReportsCommissionsTable = ({
  userRole,
  periodLabel,
  showRepresentantesSummaryTable,
  commissionsByRep,
  ordersToDisplay,
  totalSales,
  totalCommissions,
  exportingExcel,
  exportingPdf,
  formatRepLabel,
  onExportSalesExcel,
  onExportAllCommissionsPdf,
  onExportRepCommissionPdf,
  canExcel = true,
  canCommissionPdf = true,
}) => (
  <section
    className="mb-8"
    aria-labelledby="reports-resumo-representantes-heading"
  >
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2
          id="reports-resumo-representantes-heading"
          className="text-2xl font-bold text-gray-800"
        >
          Resumo por representante (vendedor)
        </h2>
        <p className="text-gray-600 mt-2 max-w-3xl">
          Cada linha é um <strong>vendedor</strong> que lançou o pedido{" "}
          (<code className="text-sm bg-gray-100 px-1 rounded">user_ref</code>
          ). Os valores somam apenas pedidos <strong>Entregue</strong> em{" "}
          <strong>{periodLabel}</strong>. A comissão é a soma do campo{" "}
          <strong>total_commission</strong> de cada pedido.
        </p>
      </div>
      {showRepresentantesSummaryTable && userRole === "admin" ? (
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={onExportSalesExcel}
            disabled={exportingExcel || exportingPdf != null}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-60"
            title={canExcel ? undefined : "Disponível no plano Profissional"}
          >
            {exportingExcel
              ? "Gerando Excel…"
              : canExcel
                ? "Exportar Excel"
                : "Exportar Excel · Pro"}
          </button>
          <button
            type="button"
            onClick={onExportAllCommissionsPdf}
            disabled={exportingPdf != null || exportingExcel}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            title={
              canCommissionPdf ? undefined : "Disponível no plano Profissional"
            }
          >
            {exportingPdf === "all"
              ? "Gerando PDF…"
              : canCommissionPdf
                ? "Exportar PDF (todos)"
                : "Exportar PDF · Pro"}
          </button>
        </div>
      ) : showRepresentantesSummaryTable ? (
        <button
          type="button"
          onClick={onExportAllCommissionsPdf}
          disabled={exportingPdf != null}
          className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          title={
            canCommissionPdf ? undefined : "Disponível no plano Profissional"
          }
        >
          {exportingPdf === "all"
            ? "Gerando PDF…"
            : canCommissionPdf
              ? "Exportar PDF (todos)"
              : "Exportar PDF · Pro"}
        </button>
      ) : null}
    </div>

    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
      {showRepresentantesSummaryTable ? (
        <div className="overflow-x-auto max-w-full min-h-[150px]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Representante
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pedidos
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendas totais
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket médio
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comissão total
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % efetivo
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PDF
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {commissionsByRep.map((sale) => (
                <tr key={sale.userId}>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    <span className="font-medium">{formatRepLabel(sale)}</span>
                    {sale.userId !== "N/A" && (
                      <span className="block text-xs text-gray-400 mt-0.5">
                        ID {sale.userId}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800 text-right tabular-nums">
                    {sale.orderCount}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800 text-right font-medium tabular-nums">
                    {formatCurrency(sale.totalSales)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right tabular-nums">
                    {formatCurrency(sale.avgTicket)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-green-700 font-semibold text-right tabular-nums">
                    {formatCurrency(sale.totalCommission)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right tabular-nums">
                    {`${sale.commissionRate}%`}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <button
                      type="button"
                      onClick={() => onExportRepCommissionPdf(sale)}
                      disabled={exportingPdf != null}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                      title={`PDF de comissões — ${formatRepLabel(sale)}`}
                    >
                      {exportingPdf === sale.userId ? "…" : "PDF"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                  Todos os representantes
                </td>
                <td className="px-4 py-3 text-sm text-right font-semibold tabular-nums">
                  {ordersToDisplay.length}
                </td>
                <td className="px-4 py-3 text-sm text-right font-semibold tabular-nums">
                  {formatCurrency(totalSales)}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-500 tabular-nums">
                  {ordersToDisplay.length > 0
                    ? formatCurrency(totalSales / ordersToDisplay.length)
                    : formatCurrency(0)}
                </td>
                <td className="px-4 py-3 text-sm text-right font-semibold text-green-800 tabular-nums">
                  {formatCurrency(totalCommissions)}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-600 tabular-nums">
                  {totalSales > 0
                    ? `${((totalCommissions / totalSales) * 100).toFixed(2)}%`
                    : "0.00%"}
                </td>
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="text-center text-gray-500">
          {userRole === "admin"
            ? "Nenhuma venda encontrada."
            : "Apenas administradores podem ver este relatório."}
        </div>
      )}
    </div>
  </section>
);

export default ReportsCommissionsTable;
