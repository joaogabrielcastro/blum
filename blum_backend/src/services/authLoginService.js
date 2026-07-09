const bcrypt = require("bcrypt");
const authRepository = require("../repositories/authRepository");

function normalizeTenantSlug(value) {
  const slug = String(value ?? "").trim();
  return slug || null;
}

function resolveLoginTenantSlug(bodySlug, headerSlug) {
  let tenantSlug = normalizeTenantSlug(bodySlug || headerSlug);
  if (tenantSlug === "default" && !normalizeTenantSlug(headerSlug)) {
    tenantSlug = null;
  }
  return tenantSlug;
}

async function findUsersForLogin(username, tenantSlug) {
  const slug = normalizeTenantSlug(tenantSlug);
  if (slug) {
    return authRepository.findUserByUsernameAndTenantSlug(username, slug);
  }
  return authRepository.findUsersByUsername(username);
}

async function matchUsersByPassword(users, password) {
  const matched = [];
  const suspendedValid = [];

  for (const user of users) {
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      continue;
    }
    if (user.tenant_status && user.tenant_status !== "active") {
      suspendedValid.push(user);
      continue;
    }
    matched.push(user);
  }

  return { matched, suspendedValid };
}

function buildTenantChoicePayload(user) {
  return {
    slug: user.tenant_slug,
    name: user.tenant_name,
    role: user.role,
  };
}

module.exports = {
  normalizeTenantSlug,
  resolveLoginTenantSlug,
  findUsersForLogin,
  matchUsersByPassword,
  buildTenantChoicePayload,
};
