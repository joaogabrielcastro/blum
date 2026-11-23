import { useState } from "react";
import formatCurrency from "../../utils/format";
import apiService from "../../services/apiService";
import Dialog from "../ui/Dialog";
import Button from "../ui/Button";
import ConfirmationModal from "../ConfirmationModal";
import { useToast } from "../../context/ToastContext";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");

function StatusPill({ status }) {
  const reversed = status === "estornada";
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${
        reversed ? "bg-zinc-100 text-zinc-600" : "bg-emerald-100 text-emerald-800"
      }`}
    >
      {reversed ? "Estornada" : "Importada"}
    </span>
  );
}

/** Notas já importadas, com detalhe e estorno. */
export default function InvoiceList({ invoices, loading, onChanged }) {
  const toast = useToast();
  const [detail, setDetail] = useState(null);
  const [toReverse, setToReverse] = useState(null);

  const openDetail = async (id) => {
    try {
      setDetail(await apiService.getPurchaseInvoice(id));
    } catch (err) {
      toast.error(err.message || "Não foi possível abrir a nota.");
    }
  };

  const reverse = async () => {
    try {
      const result = await apiService.reversePurchaseInvoice(toReverse.id);
      setToReverse(null);
      setDetail(null);
      toast.success(
        result.costKept?.length
          ? `Nota estornada. Custo mantido em ${result.costKept.length} item(ns) com compras posteriores.`
          : "Nota estornada: estoque e custo devolvidos.",
      );
      onChanged?.();
    } catch (err) {
      toast.error(err.message || "Não foi possível estornar.");
    }
  };

  return (
    <section className="rounded-2xl border border-edge bg-surface shadow-soft">
      <header className="border-b border-edge px-4 py-3 sm:px-5">
        <h2 className="font-semibold text-ink">Notas importadas</h2>
      </header>
      {loading ? (
        <p className="px-5 py-8 text-sm text-ink-muted">Carregando…</p>
      ) : invoices.length === 0 ? (
        <p className="px-5 py-8 text-sm text-ink-muted">
          Nenhuma nota importada ainda. Envie o XML de uma NF-e de compra acima.
        </p>
      ) : (
        <ul className="divide-y divide-edge">
          {invoices.map((inv) => (
            <li key={inv.id}>
              <button
                type="button"
                onClick={() => openDetail(inv.id)}
                className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-surface-muted/60 sm:px-5"
              >
                <span className="min-w-0">
                  <span className="block font-medium text-ink">
                    NF {inv.number} · {inv.emitterName || inv.brandName}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {inv.brandName} · emitida {fmtDate(inv.issuedAt)} · {inv.itemsCount} item(ns)
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <StatusPill status={inv.status} />
                  <span className="font-semibold tabular-nums text-ink">
                    {formatCurrency(inv.totalCost)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        size="xl"
        title={detail ? `NF ${detail.number} · ${detail.emitterName || ""}` : ""}
        description={
          detail
            ? `Importada em ${fmtDate(detail.importedAt)} por ${detail.importedByName || "—"} · ${detail.brandName}`
            : ""
        }
        footer={
          detail ? (
            <>
              {detail.status !== "estornada" ? (
                <Button variant="danger-outline" onClick={() => setToReverse(detail)}>
                  Estornar nota
                </Button>
              ) : null}
              <Button onClick={() => setDetail(null)}>Fechar</Button>
            </>
          ) : null
        }
      >
        {detail ? (
          <div className="max-h-[55vh] overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted">
                  <th className="py-2 pr-2">Item</th>
                  <th className="py-2 pr-2 text-right">Entrou</th>
                  <th className="py-2 pr-2 text-right">Custo un.</th>
                  <th className="py-2 text-right">Custo médio</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((i) => (
                  <tr key={i.itemNumber} className="border-t border-edge">
                    <td className="py-2 pr-2">
                      <span className="block font-medium text-ink">
                        {i.productName || i.description}
                      </span>
                      <span className="text-xs text-ink-muted">
                        {i.quantity} {i.unit} × {i.conversionFactor}
                        {i.createdProduct ? " · produto criado" : ""}
                        {i.newPrice != null && !i.createdProduct
                          ? ` · venda ${formatCurrency(i.previousPrice)} → ${formatCurrency(i.newPrice)}`
                          : ""}
                      </span>
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">+{i.stockQuantity}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{formatCurrency(i.unitCost)}</td>
                    <td className="py-2 text-right tabular-nums">
                      {i.previousCost != null ? `${formatCurrency(i.previousCost)} → ` : ""}
                      {formatCurrency(i.newAverageCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Dialog>

      <ConfirmationModal
        show={Boolean(toReverse)}
        title="Estornar esta nota?"
        message="O estoque que entrou com a nota será retirado. O custo volta ao anterior quando não houver compra mais nova do produto. Preços de venda alterados na importação não são revertidos."
        confirmText="Estornar"
        onConfirm={reverse}
        onCancel={() => setToReverse(null)}
      />
    </section>
  );
}
