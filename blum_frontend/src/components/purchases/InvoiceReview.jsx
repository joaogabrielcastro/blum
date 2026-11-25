import { useMemo, useState } from "react";
import formatCurrency from "../../utils/format";
import { formatAccessKey, parseFactor } from "../../utils/purchaseInvoice";
import Button from "../ui/Button";
import InvoiceItemCard, { decisionPrice } from "./InvoiceItemCard";

function initialDecisions(items) {
  const map = {};
  for (const item of items) {
    map[item.itemNumber] = {
      product: item.product,
      matchedBy: item.matchedBy,
      createProduct: false,
      factor: String(item.conversionFactor ?? 1),
      priceMode: "manter",
      manualPrice: "",
    };
  }
  return map;
}

/**
 * Conferência de uma NF-e antes de gravar.
 * preview: resposta de POST /purchases/invoices/preview.
 */
export default function InvoiceReview({
  preview,
  fileName,
  brands,
  busy,
  onBrandChange,
  onConfirm,
  onSkip,
}) {
  const [decisions, setDecisions] = useState(() => initialDecisions(preview.items));
  const brandId = preview.brand?.id ?? "";

  const pending = useMemo(
    () =>
      preview.items.filter((item) => {
        const d = decisions[item.itemNumber];
        return !d.product && !d.createProduct;
      }).length,
    [preview.items, decisions],
  );
  const otherBrandCount = preview.items.filter((item) => {
    const p = decisions[item.itemNumber].product;
    const pid = p?.brandId ?? p?.brand_id;
    return p && brandId !== "" && pid != null && String(pid) !== String(brandId);
  }).length;
  const invalidFactor = preview.items.some(
    (item) => parseFactor(decisions[item.itemNumber].factor) == null,
  );

  const blockReason = preview.duplicate
    ? "Esta nota já foi importada."
    : !brandId
      ? "Escolha a representada da nota."
      : pending > 0
        ? `${pending} item(ns) sem produto: vincule ou marque "criar produto novo".`
        : invalidFactor
          ? "Há fator de conversão inválido."
          : null;

  const handleConfirm = () => {
    onConfirm({
      brandId,
      items: preview.items.map((item) => {
        const d = decisions[item.itemNumber];
        return {
          itemNumber: item.itemNumber,
          productId: d.product?.id ?? null,
          createProduct: !d.product && d.createProduct,
          conversionFactor: parseFactor(d.factor) ?? 1,
          newPrice: decisionPrice(item, d),
        };
      }),
    });
  };

  return (
    <section aria-label="Conferência da nota" className="space-y-4">
      <div className="rounded-2xl border border-edge bg-surface p-4 shadow-soft sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-ink-muted">{fileName}</p>
            <h2 className="text-lg font-semibold text-ink">
              NF {preview.number}
              {preview.series ? `/${preview.series}` : ""} ·{" "}
              {preview.emitter?.name || "Fornecedor"}
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              {preview.issuedAt
                ? new Date(preview.issuedAt).toLocaleDateString("pt-BR")
                : "Sem data"}{" "}
              · chave <span className="font-mono">{formatAccessKey(preview.accessKey)}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-ink-muted">Custo total da nota</p>
            <p className="text-xl font-semibold tabular-nums text-ink">
              {formatCurrency(preview.totals.cost)}
            </p>
            <p className="text-xs text-ink-muted">
              Valor da nota {formatCurrency(preview.totals.invoice)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">Representada</span>
            <select
              value={brandId}
              onChange={(e) => onBrandChange(e.target.value)}
              className="w-full rounded-xl border border-edge bg-surface px-3 py-2"
            >
              <option value="">Selecione…</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-ink-muted">
              {preview.brand?.matchedBy === "cnpj"
                ? "Reconhecida pelo CNPJ do fornecedor."
                : "Na primeira nota, o CNPJ do fornecedor fica gravado nesta representada."}
            </span>
          </label>
        </div>

        {preview.duplicate || preview.warnings.length > 0 ? (
          <ul className="mt-4 space-y-1.5">
            {preview.duplicate ? (
              <li className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                Esta nota já foi importada em{" "}
                {new Date(preview.duplicate.importedAt).toLocaleDateString("pt-BR")}.
              </li>
            ) : null}
            {preview.warnings.map((w) => (
              <li key={w} className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {w}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="space-y-3">
        {preview.items.map((item) => (
          <InvoiceItemCard
            key={item.itemNumber}
            item={item}
            brandId={brandId}
            decision={decisions[item.itemNumber]}
            onChange={(next) =>
              setDecisions((prev) => ({ ...prev, [item.itemNumber]: next }))
            }
          />
        ))}
      </div>

      <div className="sticky bottom-20 z-10 flex flex-col gap-3 rounded-2xl border border-edge bg-surface-elevated p-4 shadow-pop sm:bottom-4 sm:flex-row sm:items-center sm:justify-between">
        <p className={`text-sm ${blockReason || otherBrandCount ? "text-amber-700" : "text-ink-muted"}`}>
          {blockReason ||
            (otherBrandCount
              ? `${otherBrandCount} item(ns) vinculado(s) a produto de outra representada — confira antes de confirmar.`
              : null) ||
            "Ao confirmar: soma o estoque, atualiza o custo médio e registra a nota. Preços só mudam nos itens marcados."}
        </p>
        <div className="flex gap-2">
          <Button onClick={onSkip} disabled={busy}>
            {preview.duplicate ? "Fechar" : "Descartar"}
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={Boolean(blockReason)}
            loading={busy}
          >
            Confirmar entrada
          </Button>
        </div>
      </div>
    </section>
  );
}
