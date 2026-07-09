import { API_URL, apiRequest, apiUpload, apiDownloadBlob } from "./core";
import type { ApiRequestError } from "./core";
import type { ProductsExportOptions, ProductsListResponse } from "../../types/api";

export const productsApi = {
  getProducts: async (
    brand = "all",
    page = 1,
    limit = 50,
    q = "",
    brandId?: string | number | null,
  ): Promise<ProductsListResponse | unknown[]> => {
    const params = new URLSearchParams();
    if (brand && brand !== "all") params.append("brand", brand);
    if (brandId != null && brandId !== "")
      params.append("brandId", String(brandId));
    params.append("page", String(page));
    params.append("limit", String(limit));
    const qt = typeof q === "string" ? q.trim() : "";
    if (qt) params.append("q", qt);
    return apiRequest(`${API_URL}/products?${params.toString()}`);
  },

  createProduct: (newProductData: Record<string, unknown>) =>
    apiRequest(`${API_URL}/products`, {
      method: "POST",
      body: JSON.stringify(newProductData),
    }),

  updateProduct: (
    productId: string | number,
    productData: Record<string, unknown>,
  ) =>
    apiRequest(`${API_URL}/products/${productId}`, {
      method: "PUT",
      body: JSON.stringify(productData),
    }),

  deleteProduct: (productId: string | number) =>
    apiRequest(`${API_URL}/products/${productId}`, { method: "DELETE" }),

  bulkAdjustPrices: (payload: Record<string, unknown>) =>
    apiRequest(`${API_URL}/products/bulk-price-adjust`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  previewProductImport: (formData: FormData) =>
    apiUpload(`${API_URL}/products/import/preview`, formData),

  finalizeProductImport: (payload: Record<string, unknown>) =>
    apiRequest(`${API_URL}/products/import/finalize`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  downloadProductsExport: async (
    format: "csv" | "xlsx" | string,
    { brandId, q }: ProductsExportOptions = {},
  ) => {
    const params = new URLSearchParams();
    if (brandId != null && brandId !== "")
      params.append("brandId", String(brandId));
    if (q != null && String(q).trim() !== "") params.append("q", String(q).trim());
    const ext = format === "xlsx" ? "xlsx" : "csv";
    return apiDownloadBlob(
      `${API_URL}/products/export.${ext}?${params.toString()}`,
    );
  },

  getProductById: (productId: string | number) =>
    apiRequest(`${API_URL}/products/${productId}`),

  lookupProductByCode: async (
    productCode: string,
    brand?: string,
    brandId?: string | number | null,
  ) => {
    const code = String(productCode ?? "").trim();
    if (!code) return null;
    const params = new URLSearchParams();
    params.append("productcode", code);
    if (brand && brand !== "all") params.append("brand", brand);
    if (brandId != null && brandId !== "")
      params.append("brandId", String(brandId));
    try {
      return await apiRequest(
        `${API_URL}/products/by-code?${params.toString()}`,
      );
    } catch (err) {
      if ((err as ApiRequestError)?.status === 404) return null;
      throw err;
    }
  },

  lookupProductsByCodes: async (
    productCodes: string[],
    brand?: string,
    brandId?: string | number | null,
  ) => {
    const codes = [
      ...new Set(
        (productCodes || [])
          .map((c) => String(c ?? "").trim())
          .filter(Boolean),
      ),
    ];
    if (codes.length === 0) return {};

    const chunkSize = 2500;
    const merged: Record<string, unknown> = {};

    for (let i = 0; i < codes.length; i += chunkSize) {
      const chunk = codes.slice(i, i + chunkSize);
      const body: Record<string, unknown> = { codes: chunk };
      if (brand && brand !== "all") body.brand = brand;
      if (brandId != null && brandId !== "") body.brandId = String(brandId);
      const result = await apiRequest<{ products?: Record<string, unknown> }>(
        `${API_URL}/products/lookup-by-codes`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );
      if (result?.products && typeof result.products === "object") {
        Object.assign(merged, result.products);
      }
    }

    return merged;
  },

  searchProducts: async (
    searchTerm: string,
    brand?: string,
    brandId?: string | number | null,
  ) => {
    if (!searchTerm || searchTerm.trim() === "") return [];
    const params = new URLSearchParams();
    params.append("q", searchTerm.trim());
    if (brand && brand !== "all") params.append("brand", brand);
    if (brandId != null && brandId !== "")
      params.append("brandId", String(brandId));
    return apiRequest(`${API_URL}/products/search?${params.toString()}`);
  },
};
