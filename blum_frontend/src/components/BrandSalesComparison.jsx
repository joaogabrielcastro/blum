import { useMemo } from "react";
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
  LabelList,
} from "recharts";
import formatCurrency from "../utils/format";
import { buildParticipationChartData } from "../utils/orderApiFields";

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

function ParticipationTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold text-gray-900">{row.name}</p>
      <p className="text-gray-700">{formatCurrency(row.vendas)}</p>
      <p className="text-blue-700 font-medium">{row.percent.toFixed(1)}% do total</p>
    </div>
  );
}

/**
 * Compara vendas por representada (marca) com o total do período e uma linha de média por marca.
 */
export default function BrandSalesComparison({
  brandBars,
  totalPeriodo,
  mediaPorRepresentada,
}) {
  const participationData = useMemo(
    () => buildParticipationChartData(brandBars, totalPeriodo),
    [brandBars, totalPeriodo],
  );

  const participationHeight = Math.max(220, participationData.length * 44 + 48);

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

      {totalPeriodo > 0 && participationData.length > 0 && (
        <div className="pt-6 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">
            Participação no total (representadas)
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Representadas com menos de 2% do total aparecem agrupadas em «Outros».
          </p>
          <div className="w-full" style={{ height: participationHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={participationData}
                layout="vertical"
                margin={{ top: 4, right: 56, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11 }}
                  stroke="#6b7280"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{ fontSize: 12 }}
                  stroke="#374151"
                />
                <Tooltip content={<ParticipationTooltip />} />
                <Bar dataKey="percent" name="Participação" radius={[0, 4, 4, 0]} barSize={22}>
                  {participationData.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={
                        entry.name === "Outros"
                          ? "#94a3b8"
                          : COLORS[i % COLORS.length]
                      }
                    />
                  ))}
                  <LabelList
                    dataKey="percent"
                    position="right"
                    formatter={(v) => `${Number(v).toFixed(1)}%`}
                    className="fill-gray-700 text-xs font-medium"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
