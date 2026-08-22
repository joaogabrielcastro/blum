export const PAYMENT_LABELS = {
  carteira: "Carteira",
  boleto: "Boleto",
  pix: "PIX",
  cheque: "Cheque",
  dinheiro: "Dinheiro",
};

export const rowCreatedAt = (row) => row?.createdAt ?? row?.created_at ?? null;
export const rowUnitPrice = (row) => row?.unitPrice ?? row?.unit_price ?? null;
export const rowOrderId = (row) => row?.orderId ?? row?.order_id ?? null;
export const rowSellerName = (row) => row?.sellerName ?? row?.seller_name ?? null;
export const rowLineDiscount = (row) =>
  row?.lineDiscount ?? row?.line_discount ?? 0;
export const rowPaymentMethod = (row) =>
  row?.paymentMethod ?? row?.payment_method ?? null;

export const formatRowDate = (value, withTime = false) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return withTime
    ? date.toLocaleString("pt-BR")
    : date.toLocaleDateString("pt-BR");
};

/** Dias corridos desde a data (0 = hoje). */
export const daysSince = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const ms = Date.now() - date.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
};

export const formatDaysAgo = (value) => {
  const days = daysSince(value);
  if (days == null) return "—";
  if (days === 0) return "hoje";
  if (days === 1) return "há 1 dia";
  return `há ${days} dias`;
};
