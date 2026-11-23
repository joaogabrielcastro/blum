import { API_URL, apiRequest } from "./core";

export const purchasesApi = {
  previewPurchaseInvoice: (payload: { xml: string; brandId?: string | number | null }) =>
    apiRequest(`${API_URL}/purchases/invoices/preview`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  confirmPurchaseInvoice: (payload: Record<string, unknown>) =>
    apiRequest(`${API_URL}/purchases/invoices`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getPurchaseInvoices: () => apiRequest(`${API_URL}/purchases/invoices`),

  getPurchaseInvoice: (id: string | number) =>
    apiRequest(`${API_URL}/purchases/invoices/${id}`),

  reversePurchaseInvoice: (id: string | number) =>
    apiRequest(`${API_URL}/purchases/invoices/${id}/reverse`, { method: "POST" }),
};
