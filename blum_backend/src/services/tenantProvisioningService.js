const bcrypt = require("bcrypt");
const { pool } = require("../config/database");
const tenantRepository = require("../repositories/tenantRepository");
const { validateTenantSlug } = require("../utils/tenantSlug");
const { logAuditEvent } = require("./auditService");
const { sendWelcomeEmail } = require("./emailService");

function isSignupEnabled() {
  const flag = process.env.TENANT_SIGNUP_ENABLED;
  if (flag === "false" || flag === "0") return false;
  return true;
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

async function provisionTenant({
  companyName,
  slug: rawSlug,
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

  const slugCheck = await checkSlugAvailability(rawSlug || company);
  if (!slugCheck.available) {
    const err = new Error(slugCheck.error);
    err.statusCode = 409;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.bypass_rls', 'true', true)");

    const tenantResult = await client.query(
      `INSERT INTO tenants (slug, name, status, billing_email, onboarding_completed_at)
       VALUES ($1, $2, 'active', $3, NOW())
       RETURNING id, slug, name, status, billing_email, onboarding_completed_at, created_at`,
      [slugCheck.slug, company, email],
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
      metadata: { slug: tenant.slug, companyName: company },
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
      const err = new Error("Este identificador ou e-mail já está em uso");
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
  provisionTenant,
  getCurrentTenantSummary,
};
