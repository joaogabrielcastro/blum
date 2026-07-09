import { API_URL, apiRequest, apiUpload } from "./core";

export const purchasesApi = {
  processPurchasePdf: async (formData: FormData) => {
    try {
      return await apiUpload(`${API_URL}/purchases/process-pdf`, formData);
    } catch {
      throw new Error("Erro ao processar PDF");
    }
  },

  processPurchaseCsv: async (formData: FormData) => {
    const data = await apiUpload<unknown[]>(
      `${API_URL}/purchases/process-csv`,
      formData,
    );
    if (!Array.isArray(data)) {
      throw new Error("Formato de resposta inválido da API");
    }
    return data;
  },

  finalizePurchase: (items: unknown[]) =>
    apiRequest(`${API_URL}/purchases/finalize`, {
      method: "POST",
      body: JSON.stringify({ items }),
    }),

  finalizePurchaseFromCsv: (payload: Record<string, unknown>) =>
    apiRequest(`${API_URL}/purchases/finalize-csv`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  finalizePurchaseFromPdf: (payload: Record<string, unknown>) =>
    apiRequest(`${API_URL}/purchases/finalize-pdf`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getPriceHistory: (productId: string | number) =>
    apiRequest(`${API_URL}/purchases/price-history/${productId}`),

  getLastPurchasePrice: async (productId: string | number) => {
    try {
      return await apiRequest(`${API_URL}/purchases/last-price/${productId}`);
    } catch (error) {
      if ((error as Error).message.includes("404")) return null;
      throw error;
    }
  },
};
