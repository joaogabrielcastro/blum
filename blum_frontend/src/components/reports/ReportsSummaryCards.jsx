import formatCurrency from "../../utils/format";

const ReportsSummaryCards = ({
  orderCount,
  totalSales,
  totalCommissions,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 hover:shadow-lg transition-transform duration-300 transform hover:-translate-y-1">
      <h2 className="text-xl font-semibold text-gray-800 mb-2 flex justify-between items-center gap-4">
        <span>Total de Pedidos</span>
      </h2>
      <p className="text-4xl font-bold text-blue-600">{orderCount}</p>
    </div>
    <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 hover:shadow-lg transition-transform duration-300 transform hover:-translate-y-1">
      <h2 className="text-xl font-semibold text-gray-800 mb-2 flex justify-between items-center gap-4">
        <span>Valor Total de Vendas</span>
      </h2>
      <p className="text-4xl font-bold text-blue-600">
        {formatCurrency(totalSales)}
      </p>
    </div>
    <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 hover:shadow-lg transition-transform duration-300 transform hover:-translate-y-1">
      <h2 className="text-xl font-semibold text-gray-800 mb-2 flex justify-between items-center gap-4">
        <span>Total de Comissões</span>
      </h2>
      <p className="text-4xl font-bold text-green-600">
        {formatCurrency(totalCommissions)}
      </p>
      <p className="text-sm text-gray-500 mt-1">
        {totalSales > 0
          ? ((totalCommissions / totalSales) * 100).toFixed(2)
          : "0.00"}
        % das vendas
      </p>
    </div>
  </div>
);

export default ReportsSummaryCards;
