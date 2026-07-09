const platformAdminService = require("../services/platformAdminService");

exports.listTenants = async (req, res) => {
  try {
    const tenants = await platformAdminService.listTenants(req.query);
    return res.status(200).json({ tenants });
  } catch (error) {
    console.error("platform listTenants:", error);
    return res.status(500).json({ error: "Erro ao listar empresas" });
  }
};

exports.getTenantDetail = async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId, 10);
    if (!Number.isInteger(tenantId) || tenantId < 1) {
      return res.status(400).json({ error: "ID de empresa inválido" });
    }
    const tenant = await platformAdminService.getTenantDetail(tenantId);
    return res.status(200).json({ tenant });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status >= 500) console.error("platform getTenantDetail:", error);
    return res.status(status).json({ error: error.message || "Erro ao buscar empresa" });
  }
};

exports.updateTenantStatus = async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId, 10);
    if (!Number.isInteger(tenantId) || tenantId < 1) {
      return res.status(400).json({ error: "ID de empresa inválido" });
    }
    const updated = await platformAdminService.updateTenantStatus({
      tenantId,
      status: req.body.status,
      actorUserId: req.user.userId,
      requestId: req.requestId,
    });
    return res.status(200).json({ tenant: updated });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status >= 500) console.error("platform updateTenantStatus:", error);
    return res.status(status).json({ error: error.message || "Erro ao atualizar empresa" });
  }
};
