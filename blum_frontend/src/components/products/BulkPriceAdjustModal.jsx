import { useState } from "react";
import formatCurrency from "../../utils/format";
import apiService from "../../services/apiService";

export default function BulkPriceAdjustModal({
  brandName,
  brandId,
  selectedProductIds,
  onClose,
  onSuccess,
}) {
  const [scope, setScope] = useState(
    selectedProductIds.length > 0 ? "selected" : "brand",
  );
  const [percentage, setPercentage] = useState("");
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const buildPayload = (dryRun) => {
    const pct = parseFloat(String(percentage).replace(",", "."));
    const payload = {
      brand: brandName,
      brandId,
      percentage: pct,
      dryRun,
    };
    if (scope === "selected") {
      payload.productIds = selectedProductIds;
    }
    return payload;
  };

  const handlePreview = async () => {
    setError("");
    setBusy(true);
    try {
      const result = await apiService.bulkAdjustPrices(buildPayload(true));
      setPreview(result);
    } catch (err) {
      setError(err?.message || "Não foi possível gerar a pré-visualização.");
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  const handleApply = async () => {
    setError("");
    setBusy(true);
    try {
      const result = await apiService.bulkAdjustPrices(buildPayload(false));
      onSuccess?.(result);
      onClose();
    } catch (err) {
      setError(err?.message || "Não foi possível aplicar o reajuste.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Reajuste de preços</h2>
          <p className="text-sm text-gray-600 mt-1">
            Representada: <strong>{brandName}</strong>
          </p>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-gray-700">
              Escopo do reajuste
            </legend>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="scope"
                value="brand"
                checked={scope === "brand"}
                onChange={() => setScope("brand")}
              />
              Representada inteira
            </label>
            <label
              className={`flex items-center gap-2 text-sm ${
                selectedProductIds.length === 0
                  ? "text-gray-400"
                  : "text-gray-700"
              }`}
            >
              <input
                type="radio"
                name="scope"
                value="selected"
                checked={scope === "selected"}
                onChange={() => setScope("selected")}
                disabled={selectedProductIds.length === 0}
              />
              Apenas produtos selecionados ({selectedProductIds.length})
            </label>
          </fieldset>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Acréscimo percentual (%)
    </label>
            <input
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              value={percentage}
              onChange={(e) => {
                setPercentage(e.target.value);
                setPreview(null);
              }}
              placeholder="Ex.: 8"
              className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          ) : null}

          {preview?.items?.length > 0 ? (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Pré-visualização ({preview.updated} produto
                {preview.updated === 1 ? "" : "s"})
              </p>
              <div className="border border-gray-200 rounded-lg overflow-auto max-h-64">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Produto</th>
                      <th className="px-3 py-2 text-right">Atual</th>
                      <th className="px-3 py-2 text-right">Novo</th>
                      <th className="px-3 py-2 text-right">Dif.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.items.slice(0, 100).map((item) => (
                      <tr key={item.id} className="border-t border-gray-100">
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-800">
                            {item.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.productCode || "—"}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatCurrency(item.oldPrice)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-green-700">
                          {formatCurrency(item.newPrice)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-blue-700">
                          +{formatCurrency(item.difference)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.items.length > 100 ? (
                <p className="text-xs text-gray-500 mt-2">
                  Mostrando os primeiros 100 de {preview.items.length} produtos.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="p-5 border-t border-gray-200 flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handlePreview}
            disabled={busy || !percentage}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? "Aguarde..." : "Pré-visualizar"}
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={busy || !percentage || !preview?.items?.length}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            Aplicar reajuste
          </button>
        </div>
      </div>
    </div>
  );
}
