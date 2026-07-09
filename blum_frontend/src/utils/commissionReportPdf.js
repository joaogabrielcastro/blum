import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function formatMoney(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

function formatDateTime(date = new Date()) {
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sanitizeFilenamePart(value) {
  return String(value || "relatorio")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "relatorio";
}

function drawHeader(doc, title, subtitle) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageWidth, 36, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Blum", 14, 14);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(title, 14, 24);
  if (subtitle) {
    doc.setFontSize(9);
    doc.text(subtitle, 14, 31);
  }
  doc.setTextColor(40, 40, 40);
}

function buildSummaryTable(doc, startY, rep, totals) {
  autoTable(doc, {
    startY,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 2 },
    body: [
      ["Representante", rep.displayName || "—"],
      ["Usuário", rep.username ? `@${rep.username}` : "—"],
      ["Período", totals.periodLabel],
      ["Pedidos entregues", String(rep.orderCount ?? 0)],
      ["Vendas totais", formatMoney(rep.totalSales)],
      ["Comissão total", formatMoney(rep.totalCommission)],
      ["% efetivo", `${rep.commissionRate ?? "0.00"}%`],
    ],
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 45 },
      1: { cellWidth: "auto" },
    },
  });
  return doc.lastAutoTable.finalY + 8;
}

/**
 * PDF resumo — todos os representantes (admin).
 */
export function buildAllRepresentativesCommissionPdf({
  periodLabel,
  rows,
  totals,
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const generatedAt = formatDateTime();

  drawHeader(
    doc,
    "Relatório de comissões por representante",
    `Período: ${periodLabel} · Gerado em ${generatedAt}`,
  );

  autoTable(doc, {
    startY: 44,
    head: [
      [
        "Representante",
        "Pedidos",
        "Vendas totais",
        "Ticket médio",
        "Comissão total",
        "% efetivo",
      ],
    ],
    body: rows.map((row) => [
      row.username
        ? `${row.displayName} (@${row.username})`
        : row.displayName,
      String(row.orderCount),
      formatMoney(row.totalSales),
      formatMoney(row.avgTicket),
      formatMoney(row.totalCommission),
      `${row.commissionRate}%`,
    ]),
    foot: [
      [
        "Total geral",
        String(totals.orderCount),
        formatMoney(totals.totalSales),
        formatMoney(totals.avgTicket),
        formatMoney(totals.totalCommission),
        totals.effectiveRate,
      ],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: "bold",
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [30, 41, 59],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "Somente pedidos com status Entregue no período selecionado.",
    14,
    pageHeight - 10,
  );

  return {
    doc,
    filename: `comissoes-representantes-${sanitizeFilenamePart(periodLabel)}.pdf`,
    title: `Comissões — ${periodLabel}`,
  };
}

/**
 * PDF detalhado — um representante com lista de pedidos.
 */
export function buildRepresentativeCommissionPdf({
  rep,
  orders,
  clients,
  periodLabel,
  formatRepLabel,
  formatOrderDateLabel,
  orderFinishedAt,
  orderTotalPrice,
  orderTotalCommission,
  orderClientId,
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const generatedAt = formatDateTime();
  const repLabel = formatRepLabel ? formatRepLabel(rep) : rep.displayName;

  drawHeader(
    doc,
    `Comissões — ${repLabel}`,
    `Período: ${periodLabel} · Gerado em ${generatedAt}`,
  );

  const nextY = buildSummaryTable(doc, 44, rep, { periodLabel });

  autoTable(doc, {
    startY: nextY,
    head: [["Pedido", "Data entrega", "Cliente", "Vendas", "Comissão"]],
    body: orders.map((order) => {
      const clientId = orderClientId(order);
      const clientName = clients[clientId] || `Cliente #${clientId ?? "—"}`;
      const finished = orderFinishedAt(order);
      return [
        String(order.id ?? "—"),
        finished ? formatOrderDateLabel(finished) : "—",
        clientName,
        formatMoney(orderTotalPrice(order)),
        formatMoney(orderTotalCommission(order)),
      ];
    }),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    foot: [
      [
        "Total",
        "",
        `${orders.length} pedido(s)`,
        formatMoney(rep.totalSales),
        formatMoney(rep.totalCommission),
      ],
    ],
    footStyles: {
      fillColor: [241, 245, 249],
      fontStyle: "bold",
    },
  });

  return {
    doc,
    filename: `comissao-${sanitizeFilenamePart(rep.username || rep.displayName)}-${sanitizeFilenamePart(periodLabel)}.pdf`,
    title: `Comissões ${repLabel} — ${periodLabel}`,
  };
}
