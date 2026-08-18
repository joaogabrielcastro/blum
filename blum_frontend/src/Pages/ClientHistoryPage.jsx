import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import StatusBadge from "../components/ui/StatusBadge";
import apiService from "../services/apiService";
import formatCurrency, { formatOrderData } from "../utils/format";

const ClientHistoryPage = ({ clients }) => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (clientId) {
      fetchClientData();
    } else {
      setError("ID do cliente não fornecido");
      setLoading(false);
    }
  }, [clientId]);

  const fetchClientData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Buscando dados para clientId:", clientId);

      const clientData = await apiService.getClientById(clientId);

      let ordersData = [];
      try {
        ordersData = await apiService.getOrders({ clientid: clientId });
      } catch (e) {
        console.warn("Erro ao buscar pedidos:", e);
      }

      setClient(clientData);
      setOrders(
        (Array.isArray(ordersData) ? ordersData : []).map(formatOrderData),
      );
    } catch (err) {
      console.error("Erro ao carregar dados do cliente:", err);
      setError(err.message || "Erro ao carregar histórico de pedidos.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Data não informada";
    try {
      return new Date(dateString).toLocaleDateString("pt-BR");
    } catch {
      return "Data inválida";
    }
  };

  const getSellerName = (order) => {
    if (order?.sellerName || order?.seller_name) {
      return order.sellerName || order.seller_name;
    }
    const id = order?.userId ?? order?.user_ref ?? order?.userid;
    return id != null ? String(id) : "Não informado";
  };

  const handleOpenDetails = async (order) => {
    try {
      const detailed = await apiService.getOrderById(order.id);
      setSelectedOrder(formatOrderData(detailed) || order);
    } catch (err) {
      console.error("Erro ao carregar detalhes do pedido:", err);
      setSelectedOrder(order);
    }
  };

  const handleRefresh = () => {
    fetchClientData();
  };

  if (loading) {
    return <LoadingSpinner message="Carregando histórico..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <button
              type="button"
              onClick={() => navigate("/clients")}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Voltar para clientes
            </button>
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-gray-800">
                Histórico de Pedidos
              </h1>
              <button
                onClick={handleRefresh}
                className="text-gray-400 hover:text-gray-600"
                title="Atualizar dados"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
            {client && (
              <p className="text-gray-600 mt-2">
                Cliente:{" "}
                <span className="font-semibold">{client.companyName}</span>
                {client.contactPerson && ` - ${client.contactPerson}`}
              </p>
            )}
          </div>
        </div>

        {error && (
          <ErrorMessage message={error} onClose={() => setError(null)} />
        )}

        {/* Lista de Pedidos */}
        <div className="bg-surface rounded-2xl shadow-md border border-gray-200 overflow-hidden">
          {orders.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Nenhum pedido encontrado
              </h3>
              <p className="text-gray-600">
                Este cliente ainda não realizou nenhum pedido.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nº Pedido
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendedor
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Total
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => {
                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-mono text-sm text-gray-900">
                            #{order.id}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {getSellerName(order)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-semibold">
                          {formatCurrency(order.totalPrice)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenDetails(order)}
                            className="text-blue-600 hover:text-blue-900 font-medium flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                            Detalhes
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal de Detalhes do Pedido */}
        {selectedOrder && (
          <OrderDetailsModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            getSellerName={getSellerName}
          />
        )}
      </div>
    </div>
  );
};
// Componente do Modal de Detalhes
const OrderDetailsModal = ({
  order,
  onClose,
  formatCurrency,
  formatDate,
  getSellerName,
}) => {
  const items = Array.isArray(order.items) ? order.items : [];
  const total = order.totalPrice ?? order.totalprice ?? 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Detalhes do Pedido #{order.id}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">
              Informações do Pedido
            </h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Data:</span>{" "}
                {formatDate(order.createdAt ?? order.createdat)}
              </p>
              <p>
                <span className="font-medium">Vendedor:</span>{" "}
                {getSellerName(order)}
              </p>
              <p className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                <StatusBadge status={order.status} />
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-2">
              Informações Financeiras
            </h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Valor Total:</span>{" "}
                {formatCurrency(total)}
              </p>
              <p>
                <span className="font-medium">Desconto:</span>{" "}
                {order.discount > 0
                  ? `${order.discount}%`
                  : "—"}
              </p>
              <p>
                <span className="font-medium">Valor Líquido:</span>{" "}
                {formatCurrency(total)}
              </p>
            </div>
          </div>
        </div>

        <h3 className="font-semibold text-gray-700 mb-4">Itens do Pedido</h3>

        {items.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Produto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Quantidade
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Preço Unit.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item, index) => {
                  // Corrigido: usa item.price ou item.unitPrice
                  const unitPrice = item.price || item.unitPrice || 0;
                  const quantity = item.quantity || 1;
                  const subtotal = unitPrice * quantity;

                  return (
                    <tr key={index}>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">
                            {item.productName ||
                              item.name ||
                              "Produto não especificado"}
                          </div>
                          {(item.productcode || item.productCode) && (
                            <div className="text-sm text-gray-600">
                              Código: {item.productcode || item.productCode}
                            </div>
                          )}
                          {item.productId && (
                            <div className="text-sm text-gray-600">
                              ID: {item.productId}
                            </div>
                          )}
                          {item.brand && (
                            <div className="text-sm text-gray-600">
                              Marca: {item.brand}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">{quantity}</td>
                      <td className="px-4 py-3">{formatCurrency(unitPrice)}</td>
                      <td className="px-4 py-3 font-semibold">
                        {formatCurrency(subtotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td
                    colSpan="3"
                    className="px-4 py-3 text-right font-semibold"
                  >
                    Total:
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {formatCurrency(total)}
                  </td>
                </tr>
                {order.discount > 0 && (
                  <tr>
                    <td
                      colSpan="3"
                      className="px-4 py-3 text-right font-semibold"
                    >
                      Desconto:
                    </td>
                    <td className="px-4 py-3 font-semibold text-red-600">
                      -{order.discount}%
                    </td>
                  </tr>
                )}
                <tr>
                  <td
                    colSpan="3"
                    className="px-4 py-3 text-right font-semibold"
                  >
                    Valor Líquido:
                  </td>
                  <td className="px-4 py-3 font-semibold text-green-600">
                    {formatCurrency(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhum item encontrado neste pedido.</p>
          </div>
        )}

        {order.description && (
          <div className="mt-6">
            <h3 className="font-semibold text-gray-700 mb-2">Observações</h3>
            <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
              {order.description}
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientHistoryPage;
