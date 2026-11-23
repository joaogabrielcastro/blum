import { useEffect, useState } from "react";
import apiService from "../../services/apiService";
import formatCurrency from "../../utils/format";
import { marginTone } from "../../utils/productCost";
import { Stat } from "../ui/Surface";
import Button from "../ui/Button";
import ConfirmationModal from "../ConfirmationModal";
import { useToast } from "../../context/ToastContext";

const pct = (n) =>
  n == null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

const TONE_CLASS = {
  danger: "text-red-600",
  warning: "text-amber-700",
  success: "text-emerald-700",
  muted: "text-ink-muted",
};

function monthRange(year, month) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

function ProfitTable({ title, rows, emptyText, labelHeader }) {
  return (
    <section className="rounded-2xl border border-edge bg-surface shadow-soft">
      <h3 className="border-b border-edge px-4 py-3 font-semibold text-ink sm:px-5">{title}</h3>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-muted">{emptyText}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-muted">
                <th className="px-4 py-2 sm:px-5">{labelHeader}</th>
                <th className="px-3 py-2 text-right">Receita</th>
                <th className="px-3 py-2 text-right">Custo</th>
                <th className="px-3 py-2 text-right">Lucro</th>
                <th className="px-4 py-2 text-right sm:px-5">Margem</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t border-edge">
                  <td className="px-4 py-2 sm:px-5">
                    <span className="font-medium text-ink">{r.label}</span>
                    {r.revenueWithoutCost > 0 ? (
                      <span className="block text-xs text-ink-muted">
                        {formatCurrency(r.revenueWithoutCost)} sem custo
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(r.revenue)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(r.cost)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">
                    {formatCurrency(r.profit)}
                  </td>
                  <td
                    className={`px-4 py-2 text-right tabular-nums sm:px-5 ${TONE_CLASS[marginTone(r.marginPercent)]}`}
                  >
                    {pct(r.marginPercent)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** Lucro bruto do mês (admin). */
export default function ReportsProfit({
  selectedYear,
  selectedMonth,
  periodLabel,
  sellerFilterKey = "",
  brandFilterKey = "",
  filterLabel = "",
}) {
  const toast = useToast();
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [confirmEstimate, setConfirmEstimate] = useState(false);

  useEffect(() => {
    let active = true;
    setReport(null);
    setError(null);
    apiService
      .getProfitReport({
        ...monthRange(selectedYear, selectedMonth),
        sellerId: sellerFilterKey || undefined,
        brand: brandFilterKey || undefined,
      })
      .then((r) => active && setReport(r))
      .catch((e) => active && setError(e.message || "Não foi possível carregar o lucro."));
    return () => {
      active = false;
    };
  }, [selectedYear, selectedMonth, sellerFilterKey, brandFilterKey, reloadKey]);

  const runEstimate = async () => {
    try {
      const { updated } = await apiService.estimateMissingCosts();
      setConfirmEstimate(false);
      toast.success(`Custo estimado preenchido em ${updated} item(ns) de pedidos antigos.`);
      setReloadKey((k) => k + 1);
    } catch (e) {
      toast.error(e.message || "Não foi possível estimar os custos.");
    }
  };

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!report) return <p className="text-sm text-ink-muted">Calculando lucro…</p>;

  const t = report.total;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Receita (pedidos)"
          value={formatCurrency(t.revenue)}
          hint={`${t.ordersCount} pedido(s) · ${periodLabel}${filterLabel ? ` · ${filterLabel}` : ""}`}
        />
        <Stat label="Custo dos produtos" value={formatCurrency(t.cost)} />
        <Stat
          label="Lucro bruto"
          value={formatCurrency(t.profit)}
          tone={t.profit > 0 ? "success" : "default"}
        />
        <Stat
          label="Margem"
          value={pct(t.marginPercent)}
          tone={marginTone(t.marginPercent) === "success" ? "success" : marginTone(t.marginPercent) === "warning" ? "warning" : "default"}
          hint="sobre a receita com custo"
        />
      </div>

      {t.revenueWithoutCost > 0 ? (
        <div className="flex flex-col gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {formatCurrency(t.revenueWithoutCost)} da receita ({pct(100 - (t.costCoveragePercent ?? 0))})
            veio de itens sem custo registrado e fica fora do lucro e da margem.
            {t.estimableItems > 0
              ? ` ${t.estimableItems} desses itens são de produtos que já têm custo cadastrado.`
              : " Cadastre o custo dos produtos (ou lance as notas de compra) para poder estimar."}
          </p>
          {t.estimableItems > 0 ? (
            <Button className="shrink-0" onClick={() => setConfirmEstimate(true)}>
              Estimar com o custo atual
            </Button>
          ) : null}
        </div>
      ) : null}

      {t.revenueEstimatedCost > 0 ? (
        <p className="text-xs text-ink-muted">
          Inclui {formatCurrency(t.revenueEstimatedCost)} de receita com custo estimado (custo do
          produto no dia da estimativa, não o da época da venda).
        </p>
      ) : null}

      <ConfirmationModal
        show={confirmEstimate}
        tone="primary"
        title="Estimar custo dos pedidos antigos?"
        message="Itens de pedidos confirmados sem custo receberão o custo ATUAL do produto, marcados como estimados. Vale para todos os períodos e não altera pedidos novos. Use quando o custo dos produtos não mudou muito desde essas vendas."
        confirmText="Estimar custos"
        onConfirm={runEstimate}
        onCancel={() => setConfirmEstimate(false)}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <ProfitTable title="Por representada" labelHeader="Representada" rows={report.byBrand} emptyText="Sem pedidos no período." />
        <ProfitTable title="Por vendedor" labelHeader="Vendedor" rows={report.bySeller} emptyText="Sem pedidos no período." />
        <ProfitTable title="Produtos que mais vendem" labelHeader="Produto" rows={report.topProducts} emptyText="Sem pedidos no período." />
        <ProfitTable
          title="Produtos com menor margem"
          labelHeader="Produto"
          rows={report.lowestMarginProducts}
          emptyText="Nenhum produto vendido com custo registrado."
        />
        <ProfitTable title="Clientes que mais compram" labelHeader="Cliente" rows={report.byClient} emptyText="Sem pedidos no período." />
      </div>
    </div>
  );
}
