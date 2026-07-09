import BrandSalesComparison from "../BrandSalesComparison";

const ReportsBrandComparison = ({
  brandBars,
  totalSales,
  mediaPorRepresentada,
}) => (
  <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 mb-8">
    <h2 className="text-xl font-semibold text-gray-800 mb-2">
      Vendas por representada vs. total do período
    </h2>
    <p className="text-sm text-gray-600 mb-6">
      O total geral soma o valor cheio de cada pedido. As barras repartem pedidos
      com várias marcas entre as representadas (mesma regra do somatório do
      período). A linha tracejada é a média do valor geral por marca com venda.
    </p>
    <BrandSalesComparison
      brandBars={brandBars}
      totalPeriodo={totalSales}
      mediaPorRepresentada={mediaPorRepresentada}
    />
  </div>
);

export default ReportsBrandComparison;
