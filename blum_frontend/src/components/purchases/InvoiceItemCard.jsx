import { useState } from "react";
import formatCurrency from "../../utils/format";
import { computeInvoiceLine } from "../../utils/purchaseInvoice";
import ProductPicker from "./ProductPicker";

const pct = (n) =>
  n == null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

const MATCH_LABEL = {
  vinculo: "Vínculo salvo",
  ean: "Código de barras",
  codigo: "Mesmo código",
  manual: "Escolhido",
};

function marginClass(m) {
  if (m == null) return "text-ink-muted";
  if (m <= 0) return "text-red-600";
  if (m < 15) return "text-amber-700";
  return "text-emerald-700";
}

/**
 * Um item da nota na conferência.
 * decision: { product, createProduct, factor, priceMode: "manter"|"sugerido"|"manual", manualPrice, matchedBy }
 */
export default function InvoiceItemCard({ item, decision, brandId, onChange }) {
  const [picking, setPicking] = useState(false);
  const { product, createProduct } = decision;
  const line = computeInvoiceLine(item, product, decision.factor);

  const costParts = [
    ["Produtos", item.grossValue],
    ["Desconto", -item.discount],
    ["Frete", item.freight],
    ["Seguro", item.insurance],
    ["Outras despesas", item.otherExpenses],
    ["IPI", item.ipi],
    ["ICMS-ST", item.icmsSt],
    ["FCP-ST", item.fcpSt],
  ].filter(([, v]) => Number(v) !== 0);

  const set = (patch) => onChange({ ...decision, ...patch });

  return (
    <article className="rounded-2xl border border-edge bg-surface p-4 shadow-soft">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-ink-muted">
            Item {item.itemNumber} · cód. fornecedor{" "}
            <span className="font-mono">{item.supplierCode || "—"}</span>
            {item.ean ? <> · EAN <span className="font-mono">{item.ean}</span></> : null}
          </p>
          <h3 className="mt-0.5 font-semibold text-ink">{item.description}</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-muted">
            {item.quantity.toLocaleString("pt-BR")} {item.unit || "un"} · custo final
          </p>
          <p
            className="font-semibold tabular-nums text-ink"
            title={costParts.map(([l, v]) => `${l}: ${formatCurrency(v)}`).join("\n")}
          >
            {formatCurrency(item.totalCost)}
          </p>
        </div>
      </header>

      {costParts.length > 1 ? (
        <p className="mt-1 text-xs text-ink-muted">
          {costParts.map(([l, v]) => `${l} ${formatCurrency(v)}`).join(" · ")}
        </p>
      ) : null}

      {/* Vínculo com o catálogo */}
      <div className="mt-3 rounded-xl bg-surface-muted p-3">
        {picking ? (
          <ProductPicker
            brandId={brandId}
            initialQuery={item.description.split(" ").slice(0, 2).join(" ")}
            onCancel={() => setPicking(false)}
            onPick={(p) => {
              setPicking(false);
              set({ product: p, createProduct: false, matchedBy: "manual" });
            }}
          />
        ) : product ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 text-sm">
              <span className="mr-2 rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800">
                {MATCH_LABEL[decision.matchedBy] || "Vinculado"}
              </span>
              <span className="font-medium text-ink">{product.name}</span>{" "}
              <span className="font-mono text-xs text-ink-muted">
                {product.productCode || product.productcode}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="text-sm font-medium text-brand hover:underline"
            >
              Trocar produto
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className={createProduct ? "text-ink" : "font-medium text-amber-700"}>
              {createProduct
                ? "Será criado como produto novo no catálogo."
                : "Produto não encontrado no catálogo."}
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPicking(true)}
                className="font-medium text-brand hover:underline"
              >
                Vincular a um produto
              </button>
              {!createProduct ? (
                <button
                  type="button"
                  onClick={() => set({ createProduct: true })}
                  className="font-medium text-brand hover:underline"
                >
                  Criar produto novo
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Quantidade e custo */}
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <label className="block">
          <span className="block text-xs text-ink-muted">
            Fator (1 {item.unit || "un"} = ? un.)
          </span>
          <input
            type="number"
            min="0.0001"
            step="any"
            value={decision.factor}
            onChange={(e) => set({ factor: e.target.value })}
            className="mt-1 w-full rounded-lg border border-edge bg-surface px-2 py-1.5 tabular-nums"
          />
        </label>
        <div>
          <span className="block text-xs text-ink-muted">Entra no estoque</span>
          <p className="mt-1.5 font-semibold tabular-nums text-ink">
            +{line.stockQuantity} un.
            {line.stockRounded ? (
              <span className="ml-1 text-xs font-normal text-amber-700">(arredondado)</span>
            ) : null}
          </p>
        </div>
        <div>
          <span className="block text-xs text-ink-muted">Custo por unidade</span>
          <p className="mt-1.5 font-semibold tabular-nums text-ink">
            {formatCurrency(line.unitCost)}
            {line.costChangePercent != null ? (
              <span
                className={`ml-1 text-xs ${
                  line.costChangePercent > 0 ? "text-red-600" : "text-emerald-700"
                }`}
              >
                {line.costChangePercent > 0 ? "▲" : "▼"} {pct(Math.abs(line.costChangePercent))}
              </span>
            ) : null}
          </p>
        </div>
        <div>
          <span className="block text-xs text-ink-muted">Custo médio</span>
          <p className="mt-1.5 tabular-nums text-ink">
            {line.currentCost != null ? `${formatCurrency(line.currentCost)} → ` : ""}
            <strong>{formatCurrency(line.newAverageCost)}</strong>
          </p>
        </div>
      </div>

      {/* Preço de venda */}
      <div className="mt-3 border-t border-edge pt-3 text-sm">
        {product ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-ink-muted">
              Venda {formatCurrency(line.price)} · margem{" "}
              <span className={marginClass(line.currentMargin)}>{pct(line.currentMargin)}</span>
              {" → "}
              <span className={`font-semibold ${marginClass(line.marginAfter)}`}>
                {pct(line.marginAfter)}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={decision.priceMode}
                onChange={(e) => set({ priceMode: e.target.value })}
                aria-label="Preço de venda deste item"
                className="rounded-lg border border-edge bg-surface px-2 py-1.5"
              >
                <option value="manter">Manter preço de venda</option>
                {line.suggestedPrice ? (
                  <option value="sugerido">
                    Aplicar sugerido {formatCurrency(line.suggestedPrice)}
                  </option>
                ) : null}
                <option value="manual">Definir novo preço</option>
              </select>
              {decision.priceMode === "manual" ? (
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={decision.manualPrice}
                  onChange={(e) => set({ manualPrice: e.target.value })}
                  placeholder="0,00"
                  aria-label="Novo preço de venda"
                  className="w-28 rounded-lg border border-edge bg-surface px-2 py-1.5 tabular-nums"
                />
              ) : null}
            </div>
          </div>
        ) : createProduct ? (
          <label className="flex flex-wrap items-center gap-2">
            <span className="text-ink-muted">Preço de venda do produto novo:</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={decision.manualPrice}
              onChange={(e) => set({ manualPrice: e.target.value })}
              placeholder={line.unitCost.toFixed(2)}
              className="w-28 rounded-lg border border-edge bg-surface px-2 py-1.5 tabular-nums"
            />
            <span className="text-xs text-ink-muted">Em branco = igual ao custo (margem 0%).</span>
          </label>
        ) : (
          <p className="text-ink-muted">Vincule ou crie o produto para ver margem e preço.</p>
        )}
      </div>
    </article>
  );
}

/** Preço de venda final escolhido para o item (ou null = manter). */
export function decisionPrice(item, decision) {
  if (!decision.product) {
    const n = Number(String(decision.manualPrice || "").replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  if (decision.priceMode === "sugerido") {
    return computeInvoiceLine(item, decision.product, decision.factor).suggestedPrice;
  }
  if (decision.priceMode === "manual") {
    const n = Number(String(decision.manualPrice || "").replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}
