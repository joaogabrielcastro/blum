import { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import LoadingSpinner from './LoadingSpinner';

const PriceHistoryModal = ({ product, onClose }) => {
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPriceHistory = async () => {
      if (!product?.id) return;
      
      try {
        setLoading(true);
        const history = await apiService.getPriceHistory(product.id);
        setPriceHistory(history);
      } catch (err) {
        setError('Erro ao carregar histórico de preços');
        console.error('Erro:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPriceHistory();
  }, [product]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">Histórico de Preços</h2>
              <p className="text-blue-100">
                {product?.name} 
                {product?.productcode && ` (Código: ${product.productcode})`}
                {product?.subcode && ` [Subcódigo: ${product.subcode}]`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-blue-100 hover:text-white transition-colors p-2 rounded-full hover:bg-blue-500"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500 text-lg mb-2">❌</div>
              <p className="text-gray-600">{error}</p>
            </div>
          ) : priceHistory.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-lg mb-2">📊</div>
              <p className="text-gray-600">Nenhum histórico de preços encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Estatísticas Rápidas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-600 font-medium">Última Compra</p>
                  <p className="text-lg font-bold text-blue-800">
                    {formatCurrency(priceHistory[priceHistory.length - 1]?.purchase_price)}
                  </p>
                  <p className="text-xs text-blue-600">
                    {formatDate(priceHistory[priceHistory.length - 1]?.purchase_date)}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-green-600 font-medium">Primeira Compra</p>
                  <p className="text-lg font-bold text-green-800">
                    {formatCurrency(priceHistory[0]?.purchase_price)}
                  </p>
                  <p className="text-xs text-green-600">
                    {formatDate(priceHistory[0]?.purchase_date)}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-sm text-purple-600 font-medium">Total de Compras</p>
                  <p className="text-lg font-bold text-purple-800">
                    {priceHistory.length}
                  </p>
                  <p className="text-xs text-purple-600">registros históricos</p>
                </div>
              </div>

              {/* Tabela de Histórico */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data da Compra
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Preço de Compra
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantidade
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Variação
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {priceHistory.map((record, index) => {
                      const previousPrice = priceHistory[index + 1]?.purchase_price;
                      const variation = previousPrice 
                        ? ((record.purchase_price - previousPrice) / previousPrice) * 100
                        : 0;

                      return (
                        <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(record.purchase_date)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                            {formatCurrency(record.purchase_price)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-500">
                            {record.quantity} un
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                            {index < priceHistory.length - 1 ? (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                variation > 0 
                                  ? 'bg-red-100 text-red-800' 
                                  : variation < 0 
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                              }`}>
                                {variation > 0 ? '↗' : variation < 0 ? '↘' : '→'}
                                {Math.abs(variation).toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceHistoryModal;