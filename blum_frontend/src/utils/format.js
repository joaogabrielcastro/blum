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
    const qty = parseInt(line.quantity, 10);
    const price = parseFloat(
      line.price ?? line.unit_price ?? line.unitprice ?? 0,
    );
    return {
      ...line,
      productId: productId != null ? Number(productId) || productId : null,
      productName: String(productName),
      brand: String(brand),
      quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
      price: Number.isFinite(price) ? price : 0,
      productcode: line.productcode ?? line.product_code ?? "",
      subcode: line.subcode ?? "",
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
  const sellerId = order.user_ref ?? order.userid ?? order.userId;
  const items = normalizeOrderLineItems(order.items);
  const itemsLen = items.length;
  return {
    id: order.id,
    clientId: order.clientid ?? order.clientId ?? order.client_id,
    userId: sellerId,
    sellerName: order.seller_name ?? order.sellerName,
    description: order.description,
    items,
    itemsCount: order.items_count ?? order.itemsCount ?? itemsLen,
    totalPrice: order.totalprice ?? order.totalPrice,
    discount: parseFloat(order.discount) || 0,
    status: order.status,
    createdAt: order.createdat ?? order.createdAt,
    finishedAt: order.finishedat ?? order.finishedAt,
  };
};

export default formatCurrency;
