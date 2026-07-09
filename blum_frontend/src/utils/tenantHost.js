const DEFAULT_BASE_DOMAIN =
  process.env.REACT_APP_TENANT_BASE_DOMAIN || "blum.jwsoftware.com.br";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/** Slug fixo em dev local (ex.: REACT_APP_TENANT_DEV_SLUG=acme + hosts acme.localhost) */
const DEV_TENANT_SLUG = process.env.REACT_APP_TENANT_DEV_SLUG || null;

const RESERVED_SUBDOMAINS = new Set([
  "www",
  "api",
  "api-blum",
  "app",
  "staging",
  "dev",
]);

/**
 * Extrai o slug do tenant a partir do host.
 * Ex.: acme.blum.jwsoftware.com.br → acme
 */
export function resolveTenantSlugFromHost(
  hostname = typeof window !== "undefined" ? window.location.hostname : "",
  baseDomain = DEFAULT_BASE_DOMAIN,
) {
  const host = String(hostname || "").trim().toLowerCase();
  const base = String(baseDomain || "").trim().toLowerCase();
  if (!host) return null;

  if (LOCAL_HOSTS.has(host)) {
    return DEV_TENANT_SLUG || null;
  }

  if (host.endsWith(".localhost")) {
    const subdomain = host.slice(0, -".localhost".length).split(".")[0];
    if (subdomain && !RESERVED_SUBDOMAINS.has(subdomain)) {
      return subdomain;
    }
  }

  if (host === base || host === `www.${base}`) return null;

  const suffix = `.${base}`;
  if (!host.endsWith(suffix)) return null;

  const subdomain = host.slice(0, -suffix.length).split(".")[0];
  if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) return null;
  return subdomain;
}

export function getTenantLoginUrl(slug) {
  const base = DEFAULT_BASE_DOMAIN;
  if (!slug || slug === "default") return `https://${base}/login`;
  return `https://${slug}.${base}/login`;
}
