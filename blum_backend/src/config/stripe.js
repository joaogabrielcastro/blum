/**
 * Configuração centralizada do Stripe.
 */

function isBillingEnforced() {
  const raw = String(process.env.BILLING_ENFORCE ?? "").trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "no") return false;
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  // Produção: cobrança ativa por defeito (dev permanece desligado sem flag explícita).
  return process.env.NODE_ENV === "production";
}

function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY || "";
}

function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || "";
}

function getFrontendBaseUrl() {
  const url = (process.env.FRONTEND_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  return url;
}

function getTenantBaseDomain() {
  return String(
    process.env.TENANT_BASE_DOMAIN || "blum.jwsoftware.com.br",
  )
    .trim()
    .toLowerCase()
    .replace(/^\.+|\.+$/g, "");
}

function isTenantSubdomainEnabled() {
  const flag = String(process.env.TENANT_SUBDOMAIN_ENABLED ?? "true")
    .trim()
    .toLowerCase();
  return flag !== "0" && flag !== "false" && flag !== "no";
}

/**
 * URL do frontend para redirects Stripe (checkout/portal).
 * Tenants com slug próprio usam subdomínio: https://acme.blum.jwsoftware.com.br
 */
function getFrontendBaseUrlForTenant(tenantSlug) {
  const slug = String(tenantSlug || "")
    .trim()
    .toLowerCase();
  const defaultUrl = getFrontendBaseUrl();

  if (!isTenantSubdomainEnabled() || !slug || slug === "default") {
    return defaultUrl;
  }

  try {
    const parsed = new URL(defaultUrl);
    return `${parsed.protocol}//${slug}.${getTenantBaseDomain()}`;
  } catch {
    return `https://${slug}.${getTenantBaseDomain()}`;
  }
}

function assertStripeConfigured() {
  if (!getStripeSecretKey()) {
    const err = new Error("STRIPE_SECRET_KEY não configurada");
    err.status = 503;
    err.expose = true;
    throw err;
  }
}

module.exports = {
  isBillingEnforced,
  getStripeSecretKey,
  getStripeWebhookSecret,
  getFrontendBaseUrl,
  getTenantBaseDomain,
  isTenantSubdomainEnabled,
  getFrontendBaseUrlForTenant,
  assertStripeConfigured,
};
