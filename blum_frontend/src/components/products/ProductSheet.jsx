import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import apiService from "../../services/apiService";
import formatCurrency from "../../utils/format";
import { marginTone } from "../../utils/productCost";
import Drawer from "../ui/Drawer";
import Tabs from "../ui/Tabs";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");
const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
const pct = (n) =>
  n == null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const qty = (n) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 3 });

const MOVEMENT_LABEL = {
  entrada_compra: "Entrada por nota",
  estorno_compra: "Estorno de nota",
  saida_pedido: "Saída por pedido",
  estorno_pedido: "Estorno de pedido",
  ajuste: "Ajuste manual",
  cadastro: "Estoque inicial",
  importacao: "Importação",
};

const PRICE_LABEL = {
  venda: "Alteração de preço",
  reajuste: "Reajuste em massa",
};

const TONE_CLASS = {
  danger: "text-red-600",
  warning: "text-amber-700",
  success: "text-emerald-700",
  muted: "text-ink-muted",
};

function Kpi({ label, value, hint, className = "" }) {
  return (
    <div className="rounded-xl border border-edge bg-surface p-3">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums text-ink ${className}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}

function Empty({ children }) {
  return <p className="py-6 text-center text-sm text-ink-muted">{children}</p>;
}

function CostTab({ history }) {
  const chartData = useMemo(
    () =>
      [...history]
        .reverse()
        .filter((r) => r.averageCost != null)
        .map((r, i) => ({
          idx: i,
          label: fmtDate(r.at),
          medio: r.averageCost,
          compra: r.unitCost,
        })),
    [history],
  );
  if (history.length === 0) {
    return <Empty>Nenhum custo registrado. O custo entra pelas notas em Compras ou pelo cadastro.</Empty>;
  }
  return (
    <div className="space-y-4">
      {chartData.length > 1 ? (
        <div className="h-48 w-full" aria-label="Evolução do custo">
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" />
              <XAxis
                dataKey="idx"
                tick={{ fontSize: 11 }}
                stroke="rgb(var(--color-text-muted))"
                tickFormatter={(i) => chartData[i]?.label ?? ""}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                width={56}
                stroke="rgb(var(--color-text-muted))"
                tickFormatter={(v) => `R$ ${Number(v).toFixed(2)}`}
              />
              <Tooltip
                labelFormatter={(i) => chartData[i]?.label ?? ""}
                formatter={(v, name) => [formatCurrency(v), name === "medio" ? "Custo médio" : "Custo da compra"]}
                contentStyle={{
                  background: "rgb(var(--color-elevated))",
                  border: "1px solid rgb(var(--color-border))",
                  borderRadius: 8,
                }}
              />
              <Line type="monotone" dataKey="medio" stroke="rgb(var(--brand))" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="compra" stroke="#d97706" strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 2 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}
      <ul className="divide-y divide-edge">
        {history.map((r) => (
          <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-ink">
                {r.type === "custo"
                  ? r.invoiceNumber
                    ? `NF ${r.invoiceNumber}${r.supplier ? ` · ${r.supplier}` : ""}`
                    : "Entrada de compra"
                  : r.changedBy?.startsWith("Estorno")
                    ? r.changedBy
                    : "Custo editado no cadastro"}
              </p>
              <p className="text-xs text-ink-muted">
                {fmtDateTime(r.at)}
                {r.quantity ? ` · ${qty(r.quantity)} un. a ${formatCurrency(r.unitCost)}` : ""}
                {r.invoiceNumber && r.purchaseDate ? ` · emitida ${fmtDate(r.purchaseDate)}` : ""}
                {r.changedBy && !r.changedBy.startsWith("Estorno") ? ` · ${r.changedBy}` : ""}
              </p>
            </div>
            <p className="tabular-nums text-ink">
              {r.previousCost != null ? `${formatCurrency(r.previousCost)} → ` : ""}
              <strong>{r.averageCost != null ? formatCurrency(r.averageCost) : "sem custo"}</strong>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PriceTab({ history }) {
  if (history.length === 0) return <Empty>O preço de venda ainda não foi alterado.</Empty>;
  return (
    <ul className="divide-y divide-edge">
      {history.map((r) => {
        const diff =
          r.oldPrice && r.newPrice ? ((r.newPrice - r.oldPrice) / r.oldPrice) * 100 : null;
        return (
          <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5 text-sm">
            <div>
              <p className="font-medium text-ink">{PRICE_LABEL[r.type] || "Alteração"}</p>
              <p className="text-xs text-ink-muted">
                {fmtDateTime(r.at)}
                {r.changedBy ? ` · ${r.changedBy}` : ""}
              </p>
            </div>
            <p className="tabular-nums text-ink">
              {formatCurrency(r.oldPrice)} → <strong>{formatCurrency(r.newPrice)}</strong>
              {diff != null ? (
                <span className={`ml-1 text-xs ${diff >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {diff >= 0 ? "+" : ""}
                  {pct(diff)}
                </span>
              ) : null}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function StockTab({ movements }) {
  if (movements.length === 0) {
    return <Empty>Nenhum movimento registrado ainda. Os movimentos passam a ser registrados a partir desta versão.</Empty>;
  }
  return (
    <ul className="divide-y divide-edge">
      {movements.map((m) => {
        const detail =
          m.referenceType === "order"
            ? `Pedido #${m.referenceId}${m.clientName ? ` · ${m.clientName}` : ""}`
            : m.referenceType === "purchase" && (m.invoiceNumber || m.referenceId)
              ? `NF ${m.invoiceNumber || m.referenceId}`
              : m.reason;
        return (
          <li key={m.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-ink">{MOVEMENT_LABEL[m.type] || m.type}</p>
              <p className="text-xs text-ink-muted">
                {fmtDateTime(m.at)}
                {detail ? ` · ${detail}` : ""}
                {m.user ? ` · ${m.user}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right tabular-nums">
              <p className={`font-semibold ${m.quantity >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                {m.quantity >= 0 ? "+" : ""}
                {qty(m.quantity)}
              </p>
              <p className="text-xs text-ink-muted">saldo {m.balanceAfter == null ? "—" : qty(m.balanceAfter)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function SalesTab({ clients }) {
  if (clients.length === 0) return <Empty>Nenhum pedido com este produto ainda.</Empty>;
  return (
    <ul className="divide-y divide-edge">
      {clients.map((c) => (
        <li key={c.clientId} className="flex items-start justify-between gap-3 py-2.5 text-sm">
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{c.clientName}</p>
            <p className="text-xs text-ink-muted">
              último pedido {fmtDate(c.lastAt)} a {formatCurrency(c.lastUnitPrice)}
            </p>
          </div>
          <div className="shrink-0 text-right tabular-nums">
            <p className="font-semibold text-ink">{qty(c.quantity)} un.</p>
            <p className="text-xs text-ink-muted">{formatCurrency(c.total)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Ficha do produto (admin): custo, preço de venda, estoque e vendas. */
export default function ProductSheet({ productId, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("custo");

  useEffect(() => {
    if (!productId) return undefined;
    let active = true;
    setData(null);
    setError(null);
    setTab("custo");
    apiService
      .getProductInsights(productId)
      .then((res) => active && setData(res))
      .catch((err) => active && setError(err.message || "Não foi possível carregar a ficha."));
    return () => {
      active = false;
    };
  }, [productId]);

  const p = data?.product;
  const lowStock = p && p.stock <= p.minStock;

  return (
    <Drawer
      open={Boolean(productId)}
      onClose={onClose}
      widthClass="max-w-2xl"
      title={p ? p.name : "Ficha do produto"}
      description={p ? `${p.productCode || "sem código"} · ${p.brand || ""}` : undefined}
    >
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !data ? (
        <p className="text-sm text-ink-muted">Carregando…</p>
      ) : (
        <div className="space-y-5">
          {data.unavailable?.length ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Parte do histórico não pôde ser carregada agora. Os demais dados estão abaixo.
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Kpi label="Preço de venda" value={formatCurrency(p.price)} />
            <Kpi
              label="Custo médio"
              value={p.costPrice == null ? "—" : formatCurrency(p.costPrice)}
              hint={p.lastCost != null ? `última compra ${formatCurrency(p.lastCost)}` : "sem compras registradas"}
            />
            <Kpi
              label="Margem"
              value={pct(p.marginPercent)}
              className={TONE_CLASS[marginTone(p.marginPercent)]}
              hint={
                p.costPrice != null
                  ? `lucro ${formatCurrency(p.price - p.costPrice)} por un.`
                  : "informe o custo"
              }
            />
            <Kpi
              label="Estoque"
              value={`${qty(p.stock)} un.`}
              className={lowStock ? "text-red-600" : ""}
              hint={p.minStock ? `mínimo ${p.minStock}` : undefined}
            />
            <Kpi
              label="Vendido (30 / 90 dias)"
              value={`${qty(data.sales.quantity30d)} / ${qty(data.sales.quantity90d)}`}
              hint={`${formatCurrency(data.sales.revenue90d)} em 90 dias`}
            />
            <Kpi
              label="Última venda · compra"
              value={fmtDate(data.sales.lastSaleAt)}
              hint={`compra ${fmtDate(p.lastPurchaseAt)}`}
            />
          </div>

          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "custo", label: "Custo" },
              { id: "venda", label: "Preço de venda" },
              { id: "estoque", label: "Estoque" },
              { id: "vendas", label: "Vendas" },
            ]}
          />
          <div role="tabpanel" aria-labelledby={`tab-${tab}`}>
            {tab === "custo" ? <CostTab history={data.costHistory} /> : null}
            {tab === "venda" ? <PriceTab history={data.priceHistory} /> : null}
            {tab === "estoque" ? <StockTab movements={data.movements} /> : null}
            {tab === "vendas" ? <SalesTab clients={data.clients} /> : null}
          </div>
        </div>
      )}
    </Drawer>
  );
}
