import { useEffect, useMemo, useState } from "react";
import apiService from "../../services/apiService";
import formatCurrency from "../../utils/format";
import {
  PAYMENT_LABELS,
  formatRowDate,
  rowCreatedAt,
  rowOrderId,
  rowPaymentMethod,
  rowUnitPrice,
} from "../../utils/clientItemPriceHistoryDisplay";

export default function OrderFormItemHistoryPanel({
  clientId,
  productId,
  compact = false,
  onOpenFullHistory,
}) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      if (!clientId || !productId) {
        setRows([]);
        setError("");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError("");
        const data = await apiService.getClientItemPriceHistory(
          clientId,
          productId,
          compact ? 3 : 5,
        );
        setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err?.message || "Erro ao carregar histórico.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [clientId, productId, compact]);

  const latest = useMemo(() => rows[0] || null, [rows]);

  if (!clientId) {
    return (
      <p className="text-xs text-amber-700">
        Selecione um cliente para ver o histórico de preços deste item.
      </p>
    );
  }

  if (loading) {
    return <p className="text-xs text-gray-500">Carregando histórico...</p>;
  }

  if (error) {
    return <p className="text-xs text-red-600">{error}</p>;
  }

  if (rows.length === 0) {
    return (
      <p className="text-xs text-gray-500">
        Nenhuma venda anterior deste produto para este cliente.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {latest ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-950">
          Último preço:{" "}
          <strong>{formatCurrency(rowUnitPrice(latest))}</strong> em{" "}
          <strong>{formatRowDate(rowCreatedAt(latest))}</strong>
          {rowOrderId(latest) ? (
            <> (Pedido #{rowOrderId(latest)})</>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-2 py-1.5 text-left font-semibold">Data</th>
              <th className="px-2 py-1.5 text-left font-semibold">Pedido</th>
              <th className="px-2 py-1.5 text-right font-semibold">Preço</th>
              <th className="px-2 py-1.5 text-center font-semibold">Qtd</th>
              {!compact ? (
                <th className="px-2 py-1.5 text-left font-semibold">
                  Pagamento
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-2 py-1.5 text-gray-700 whitespace-nowrap">
                  {formatRowDate(rowCreatedAt(row))}
                </td>
                <td className="px-2 py-1.5 text-gray-700">
                  {rowOrderId(row) ? `#${rowOrderId(row)}` : "—"}
                </td>
                <td className="px-2 py-1.5 text-right font-medium text-gray-900 whitespace-nowrap">
                  {formatCurrency(rowUnitPrice(row))}
                </td>
                <td className="px-2 py-1.5 text-center text-gray-700">
                  {row.quantity}
                </td>
                {!compact ? (
                  <td className="px-2 py-1.5 text-gray-700">
                    {PAYMENT_LABELS[rowPaymentMethod(row)] ||
                      rowPaymentMethod(row) ||
                      "—"}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {onOpenFullHistory ? (
        <button
          type="button"
          onClick={onOpenFullHistory}
          className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline"
        >
          Ver histórico completo
        </button>
      ) : null}
    </div>
  );
}
