import { API_URL, apiRequest } from "./core";

export const brandsApi = {
  getBrands: () => apiRequest(`${API_URL}/brands`),

  createBrand: (newBrandData: Record<string, unknown>) =>
    apiRequest(`${API_URL}/brands`, {
      method: "POST",
      body: JSON.stringify(newBrandData),
    }),

  updateBrand: (oldName: string, brandData: Record<string, unknown>) =>
    apiRequest(`${API_URL}/brands/${encodeURIComponent(oldName)}`, {
      method: "PUT",
      body: JSON.stringify(brandData),
    }),

  deleteBrand: (brandId: string | number) =>
    apiRequest(`${API_URL}/brands/${brandId}`, { method: "DELETE" }),
};
