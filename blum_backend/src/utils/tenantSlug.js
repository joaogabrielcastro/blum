const RESERVED_SLUGS = new Set([
  "default",
  "admin",
  "api",
  "www",
  "app",
  "billing",
  "login",
  "signup",
  "register",
  "support",
  "help",
  "status",
  "static",
  "assets",
]);

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])?$/;

function normalizeTenantSlug(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function validateTenantSlug(slug) {
  const normalized = normalizeTenantSlug(slug);
  if (!normalized) {
    return { ok: false, slug: normalized, error: "Identificador da empresa é obrigatório" };
  }
  if (normalized.length < 3) {
    return {
      ok: false,
      slug: normalized,
      error: "Identificador deve ter pelo menos 3 caracteres",
    };
  }
  if (!SLUG_PATTERN.test(normalized)) {
    return {
      ok: false,
      slug: normalized,
      error:
        "Use apenas letras minúsculas, números e hífens (sem começar ou terminar com hífen)",
    };
  }
  if (RESERVED_SLUGS.has(normalized)) {
    return {
      ok: false,
      slug: normalized,
      error: "Este identificador está reservado. Escolha outro.",
    };
  }
  return { ok: true, slug: normalized, error: null };
}

function slugFromCompanyName(name) {
  return normalizeTenantSlug(name);
}

module.exports = {
  RESERVED_SLUGS,
  normalizeTenantSlug,
  validateTenantSlug,
  slugFromCompanyName,
};
