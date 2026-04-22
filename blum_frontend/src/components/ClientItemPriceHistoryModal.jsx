import { useEffect, useMemo, useState } from "react";
import apiService from "../services/apiService";
import formatCurrency from "../utils/format";

const PAYMENT_LABELS = {
  carteira: "Carteira",
  boleto: "Boleto",
  pix: "PIX",
  cheque: "Cheque",
  dinheiro: "Dinheiro",
};

const ClientItemPriceHistoryModal = ({ clientId, item, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      if (!clientId || !item?.productId) {
        setRows([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError("");
        const data = await apiService.getClientItemPriceHistory(
          clientId,
          item.productId,
          8,
        );
        setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err?.message || "Erro ao carregar histórico.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [clientId, item?.productId]);

  const latest = useMemo(() => rows[0] || null, [rows]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="border-b border-gray-200 px-5 py-4">
          <h3 className="text-lg font-bold text-gray-900">
            Histórico do cliente para este item
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {item?.productName || "Produto"} {item?.productcode ? `- ${item.productcode}` : ""}
          </p>
        </div>
        <div className="max-h-[55vh] overflow-y-auto px-5 py-4">
          {!clientId ? (
            <p className="text-sm text-amber-700">
              Selecione um cliente para ver o histórico.
            </p>
          ) : loading ? (
            <p className="text-sm text-gray-600">Carregando histórico...</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-600">
              Nenhuma venda anterior encontrada desse produto para este cliente.
            </p>
          ) : (
            <>
              {latest && (
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
                  Último preço praticado:{" "}
                  <strong>{formatCurrency(latest.unit_price)}</strong> em{" "}
                  <strong>
                    {new Date(latest.created_at).toLocaleDateString("pt-BR")}
                  </strong>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">
                        Data
                      </th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-600">
                        Preço
                      </th>
                      <th className="px-3 py-2 text-center font-semibold text-gray-600">
                        Qtd
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">
                        Pagamento
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-3 py-2 text-gray-700">
                          {new Date(row.created_at).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">
                          {formatCurrency(row.unit_price)}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-700">
                          {row.quantity}
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {PAYMENT_LABELS[row.payment_method] ||
                            row.payment_method ||
                            "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end border-t border-gray-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientItemPriceHistoryModal;
