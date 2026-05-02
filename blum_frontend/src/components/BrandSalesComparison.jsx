import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import formatCurrency from "../utils/format";

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#ca8a04",
  "#9333ea",
  "#dc2626",
  "#0891b2",
  "#ea580c",
  "#4f46e5",
  "#be185d",
  "#0d9488",
];

/**
 * Compara vendas por representada (marca) com o total do período e uma linha de média por marca.
 */
export default function BrandSalesComparison({
  brandBars,
  totalPeriodo,
  mediaPorRepresentada,
}) {
  if (!brandBars?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-gray-500 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
        <p className="font-medium">Nenhuma venda por representada neste período.</p>
        <p className="text-sm mt-1">
          Finalize pedidos com status Entregue para ver os valores aqui.
        </p>
      </div>
    );
  }

  const tooltipFmt = (value) => [formatCurrency(value), "Vendas"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-gray-700">
        <span>
          <span className="font-semibold text-gray-900">Total no período:</span>{" "}
          {formatCurrency(totalPeriodo)}
        </span>
        <span>
          <span className="font-semibold text-gray-900">
            Média por representada:
          </span>{" "}
          {formatCurrency(mediaPorRepresentada)}
          <span className="text-gray-400 ml-1 font-normal">
            (total ÷ nº de marcas com venda)
          </span>
        </span>
      </div>

      <div className="w-full min-h-[360px] h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={brandBars}
            margin={{ top: 12, right: 16, left: 8, bottom: 56 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              angle={-30}
              textAnchor="end"
              height={72}
              interval={0}
              tick={{ fontSize: 11 }}
              stroke="#6b7280"
            />
            <YAxis
              tickFormatter={(v) => formatCurrency(v)}
              tick={{ fontSize: 11 }}
              stroke="#6b7280"
            />
            <Tooltip formatter={tooltipFmt} />
            <ReferenceLine
              y={mediaPorRepresentada}
              stroke="#64748b"
              strokeDasharray="6 4"
              label={{
                value: "Média",
                position: "insideTopRight",
                fill: "#64748b",
                fontSize: 11,
              }}
            />
            <Bar dataKey="vendas" name="Vendas" radius={[4, 4, 0, 0]}>
              {brandBars.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        Quando um pedido inclui várias representadas, o valor é dividido igualmente
        entre elas neste gráfico (o total do período continua igual ao somatório real).
      </p>

      {totalPeriodo > 0 && brandBars.length <= 10 && (
        <div className="pt-6 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            Participação no total (representadas)
          </h3>
          <div className="w-full min-h-[280px] h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={brandBars.map((b) => ({
                    name: b.name,
                    value: b.vendas,
                  }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(1)}%`
                  }
                >
                  {brandBars.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
