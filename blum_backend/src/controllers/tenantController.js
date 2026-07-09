const tenantProvisioningService = require("../services/tenantProvisioningService");
const { validateTenantSlug } = require("../utils/tenantSlug");

exports.checkSlug = async (req, res) => {
  try {
    const rawSlug = req.params.slug || req.query.slug || "";
    const result = await tenantProvisioningService.checkSlugAvailability(rawSlug);
    return res.status(200).json({
      slug: result.slug,
      available: result.available,
      error: result.error,
    });
  } catch (error) {
    console.error("checkSlug:", error);
    return res.status(500).json({ error: "Erro ao verificar identificador" });
  }
};

exports.signup = async (req, res) => {
  try {
    const { companyName, slug, adminEmail, adminPassword, adminName } = req.body;
    const result = await tenantProvisioningService.provisionTenant({
      companyName,
      slug,
      adminEmail,
      adminPassword,
      adminName,
      requestId: req.requestId,
    });

    return res.status(201).json({
      message: "Empresa criada com sucesso",
      tenant: {
        id: result.tenant.id,
        slug: result.tenant.slug,
        name: result.tenant.name,
        status: result.tenant.status,
      },
      admin: {
        id: result.admin.id,
        username: result.admin.username,
        role: result.admin.role,
        name: result.admin.name,
        tenantId: result.admin.tenantId,
      },
    });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status >= 500) {
      console.error("signup:", error);
    }
    return res.status(status).json({
      error: error.message || "Erro ao criar empresa",
    });
  }
};

exports.getCurrent = async (req, res) => {
  try {
    const summary = await tenantProvisioningService.getCurrentTenantSummary(
      req.user.tenantId,
    );
    return res.status(200).json({ tenant: summary });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status >= 500) {
      console.error("getCurrent tenant:", error);
    }
    return res.status(status).json({
      error: error.message || "Erro ao buscar empresa",
    });
  }
};

exports.previewSlug = (req, res) => {
  const { name } = req.query;
  const validation = validateTenantSlug(name || "");
  return res.status(200).json({
    slug: validation.slug,
    valid: validation.ok,
    error: validation.error,
  });
};
