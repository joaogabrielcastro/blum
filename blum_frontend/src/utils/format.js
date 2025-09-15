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
  return {
    id: order.id,
    clientId: order.clientid,
    userId: order.userid,
    description: order.description,
    items: order.items,
    totalPrice: order.totalprice,
    discount: order.discount,
    status: order.status,
    createdAt: order.createdat,
    finishedAt: order.finishedat // ← Garante consistência
  };
};

export default formatCurrency;
