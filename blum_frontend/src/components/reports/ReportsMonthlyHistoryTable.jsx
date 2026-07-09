import formatCurrency from "../../utils/format";
import { formatMonthYearLabel } from "../../utils/orderApiFields";

const ReportsMonthlyHistoryTable = ({ monthlySummaries }) => {
  if (!monthlySummaries.length) return null;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 mb-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Histórico mensal de vendas
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">
                Mês
              </th>
              <th className="px-4 py-2 text-right font-semibold text-gray-600">
                Pedidos
              </th>
              <th className="px-4 py-2 text-right font-semibold text-gray-600">
                Total vendido
              </th>
            </tr>
          </thead>
          <tbody>
            {monthlySummaries.map((row) => (
              <tr key={`${row.year}-${row.month}`} className="border-t">
                <td className="px-4 py-2 capitalize">
                  {formatMonthYearLabel(row.year, row.month)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {row.orderCount}
                </td>
                <td className="px-4 py-2 text-right tabular-nums font-medium">
                  {formatCurrency(row.totalSales)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportsMonthlyHistoryTable;
