import { API_URL, apiRequest } from "./core";
import type {
  ClientOrderSummary,
  ClientRecord,
  ClientStats,
} from "../../types/api";

export const clientsApi = {
  getClients: (): Promise<ClientRecord[]> =>
    apiRequest<ClientRecord[]>(`${API_URL}/clients`),

  createClient: (newClientData: Record<string, unknown>) =>
    apiRequest(`${API_URL}/clients`, {
      method: "POST",
      body: JSON.stringify(newClientData),
    }),

  updateClient: (clientid: string | number, clientData: Record<string, unknown>) =>
    apiRequest(`${API_URL}/clients/${clientid}`, {
      method: "PUT",
      body: JSON.stringify(clientData),
    }),

  deleteClient: (clientId: string | number) =>
    apiRequest(`${API_URL}/clients/${clientId}`, { method: "DELETE" }),

  getClientById: (clientId: string | number) =>
    apiRequest(`${API_URL}/clients/${clientId}`),

  getClientStats: async (clientId: string | number): Promise<ClientStats> => {
    try {
      return await apiRequest<ClientStats>(`${API_URL}/orders/stats/${clientId}`);
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
      return { totalOrders: 0, totalSpent: 0 };
    }
  },

  getClientOrders: async (
    clientId: string | number,
  ): Promise<ClientOrderSummary[]> => {
    const orders = await apiRequest<Record<string, unknown>[]>(
      `${API_URL}/orders?clientid=${clientId}`,
    );
    return orders.map((order) => ({
      id: order.id as number,
      orderNumber: String(order.id),
      orderDate: (order.createdAt ?? order.createdat ?? null) as string | null,
      seller: order.userRef ?? order.userId ?? order.user_ref ?? order.userid,
      status: (order.status as string) || "pending",
      totalAmount: (order.totalPrice ?? order.totalprice ?? 0) as number,
      discount: (order.discount as number) || 0,
      paymentMethod:
        (order.paymentMethod ?? order.payment_method ?? "Não informado") as string,
      notes: (order.description as string) || "",
      items: Array.isArray(order.items) ? order.items : [],
    }));
  },
};
