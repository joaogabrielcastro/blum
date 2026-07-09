export const TENANT_SLUG_KEY = "blum_tenant_slug";

export function getStoredTenantSlug() {
  try {
    return localStorage.getItem(TENANT_SLUG_KEY) || "default";
  } catch {
    return "default";
  }
}

export function setStoredTenantSlug(slug) {
  try {
    if (slug) {
      localStorage.setItem(TENANT_SLUG_KEY, slug);
    }
  } catch {
    /* ignore */
  }
}

export function clearStoredTenantSlug() {
  try {
    localStorage.removeItem(TENANT_SLUG_KEY);
  } catch {
    /* ignore */
  }
}
