import React from "react";

const VerificationTable = ({
  items = [],
  onItemChange = () => {},
  userProducts = [],
  title = "Verificação",
  description = "",
  source = "PDF",
}) => {
  const handleChange = (index, field, value) => {
    onItemChange(index, field, value);
  };

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-800">
            {title} <span className="text-xs text-gray-500">({source})</span>
          </h3>
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum item encontrado.</p>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {items.map((it, idx) => (
              <section
                key={idx}
                className="rounded-xl border border-gray-200 bg-gray-50/70 p-3"
                aria-label={`Produto ${idx + 1}`}
              >
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Produto {idx + 1}
                </p>
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Código
                    <input
                      value={it.productCode || ""}
                      onChange={(e) => handleChange(idx, "productCode", e.target.value)}
                      className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Descrição
                    <input
                      value={it.description || ""}
                      onChange={(e) => handleChange(idx, "description", e.target.value)}
                      className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block min-w-0 text-sm font-medium text-gray-700">
                      Quantidade
                      <input
                        type="number"
                        step="any"
                        value={it.quantity ?? ""}
                        onChange={(e) => handleChange(idx, "quantity", e.target.value)}
                        className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base"
                      />
                    </label>
                    <label className="block min-w-0 text-sm font-medium text-gray-700">
                      Preço unitário
                      <input
                        type="number"
                        step="any"
                        value={it.unitPrice ?? ""}
                        onChange={(e) => handleChange(idx, "unitPrice", e.target.value)}
                        className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base"
                      />
                    </label>
                  </div>
                  <label className="block text-sm font-medium text-gray-700">
                    Vínculo no catálogo
                    <select
                      value={it.mappedProductId || ""}
                      onChange={(e) => handleChange(idx, "mappedProductId", e.target.value)}
                      className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base"
                    >
                      <option value="">-- Novo produto --</option>
                      {userProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.productcode})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-gray-700">
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Descrição</th>
                <th className="px-3 py-2">Quantidade</th>
                <th className="px-3 py-2">Preço Unit.</th>
                <th className="px-3 py-2">Produto</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-3 py-2 align-top">
                    <input
                      value={it.productCode || ""}
                      onChange={(e) =>
                        handleChange(idx, "productCode", e.target.value)
                      }
                      className="w-32 p-1 border rounded"
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input
                      value={it.description || ""}
                      onChange={(e) =>
                        handleChange(idx, "description", e.target.value)
                      }
                      className="w-64 p-1 border rounded"
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input
                      type="number"
                      step="any"
                      value={it.quantity ?? ""}
                      onChange={(e) =>
                        handleChange(idx, "quantity", e.target.value)
                      }
                      className="w-20 p-1 border rounded"
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input
                      type="number"
                      step="any"
                      value={it.unitPrice ?? ""}
                      onChange={(e) =>
                        handleChange(idx, "unitPrice", e.target.value)
                      }
                      className="w-28 p-1 border rounded"
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <select
                      value={it.mappedProductId || ""}
                      onChange={(e) =>
                        handleChange(idx, "mappedProductId", e.target.value)
                      }
                      className="w-48 p-1 border rounded"
                    >
                      <option value="">-- Novo produto --</option>
                      {userProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.productcode})
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  );
};

export default VerificationTable;
