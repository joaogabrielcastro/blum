import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import formatCurrency from '../utils/format';

const SalesChart = ({ data, monthlyTarget }) => {
  const chartData =
    data && data.length > 0
      ? data
      : [
          { date: '01/09/2023', 'Vendas Acumuladas': 500 },
          { date: '08/09/2023', 'Vendas Acumuladas': 3400 },
        ];

  const valorFinal = chartData[chartData.length - 1]['Vendas Acumuladas'];
  const linhaCor = valorFinal >= monthlyTarget ? '#10B981' : '#3B82F6';

  // Lógica de largura mínima por data
  const larguraPorData = 100;
  const larguraExtra = 100;
  const larguraTotal = chartData.length * larguraPorData + larguraExtra;

  return (
    <div className="overflow-x-auto w-full">
      <div style={{ minWidth: `${larguraTotal}px` }}>
        <ResponsiveContainer width="100%" height={420}>
          <LineChart
            data={chartData}
            margin={{ top: 40, right: 50, left: 50, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 14, dy: 10 }}
              padding={{ left: 20, right: 20 }}
            />
            <YAxis
              tickFormatter={(value) => `R$ ${formatCurrency(value)}`}
              tick={{ fontSize: 14, dx: -10 }}
            />
            <Tooltip
              formatter={(value, name) => [`R$ ${formatCurrency(value)}`, name]}
              labelFormatter={(label) => `Data: ${label}`}
              contentStyle={{ fontSize: '14px', padding: '10px' }}
            />
            <Legend wrapperStyle={{ paddingTop: 20 }} />
            <ReferenceLine
              y={monthlyTarget}
              label={{
                value: `Meta: R$ ${formatCurrency(monthlyTarget)}`,
                position: 'top',
                fontSize: 14,
              }}
              stroke="red"
              strokeDasharray="3 3"
            />
            <Line
              type="monotone"
              dataKey="Vendas Acumuladas"
              stroke={linhaCor}
              strokeWidth={4}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SalesChart;