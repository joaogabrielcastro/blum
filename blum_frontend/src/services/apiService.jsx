// Re-exporta API modular — mantém compatibilidade com imports existentes.
export { API_URL, apiRequest, getAuthHeaders } from "./api/core";
export {
  login,
  signupTenant,
  checkTenantSlug,
  checkTenantTaxId,
  verifyToken,
  logout,
} from "./api/authApi";
export { default } from "./api/index";
