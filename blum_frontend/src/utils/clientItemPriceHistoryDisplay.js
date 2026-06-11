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
