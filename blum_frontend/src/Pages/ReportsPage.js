import { useState, useEffect } from 'react';
import apiService from '../apiService';

const ReportsPage = ({ userRole, userId }) => {
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchSalesData();
    }
  }, [userRole]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      const salesData = await apiService.getSalesByRep();
      setSalesData(salesData);
    } catch (error) {
      console.error("Erro ao buscar dados de vendas:", error);
      alert("Falha ao carregar relatório de vendas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Relatórios</h1>
      
      {userRole === 'admin' ? (
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Vendas por Representante</h2>
          
          {loading ? (
            <div className="text-center">Carregando dados de vendas...</div>
          ) : salesData.length === 0 ? (
            <div className="text-center text-gray-500">Nenhum dado de venda encontrado.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Representante</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total de Vendas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {salesData.map((sale, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">{sale.userId}</td>
                    <td className="px-6 py-4 whitespace-nowrap">R$ {sale.totalSales.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Acesso Restrito</h2>
          <p className="text-gray-600">Apenas administradores podem acessar os relatórios.</p>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;