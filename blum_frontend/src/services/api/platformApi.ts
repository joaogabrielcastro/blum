import { API_URL, apiRequest } from "./core";

export const platformApi = {
  listPlatformTenants: () => apiRequest(`${API_URL}/platform/tenants`),

  updatePlatformTenantStatus: (tenantId: string | number, status: string) =>
    apiRequest(`${API_URL}/platform/tenants/${tenantId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  getPlatformTenantDetail: (tenantId: string | number) =>
    apiRequest(`${API_URL}/platform/tenants/${tenantId}`),
};
