import { API_URL, apiRequest, apiDownloadBlob } from "./core";
import type {
  MonthlySalesSummary,
  ReportStatsFilters,
  SalesTargetResponse,
  SaveSalesTargetPayload,
} from "../../types/api";

export const reportsApi = {
  getSalesByRep: () => apiRequest(`${API_URL}/reports/sales-by-rep`),

  getReportStats: (filters: ReportStatsFilters) => {
    const queryString = new URLSearchParams(
      Object.entries(filters).reduce<Record<string, string>>((acc, [key, val]) => {
        if (val != null) acc[key] = String(val);
        return acc;
      }, {}),
    ).toString();
    return apiRequest(`${API_URL}/reports/stats?${queryString}`);
  },

  getMonthlySalesSummaries: (
    sellerUserId?: string | number | null,
  ): Promise<MonthlySalesSummary[]> => {
    const params = new URLSearchParams();
    if (sellerUserId) params.append("sellerUserId", String(sellerUserId));
    const qs = params.toString();
    return apiRequest(`${API_URL}/reports/monthly-sales${qs ? `?${qs}` : ""}`);
  },

  getSalesTarget: ({
    year,
    month,
    sellerUserId,
  }: {
    year: number;
    month: number;
    sellerUserId?: string | number | null;
  }): Promise<SalesTargetResponse> => {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
    });
    if (sellerUserId != null && sellerUserId !== "") {
      params.append("sellerUserId", String(sellerUserId));
    }
    return apiRequest(`${API_URL}/reports/sales-target?${params.toString()}`);
  },

  saveSalesTarget: (payload: SaveSalesTargetPayload) =>
    apiRequest(`${API_URL}/reports/sales-target`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  downloadSalesByRepExcel: () =>
    apiDownloadBlob(`${API_URL}/reports/sales-by-rep/export.xlsx`),
};
