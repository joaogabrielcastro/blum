import { setStoredTenantSlug } from "../constants/tenantStorage";

export function persistAuthSession(authResponse) {
  if (!authResponse?.token || !authResponse?.user) {
    throw new Error("Resposta de autenticação inválida");
  }
  localStorage.setItem("token", authResponse.token);
  localStorage.setItem("user", JSON.stringify(authResponse.user));
  if (authResponse.refreshToken) {
    localStorage.setItem("refreshToken", authResponse.refreshToken);
  }
  if (authResponse.user.tenantSlug) {
    setStoredTenantSlug(authResponse.user.tenantSlug);
  }
  return authResponse.user;
}
