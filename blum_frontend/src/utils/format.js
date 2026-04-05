// src/utils/format.js
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
  const sellerId = order.user_ref ?? order.userid;
  const itemsLen = Array.isArray(order.items) ? order.items.length : 0;
  return {
    id: order.id,
    clientId: order.clientid,
    userId: sellerId,
    sellerName: order.seller_name,
    description: order.description,
    items: order.items,
    itemsCount: order.items_count ?? itemsLen,
    totalPrice: order.totalprice,
    discount: order.discount,
    status: order.status,
    createdAt: order.createdat,
    finishedAt: order.finishedat,
  };
};

export default formatCurrency;
