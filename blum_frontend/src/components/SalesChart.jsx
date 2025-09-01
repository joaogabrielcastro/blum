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
  const chartData = data.length > 0 ? data : [{ date: new Date().toLocaleDateString('pt-BR'), 'Vendas Acumuladas': 0 }];

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={chartData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis tickFormatter={(value) => `R$ ${formatCurrency(value)}`} />
        <Tooltip formatter={(value) => `R$ ${formatCurrency(value)}`} />
        <Legend />
        <ReferenceLine y={monthlyTarget} label={{ value: `Meta: R$ ${formatCurrency(monthlyTarget)}`, position: 'top' }} stroke="red" strokeDasharray="3 3" />
        <Line type="monotone" dataKey="Vendas Acumuladas" stroke="#8884d8" activeDot={{ r: 8 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default SalesChart;
