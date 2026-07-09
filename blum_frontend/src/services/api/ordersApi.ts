import { API_URL, apiRequest } from "./core";
import type { ConvertOrderOptions, OrderQueryParams } from "../../types/api";

export const ordersApi = {
  getOrders: (params: OrderQueryParams = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).reduce<Record<string, string>>((acc, [key, val]) => {
        if (val != null) acc[key] = String(val);
        return acc;
      }, {}),
    ).toString();
    return apiRequest(`${API_URL}/orders?${query}`);
  },

  getOrderById: (orderId: string | number) =>
    apiRequest(`${API_URL}/orders/${orderId}`),

  createOrder: (newOrderData: Record<string, unknown>) =>
    apiRequest(`${API_URL}/orders`, {
      method: "POST",
      body: JSON.stringify(newOrderData),
    }),

  updateOrder: (orderId: string | number, orderData: Record<string, unknown>) =>
    apiRequest(`${API_URL}/orders/${orderId}`, {
      method: "PUT",
      body: JSON.stringify(orderData),
    }),

  deleteOrder: (orderId: string | number) =>
    apiRequest(`${API_URL}/orders/${orderId}`, { method: "DELETE" }),

  finalizeOrder: (orderId: string | number) =>
    apiRequest(`${API_URL}/orders/${orderId}/finalize`, { method: "PUT" }),

  updateOrderPaymentMethod: (orderId: string | number, payment_method: string) =>
    apiRequest(`${API_URL}/orders/${orderId}/payment-method`, {
      method: "PUT",
      body: JSON.stringify({
        payment_method,
        paymentMethod: payment_method,
      }),
    }),

  duplicateOrder: (orderId: string | number) =>
    apiRequest(`${API_URL}/orders/${orderId}/duplicate`, { method: "POST" }),

  getClientItemPriceHistory: (
    clientId: string | number,
    productId: string | number,
    limit = 8,
  ) =>
    apiRequest(
      `${API_URL}/orders/clients/${clientId}/products/${productId}/price-history?limit=${limit}`,
    ),

  convertOrderToPedido: (
    orderId: string | number,
    options: ConvertOrderOptions = {},
  ) =>
    apiRequest(`${API_URL}/orders/${orderId}/convert-to-pedido`, {
      method: "PUT",
      body: JSON.stringify({
        confirmStockWarning: options.confirmStockWarning === true,
      }),
    }),
};
