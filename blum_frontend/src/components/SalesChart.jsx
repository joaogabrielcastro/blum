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
  // Garante que haja dados variados para evitar linha reta
  const chartData =
    data && data.length > 0
      ? data
      : [
          { date: '01/09/2023', 'Vendas Acumuladas': 0 },
          { date: '02/09/2023', 'Vendas Acumuladas': 0 },
        ];

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis tickFormatter={(value) => `R$ ${formatCurrency(value)}`} />
        <Tooltip formatter={(value) => `R$ ${formatCurrency(value)}`} />
        <Legend />
        <ReferenceLine
          y={monthlyTarget}
          label={{
            value: `Meta: R$ ${formatCurrency(monthlyTarget)}`,
            position: 'top',
          }}
          stroke="red"
          strokeDasharray="3 3"
        />
        <Line
          type="monotone"
          dataKey="Vendas Acumuladas"
          stroke="#3B82F6" // Azul mais vibrante
          strokeWidth={3} // Espessura dobrada
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default SalesChart;