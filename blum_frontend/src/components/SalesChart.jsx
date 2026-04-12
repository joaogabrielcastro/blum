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
} from "recharts";
import formatCurrency from "../utils/format";

const SalesChart = ({
  data,
  monthlyTarget,
  filterPeriod,
  totalSales,
  simplified = false,
}) => {
  // CORREÇÃO: Calcular o domínio do eixo Y corretamente
  const calculateYDomain = () => {
    if (data.length === 0) return [0, 1000];

    const maxValue = Math.max(...data.map((item) => item["Vendas Acumuladas"]));
    // Adicionar 10% de margem no topo para melhor visualização
    const paddedMax = maxValue * 1.1;

    return [0, paddedMax];
  };

  // Tooltip simplificado
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{`Data: ${label}`}</p>
          <p className="text-blue-600 font-semibold">
            {`Vendas Acumuladas: ${formatCurrency(payload[0].value)}`}
          </p>
          <p className="text-green-600">
            {`Vendas do Dia: ${formatCurrency(dataPoint["Vendas do Dia"])}`}
          </p>
        </div>
      );
    }
    return null;
  };

  // CORREÇÃO: Formatar eixo Y com valores COMPLETOS
  const formatYAxis = (value) => {
    // Usar a mesma formatação do formatCurrency para consistência
    return formatCurrency(value);
  };

  // CORREÇÃO: Formatação mais detalhada para valores específicos
  const getYTicks = () => {
    if (data.length === 0) return [0, 500, 1000];
    
    const maxValue = Math.max(...data.map((item) => item["Vendas Acumuladas"]));
    
    // Gerar ticks baseados no valor máximo
    if (maxValue <= 1000) {
      return [0, 250, 500, 750, 1000];
    } else if (maxValue <= 5000) {
      return [0, 1000, 2000, 3000, 4000, 5000];
    } else if (maxValue <= 10000) {
      return [0, 2000, 4000, 6000, 8000, 10000];
    } else if (maxValue <= 50000) {
      return [0, 10000, 20000, 30000, 40000, 50000];
    } else {
      // Para valores maiores, gerar ticks dinamicamente
      const step = Math.ceil(maxValue / 5 / 1000) * 1000;
      const ticks = [];
      for (let i = 0; i <= 5; i++) {
        ticks.push(i * step);
      }
      return ticks;
    }
  };

  // CORREÇÃO: Intervalo inteligente para eixo X
  const getXAxisInterval = () => {
    if (data.length <= 7) return 0; // Mostrar todas as labels
    if (data.length <= 15) return 1; // Mostrar cada segunda label
    return "preserveStartEnd"; // Recharts decide automaticamente
  };

  // VERSÃO SIMPLIFICADA para Dashboard
  if (simplified) {
    return (
      <div className="w-full h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 20, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
              stroke="#6b7280"
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fontSize: 10 }}
              domain={calculateYDomain()}
              stroke="#6b7280"
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="Vendas Acumuladas"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 2, fill: "#3b82f6" }}
              activeDot={{ r: 4 }}
              connectNulls={true}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Mensagem se não houver dados */}
        {data.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80">
            <div className="text-center text-gray-500">
              <svg
                className="w-12 h-12 mx-auto text-gray-400 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <p className="text-sm">Nenhum dado de vendas disponível</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // VERSÃO COMPLETA para ReportsPage
  return (
    <div className="w-full h-[600px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: data.length > 10 ? 50 : 30,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            interval={getXAxisInterval()}
            angle={data.length > 7 ? -45 : 0}
            textAnchor={data.length > 7 ? "end" : "middle"}
            height={data.length > 7 ? 70 : 50}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fontSize: 12 }}
            domain={calculateYDomain()}
            width={80} // CORREÇÃO: Mais espaço para labels completas
            tickCount={6} // CORREÇÃO: Número fixo de ticks
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="Vendas Acumuladas"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ r: 4, fill: "#3b82f6" }}
            activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2 }}
            connectNulls={true}
          />
          {/* Linha da meta apenas se houver meta definida e for período mensal */}
          {monthlyTarget && filterPeriod === "monthly" && (
            <ReferenceLine
              y={monthlyTarget}
              stroke="#ef4444"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: `Meta: ${formatCurrency(monthlyTarget)}`,
                position: "insideTopRight",
                fill: "#ef4444",
                fontSize: 12,
                fontWeight: "bold"
              }}
            />
          )}
          {/* Linha do total atual */}
          {data.length > 0 && (
            <ReferenceLine
              y={totalSales}
              stroke="#10b981"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: `Total: ${formatCurrency(totalSales)}`,
                position: "insideTopLeft",
                fill: "#10b981",
                fontSize: 12,
                fontWeight: "bold"
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Mensagem se não houver dados */}
      {data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90">
          <div className="text-center text-gray-500">
            <svg
              className="w-16 h-16 mx-auto text-gray-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="text-lg font-semibold mb-2">Nenhum dado disponível</p>
            <p className="text-sm">Não há vendas finalizadas para o período selecionado</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesChart;