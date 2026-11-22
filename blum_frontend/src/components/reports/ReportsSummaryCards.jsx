import formatCurrency from "../../utils/format";
import { Stat } from "../ui/Surface";

/** Totais do período. Só pedidos confirmados entram nos relatórios. */
const ReportsSummaryCards = ({ orderCount, totalSales, totalCommissions }) => (
  <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
    <Stat
      label="Pedidos no período"
      value={orderCount}
      hint="Pedidos confirmados"
    />
    <Stat label="Valor total de vendas" value={formatCurrency(totalSales)} />
    <Stat
      label="Comissões"
      value={formatCurrency(totalCommissions)}
      tone="success"
      hint={`${
        totalSales > 0
          ? ((totalCommissions / totalSales) * 100).toFixed(2)
          : "0.00"
      }% das vendas`}
    />
  </div>
);

export default ReportsSummaryCards;
