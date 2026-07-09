const bcrypt = require("bcrypt");
const { pool } = require("../config/database");
const tenantRepository = require("../repositories/tenantRepository");
const { validateTenantSlug, slugFromCompanyName } = require("../utils/tenantSlug");
const { validateTenantTaxId } = require("../utils/tenantTaxId");
const { logAuditEvent } = require("./auditService");
const { sendWelcomeEmail } = require("./emailService");

function isSignupEnabled() {
  const flag = process.env.TENANT_SIGNUP_ENABLED;
  if (flag === "false" || flag === "0") return false;
  return true;
}

async function resolveUniqueSlug(preferred) {
  const base = slugFromCompanyName(preferred) || "empresa";
  const baseValidation = validateTenantSlug(base);
  let candidate = baseValidation.ok ? baseValidation.slug : "empresa";
  if (!(await tenantRepository.slugExists(candidate))) {
    return candidate;
  }
  for (let n = 2; n < 1000; n += 1) {
    const suffix = `-${n}`;
    const trimmed = candidate.slice(0, Math.max(3, 60 - suffix.length));
    const next = `${trimmed}${suffix}`;
    const check = validateTenantSlug(next);
    if (!check.ok) continue;
    if (!(await tenantRepository.slugExists(check.slug))) {
      return check.slug;
    }
  }
  const err = new Error("Não foi possível gerar identificador interno da empresa");
  err.statusCode = 500;
  throw err;
}

async function checkSlugAvailability(rawSlug) {
  const validation = validateTenantSlug(rawSlug);
  if (!validation.ok) {
    return { available: false, slug: validation.slug, error: validation.error };
  }
  const exists = await tenantRepository.slugExists(validation.slug);
  if (exists) {
    return {
      available: false,
      slug: validation.slug,
      error: "Este identificador já está em uso",
    };
  }
  return { available: true, slug: validation.slug, error: null };
}

async function checkTaxIdAvailability(rawTaxId) {
  const validation = validateTenantTaxId(rawTaxId);
  if (!validation.ok) {
    return {
      available: false,
      taxId: validation.taxId,
      type: validation.type,
      error: validation.error,
    };
  }
  const exists = await tenantRepository.taxIdExists(validation.taxId);
  if (exists) {
    return {
      available: false,
      taxId: validation.taxId,
      type: validation.type,
      error: "Este CNPJ/CPF já está cadastrado",
    };
  }
  return {
    available: true,
    taxId: validation.taxId,
    type: validation.type,
    error: null,
  };
}

async function provisionTenant({
  companyName,
  slug: rawSlug,
  taxId: rawTaxId,
  adminEmail,
  adminPassword,
  adminName = null,
  requestId = null,
}) {
  if (!isSignupEnabled()) {
    const err = new Error("Cadastro de novas empresas está temporariamente desativado");
    err.statusCode = 403;
    throw err;
  }

  const company = String(companyName || "").trim();
  const email = String(adminEmail || "").trim().toLowerCase();
  const password = String(adminPassword || "").trim();

  if (!company || company.length < 2) {
    const err = new Error("Nome da empresa é obrigatório");
    err.statusCode = 400;
    throw err;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const err = new Error("E-mail do administrador inválido");
    err.statusCode = 400;
    throw err;
  }
  if (password.length < 6) {
    const err = new Error("Senha deve ter no mínimo 6 caracteres");
    err.statusCode = 400;
    throw err;
  }

  const taxCheck = await checkTaxIdAvailability(rawTaxId);
  if (!taxCheck.available) {
    const err = new Error(taxCheck.error);
    err.statusCode = 409;
    throw err;
  }

  let slug;
  if (rawSlug) {
    const slugCheck = await checkSlugAvailability(rawSlug);
    if (!slugCheck.available) {
      const err = new Error(slugCheck.error);
      err.statusCode = 409;
      throw err;
    }
    slug = slugCheck.slug;
  } else {
    slug = await resolveUniqueSlug(company);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.bypass_rls', 'true', true)");

    const tenantResult = await client.query(
      `INSERT INTO tenants (slug, name, status, billing_email, onboarding_completed_at, tax_id, tax_id_type)
       VALUES ($1, $2, 'active', $3, NOW(), $4, $5)
       RETURNING id, slug, name, status, billing_email, tax_id, tax_id_type, onboarding_completed_at, created_at`,
      [slug, company, email, taxCheck.taxId, taxCheck.type],
    );
    const tenant = tenantResult.rows[0];

    const existingUser = await client.query(
      `SELECT id FROM users
       WHERE LOWER(TRIM(username)) = LOWER($1) AND tenant_id = $2`,
      [email, tenant.id],
    );
    if (existingUser.rows.length > 0) {
      const err = new Error("Já existe um usuário com este e-mail nesta empresa");
      err.statusCode = 409;
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await client.query(
      `INSERT INTO users (username, password_hash, role, name, tenant_id)
       VALUES ($1, $2, 'admin', $3, $4)
       RETURNING id, username, role, name, tenant_id`,
      [email, passwordHash, adminName || company, tenant.id],
    );
    const user = userResult.rows[0];

    await client.query("COMMIT");

    await logAuditEvent({
      tenantId: tenant.id,
      actorUserId: user.id,
      action: "tenant.signup",
      resourceType: "tenant",
      resourceId: String(tenant.id),
      requestId,
      metadata: {
        slug: tenant.slug,
        companyName: company,
        taxIdType: taxCheck.type,
      },
    });

    sendWelcomeEmail({
      to: email,
      companyName: company,
      tenantSlug: tenant.slug,
    }).catch((err) => console.warn("[email] welcome:", err.message));

    return {
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.status,
        taxId: tenant.tax_id,
        taxIdType: tenant.tax_id_type,
      },
      admin: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        tenantId: user.tenant_id,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      const err = new Error("Este CNPJ/CPF ou e-mail já está em uso");
      err.statusCode = 409;
      throw err;
    }
    throw error;
  } finally {
    client.release();
  }
}

async function getCurrentTenantSummary(tenantId) {
  const tenant = await tenantRepository.findBillingById(tenantId);
  if (!tenant) {
    const err = new Error("Empresa não encontrada");
    err.statusCode = 404;
    throw err;
  }
  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    status: tenant.status,
    planSlug: tenant.plan_slug,
    subscriptionStatus: tenant.subscription_status,
    onboardingCompletedAt: tenant.onboarding_completed_at,
  };
}

module.exports = {
  isSignupEnabled,
  checkSlugAvailability,
  checkTaxIdAvailability,
  resolveUniqueSlug,
  provisionTenant,
  getCurrentTenantSummary,
};
