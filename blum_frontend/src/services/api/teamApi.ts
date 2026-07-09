import { API_URL, apiRequest } from "./core";

export const teamApi = {
  getUsers: () => apiRequest(`${API_URL}/auth/users`),

  createUser: (payload: Record<string, unknown>) =>
    apiRequest(`${API_URL}/auth/users`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getUserAllowedBrands: (userId: string | number) =>
    apiRequest(`${API_URL}/auth/users/${userId}/allowed-brands`),

  setUserAllowedBrands: (userId: string | number, brandIds: (string | number)[]) =>
    apiRequest(`${API_URL}/auth/users/${userId}/allowed-brands`, {
      method: "PUT",
      body: JSON.stringify({ brandIds }),
    }),

  adminResetUserPassword: (userId: string | number, newPassword: string) =>
    apiRequest(`${API_URL}/auth/users/${userId}/password`, {
      method: "PUT",
      body: JSON.stringify({ newPassword }),
    }),

  deleteUser: (userId: string | number) =>
    apiRequest(`${API_URL}/auth/users/${userId}`, { method: "DELETE" }),
};
