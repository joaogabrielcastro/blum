// src/utils/format.js

/**
 * Garante linhas no formato do OrdersForm (camelCase), vindo da API ou lista.
 * Produção/Postgres pode expor product_name, unit_price, etc.
 */
export const normalizeOrderLineItems = (items) => {
  if (items == null) return [];
  let list = items;
  if (typeof list === "string") {
    try {
      list = JSON.parse(list);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];

  return list.map((line) => {
    const productId =
      line.productId ?? line.product_id ?? line.productid ?? null;
    const productName = line.productName ?? line.product_name ?? "";
    const brand = line.brand ?? "";
    const qty = parseFloat(
      String(line.quantity ?? "")
        .trim()
        .replace(",", "."),
    );
    const price = parseFloat(
      line.price ?? line.unit_price ?? line.unitprice ?? 0,
    );
    const lineDiscRaw = parseFloat(
      line.lineDiscount ?? line.line_discount ?? line.discount_percent ?? 0,
    );
    const lineDiscount =
      Number.isFinite(lineDiscRaw) && lineDiscRaw > 0
        ? Math.min(100, lineDiscRaw)
        : 0;
    const productcode =
      line.productCode ??
      line.productcode ??
      line.product_code ??
      "";
    const subcode = line.subCode ?? line.subcode ?? "";
    return {
      ...line,
      productId: productId != null ? Number(productId) || productId : null,
      productName: String(productName),
      brand: String(brand),
      quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
      price: Number.isFinite(price) ? price : 0,
      lineDiscount,
      productcode,
      subcode,
      availableStock:
        line.availableStock ??
        line.available_stock ??
        (line.stock != null ? line.stock : undefined),
    };
  });
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(parseFloat(value))) {
    return "R$ 0,00"; // já retorna no padrão moeda
  }

  return parseFloat(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatOrderData = (order) => {
  if (order == null) return null;
  const sellerId =
    order.user_ref ??
    order.userRef ??
    order.userid ??
    order.userId;
  const items = normalizeOrderLineItems(order.items);
  const itemsLen = items.length;
  const documentType =
    order.document_type ?? order.documentType ?? "pedido";
  const rawId = order.id ?? order.orderId;
  const numericId = Number(rawId);
  const id = Number.isFinite(numericId) ? numericId : rawId;
  return {
    id,
    clientId: order.clientid ?? order.clientId ?? order.client_id,
    userId: sellerId,
    sellerName: order.seller_name ?? order.sellerName,
    sellerUsername: order.seller_username ?? order.sellerUsername,
    description: order.description,
    items,
    itemsCount: order.items_count ?? order.itemsCount ?? itemsLen,
    totalPrice: order.totalprice ?? order.totalPrice,
    discount: parseFloat(order.discount) || 0,
    status: order.status,
    createdAt: order.createdat ?? order.createdAt,
    finishedAt: order.finishedat ?? order.finishedAt,
    documentType: documentType === "orcamento" ? "orcamento" : "pedido",
    paymentMethod: order.payment_method ?? order.paymentMethod ?? null,
    representadas:
      order.representadas ?? order.representedBrands ?? "",
  };
};

export default formatCurrency;
