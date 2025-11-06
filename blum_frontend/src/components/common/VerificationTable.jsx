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
    <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-3">
        <div>
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
        <div className="overflow-x-auto">
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
                    {it.subcode !== undefined && (
                      <input
                        placeholder="Subcódigo"
                        value={it.subcode || ""}
                        onChange={(e) =>
                          handleChange(idx, "subcode", e.target.value)
                        }
                        className="mt-2 w-40 p-1 border rounded"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default VerificationTable;
