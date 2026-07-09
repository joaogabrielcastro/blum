import formatCurrency from "../../utils/format";
import {
  orderClientId,
  orderRepresentadas,
  orderSellerUserKey,
  orderSellerName,
  orderSellerUsername,
  orderFinishedAt,
  orderTotalPrice,
  orderTotalCommission,
  formatOrderDateLabel,
} from "../../utils/orderApiFields";

const ReportsOrdersTable = ({
  ordersToDisplay,
  clients,
  usersById,
  sellerFilterKey,
}) => (
  <>
    <h2 className="text-2xl font-bold text-gray-800 mb-4">
      Detalhes dos Pedidos (entregues no período)
    </h2>

    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200 mb-8">
      {ordersToDisplay.length > 0 ? (
        <div className="overflow-x-auto max-w-full min-h-[150px]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pedido
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Representante
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Representadas
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor total
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comissão
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Finalizado em
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ordersToDisplay.map((order) => {
                const repKey = orderSellerUserKey(order);
                const team = usersById[repKey];
                const repName =
                  orderSellerName(order) ||
                  team?.name ||
                  (repKey !== "N/A" ? `Usuário #${repKey}` : "");
                const repUser =
                  orderSellerUsername(order) || team?.username || "";
                const repCell =
                  repName && repUser
                    ? `${repName} (@${repUser})`
                    : repName || repUser || repKey;
                const brandsLabel = orderRepresentadas(order);
                return (
                  <tr key={order.id}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{order.id}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700 max-w-[220px]">
                      {clients[orderClientId(order)] || "N/A"}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-800 whitespace-nowrap">
                      {repCell}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 max-w-[260px]">
                      {brandsLabel ? (
                        <span className="line-clamp-2" title={brandsLabel}>
                          {brandsLabel}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(orderTotalPrice(order))}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-green-700 font-semibold text-right">
                      {formatCurrency(orderTotalCommission(order))}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {orderFinishedAt(order)
                        ? formatOrderDateLabel(orderFinishedAt(order))
                        : "N/A"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center text-gray-500">
          {sellerFilterKey
            ? "Nenhum pedido deste representante no período selecionado."
            : "Nenhum pedido encontrado para o período selecionado."}
        </div>
      )}
    </div>
  </>
);

export default ReportsOrdersTable;
